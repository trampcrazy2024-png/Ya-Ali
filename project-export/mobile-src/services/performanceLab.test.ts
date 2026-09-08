import { describe, expect, it } from 'vitest';
import { benchmarkLocalModel } from './performanceLab';

describe('performance lab', () => {
  it('fails safely outside Android native runtime', async () => {
    const result = await benchmarkLocalModel('hello');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Android');
  });
});
