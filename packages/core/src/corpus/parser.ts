import type { CorpusRecord, CorpusItemType, SourceMetadata } from './types';

export interface CorpusParserOptions { source: SourceMetadata; language: string; dialect?: string; maxChars?: number; }

const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/g, ' ').trim();

function detectType(raw: Record<string, unknown>): CorpusItemType {
  const t = String(raw.type ?? raw.kind ?? '').toLowerCase();
  if (['word','phrase','sentence','dialogue','audio'].includes(t)) return t as CorpusItemType;
  if (raw.audio || raw.audio_filepath || raw.path) return 'audio';
  const text = String(raw.text ?? raw.sentence ?? raw.transcription ?? '').trim();
  if (text.split(/\s+/).length <= 2) return 'phrase';
  return 'sentence';
}

export function parseCorpusRecords(input: string | Array<Record<string, unknown>>, options: CorpusParserOptions): CorpusRecord[] {
  const rows = Array.isArray(input) ? input : parseDelimitedOrJson(input);
  const seen = new Set<string>();
  const out: CorpusRecord[] = [];
  const maxChars = options.maxChars ?? 500;
  for (const raw of rows) {
    const text = normalize(String(raw.text ?? raw.sentence ?? raw.transcription ?? ''));
    if (!text || text.length > maxChars) continue;
    const normalizedText = normalize(text).toLocaleLowerCase();
    const key = `${options.language}|${options.dialect ?? ''}|${normalizedText}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const dialect = options.dialect ?? stringOrUndefined(raw.dialect ?? raw.locale);
    const translation = stringOrUndefined(raw.translation ?? raw.meaning);
    const pos = stringOrUndefined(raw.pos ?? raw.part_of_speech);
    const estimatedLevel = stringOrUndefined(raw.cefr ?? raw.level);
    const levelConfidence = numberOrUndefined(raw.levelConfidence);
    const levelMethod = stringOrUndefined(raw.levelMethod);
    const audio = raw.audio || raw.audio_filepath
      ? compactOptional({
          uri: stringOrUndefined(raw.audio ?? raw.audio_filepath ?? raw.path),
          durationMs: numberOrUndefined(raw.durationMs ?? raw.duration_ms),
          sampleRate: numberOrUndefined(raw.sampleRate ?? raw.sample_rate),
          format: stringOrUndefined(raw.format),
          speakerId: stringOrUndefined(raw.client_id ?? raw.speakerId)
        }) as NonNullable<CorpusRecord['audio']>
      : undefined;
    const speaker = raw.gender || raw.age || raw.accent
      ? compactOptional({
          id: stringOrUndefined(raw.client_id),
          gender: stringOrUndefined(raw.gender),
          ageRange: stringOrUndefined(raw.age),
          accent: stringOrUndefined(raw.accent)
        }) as NonNullable<CorpusRecord['speaker']>
      : undefined;
    const tags = Array.isArray(raw.tags) ? raw.tags.map(String) : undefined;
    out.push({
      id: String(raw.id ?? raw.client_id ?? `corpus_${out.length}_${Date.now()}`),
      type: detectType(raw),
      language: options.language,
      text,
      normalizedText,
      source: options.source,
      createdAt: new Date().toISOString(),
      ...(dialect !== undefined ? { dialect } : {}),
      ...(translation !== undefined ? { translation } : {}),
      ...(pos !== undefined ? { pos } : {}),
      ...(estimatedLevel !== undefined ? { estimatedLevel } : {}),
      ...(levelConfidence !== undefined ? { levelConfidence } : {}),
      ...(levelMethod !== undefined ? { levelMethod } : {}),
      ...(audio !== undefined ? { audio } : {}),
      ...(speaker !== undefined ? { speaker } : {}),
      ...(tags !== undefined ? { tags } : {})
    });
  }
  return out;
}

function parseDelimitedOrJson(input: string): Array<Record<string, unknown>> {
  const trimmed = input.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) return parsed.filter(isRecord);
    if (isRecord(parsed)) {
      for (const key of ['data','records','items','sentences','entries']) if (Array.isArray(parsed[key])) return parsed[key].filter(isRecord);
    }
    return [];
  }
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const firstLine = lines[0]!;
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  const headers = firstLine.split(delimiter).map(x => x.trim());
  return lines.slice(1).map(line => {
    const cells = line.split(delimiter);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
}

const compactOptional = (value: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const stringOrUndefined = (value: unknown) => value == null || String(value).trim() === '' ? undefined : String(value);
const numberOrUndefined = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : undefined; };
