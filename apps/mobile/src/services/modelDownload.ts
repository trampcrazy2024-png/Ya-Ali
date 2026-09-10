// Completes the "download a model from a link" architecture: pickLocalModel
// (in modelManager.ts) only handles files already sitting on the device.
// This wraps the new native DownloadManager-based flow in LocalAIPlugin.java
// so the user can paste a direct HTTPS link (e.g. to a LiteRT-LM .litertlm
// build of Qwen3.5-4B, Gemma, etc.) and have it download straight to the
// device and become usable exactly like a manually picked model.
import { Capacitor, registerPlugin } from '@capacitor/core';

const NativeLocalAI = registerPlugin<any>('LocalAI');

export interface ModelDownloadProgress {
  status: 'pending' | 'running' | 'paused' | 'successful' | 'failed' | 'not_found' | 'unknown';
  bytesDownloaded: number;
  bytesTotal: number;
}

export function guessModelFilename(url: string): string {
  try {
    const clean = url.split('?')[0].split('#')[0];
    const last = clean.split('/').filter(Boolean).pop();
    return last && /\.[a-z0-9]+$/i.test(last) ? last : `model_${Date.now()}.bin`;
  } catch { return `model_${Date.now()}.bin`; }
}

async function startModelDownload(url: string, filename: string): Promise<{ downloadId: string; filename: string }> {
  const r = await NativeLocalAI.downloadModel({ url, filename });
  if (!r?.downloadId) throw new Error('شروع دانلود ناموفق بود.');
  return { downloadId: String(r.downloadId), filename: String(r.filename || filename) };
}

async function checkModelDownload(downloadId: string): Promise<ModelDownloadProgress> {
  const r = await NativeLocalAI.downloadStatus({ downloadId });
  return {
    status: (r?.status as ModelDownloadProgress['status']) || 'unknown',
    bytesDownloaded: Number(r?.bytesDownloaded || 0),
    bytesTotal: Number(r?.bytesTotal || 0),
  };
}

/**
 * Starts a native download and polls until it finishes, then moves the file
 * into the app's models directory. Large (multi-GB) LiteRT-LM files can
 * take a long time on a slow connection — this can run for many minutes;
 * the download itself continues natively even if the polling loop's caller
 * navigates away, since DownloadManager owns it independently of the JS
 * side.
 */
export async function downloadModelWithProgress(
  url: string,
  filename?: string,
  onProgress?: (pct: number, bytesDownloaded: number, bytesTotal: number) => void,
): Promise<{ path: string; name: string; sizeBytes: number; format?: string }> {
  if (!Capacitor.isNativePlatform()) throw new Error('دانلود مدل فقط در اپ اندروید ممکن است.');
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) throw new Error('آدرس باید با http:// یا https:// شروع شود.');
  const name = (filename || '').trim() || guessModelFilename(trimmed);
  const { downloadId } = await startModelDownload(trimmed, name);
  let lastStatus: ModelDownloadProgress['status'] = 'pending';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise((res) => setTimeout(res, 1500));
    const progress = await checkModelDownload(downloadId);
    lastStatus = progress.status;
    if (progress.bytesTotal > 0) onProgress?.(Math.min(99, Math.round((progress.bytesDownloaded / progress.bytesTotal) * 100)), progress.bytesDownloaded, progress.bytesTotal);
    if (progress.status === 'successful' || progress.status === 'failed' || progress.status === 'not_found') break;
  }
  if (lastStatus !== 'successful') throw new Error(lastStatus === 'failed' ? 'دانلود مدل ناموفق بود.' : 'دانلود پیدا نشد (شاید لغو شده باشد).');
  onProgress?.(100, 0, 0);
  const result = await NativeLocalAI.finalizeDownload({ filename: name });
  if (!result?.path) throw new Error('انتقال فایل دانلودشده ناموفق بود.');
  return { path: String(result.path), name: String(result.name || name), sizeBytes: Number(result.sizeBytes || 0), format: result.format };
}
