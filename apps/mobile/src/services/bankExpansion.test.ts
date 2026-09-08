import { describe, expect, it } from 'vitest';
import { EVERYDAY_SENTENCES } from '../everydaySentenceBank';
import { SCENARIOS } from './scenarioLibrary';

describe('Ya-Ali content bank expansion', () => {
  it('contains a substantial curated everyday sentence layer', () => {
    expect(EVERYDAY_SENTENCES.length).toBeGreaterThanOrEqual(120);
    expect(new Set(EVERYDAY_SENTENCES.map((x) => x.id)).size).toBe(EVERYDAY_SENTENCES.length);
    expect(EVERYDAY_SENTENCES.filter((x) => x.lang === 'english').length).toBeGreaterThan(40);
    expect(EVERYDAY_SENTENCES.filter((x) => x.lang === 'arabic').length).toBeGreaterThan(40);
  });

  it('keeps scenario coverage broad and deduplicated', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(55);
    expect(new Set(SCENARIOS.map((x) => x.id)).size).toBe(SCENARIOS.length);
    expect(new Set(SCENARIOS.map((x) => x.category)).size).toBeGreaterThanOrEqual(8);
    expect(SCENARIOS.every((x) => x.turnPlan.length >= 4 && x.roles.length === 2)).toBe(true);
  });
});
