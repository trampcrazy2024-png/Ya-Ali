export type TelemetryMetric = 'stt' | 'tts' | 'inference' | 'error' | 'crash';
export interface TelemetryBucket { count: number; totalMs: number; failures: number; lastAt: string }
export interface PrivacyTelemetryReport { enabled: boolean; schema: 1; metrics: Record<TelemetryMetric, TelemetryBucket>; exportedAt: string }
const KEY = 'yaali_privacy_telemetry_v1';
const ENABLED = 'yaali_privacy_telemetry_enabled';
const EMPTY = (): TelemetryBucket => ({ count: 0, totalMs: 0, failures: 0, lastAt: '' });
function read(): Record<TelemetryMetric, TelemetryBucket> {
  const base = { stt: EMPTY(), tts: EMPTY(), inference: EMPTY(), error: EMPTY(), crash: EMPTY() } as Record<TelemetryMetric, TelemetryBucket>;
  try { const x = JSON.parse(localStorage.getItem(KEY) || '{}'); for (const k of Object.keys(base) as TelemetryMetric[]) base[k] = { ...base[k], ...(x[k] || {}) }; } catch {}
  return base;
}
function enabled() { try { return localStorage.getItem(ENABLED) !== '0'; } catch { return true; } }
export function isPrivacyTelemetryEnabled() { return enabled(); }
export function setPrivacyTelemetryEnabled(value: boolean) { try { localStorage.setItem(ENABLED, value ? '1' : '0'); if (!value) localStorage.removeItem(KEY); } catch {} }
export function recordTelemetry(metric: TelemetryMetric, elapsedMs = 0, ok = true) {
  if (!enabled()) return;
  const all = read(); const b = all[metric]; b.count += 1; b.totalMs += Math.max(0, Math.round(elapsedMs)); if (!ok) b.failures += 1; b.lastAt = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
}
export function getPrivacyTelemetryReport(): PrivacyTelemetryReport { return { enabled: enabled(), schema: 1, metrics: read(), exportedAt: new Date().toISOString() }; }
export function clearPrivacyTelemetry() { try { localStorage.removeItem(KEY); } catch {} }
export function installPrivacyTelemetryGlobalHandlers() {
  if (typeof window === 'undefined') return () => {};
  const onError = () => recordTelemetry('crash', 0, false);
  const onReject = () => recordTelemetry('crash', 0, false);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onReject);
  return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onReject); };
}
