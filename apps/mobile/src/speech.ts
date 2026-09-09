import { Capacitor, registerPlugin } from '@capacitor/core';
import { startOfflineStt, stopOfflineStt } from './services/audioPipeline';
import { listSherpaSttModels } from './services/sherpaModelManager';
import { RECOMMENDED_STT_MODELS, isRecommendedSttModelInstalled } from './services/offlineSttSetup';
const NativeSTT = registerPlugin<any>('NativeSTT');

export async function speechAvailability(){
  if(!Capacitor.isNativePlatform()) return {available:!!((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition),onDeviceAvailable:false};
  try{return await NativeSTT.isAvailable()}catch{return {available:false,onDeviceAvailable:false}}
}

// Lightweight device-readiness check (RC1 roadmap item 2: "Onboarding هوشمند
// دستگاه"). Not a wizard/new screen — just a single answer the Settings UI
// and the mic-button error path can both use to tell the user the ONE most
// useful next step for their specific device, instead of a generic error.
export interface VoiceReadiness { systemRecognizerAvailable: boolean; offlineEnglishInstalled: boolean; online: boolean; recommendation: string }
export async function getVoiceReadiness(): Promise<VoiceReadiness> {
  const avail = await speechAvailability();
  const offlineEnglishInstalled = isRecommendedSttModelInstalled(RECOMMENDED_STT_MODELS[0].id);
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let recommendation: string;
  if (avail.available) recommendation = 'سرویس گفتار سیستمی این گوشی در دسترس است؛ میکروفون باید کار کند.';
  else if (offlineEnglishInstalled) recommendation = 'این گوشی سرویس گفتار سیستمی ندارد، ولی مدل آفلاین انگلیسی نصب است — میکروفون برای تمرین انگلیسی کار می‌کند. برای دیکته فارسی فعلاً تایپ کنید.';
  else recommendation = 'این گوشی سرویس گفتار سیستمی ندارد (رایج روی گوشی‌های بدون Google). از تنظیمات ← «نصب یک‌کلیکی گفتار آفلاین» مدل انگلیسی را نصب کنید تا میکروفون در تمرین انگلیسی کار کند.';
  return { systemRecognizerAvailable: !!avail.available, offlineEnglishInstalled, online, recommendation };
}

export async function stopSpeech(){if(Capacitor.isNativePlatform()){try{await NativeSTT.stop()}catch{}; try{await stopOfflineStt()}catch{}}}

export async function listenSpeech(lang = 'fa-IR'): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const sherpa = listSherpaSttModels().find(x => lang.toLowerCase().startsWith(x.language.toLowerCase()) || x.dialect.toLowerCase() === lang.toLowerCase());
    if (sherpa) {
      try {
        await startOfflineStt({modelDir:sherpa.modelDir,encoder:sherpa.encoder,decoder:sherpa.decoder,joiner:sherpa.joiner,tokens:sherpa.tokens});
        return await stopOfflineStt();
      } catch (e:any) {
        // Keep the existing Android recognizer as a resilient fallback.
        const message=String(e?.message||e||'Sherpa-ONNX STT failed');
        if (!/model|Sherpa|AudioRecord|runtime/i.test(message)) throw e;
      }
    }
    try {
      const r = await NativeSTT.listen({ lang });
      return String(r?.text || '').trim();
    } catch (e:any) {
      const message=String(e?.message||e||'Speech recognition failed');
      if (/permission|مجوز/i.test(message)) throw new Error('مجوز میکروفن داده نشده است.');
      if (/network|اینترنت/i.test(message)) throw new Error('سرویس گفتار این گوشی به اینترنت نیاز دارد یا اتصال آن ناموفق است.');
      if (/cancel|لغو/i.test(message)) throw new Error('تشخیص گفتار لغو شد.');
      throw new Error(message);
    }
  }
  const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Recognition) throw new Error('Speech recognition is not available on this device');
  return new Promise((resolve, reject) => {
    const r = new Recognition();
    r.lang = lang; r.continuous = false; r.interimResults = false; r.maxAlternatives = 3;
    const timer=window.setTimeout(()=>{try{r.abort()}catch{};reject(new Error('تشخیص گفتار بیش از حد طول کشید.'))},30000);
    r.onresult = (e: any) => {clearTimeout(timer);resolve(String(e.results?.[0]?.[0]?.transcript || '').trim())};
    r.onerror = (e: any) => {clearTimeout(timer);reject(new Error(e?.error || 'speech recognition failed'))};
    r.onnomatch = () => {clearTimeout(timer);reject(new Error('No speech recognized'))};
    r.onend=()=>{};
    try{r.start()}catch(e:any){clearTimeout(timer);reject(e)}
  });
}
