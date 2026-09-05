import { describe, expect, it } from 'vitest';
import { ENDPOINT_CATALOG, endpointRoot } from './endpointMatrix';

describe('endpoint matrix',()=>{
  it('normalizes known API suffixes',()=>{
    expect(endpointRoot('http://192.168.1.10:1234/v1/chat/completions')).toBe('http://192.168.1.10:1234');
    expect(endpointRoot('http://192.168.1.10:11434/api/tags')).toBe('http://192.168.1.10:11434');
  });
  it('catalogs modern and legacy generation surfaces',()=>{
    const routes=ENDPOINT_CATALOG.flatMap(x=>x.routes);expect(routes).toContain('/v1/responses');expect(routes).toContain('/api/generate');expect(routes).toContain('/completion');
  });
});
