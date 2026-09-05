import { describe, expect, it } from 'vitest';
import { detectLocalModelFormat } from './modelFormats';
describe('model formats',()=>{it('recognizes current non-GGUF formats',()=>{expect(detectLocalModelFormat('model.gguf').execution).toBe('llama.cpp');expect(detectLocalModelFormat('model.onnx').execution).toBe('onnxruntime-genai');expect(detectLocalModelFormat('model.pte').execution).toBe('executorch');expect(detectLocalModelFormat('model.litertlm').execution).toBe('litert-lm')})});
