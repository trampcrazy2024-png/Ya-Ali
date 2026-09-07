import { describe, expect, it } from 'vitest';
import { estimateCefr, extractVocabularyCandidates, parseCommonVoiceTSV, parseCorpusRecords, decideNextState, evaluateTurn, applyEvaluation, rankLearningCandidates } from '@yaali/core';

describe('adaptive architecture', () => {
  it('parses corpus with explicit provenance and deduplicates', () => {
    const rows = parseCorpusRecords('id\tsentence\n1\tHello world\n2\tHello world', {
      language: 'en',
      source: { source: 'test', dataset: 'unit', datasetVersion: '1', license: 'CC0-1.0', provenance: 'user' }
    });
    expect(rows).toHaveLength(1);
    const first = rows[0]!;
    expect(first.source.license).toBe('CC0-1.0');
  });

  it('extracts candidates using more than first-token order', () => {
    const records = parseCorpusRecords([
      { id: '1', text: 'book airport book', type: 'sentence' },
      { id: '2', text: 'airport ticket', type: 'sentence' }
    ], { language: 'en', source: { source: 'test', license: 'CC0-1.0', provenance: 'user' } });
    const result = extractVocabularyCandidates(records, { known: new Set(['book']), scenarioTerms: ['airport'] });
    const first = result[0]!;
    expect(first.text).toBe('airport');
  });

  it('supports Common Voice-style TSV and conservative CEFR estimates', () => {
    const rows = parseCommonVoiceTSV('client_id\tsentence\nabc\tThis is a simple sentence.', { language: 'en', datasetVersion: '26.0', license: 'CC0-1.0' });
    const first = rows[0]!;
    expect(first.source.datasetVersion).toBe('26.0');
    expect(estimateCefr(first.text).confidence).toBeLessThan(1);
  });

  it('ranks learning candidates toward the learner weakest skills', () => {
    const vector = { learnerId: 'u', updatedAt: '', scores: { grammar: 0.2, vocabulary: 0.8, fluency: 0.7 }, confidence: {} };
    const ranked = rankLearningCandidates(vector, [
      { id: 'grammar', skills: ['grammar'], due: false, relevance: 0.5 },
      { id: 'vocabulary', skills: ['vocabulary'], due: true, relevance: 0.5 }
    ]);
    expect(ranked[0]!.id).toBe('grammar');
  });

  it('uses weighted evaluation and updates a skill vector', () => {
    const evaluation = evaluateTurn({ grammar: .4, fluency: .8, vocabulary: .7, taskCompletion: .9, intent: .9, appropriateness: .8, pronunciation: .6, languageAccuracy: .5 });
    const applied = applyEvaluation({ learnerId: 'u', updatedAt: '', scores: {}, confidence: {} }, evaluation, 'u');
    expect(evaluation.overall).toBeGreaterThan(.5);
    expect(applied.events.length).toBeGreaterThan(0);
    expect(applied.recommendedSkills.length).toBe(3);
  });

  it('selects scenario transitions from decision signals', () => {
    const decision = decideNextState({ sessionId: 's', learnerId: 'u', scenario: { id: 'x', version: 1, title: 'x', level: 'B1', dialects: ['en-US'], context: '', learnerRole: '', partnerRole: '', persona: '', goals: [], constraints: [], successCriteria: [], states: ['a','b'], transitions: [{ from: 'a', to: 'b', signals: [{ type: 'intent', value: 'complete' }] }], skills: [], tags: [] }, state: 'a', turn: 1, transcript: [], goalProgress: 0, evaluations: [], metadata: {} }, { intent: 'complete' });
    expect(decision.nextState).toBe('b');
  });
});
