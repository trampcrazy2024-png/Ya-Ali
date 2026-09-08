export type PronunciationAsset = {
  id: string;
  itemId: string;
  name: string;
  locale: string;
  sourceType: 'file' | 'url' | 'remote';
  sourceUrl?: string;
  sourceName?: string;
  license?: string;
  mimeType: string;
  sizeBytes: number;
  sha256?: string;
  createdAt: string;
};

const DB_NAME = 'yaali_pronunciations';
const DB_VERSION = 1;
const META_STORE = 'metadata';
const BLOB_STORE = 'blobs';
const MAX_AUDIO_BYTES = 64 * 1024 * 1024;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'));
  });
}

async function digest(blob: Blob): Promise<string | undefined> {
  try {
    const bytes = await blob.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return undefined;
  }
}

async function putAsset(asset: PronunciationAsset, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
    tx.objectStore(META_STORE).put(asset);
    tx.objectStore(BLOB_STORE).put(blob, asset.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not store pronunciation'));
    tx.onabort = () => reject(tx.error ?? new Error('Could not store pronunciation'));
  });
  db.close();
}

export async function listPronunciations(itemId?: string): Promise<PronunciationAsset[]> {
  const db = await openDb();
  const values = await new Promise<PronunciationAsset[]>((resolve, reject) => {
    const request = db.transaction(META_STORE, 'readonly').objectStore(META_STORE).getAll();
    request.onsuccess = () => resolve((request.result as PronunciationAsset[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error('Could not read pronunciations'));
  });
  db.close();
  return values.filter((x) => !itemId || x.itemId === itemId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPronunciationBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  const value = await new Promise<Blob | null>((resolve) => {
    const request = db.transaction(BLOB_STORE, 'readonly').objectStore(BLOB_STORE).get(id);
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => resolve(null);
  });
  db.close();
  return value;
}

export async function addPronunciationFile(input: {
  itemId: string;
  file: File;
  locale: string;
  sourceName?: string;
  license?: string;
}): Promise<PronunciationAsset> {
  if (!input.itemId) throw new Error('ابتدا یک مورد از بانک زبان انتخاب کنید.');
  if (!input.file.type.startsWith('audio/')) throw new Error('فایل باید صوتی باشد.');
  if (input.file.size <= 0 || input.file.size > MAX_AUDIO_BYTES) throw new Error('حجم صوت باید بین 1 بایت و 64MB باشد.');
  const id = `pron-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const sha256 = await digest(input.file);
  const asset: PronunciationAsset = {
    id,
    itemId: input.itemId,
    name: input.file.name,
    locale: input.locale || 'und',
    sourceType: 'file',
    ...(input.sourceName ? { sourceName: input.sourceName } : {}),
    ...(input.license ? { license: input.license } : {}),
    mimeType: input.file.type,
    sizeBytes: input.file.size,
    ...(sha256 ? { sha256 } : {}),
    createdAt: new Date().toISOString(),
  };
  await putAsset(asset, input.file);
  return asset;
}

export async function addPronunciationFromUrl(input: {
  itemId: string;
  url: string;
  locale: string;
  sourceName?: string;
  license?: string;
}): Promise<PronunciationAsset> {
  if (!input.itemId) throw new Error('ابتدا یک مورد از بانک زبان انتخاب کنید.');
  if (!/^https:\/\//i.test(input.url.trim())) throw new Error('برای منبع صوتی خارجی فقط HTTPS پذیرفته می‌شود.');
  const response = await fetch(input.url, { mode: 'cors' });
  if (!response.ok) throw new Error(`دانلود صوت ناموفق بود: HTTP ${response.status}`);
  const blob = await response.blob();
  if (!blob.type.startsWith('audio/')) throw new Error('URL به یک فایل صوتی قابل شناسایی اشاره نمی‌کند.');
  if (blob.size <= 0 || blob.size > MAX_AUDIO_BYTES) throw new Error('حجم صوت باید حداکثر 64MB باشد.');
  const id = `pron-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const sha256 = await digest(blob);
  const name = input.url.split('/').pop()?.split('?')[0] || 'remote-pronunciation';
  const asset: PronunciationAsset = {
    id,
    itemId: input.itemId,
    name,
    locale: input.locale || 'und',
    sourceType: 'url',
    sourceUrl: input.url.trim(),
    ...(input.sourceName ? { sourceName: input.sourceName } : {}),
    ...(input.license ? { license: input.license } : {}),
    mimeType: blob.type,
    sizeBytes: blob.size,
    ...(sha256 ? { sha256 } : {}),
    createdAt: new Date().toISOString(),
  };
  await putAsset(asset, blob);
  return asset;
}


export async function addRemotePronunciation(input: {
  itemId: string;
  url: string;
  locale: string;
  sourceName?: string;
  license?: string;
  name?: string;
}): Promise<PronunciationAsset> {
  if (!input.itemId) throw new Error('ابتدا یک مورد از بانک زبان انتخاب کنید.');
  const url = input.url.trim();
  if (!/^https:\/\//i.test(url)) throw new Error('برای منبع صوتی خارجی فقط HTTPS پذیرفته می‌شود.');
  const id = `pron-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const asset: PronunciationAsset = {
    id,
    itemId: input.itemId,
    name: input.name?.trim() || url.split('/').pop()?.split('?')[0] || 'remote-pronunciation',
    locale: input.locale || 'und',
    sourceType: 'remote',
    sourceUrl: url,
    ...(input.sourceName ? { sourceName: input.sourceName } : {}),
    ...(input.license ? { license: input.license } : {}),
    mimeType: 'audio/*',
    sizeBytes: 0,
    createdAt: new Date().toISOString(),
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put(asset);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not store remote pronunciation'));
  });
  db.close();
  return asset;
}

export async function getRemotePronunciationUrl(asset: PronunciationAsset): Promise<string | null> {
  return asset.sourceType === 'remote' && asset.sourceUrl ? asset.sourceUrl : null;
}

export function exportPronunciationManifest(): string {
  return JSON.stringify({ schema: 'yaali.pronunciation.v2', generatedAt: new Date().toISOString() }, null, 2);
}

export async function deletePronunciation(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
    tx.objectStore(META_STORE).delete(id);
    tx.objectStore(BLOB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not delete pronunciation'));
  });
  db.close();
}

export function pronunciationObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export const pronunciationLimits = { maxAudioBytes: MAX_AUDIO_BYTES } as const;
