import { Capacitor, registerPlugin } from '@capacitor/core';
import { scorePhonemes, type PhonemeScore } from '@yaali/core';
import { recordTelemetry } from './privacyTelemetry';

export interface SherpaCapabilities { available:boolean; stt:boolean; tts:boolean; offline:boolean; sampleRate:number; version:string }
export interface SttOptions { modelDir:string; encoder?:string; decoder?:string; joiner?:string; tokens?:string }
export interface TtsOptions { model:string; tokens:string; dataDir?:string; lexicon?:string; sid?:number; speed?:number }
export interface AudioPipelineResult { text:string; pronunciation?:PhonemeScore; }

interface SherpaPlugin {
  capabilities():Promise<SherpaCapabilities>;
  startStt(options:SttOptions):Promise<{recording:boolean;sampleRate:number}>;
  stopStt():Promise<{recording:boolean;text:string}>;
  speak(options:TtsOptions & {text:string}):Promise<{ok:boolean;sampleRate:number;samples:number}>;
  addListener(eventName:string, listener:(event:any)=>void):Promise<{remove:()=>Promise<void>} | void>;
}

const NativeSherpa = registerPlugin<SherpaPlugin>('SherpaOnnx');

export async function audioCapabilities():Promise<SherpaCapabilities>{
  if (!Capacitor.isNativePlatform()) return {available:false,stt:false,tts:false,offline:true,sampleRate:16000,version:'web'};
  return NativeSherpa.capabilities();
}

export async function startOfflineStt(options:SttOptions){
  if (!Capacitor.isNativePlatform()) throw new Error('Sherpa-ONNX STT requires Android.');
  const started=performance.now();
  try { const result=await NativeSherpa.startStt(options); recordTelemetry('stt', performance.now()-started, true); return result; }
  catch(e){ recordTelemetry('stt', performance.now()-started, false); throw e; }
}

export async function stopOfflineStt():Promise<string>{
  if (!Capacitor.isNativePlatform()) return '';
  const started=performance.now();
  try { const result=await NativeSherpa.stopStt(); recordTelemetry('stt', performance.now()-started, true); return result.text || ''; }
  catch(e){ recordTelemetry('stt', performance.now()-started, false); throw e; }
}

export async function speakOffline(text:string, options:TtsOptions){
  if (!Capacitor.isNativePlatform()) throw new Error('Sherpa-ONNX TTS requires Android.');
  const started=performance.now();
  try { const result=await NativeSherpa.speak({text,...options}); recordTelemetry('tts', performance.now()-started, true); return result; }
  catch(e){ recordTelemetry('tts', performance.now()-started, false); throw e; }
}

/**
 * Complete offline voice turn: speech -> text, optional phoneme scoring,
 * then response text -> speech. The LLM itself remains behind the caller's
 * existing local-model provider so this pipeline never requires a cloud API.
 */
export async function runOfflineVoiceTurn(
  stt:SttOptions,
  tts:TtsOptions,
  respond:(recognizedText:string)=>Promise<string>,
  expectedPhonemes?:string[],
  actualPhonemes?:string[],
):Promise<AudioPipelineResult>{
  await startOfflineStt(stt);
  const text = await stopOfflineStt();
  if (!text.trim()) throw new Error('No speech recognized.');
  const response = await respond(text);
  await speakOffline(response,tts);
  const pronunciation = expectedPhonemes && actualPhonemes
    ? scorePhonemes(expectedPhonemes,actualPhonemes)
    : undefined;
  return {text,pronunciation};
}
