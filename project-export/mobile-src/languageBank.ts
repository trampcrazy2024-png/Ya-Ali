import { Capacitor } from '@capacitor/core';
import { DatabaseManager, MigrationRunner, migration001, migration002LanguageBank, migration003Learning, migration004LearningRuntime, migration005LearningOS, VocabularyRepository } from '@yaali/database';
import type { LanguageBankItem } from '@yaali/database';
import { PHRASES } from './data';
import { SEED_WORDS } from './vocabularySeed';


const MIRROR_KEY = 'yaali_language_bank_v4';
const LEGACY_KEYS = ['yaali_language_bank_v3', 'yaali_language_bank_v2'];
const db = new DatabaseManager();
let ready = false;

function normalize(s: string): string {
  return s.trim().toLocaleLowerCase('fa-IR')
    .replace(/ي/g,'ی').replace(/ى/g,'ی').replace(/ك/g,'ک')
    .replace(/\u200c/g,'').replace(/\s+/g,' ');
}

function now() { return new Date().toISOString(); }

export function phraseToBankItem(p: any): LanguageBankItem {
  const ts = now();
  return {
    id: `seed_${p.id}`,
    kind: p.kind === 'word' ? 'word' : p.kind === 'example' ? 'example' : 'phrase',
    source_language: String(p.lang || '').toLowerCase() === 'english' ? 'en' : 'ar',
    target_language: 'fa',
    dialect: p.dialect || 'common',
    text: p.lang === 'english' ? (p.text || p.english || '') : (p.arabic || ''),
    normalized_text: normalize(p.lang === 'english' ? (p.text || p.english || '') : (p.arabic || '')),
    translation: p.farsi || p.translation || p.english || '',
    transliteration: p.arabicPhoneticLatin || '',
    pronunciation: p.arabicPhonetic || '',
    definition: p.definition || p.farsi || p.translation || p.english || '',
    level: p.level || 'A1-A2',
    topic: p.category || 'general',
    part_of_speech: p.part_of_speech || '',
    tags: [p.category,p.gender,p.dialect].filter(Boolean).join(','),
    ...(String(p.gender || '').includes('speaker') ? {speaker_gender: p.gender} : {}),
    ...(String(p.gender || '').includes('listener') ? {listener_gender: p.gender} : {}),
    example_text: p.example || p.arabic || p.text || '',
    example_translation: p.exampleFa || p.farsi || '',
    source: 'built-in Persian language bank',
    favorite: 0, learned: 0, notes: p.audioTips || '',
    created_at: ts, updated_at: ts
  };
}

function readMirror(): LanguageBankItem[] {
  try {
    const current = JSON.parse(localStorage.getItem(MIRROR_KEY) || '[]');
    if (Array.isArray(current)) return current;
  } catch {}
  return [];
}
function readLegacy(): LanguageBankItem[] {
  const out: LanguageBankItem[] = [];
  for (const key of LEGACY_KEYS) {
    try { const items = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(items)) out.push(...items); } catch {}
  }
  return out;
}
function writeMirror(items: LanguageBankItem[]) {
  try { localStorage.setItem(MIRROR_KEY, JSON.stringify(items)); } catch {}
}

export async function initLanguageBank(): Promise<void> {
  if (ready) return;
  const supported = PHRASES.filter((p:any)=>{ const d=String(p.dialect||''); return d.includes('عراقی') || d.includes('لبنانی') || d.includes('آمریکایی'); });
  const seeds = supported.map(phraseToBankItem);
  const wordSeeds: LanguageBankItem[] = SEED_WORDS.map(w => phraseToBankItem({id:w.id, kind:'word', lang:w.lang, dialect:w.dialect, text:w.text, translation:w.translation, farsi:w.translation, english:w.lang==='english'?w.text:'', arabic:w.lang==='arabic'?w.text:'', arabicPhoneticLatin:w.transliteration, arabicPhonetic:w.pronunciation, category:w.category, example:w.example, exampleFa:w.exampleFa, level:w.level, audioTips:`${w.level} · ${w.category}`}));
  const existing = [...readLegacy(), ...readMirror()];
  const map = new Map(existing.map(x => [x.id,x]));
  for (const s of [...seeds, ...wordSeeds]) map.set(s.id,s);
  writeMirror([...map.values()].slice(0, 30000));
  if (Capacitor.isNativePlatform()) {
    try {
      await db.initialize();
      await new MigrationRunner(db).run([migration001, migration002LanguageBank, migration003Learning, migration004LearningRuntime, migration005LearningOS]);
      const repo = new VocabularyRepository(db);
      for (const item of [...seeds, ...wordSeeds]) await repo.upsertLanguageItem(item);
    } catch (e) {
      console.warn('[language-bank] SQLite unavailable; local mirror remains active', e);
    }
  }
  ready = true;
}

export async function getDatabaseManager(): Promise<DatabaseManager> {
  await db.initialize();
  await new MigrationRunner(db).run([migration001, migration002LanguageBank, migration003Learning, migration004LearningRuntime, migration005LearningOS]);
  return db;
}

export function getBankItems(): LanguageBankItem[] { return readMirror(); }

export async function saveBankItem(item: LanguageBankItem): Promise<void> {
  const safe: LanguageBankItem = {
    ...item,
    id: String(item.id || `user_${Date.now()}_${Math.random().toString(36).slice(2,8)}`),
    text: String(item.text || '').trim(),
    normalized_text: normalize(String(item.text || '')),
    source_language: String(item.source_language || 'ar'),
    target_language: String(item.target_language || 'fa'),
    dialect: String(item.dialect || ''),
    created_at: item.created_at || now(),
    updated_at: now(),
    favorite: Number(item.favorite || 0),
    learned: Number(item.learned || 0),
  };
  if (!safe.text) return;
  const all = readMirror().filter(x => x.id !== safe.id);
  all.unshift(safe);
  writeMirror(all.slice(0, 30000));
  if (Capacitor.isNativePlatform()) {
    try { await db.initialize(); await new MigrationRunner(db).run([migration001, migration002LanguageBank, migration003Learning, migration004LearningRuntime, migration005LearningOS]); await new VocabularyRepository(db).upsertLanguageItem(safe); } catch {}
  }
}

