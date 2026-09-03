import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yaali.assistant',
  appName: 'Ya Ali',
  webDir: 'apps/mobile/dist',
  server: { androidScheme: 'https' },
  plugins: { CapacitorHttp: { enabled: true } },
  android: { backgroundColor: '#070b13', allowMixedContent: true }
};
export default config;
