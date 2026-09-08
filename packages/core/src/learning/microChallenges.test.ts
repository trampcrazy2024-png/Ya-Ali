import { describe, expect, it } from 'vitest';
import { generateMicroChallenges } from './microChallenges';

describe('micro challenges', () => {
  it('targets the weakest skills and stays at two minutes', () => {
    const vector = { learnerId: 'x', updatedAt: new Date().toISOString(), scores: { pronunciation: .2, grammar: .3, vocabulary: .8 }, confidence: {} };
    const result = generateMicroChallenges(vector, { vocabulary: ['hello', 'please'], count: 2 });
    expect(result).toHaveLength(2);
    expect(result[0]?.skill).toBe('pronunciation');
    expect(result.every(x => x.targetSeconds === 120)).toBe(true);
  });
});