export async function savePhrase(p: any): Promise<void> {
  await saveBankItem(phraseToBankItem({...p, id: `user_${Date.now()}`}));
}

export function searchBank(query: string, limit=100): LanguageBankItem[] {
  const q=normalize(query);
  if (!q) return getBankItems().slice(0,limit);
  return getBankItems().filter(x => {
    const hay=normalize([x.text,x.translation,x.transliteration,x.definition,x.tags,x.dialect].filter(Boolean).join(' '));
    return hay.includes(q) || q.split(' ').every(t => hay.includes(t));
  }).slice(0,limit);
}

export function exportBank(): string {
  return JSON.stringify({version:4, exportedAt:now(), items:getBankItems()},null,2);
}

function stringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function firstArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value.items)) return value.items;
  const combined: any[] = [];
  for (const key of ['data','entries','words','phrases','vocabulary','bank','records']) {
    if (Array.isArray(value[key])) combined.push(...value[key]);
  }
  return combined;
}

function inferDialect(raw: any, fallbackDialect=''): string {
  const d = stringValue(raw.dialect, raw.dialect_fa, raw.dialectName, raw.variant);
  if (/عراقی|iraqi|iraq|en-?iq|ar-?iq/i.test(d)) return 'عراقی';
  if (/لبنانی|lebanese|levantine|شامی|لبنان|ar-?lb/i.test(d)) return 'لبنانی';
  if (/آمریکایی|american|en-?us|us english/i.test(d)) return 'آمریکایی';
  // Generic labels such as "common", "standard" or "fusha" are not a
  // supported learning target. If the user explicitly selected a fallback
  // dialect for this import, use that rather than silently hiding the item.
  if (!d || /مشترک|common|standard|fusha|فصیح|محلی|عامه|عربی/i.test(d)) return fallbackDialect;
  return d;
}

function normalizeImportedItem(raw: any, index: number, fallbackDialect=''): LanguageBankItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const dialect = inferDialect(raw, fallbackDialect);
  if (!dialect) return null;
  const arabic = stringValue(raw.arabic, raw.arabicText, raw.targetText, raw.word, raw.phrase);
  const english = stringValue(raw.english, raw.englishText, raw.sourceText);
  const text = stringValue(raw.text, raw.term, raw.word_text, raw.expression, raw.phrase, dialect === 'آمریکایی' ? english : arabic);
  if (!text) return null;
  const translation = stringValue(raw.translation, raw.farsi, raw.persian, raw.meaning, raw.definition, dialect === 'آمریکایی' ? raw.meaning_fa : '');
  const lang = stringValue(raw.source_language, raw.language, raw.lang).toLowerCase();
  const sourceLanguage = dialect === 'آمریکایی' || lang === 'english' || lang === 'en' || /^[a-z\s'.,!?-]+$/i.test(text) ? 'en' : 'ar';
  const kindRaw = stringValue(raw.kind, raw.type).toLowerCase();
  const kind: LanguageBankItem['kind'] = kindRaw === 'word' ? 'word' : kindRaw === 'example' ? 'example' : 'phrase';
  const ts = now();
  return {
    id: stringValue(raw.id, raw.uuid) || `import_${Date.now()}_${index}_${Math.random().toString(36).slice(2,7)}`,
    kind, source_language: sourceLanguage, target_language: 'fa', dialect, text,
    normalized_text: normalize(text), translation,
    transliteration: stringValue(raw.transliteration, raw.arabicPhoneticLatin, raw.romanization),
    pronunciation: stringValue(raw.pronunciation, raw.arabicPhonetic, raw.phonetic),
    definition: stringValue(raw.definition, raw.meaning, raw.farsi, raw.translation),
    part_of_speech: stringValue(raw.part_of_speech, raw.pos),
    level: stringValue(raw.level, raw.cefr) || 'A1-A2',
    topic: stringValue(raw.topic, raw.category) || 'general',
    tags: Array.isArray(raw.tags) ? raw.tags.join(',') : stringValue(raw.tags, raw.category),
    synonyms: stringValue(raw.synonyms), antonyms: stringValue(raw.antonyms),
    speaker_gender: stringValue(raw.speaker_gender), listener_gender: stringValue(raw.listener_gender),
    example_text: stringValue(raw.example_text, raw.example, raw.exampleTarget),
    example_translation: stringValue(raw.example_translation, raw.exampleFa, raw.example_fa),
    source: stringValue(raw.source, raw.origin) || 'JSON import',
    favorite: Number(raw.favorite || 0), learned: Number(raw.learned || 0),
    notes: stringValue(raw.notes, raw.audioTips), created_at: stringValue(raw.created_at) || ts, updated_at: ts
  };
}

/**
 * Accepts both Ya-Ali exports and common JSON vocabulary shapes.
 * Unsupported/ambiguous entries are skipped instead of being silently
 * inserted under an incorrect dialect.
 */
export async function importBank(payload: unknown, fallbackDialect=''): Promise<number> {
  const rawItems = firstArray(payload);
  let n=0;
  for (let i=0; i<rawItems.length; i++) {
    const item = normalizeImportedItem(rawItems[i], i, fallbackDialect);
    if (!item) continue;
    await saveBankItem(item);
    n++;
  }
  return n;
}
