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

import { importBank } from '../src/languageBank';

describe('JSON language-bank import', () => {
  it('accepts an exported object and applies the selected fallback dialect', async () => {
    const original = globalThis.localStorage;
    const store = new Map<string,string>();
    Object.defineProperty(globalThis, 'localStorage', {configurable:true, value:{
      getItem:(k:string)=>store.get(k) ?? null,
      setItem:(k:string,v:string)=>store.set(k,v),
      removeItem:(k:string)=>store.delete(k)
    }});
    const count = await importBank({items:[{text:'hello',translation:'سلام',language:'english'}]}, 'آمریکایی');
    expect(count).toBe(1);
    expect(JSON.parse(store.get('yaali_language_bank_v4') || '[]')[0].dialect).toBe('آمریکایی');
    Object.defineProperty(globalThis, 'localStorage', {configurable:true, value:original});
  });
});
