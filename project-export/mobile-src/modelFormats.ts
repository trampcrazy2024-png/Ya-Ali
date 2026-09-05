export type LocalModelFormat = 'gguf' | 'onnx' | 'pte' | 'litertlm' | 'safetensors' | 'pytorch' | 'tflite' | 'unknown';
export type LocalModelExecution = 'llama.cpp' | 'onnxruntime-genai' | 'executorch' | 'litert-lm' | 'endpoint' | 'unsupported';

export interface ModelFormatInfo {
  format: LocalModelFormat;
  execution: LocalModelExecution;
  labelFa: string;
  directOnDevice: boolean;
  extensions: string[];
}

const FORMATS: ModelFormatInfo[] = [
  { format: 'gguf', execution: 'llama.cpp', labelFa: 'GGUF / llama.cpp', directOnDevice: true, extensions: ['.gguf'] },
  { format: 'onnx', execution: 'onnxruntime-genai', labelFa: 'ONNX / ONNX Runtime GenAI', directOnDevice: true, extensions: ['.onnx'] },
  { format: 'pte', execution: 'executorch', labelFa: 'ExecuTorch PTE', directOnDevice: true, extensions: ['.pte'] },
  { format: 'litertlm', execution: 'litert-lm', labelFa: 'LiteRT-LM', directOnDevice: true, extensions: ['.litertlm'] },
  { format: 'safetensors', execution: 'endpoint', labelFa: 'Safetensors / Hugging Face', directOnDevice: false, extensions: ['.safetensors'] },
  { format: 'pytorch', execution: 'endpoint', labelFa: 'PyTorch checkpoint', directOnDevice: false, extensions: ['.bin', '.pt', '.pth'] },
  { format: 'tflite', execution: 'endpoint', labelFa: 'LiteRT / TFLite', directOnDevice: false, extensions: ['.tflite'] },
];

export function detectLocalModelFormat(nameOrPath: string): ModelFormatInfo {
  const value = String(nameOrPath || '').toLowerCase().split('?')[0] ?? '';
  const match = FORMATS.find((x) => x.extensions.some((ext) => value.endsWith(ext)));
  return match || { format: 'unknown', execution: 'unsupported', labelFa: 'فرمت ناشناخته', directOnDevice: false, extensions: [] };
}
export function supportedModelFormats(): ModelFormatInfo[] { return [...FORMATS]; }
export function formatFromEndpointModel(name: string): ModelFormatInfo {
  return { format: 'unknown', execution: 'endpoint', labelFa: `Endpoint · ${name || 'model'}`, directOnDevice: false, extensions: [] };
}
