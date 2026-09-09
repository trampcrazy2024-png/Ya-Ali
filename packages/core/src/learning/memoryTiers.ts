// L1/L2/L3 memory architecture (report §4) + fast/deep evaluation split
// (roadmap item 6). Pure, framework-free logic — the app wires this to
// SQLite/localStorage in apps/mobile/src/services/memoryTiers.ts.
import type { TurnEvaluation } from './types';

// ---------------------------------------------------------------------------
// L1 — bounded short-term conversation context.
// A plain `.slice(-10)` (what the app did before) still lets a handful of
// very long messages blow the token budget. This caps BOTH message count
// and total characters, and always keeps at least the newest message.
// ---------------------------------------------------------------------------
export interface L1Message { role: 'user' | 'assistant' | 'system'; text: string }
export interface L1ContextInput { messages: L1Message[]; maxMessages?: number; maxChars?: number }
export interface L1Context { kept: L1Message[]; droppedCount: number }

const DEFAULT_L1_MAX_MESSAGES = 10;
const DEFAULT_L1_MAX_CHARS = 4000;

export function buildL1Context(input: L1ContextInput): L1Context {
  const maxMessages = input.maxMessages ?? DEFAULT_L1_MAX_MESSAGES;
  const maxChars = input.maxChars ?? DEFAULT_L1_MAX_CHARS;
  const recent = input.messages.slice(-maxMessages);
  let chars = 0;
  const kept: L1Message[] = [];
  for (let i = recent.length - 1; i >= 0; i--) {
    const m = recent[i];
    chars += m.text.length;
    if (chars > maxChars && kept.length > 0) break; // always keep at least the newest message
    kept.unshift(m);
  }
  return { kept, droppedCount: input.messages.length - kept.length };
}

// ---------------------------------------------------------------------------
// L2 — session summary. Once a conversation crosses a size threshold, the
// portion of it that's about to fall out of the L1 window gets compacted
// into a short summary + extracted teaching points/corrections instead of
// being silently dropped.
// ---------------------------------------------------------------------------
export function shouldSummarizeSession(messageCount: number, threshold = 16): boolean {
  return messageCount > 0 && messageCount % threshold === 0;
}

export function buildSummaryPrompt(olderMessages: L1Message[], existingSummary?: string): string {
  const transcript = olderMessages.map(m => `${m.role}: ${m.text}`).join('\n');
  return `Return ONLY valid JSON with keys: summary (2-4 plain sentences), teachingPoints (array, max 5 short strings), corrections (array, max 5 short strings, each one concrete mistake+fix). Summarize this part of a language-learning conversation so it can replace the raw transcript in future context.${existingSummary ? ` Build on this earlier summary: ${existingSummary}` : ''}\nTranscript:\n${transcript}`;
}

export interface SessionSummary { summary: string; teachingPoints: string[]; corrections: string[] }
export function parseSessionSummary(raw: string): SessionSummary | null {
  try {
    const jsonText = raw.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonText) return null;
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    return {
      summary: String(parsed.summary ?? '').slice(0, 800),
      teachingPoints: toStringArray(parsed.teachingPoints).slice(0, 5),
      corrections: toStringArray(parsed.corrections).slice(0, 5),
    };
  } catch { return null; }
}
function toStringArray(v: unknown): string[] { return Array.isArray(v) ? v.map(String).filter(Boolean) : []; }

// ---------------------------------------------------------------------------
// L3 — long-term memory promotion, with a memory-pollution guard: a fact
// only earns a permanent place once it has recurred (count >= 2). A single
// one-off slip stays in L1/L2 and simply fades out on its own; it is never
// written to long-term storage. Importance then rises a little with each
// further occurrence, capped so a few very-frequent facts can't crowd out
// everything else once the app sorts long-term memory by importance.
// ---------------------------------------------------------------------------
export function shouldPromoteToLongTerm(occurrenceCount: number): boolean {
  return occurrenceCount >= 2;
}
export function importanceForOccurrences(occurrenceCount: number): number {
  return Math.max(0.3, Math.min(1, 0.3 + occurrenceCount * 0.15));
}
// Normalizes free text so near-identical corrections/topics collapse to the
// same key (case/punctuation/whitespace only — this is exact-ish matching,
// not semantic similarity; that's a known, stated limitation, not a bug).
export function normalizeFactKey(text: string): string {
  return text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').slice(0, 80);
}

// ---------------------------------------------------------------------------
// Fast (heuristic, zero-generation) evaluation — roadmap item 6. Cheap
// enough to run after every single turn on any device, including weak
// phones, because it calls no model at all. Deep (LLM-based) evaluation
// (see apps/mobile/src/services/scenarioEvaluator.ts) stays reserved for
// scenario practice turns and L2 session checkpoints, where the extra
// generation is worth its cost.
// ---------------------------------------------------------------------------
export function evaluateTurnFast(learnerText: string): TurnEvaluation {
  const trimmed = learnerText.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const lengthScore = clamp01(words.length / 12);
  const varietyScore = clamp01(new Set(words.map(w => w.toLowerCase())).size / Math.max(1, words.length));
  const punctuationScore = /[.!?؟]/.test(trimmed) ? 0.8 : 0.5;
  const dimensions = [
    { name: 'fluency', weight: 0.4, score: lengthScore },
    { name: 'vocabulary', weight: 0.35, score: varietyScore },
    { name: 'appropriateness', weight: 0.25, score: punctuationScore },
  ];
  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
  const overall = dimensions.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight;
  return { overall, dimensions, corrections: [], strengths: dimensions.filter(d => d.score >= 0.8).map(d => d.name), nextActions: [] };
}
function clamp01(n: number) { return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0)); }
