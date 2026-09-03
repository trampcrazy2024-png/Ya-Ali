import { Capacitor, registerPlugin } from '@capacitor/core';
const NativeSTT = registerPlugin<any>('NativeSTT');

export async function listenSpeech(lang = 'fa-IR'): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const r = await NativeSTT.listen({ lang });
    return String(r?.text || '').trim();
  }
  const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Recognition) throw new Error('Speech recognition is not available on this device');
  return new Promise((resolve, reject) => {
    const r = new Recognition();
    r.lang = lang; r.continuous = false; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e: any) => resolve(String(e.results?.[0]?.[0]?.transcript || '').trim());
    r.onerror = (e: any) => reject(new Error(e?.error || 'speech recognition failed'));
    r.onnomatch = () => reject(new Error('No speech recognized'));
    r.start();
  });
}
