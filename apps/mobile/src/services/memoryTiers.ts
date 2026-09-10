// Wires the pure L1/L2/L3 logic in @yaali/core to real storage:
//  - L1 (short-term context): handled inline in App.tsx via buildL1Context —
//    nothing to persist, it's just "what goes in THIS prompt".
//  - L2 (session summary): a per-conversation compact summary, kept in
//    localStorage (cheap, session-scoped, doesn't need SQLite).
//  - L3 (long-term memory): the real, cross-session store — SQLite via the
//    previously-unused UserMemoryRepository, gated by recurrence so a single
//    one-off mistake never reaches it (memory-pollution guard, RC1 review §5).
import {
  buildL1Context, shouldSummarizeSession, buildSummaryPrompt, parseSessionSummary,
  shouldPromoteToLongTerm, importanceForOccurrences, normalizeFactKey,
  type L1Message, type SessionSummary,
} from '@yaali/core';
import { UserMemoryRepository } from '@yaali/database';
import { getDatabaseManager } from '../languageBank';
import { bumpFactOccurrence } from './localLearningMemory';

export { buildL1Context, shouldSummarizeSession };
export type { L1Message, SessionSummary };

// ---------------------------------------------------------------------------
// L2 — session summaries (localStorage, keyed by conversation id)
// ---------------------------------------------------------------------------
const L2_KEY = 'yaali_session_summaries_v1';
interface L2Store { [conversationId: string]: SessionSummary & { messageCountAtSummary: number } }
function readL2(): L2Store { try { const x = JSON.parse(localStorage.getItem(L2_KEY) || '{}'); return x && typeof x === 'object' ? x : {}; } catch { return {}; } }
function writeL2(x: L2Store) { try { localStorage.setItem(L2_KEY, JSON.stringify(x)); } catch { /* ignore */ } }

export function getSessionSummary(conversationId: string): (SessionSummary & { messageCountAtSummary: number }) | null {
  return readL2()[conversationId] ?? null;
}

export function saveSessionSummary(conversationId: string, summary: SessionSummary, messageCountAtSummary: number) {
  const store = readL2();
  store[conversationId] = { ...summary, messageCountAtSummary };
  writeL2(store);
}

export function buildSessionSummaryPrompt(conversationId: string, olderMessages: L1Message[]): string {
  return buildSummaryPrompt(olderMessages, getSessionSummary(conversationId)?.summary);
}

export { parseSessionSummary };

// ---------------------------------------------------------------------------
// L3 — long-term memory (SQLite, gated by recurrence)
// ---------------------------------------------------------------------------
// BUGFIX (field report — scenario chat and free chat both froze on "local
// model generating a response" with no reply, ever, and no fallback): this
// function used to be a plain `await ... .catch(() => '')` at the call
// site, which handles a *rejected* promise but does nothing for a promise
// that never settles at all — e.g. a genuinely stuck DB call (most likely
// the very first time a new migration runs on a device). Since this runs
// BEFORE the try/catch that wraps the actual chat generation, a hang here
// froze the whole send() with no error, no fallback, and no way to recover
// short of restarting the app. A hard timeout guarantees this can never
// block the main chat path for more than ~1.5s, matching §11 of the LAILI
// report ("UI نباید برای ارزیابی سنگین متوقف شود" — heavy evaluation must
// never stall the UI) — this enrichment is a nice-to-have, not something
// worth freezing the whole app over.
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; resolve(fallback); } }, ms);
    promise.then(
      (v) => { if (!settled) { settled = true; clearTimeout(timer); resolve(v); } },
      () => { if (!settled) { settled = true; clearTimeout(timer); resolve(fallback); } },
    );
  });
}

export async function getL3ContextText(learnerId: string, limit = 6): Promise<string> {
  return withTimeout(getL3ContextTextInner(learnerId, limit), 1500, '');
}

async function getL3ContextTextInner(learnerId: string, limit: number): Promise<string> {
  try {
    const db = await getDatabaseManager();
    const rows = await new UserMemoryRepository(db).list(learnerId);
    if (!rows.length) return '';
    const top = rows.slice(0, limit).map(r => r.memory_value);
    return `Long-term memory (things this learner has shown repeatedly, not one-off mistakes): ${top.join(' | ')}.`;
  } catch { return ''; }
}

// Promotes a correction to long-term memory only once it has recurred — a
// single mention just bumps the local counter and stops there.
export async function maybePromoteCorrection(learnerId: string, correction: string): Promise<void> {
  const key = normalizeFactKey(correction);
  if (!key) return;
  const count = bumpFactOccurrence(`correction:${key}`);
  if (!shouldPromoteToLongTerm(count)) return;
  try {
    const db = await getDatabaseManager();
    await new UserMemoryRepository(db).upsert({
      id: `mem_correction_${key}`,
      user_id: learnerId,
      memory_key: `recurring_mistake:${key}`,
      memory_value: correction.slice(0, 240),
      importance: importanceForOccurrences(count),
      updated_at: new Date().toISOString(),
    });
  } catch { /* best-effort; local counters already recorded the recurrence */ }
}

// Promotes a topic (weak area or genuine strength/interest) once its local
// tally (already kept in localLearningMemory) crosses the same recurrence bar.
export async function maybePromoteTopic(learnerId: string, topic: string, kind: 'weak' | 'strength', count: number): Promise<void> {
  if (!topic || !shouldPromoteToLongTerm(count)) return;
  const key = normalizeFactKey(topic);
  if (!key) return;
  try {
    const db = await getDatabaseManager();
    await new UserMemoryRepository(db).upsert({
      id: `mem_topic_${kind}_${key}`,
      user_id: learnerId,
      memory_key: `${kind === 'weak' ? 'weak_topic' : 'strength_topic'}:${key}`,
      memory_value: topic,
      importance: importanceForOccurrences(count),
      updated_at: new Date().toISOString(),
    });
  } catch { /* best-effort */ }
}

// Clears L3 — the persistent, cross-session long-term memory in the
// database. Separate on purpose from clearLocalLearningMemory (L1/L2,
// localStorage) so a settings "clear memory" control can offer either or
// both.
export async function clearLearnerLongTermMemory(learnerId: string): Promise<void> {
  const db = await getDatabaseManager();
  await new UserMemoryRepository(db).deleteAll(learnerId);
}

// Clears L2 — every saved per-conversation session summary.
export function clearAllSessionSummaries(): void {
  try { localStorage.removeItem(L2_KEY); } catch { /* ignore */ }
}
