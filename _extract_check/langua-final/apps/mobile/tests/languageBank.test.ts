import { describe, expect, it } from 'vitest';
import { PHRASES } from '../src/data';

describe('Persian-first language bank', () => {
  it('contains a substantial built-in phrase bank', () => {
    expect(PHRASES.length).toBeGreaterThan(100);
  });
  it('contains Persian translations', () => {
    expect(PHRASES.filter((p:any) => p.farsi && p.farsi.trim()).length).toBeGreaterThan(100);
  });
});
