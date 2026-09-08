import { describe, expect, it } from 'vitest';
import { DIALECT_PROFILES, buildDialectPrompt, getDialectProfile } from './dialectEngine';
describe('dialectEngine',()=>{it('contains requested target varieties',()=>expect(DIALECT_PROFILES.map(x=>x.id)).toEqual(expect.arrayContaining(['iraqi','lebanese','gulf','saudi','egyptian','msa','american'])));it('builds a dialect-aware prompt',()=>expect(buildDialectPrompt('iraqi')).toContain('عربی عراقی'));it('falls back safely',()=>expect(getDialectProfile('unknown').id).toBe('iraqi'))});
