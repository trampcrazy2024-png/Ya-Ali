import { Capacitor, registerPlugin } from '@capacitor/core';

export type LocalModelStatus = { loaded:boolean; path?:string; name?:string; sizeBytes?:number; error?:string };
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
      setLocalModelPath(r.path);return {loaded:false,path:r.path,name:r.name,sizeBytes:r.sizeBytes};
    }
    return {loaded:false,error:'مدل انتخاب نشد.'};
  }catch(e:any){return {loaded:false,error:e?.message||String(e)}}
}
export async function loadLocalModel(path=getLocalModelPath()):Promise<LocalModelStatus>{
  if(!Capacitor.isNativePlatform()) return {loaded:false,error:'Local AI native فقط روی Android اجرا می‌شود.'};
  if(!path){ const picked=await pickLocalModel(); if(!picked.path) return picked; path=picked.path; }
  if(!GGUF_EXT.test(path)) return {loaded:false,path,error:'فایل انتخاب‌شده GGUF نیست.'};
  try{const r=await NativeLocalAI.loadModel({path});setLocalModelPath(path);return {loaded:!!r?.loaded,path,name:r?.name,sizeBytes:r?.sizeBytes};}
  catch(e:any){return {loaded:false,path,error:e?.message||String(e)}}
}
export async function unloadLocalModel(){if(!Capacitor.isNativePlatform())return;try{await NativeLocalAI.unloadModel()}catch{} }
export async function localModelStatus():Promise<LocalModelStatus>{
  if(!Capacitor.isNativePlatform()) return {loaded:false,path:getLocalModelPath()};
  try{return await NativeLocalAI.status()}catch(e:any){return {loaded:false,error:e?.message||String(e)}}
}
export async function localChat(messages:{role:string;content:string}[]):Promise<string>{
  if(!Capacitor.isNativePlatform()) throw new Error('Local AI native runner requires Android.');
  const r=await NativeLocalAI.generate({messages});
  return String(r?.text||'').trim();
}
