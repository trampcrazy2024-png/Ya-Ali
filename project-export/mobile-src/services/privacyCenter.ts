import { Capacitor } from '@capacitor/core';
import { clearLogs, getLogs } from '../diagnostics';
import { exportBank } from '../languageBank';
import { exportConversations } from '../conversationStore';

const SENSITIVE_KEYS = [
  'yaali_openrouter_key','yaali_gemini_key','yaali_groq_key','yaali_huggingface_key',
  'yaali_cloudflare_token','yaali_cloudflare_account','yaali_custom_endpoint_key'
];

export type PrivacyReport = {
  native: boolean;
  localStorageKeys: number;
  secretsConfigured: number;
  conversationsExportable: boolean;
  languageBankExportable: boolean;
  logsCount: number;
};

export function privacyReport(): PrivacyReport {
  let keys = 0;
  let secrets = 0;
  try {
    keys = localStorage.length;
    for (const k of SENSITIVE_KEYS) if (localStorage.getItem(k)) secrets++;
  } catch {}
  return {
    native: Capacitor.isNativePlatform(),
    localStorageKeys: keys,
    secretsConfigured: secrets,
    conversationsExportable: !!exportConversations(),
    languageBankExportable: !!exportBank(),
    logsCount: getLogs().length,
  };
}

export function redactSecrets(value: string): string {
  let out = value;
  for (const key of SENSITIVE_KEYS) {
    try {
      const secret = localStorage.getItem(key);
      if (secret) out = out.split(secret).join('[REDACTED]');
    } catch {}
  }
  return out.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
}

export function clearDiagnosticData(): void {
  clearLogs();
}

export function clearNonSecretAppCache(): number {
  const prefixes = ['yaali_diagnostic_', 'yaali_voicepack_', 'yaali_cache_'];
  let removed = 0;
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (prefixes.some(prefix => key.startsWith(prefix))) {
        localStorage.removeItem(key);
        removed++;
      }
    }
  } catch {}
  return removed;
}
