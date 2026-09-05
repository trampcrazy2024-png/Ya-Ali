import { describe, expect, it } from 'vitest';
import { runtimeMatrix } from '../src/services/runtimeMatrix';

describe('runtime matrix', () => {
  it('never reports non-remote runtimes as available on a normal web test environment', async () => {
    const rows = await runtimeMatrix();
    expect(rows.map(x => x.id)).toEqual(['llama.cpp', 'onnxruntime-genai', 'executorch', 'litert-lm', 'remote-endpoint']);
    expect(rows.find(x => x.id === 'remote-endpoint')?.available).toBe(true);
  });
});
