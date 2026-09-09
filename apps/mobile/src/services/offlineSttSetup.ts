// One-tap offline STT model installer (RC1 roadmap item 1: "STT آفلاین باید یک
// قابلیت واقعی و One-tap باشد"). Downloads real, verified files for a small
// streaming Sherpa-ONNX transducer model straight from Hugging Face — no
// window.prompt(), no manual file paths, no tar.bz2 extraction needed (we
// fetch the individual model files directly instead of the archive).
//
// Model: csukuangfj/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17
// (Apache-2.0, part of the k2-fsa / Next-gen Kaldi "sherpa-onnx" project).
// It is the smallest published streaming English model — good fit for
// low-end Android hardware, ~42MB total using the int8 weights.
//
// IMPORTANT, honest limitation: as of this writing there is no published
// streaming (online transducer) Sherpa-ONNX model for Persian or for the
// Arabic dialects this app teaches — only for a fixed set of languages
// (English, Chinese, Korean, French, Russian, Japanese, Vietnamese, ...).
// So this installer currently only gives full offline coverage for the
// *target-language* practice (pronunciation coach / English role-play),
// not for Persian dictation in the chat composer, which still depends on
// the Android system recognizer (see speech.ts / NativeSTTPlugin.java).
// Swapping in a Persian/Arabic model later only requires adding an entry
// to RECOMMENDED_STT_MODELS below, once/if k2-fsa publishes one — or,
// longer-term, adding offline Whisper-based recognition to
// SherpaOnnxPlugin.java, which does support many more languages but is a
// native-code change, not just a new download.

import { Capacitor } from '@capacitor/core';
import { saveSherpaSttModel, listSherpaSttModels, type SherpaSttModelConfig } from './sherpaModelManager';

export interface RecommendedSttModelFile { name: string; url: string; approxBytes: number }
export interface RecommendedSttModel {
  id: string;
  labelFa: string;
  language: string; // matched against speech target language, e.g. 'en'
  dialect: string;
  sourceRepo: string;
  license: string;
  files: RecommendedSttModelFile[];
}

const HF_BASE = 'https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17/resolve/main';

export const RECOMMENDED_STT_MODELS: RecommendedSttModel[] = [
  {
    id: 'en-20m-int8',
    labelFa: 'انگلیسی آمریکایی — مدل کوچک آفلاین (حدود ۴۲ مگابایت)',
    language: 'en',
    dialect: 'american',
    sourceRepo: 'csukuangfj/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17',
    license: 'Apache-2.0 · k2-fsa / Next-gen Kaldi (sherpa-onnx)',
    files: [
      { name: 'encoder.onnx', url: `${HF_BASE}/encoder-epoch-99-avg-1.int8.onnx`, approxBytes: 41 * 1024 * 1024 },
      { name: 'decoder.onnx', url: `${HF_BASE}/decoder-epoch-99-avg-1.int8.onnx`, approxBytes: 527 * 1024 },
      { name: 'joiner.onnx', url: `${HF_BASE}/joiner-epoch-99-avg-1.int8.onnx`, approxBytes: 253 * 1024 },
      { name: 'tokens.txt', url: `${HF_BASE}/tokens.txt`, approxBytes: 56 * 1024 },
    ],
  },
];

const STT_MODEL_ROOT = 'yaali-stt-models';

function sherpaModelId(modelId: string) { return `stt_${modelId}`; }

export function isRecommendedSttModelInstalled(modelId: string): boolean {
  return listSherpaSttModels().some(m => m.id === sherpaModelId(modelId));
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

// @capacitor/filesystem is a peer dependency added alongside this feature
// (see apps/mobile/package.json) — it's what lets us write the downloaded
// model bytes to real files the native Sherpa-ONNX engine can open by path
// (unlike the existing voicePackManager, which stores audio in IndexedDB —
// fine for playback in the WebView, but invisible to native/Java code).
async function getFilesystem() {
  const mod = await import('@capacitor/filesystem');
  return { Filesystem: mod.Filesystem, Directory: mod.Directory };
}

export async function downloadRecommendedSttModel(
  modelId: string,
  onProgress?: (pct: number, fileLabel: string) => void,
): Promise<SherpaSttModelConfig> {
  if (!Capacitor.isNativePlatform()) throw new Error('نصب مدل آفلاین فقط داخل اپ اندروید ممکن است، نه در پیش‌نمایش مرورگر.');
  const model = RECOMMENDED_STT_MODELS.find(m => m.id === modelId);
  if (!model) throw new Error('مدل پیشنهادی پیدا نشد.');

  const { Filesystem, Directory } = await getFilesystem();
  const dir = `${STT_MODEL_ROOT}/${model.id}`;
  try { await Filesystem.mkdir({ path: dir, directory: Directory.Data, recursive: true }); } catch { /* already exists */ }

  const totalBytes = model.files.reduce((s, f) => s + f.approxBytes, 0);
  let loadedBytes = 0;
  const paths: Record<string, string> = {};

  for (const file of model.files) {
    onProgress?.(Math.min(99, Math.round((loadedBytes / totalBytes) * 100)), file.name);
    const res = await fetch(file.url);
    if (!res.ok) throw new Error(`دانلود ${file.name} ناموفق بود (HTTP ${res.status}).`);
    const buffer = await res.arrayBuffer();
    loadedBytes += buffer.byteLength;
    const path = `${dir}/${file.name}`;
    await Filesystem.writeFile({ path, directory: Directory.Data, data: toBase64(buffer) });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Data });
    paths[file.name] = uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
    onProgress?.(Math.min(99, Math.round((loadedBytes / totalBytes) * 100)), file.name);
  }

  const config: SherpaSttModelConfig = {
    id: sherpaModelId(model.id),
    language: model.language,
    dialect: model.dialect,
    modelDir: paths['encoder.onnx'].slice(0, paths['encoder.onnx'].lastIndexOf('/')),
    encoder: paths['encoder.onnx'],
    decoder: paths['decoder.onnx'],
    joiner: paths['joiner.onnx'],
    tokens: paths['tokens.txt'],
    sampleRate: 16000,
    sourceUrl: `https://huggingface.co/${model.sourceRepo}`,
    license: model.license,
  };
  saveSherpaSttModel(config);
  onProgress?.(100, 'done');
  return config;
}

export async function removeRecommendedSttModel(modelId: string) {
  const { Filesystem, Directory } = await getFilesystem();
  const dir = `${STT_MODEL_ROOT}/${modelId}`;
  try { await Filesystem.rmdir({ path: dir, directory: Directory.Data, recursive: true }); } catch { /* ignore */ }
  const { removeSherpaSttModel } = await import('./sherpaModelManager');
  removeSherpaSttModel(sherpaModelId(modelId));
}
