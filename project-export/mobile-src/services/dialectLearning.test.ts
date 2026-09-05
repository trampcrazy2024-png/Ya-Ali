import { describe, expect, it } from 'vitest';
import { dialectItemMatches, getDialectLearningState, normalizeDialectId, recordDialectOutcome } from './dialectLearning';

describe('dialectLearning',()=>{
  it('normalizes supported dialect labels',()=>{
    expect(normalizeDialectId('لهجه عراقی')).toBe('iraqi');
    expect(normalizeDialectId('لهجه لبنانی (شامی)')).toBe('lebanese');
    expect(normalizeDialectId('لهجه مصری')).toBe('egyptian');
    expect(normalizeDialectId('American English')).toBe('american');
  });
  it('tracks dialect-specific mastery and skill',()=>{
    const before=getDialectLearningState('iraqi');
    const after=recordDialectOutcome('iraqi','good','listening',undefined,Date.UTC(2026,0,1));
    expect(after.mastery).toBeGreaterThanOrEqual(before.mastery);
    expect(after.skills.listening).toBeGreaterThanOrEqual(3);
    expect(after.exposure).toBeGreaterThan(before.exposure);
  });
  it('matches bank items without mixing dialects',()=>{
    expect(dialectItemMatches({dialect:'لهجه عراقی'} as any,'iraqi')).toBe(true);
    expect(dialectItemMatches({dialect:'لهجه مصری'} as any,'iraqi')).toBe(false);
  });
});
