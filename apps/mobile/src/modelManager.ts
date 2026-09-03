import { Capacitor, registerPlugin } from '@capacitor/core';

export type LocalModel = { path:string; name:string; sizeBytes:number; loaded?:boolean };
export type LocalModelStatus = { loaded:boolean; imported?:boolean; engineReady?:boolean; generating?:boolean; path?:string; name?:string; sizeBytes?:number; error?:string };
const NativeLocalAI = registerPlugin<any>('LocalAI');
const KEY='yaali_local_model';
const GGUF_EXT=/\.gguf$/i;

export function getLocalModelPath(){ try{return localStorage.getItem(KEY)||''}catch{return ''} }
export function setLocalModelPath(path:string){ try{path?localStorage.setItem(KEY,path):localStorage.removeItem(KEY)}catch{} }

export async function pickLocalModel():Promise<LocalModelStatus>{
  if(!Capacitor.isNativePlatform()) return {loaded:false,error:'انتخاب مدل محلی GGUF روی Android انجام می‌شود.'};
  try{
    const r=await NativeLocalAI.pickModel();
    if(r?.path){
      if(!GGUF_EXT.test(String(r.path))) return {loaded:false,error:'فقط مدل GGUF پشتیبانی می‌شود.'};
      setLocalModelPath(r.path);return {loaded:false,imported:true,engineReady:false,path:r.path,name:r.name,sizeBytes:r.sizeBytes};
    }
    return {loaded:false,error:'مدل انتخاب نشد.'};
  }catch(e:any){return {loaded:false,error:e?.message||String(e)}}
}
export async function listLocalModels():Promise<LocalModel[]>{ if(!Capacitor.isNativePlatform()) return []; try{ const r=await NativeLocalAI.listModels(); return Array.isArray(r?.models)?r.models:[]; }catch{return []} }
export async function deleteLocalModel(path:string){ if(!Capacitor.isNativePlatform()) return false; try{ const r=await NativeLocalAI.deleteModel({path}); if(getLocalModelPath()===path) setLocalModelPath(''); return !!r?.deleted; }catch{return false} }
export async function loadLocalModel(path=getLocalModelPath()):Promise<LocalModelStatus>{
  if(!Capacitor.isNativePlatform()) return {loaded:false,error:'Local AI native فقط روی Android اجرا می‌شود.'};
  if(!path){ const picked=await pickLocalModel(); if(!picked.path) return picked; path=picked.path; }
  if(!GGUF_EXT.test(path)) return {loaded:false,path,error:'برای اجرای مستقیم روی گوشی فقط GGUF پشتیبانی می‌شود. فرمت‌های دیگر را از طریق Endpoint محلی OpenAI/Ollama استفاده کنید.'};
  try{const r=await NativeLocalAI.loadModel({path,context:2048,threads:Math.max(2,Math.min(6,Math.floor((navigator.hardwareConcurrency||4)/2)))});setLocalModelPath(path);return {loaded:!!r?.loaded,imported:true,engineReady:!!r?.engineReady,path,name:r?.name,sizeBytes:r?.sizeBytes,error:r?.error};}
  catch(e:any){return {loaded:false,path,error:e?.message||String(e)}}
}
export async function unloadLocalModel(){if(!Capacitor.isNativePlatform())return;try{await NativeLocalAI.unloadModel()}catch{} }
export async function localModelStatus():Promise<LocalModelStatus>{
  if(!Capacitor.isNativePlatform()) return {loaded:false,imported:!!getLocalModelPath(),engineReady:false,path:getLocalModelPath()};
  try{return await NativeLocalAI.status()}catch(e:any){return {loaded:false,error:e?.message||String(e)}}
}
export async function localChat(messages:{role:string;content:string}[]):Promise<string>{
  if(!Capacitor.isNativePlatform()) throw new Error('Local AI native runner requires Android.');
  const r=await NativeLocalAI.generate({messages,maxTokens:384,temperature:0.65});
  return String(r?.text||'').trim();
}
