export interface CefrEstimate { level: string; confidence: number; method: string; }

/** Conservative heuristic only; it is never treated as ground-truth CEFR. */
export function estimateCefr(text: string, features?: { frequencyRank?: number; knownWordRatio?: number; grammarComplexity?: number }): CefrEstimate {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const avgLength = words.length ? words.reduce((n,w)=>n+w.length,0)/words.length : 0;
  const known = features?.knownWordRatio ?? 0.5;
  const grammar = features?.grammarComplexity ?? Math.min(1, Math.max(0, (words.length-6)/18));
  const score = (avgLength/10)*0.25 + (1-known)*0.45 + grammar*0.30;
  const level = score < 0.2 ? 'A1' : score < 0.35 ? 'A2' : score < 0.5 ? 'B1' : score < 0.68 ? 'B2' : score < 0.84 ? 'C1' : 'C2';
  return { level, confidence: 0.35, method: 'heuristic-v1-not-ground-truth' };
}
