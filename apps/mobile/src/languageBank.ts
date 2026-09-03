import { Capacitor } from '@capacitor/core';
import { DatabaseManager, MigrationRunner, migration001, migration002LanguageBank, VocabularyRepository } from '@yaali/database';
import type { LanguageBankItem } from '@yaali/database';
import { PHRASES } from './data';


const MIRROR_KEY = 'yaali_language_bank_v2';
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
    kind: 'phrase',
    source_language: String(p.lang || '').toLowerCase() === 'english' ? 'en' : 'ar',
    target_language: 'fa',
    dialect: p.dialect || 'common',
    text: p.arabic || '',
    normalized_text: normalize(p.arabic || ''),
    translation: p.farsi || p.english || '',
    transliteration: p.arabicPhoneticLatin || '',
    pronunciation: p.arabicPhonetic || '',
    definition: p.english || '',
    level: 'A1-A2',
    topic: p.category || 'general',
    tags: [p.category,p.gender,p.dialect].filter(Boolean).join(','),
    ...(String(p.gender || '').includes('speaker') ? {speaker_gender: p.gender} : {}),
    ...(String(p.gender || '').includes('listener') ? {listener_gender: p.gender} : {}),
    example_text: p.arabic || '',
    example_translation: p.farsi || '',
    source: 'built-in Persian language bank',
    favorite: 0, learned: 0, notes: p.audioTips || '',
    created_at: ts, updated_at: ts
  };
}

function readMirror(): LanguageBankItem[] {
  try { return JSON.parse(localStorage.getItem(MIRROR_KEY) || '[]'); } catch { return []; }
}
function writeMirror(items: LanguageBankItem[]) {
  try { localStorage.setItem(MIRROR_KEY, JSON.stringify(items)); } catch {}
}

export async function initLanguageBank(): Promise<void> {
  if (ready) return;
  const supported = PHRASES.filter((p:any)=>{ const d=String(p.dialect||''); return d.includes('عراقی') || d.includes('لبنانی') || d.includes('آمریکایی'); });
  const seeds = supported.map(phraseToBankItem);
  const wordSeeds: LanguageBankItem[] = [];
  const existing = readMirror();
  const map = new Map(existing.map(x => [x.id,x]));
  for (const s of [...seeds, ...wordSeeds]) if (!map.has(s.id)) map.set(s.id,s);
  writeMirror([...map.values()]);
  if (Capacitor.isNativePlatform()) {
    try {
      await db.initialize();
      await new MigrationRunner(db).run([migration001, migration002LanguageBank]);
      const repo = new VocabularyRepository(db);
      for (const item of [...seeds, ...wordSeeds]) await repo.upsertLanguageItem(item);
    } catch (e) {
      console.warn('[language-bank] SQLite unavailable; local mirror remains active', e);
    }
  }
  ready = true;
}

export function getBankItems(): LanguageBankItem[] { return readMirror(); }

export async function saveBankItem(item: LanguageBankItem): Promise<void> {
  const all = readMirror().filter(x => x.id !== item.id);
  all.unshift({...item, normalized_text: normalize(item.text), updated_at: now()});
  writeMirror(all.slice(0, 20000));
  if (Capacitor.isNativePlatform()) {
    try { await new VocabularyRepository(db).upsertLanguageItem(item); } catch {}
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
  return JSON.stringify({version:2, exportedAt:now(), items:getBankItems()},null,2);
}

export async function importBank(items: LanguageBankItem[]): Promise<number> {
  let n=0;
  for (const item of items) {
    if (!item?.text) continue;
    await saveBankItem({...item,id:item.id || `import_${Date.now()}_${n}`,updated_at:now(),created_at:item.created_at||now()});
    n++;
  }
  return n;
}
