import { Capacitor, registerPlugin } from '@capacitor/core';
const NativeSTT = registerPlugin<any>('NativeSTT');

export async function speechAvailability(){
  if(!Capacitor.isNativePlatform()) return {available:!!((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition),onDeviceAvailable:false};
  try{return await NativeSTT.isAvailable()}catch{return {available:false,onDeviceAvailable:false}}
}
export async function stopSpeech(){if(Capacitor.isNativePlatform()){try{await NativeSTT.stop()}catch{}}}

export async function listenSpeech(lang = 'fa-IR'): Promise<string> {
  if (Capacitor.isNativePlatform()) {
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
