import type { CorpusRecord, VocabularyCandidate } from './types';

export interface CandidateContext { known: Set<string>; scenarioTerms?: string[]; weakTerms?: string[]; }

export function extractVocabularyCandidates(records: CorpusRecord[], context: CandidateContext): VocabularyCandidate[] {
  const frequency = new Map<string, number>();
  for (const r of records) {
    for (const token of r.normalizedText.split(/[^\p{L}\p{N}'-]+/u).filter(t => t.length >= 2)) frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }
  return [...frequency.entries()].map(([text, count]) => {
    const novelty = context.known.has(text) ? 0 : 1;
    const semanticRelevance = context.weakTerms?.some(t => text.includes(t) || t.includes(text)) ? 1 : 0;
    const scenarioRelevance = context.scenarioTerms?.some(t => text.includes(t) || t.includes(text)) ? 1 : 0;
    const score = count * 0.35 + novelty * 0.3 + semanticRelevance * 0.2 + scenarioRelevance * 0.15;
    return { text, score, frequency: count, novelty, semanticRelevance, scenarioRelevance, reason: [count > 1 ? 'frequent' : 'rare', novelty ? 'new' : 'known', semanticRelevance ? 'weak-skill match' : '', scenarioRelevance ? 'scenario match' : ''].filter(Boolean) };
  }).sort((a,b) => b.score - a.score);
}
