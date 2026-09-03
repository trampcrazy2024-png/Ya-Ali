export type AppMode = 'offline' | 'hybrid' | 'online';

export type SupportedDialect = 'en-US' | 'ar-IQ' | 'ar-LB';

export interface AppConfig {
  mode: AppMode;
  dialect: SupportedDialect;
  debug: boolean;
}

export const APP_VERSION = '0.1.0';
export const APP_NAME = 'Ya Ali';
export const APP_NAME_FA = 'یا امیرالمؤمنین علی علیه السلام';
