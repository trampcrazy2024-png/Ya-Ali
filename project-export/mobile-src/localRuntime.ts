import { Capacitor } from '@capacitor/core';
import { detectLocalModelFormat, type LocalModelExecution, type LocalModelFormat } from './modelFormats';

export interface RuntimeCapability {
  execution: LocalModelExecution;
  format: LocalModelFormat;
  available: boolean;
  labelFa: string;
  reasonFa: string;
}

/**
 * Single source of truth for the mobile runtime matrix.
 * Availability is conservative: a format is not reported as runnable merely
 * because the filename is recognized.
 */
export function getRuntimeCapabilities(_modelNameOrPath = ''): RuntimeCapability[] {
  const native = Capacitor.isNativePlatform();
  const capabilities: RuntimeCapability[] = [
    {
      execution: 'llama.cpp', format: 'gguf', available: native,
      labelFa: 'GGUF / llama.cpp',
      reasonFa: native ? 'اجرای مستقیم Android فعال است.' : 'فقط در Android native فعال می‌شود.',
    },
    {
      execution: 'onnxruntime-genai', format: 'onnx', available: false,
      labelFa: 'ONNX / ONNX Runtime GenAI',
      reasonFa: 'نیازمند بسته native ONNX Runtime GenAI است؛ فایل خام به llama.cpp فرستاده نمی‌شود.',
    },
    {
      execution: 'executorch', format: 'pte', available: false,
      labelFa: 'ExecuTorch PTE',
      reasonFa: 'نیازمند AAR/Backend مخصوص ExecuTorch و مدل export‌شده PTE است.',
    },
    {
      execution: 'endpoint', format: 'safetensors', available: true,
      labelFa: 'Safetensors / Endpoint',
      reasonFa: 'وزن خام برای اجرای مستقیم موبایل کافی نیست؛ تبدیل یا Endpoint محلی لازم است.',
    },
    {
      execution: 'endpoint', format: 'pytorch', available: true,
      labelFa: 'PyTorch / Endpoint',
      reasonFa: 'Checkpoint خام است؛ برای چت باید به runtime قابل اجرا تبدیل شود یا روی Endpoint اجرا شود.',
    },
  ];
  return capabilities;
}

export function explainModel(nameOrPath: string): string {
  const f = detectLocalModelFormat(nameOrPath);
  if (f.format === 'unknown') return 'فرمت مدل ناشناخته است.';
  return `${f.labelFa}: ${f.directOnDevice ? 'قابل طراحی برای اجرای مستقیم روی دستگاه' : 'نیازمند Endpoint یا تبدیل/export'}.`;
}
