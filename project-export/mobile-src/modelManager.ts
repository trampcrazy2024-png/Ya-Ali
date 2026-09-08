import { Capacitor, registerPlugin } from '@capacitor/core';
import { detectLocalModelFormat, type LocalModelFormat } from './modelFormats';
import { edgeGenerate, edgeRuntimeCapabilities } from './services/edgeAiRuntime';

export type LocalModel = { path:string; name:string; sizeBytes:number; loaded?:boolean; format?:LocalModelFormat };

export type LocalModelStatus = { loaded:boolean; imported?:boolean; engineReady?:boolean; generating?:boolean; path?:string; name?:string; sizeBytes?:number; error?:string; format?:LocalModelFormat; execution?:string; directOnDevice?:boolean };
const NativeLocalAI = registerPlugin<any>('LocalAI');
const KEY='yaali_local_model';
const TOKENIZER_KEY='yaali_edge_tokenizer';
export function getEdgeTokenizerPath(){try{return localStorage.getItem(TOKENIZER_KEY)||''}catch{return ''}}
export function setEdgeTokenizerPath(path:string){try{path?localStorage.setItem(TOKENIZER_KEY,path):localStorage.removeItem(TOKENIZER_KEY)}catch{}}

export function getLocalModelPath(){ try{return localStorage.getItem(KEY)||''}catch{return ''} }
export function setLocalModelPath(path:string){ try{path?localStorage.setItem(KEY,path):localStorage.removeItem(KEY)}catch{} }

export async function pickLocalModel():Promise<LocalModelStatus>{
  if(!Capacitor.isNativePlatform()) return {loaded:false,error:'انتخاب مدل محلی روی Android انجام می‌شود.'};
  try{
    const r=await NativeLocalAI.pickModel();
    if(r?.path){
      const info=detectLocalModelFormat(String(r.path));
      if(info.format==='unknown') return {loaded:false,error:'فرمت مدل ناشناخته است. فرمت‌های معتبر: GGUF، ONNX، PTE، Safetensors، PyTorch و TFLite.'};
      setLocalModelPath(r.path);return {loaded:false,imported:true,engineReady:false,path:r.path,name:r.name,sizeBytes:r.sizeBytes,format:info.format,execution:info.execution,directOnDevice:info.directOnDevice};
    }
    return {loaded:false,error:'مدل انتخاب نشد.'};
  }catch(e:any){return {loaded:false,error:e?.message||String(e)}}
}
export async function listLocalModels():Promise<LocalModel[]>{ if(!Capacitor.isNativePlatform()) return []; try{ const r=await NativeLocalAI.listModels(); const selected=getLocalModelPath(); return Array.isArray(r?.models)?r.models.map((m:any)=>({...m,loaded:!!m.loaded||m.path===selected})):[]; }catch{return []} }
export async function deleteLocalModel(path:string){ if(!Capacitor.isNativePlatform()) return false; try{ const r=await NativeLocalAI.deleteModel({path}); if(getLocalModelPath()===path) setLocalModelPath(''); return !!r?.deleted; }catch{return false} }
export async function loadLocalModel(path=getLocalModelPath()):Promise<LocalModelStatus>{
  if(!Capacitor.isNativePlatform()) return {loaded:false,error:'Local AI native فقط روی Android اجرا می‌شود.'};
  if(!path){ const picked=await pickLocalModel(); if(!picked.path) return picked; path=picked.path; }
  const format=detectLocalModelFormat(path);
  if(format.format==='safetensors'||format.format==='pytorch'||format.format==='tflite') return {loaded:false,path,format:format.format,execution:format.execution,directOnDevice:false,error:`${format.labelFa} برای اجرای Chat روی Android باید به Runtime سازگار export شود یا از Endpoint استفاده شود.`};
  if(format.format==='onnx'||format.format==='pte'||format.format==='litertlm'){ setLocalModelPath(path); const caps=await edgeRuntimeCapabilities(); const ready=format.format==='onnx'?caps.onnxGenAI:format.format==='pte'?caps.executorch:caps.litertLm; if(format.format==='pte'&&!getEdgeTokenizerPath()) return {loaded:false,imported:true,engineReady:false,path,name:path.split('/').pop()||path,format:format.format,execution:format.execution,directOnDevice:true,error:'برای ExecuTorch باید tokenizer.model را نیز یک‌بار انتخاب کنید.'}; return {loaded:!!ready,imported:true,engineReady:!!ready,path,name:path.split('/').pop()||path,format:format.format,execution:format.execution,directOnDevice:true,error:ready?'':`Runtime ${format.execution} روی این APK در دسترس نیست.`}; }
  if(format.format!=='gguf') return {loaded:false,path,format:format.format,execution:format.execution,directOnDevice:format.directOnDevice,error:`فرمت ${format.labelFa} شناسایی شد؛ برای این نوع فایل، Endpoint یا export به Runtime سازگار لازم است.`};
  try{const r=await NativeLocalAI.loadModel({path,context:2048,threads:Math.max(2,Math.min(6,Math.floor((navigator.hardwareConcurrency||4)/2)))});setLocalModelPath(path);return {loaded:!!r?.loaded,imported:true,engineReady:!!r?.engineReady,path,name:r?.name,sizeBytes:r?.sizeBytes,error:r?.error,format:'gguf',execution:'llama.cpp',directOnDevice:true};}
  catch(e:any){return {loaded:false,path,error:e?.message||String(e)}}
}
export async function unloadLocalModel(){if(!Capacitor.isNativePlatform())return;try{await NativeLocalAI.unloadModel()}catch{} }
export async function localModelStatus():Promise<LocalModelStatus>{
  const saved=getLocalModelPath(); const savedInfo=detectLocalModelFormat(saved);
  if(!Capacitor.isNativePlatform()) return {loaded:false,imported:!!saved,engineReady:false,path:saved,format:savedInfo.format,execution:savedInfo.execution,directOnDevice:savedInfo.directOnDevice};
  if(saved && savedInfo.format!=='gguf'){
    try{const caps=await edgeRuntimeCapabilities(); const ready=savedInfo.format==='onnx'?caps.onnxGenAI:savedInfo.format==='pte'?caps.executorch:savedInfo.format==='litertlm'?caps.litertLm:false; return {loaded:!!ready,imported:true,engineReady:!!ready,path:saved,name:saved.split('/').pop()||saved,format:savedInfo.format,execution:savedInfo.execution,directOnDevice:true,error:ready?'':`Runtime ${savedInfo.execution} روی این APK در دسترس نیست.`};}catch(e:any){return {loaded:false,imported:true,engineReady:false,path:saved,name:saved.split('/').pop()||saved,format:savedInfo.format,execution:savedInfo.execution,directOnDevice:true,error:e?.message||String(e)} }
  }
  try{const r=await NativeLocalAI.status(); const info=detectLocalModelFormat(String(r?.path||saved)); return {...r,path:r?.path||saved,format:info.format,execution:info.execution,directOnDevice:info.directOnDevice};}catch(e:any){return {loaded:false,error:e?.message||String(e),path:saved,format:savedInfo.format,execution:savedInfo.execution,directOnDevice:savedInfo.directOnDevice}}
}
export async function cancelLocalGeneration(){if(!Capacitor.isNativePlatform())return false;try{return !!(await NativeLocalAI.cancelGeneration())?.cancelled}catch{return false}}
export async function localChat(messages:{role:string;content:string}[]):Promise<string>{
  if(!Capacitor.isNativePlatform()) throw new Error('Local AI native runner requires Android.');
  const status=await localModelStatus(); const format=status.format||detectLocalModelFormat(status.path||'').format;
  if(format==='onnx'||format==='pte'||format==='litertlm'){
    const runtime=format==='onnx'?'onnx-genai':format==='litertlm'?'litert-lm':'executorch';
    const r=await edgeGenerate({runtime,modelPath:String(status.path||''),...(format==='pte'&&getEdgeTokenizerPath()?{tokenizerPath:getEdgeTokenizerPath()}:{}),prompt:messages.map(m=>`${m.role.toUpperCase()}:\n${m.content}`).join('\n\n')+'\n\nASSISTANT:',maxTokens:384,temperature:.65});
    const text=String(r?.text||'').trim(); if(!text)throw new Error('Edge runtime پاسخ خالی برگرداند.'); return text;
  }
  const timeout=window.setTimeout(()=>{void cancelLocalGeneration()},90000);
  try{const r=await NativeLocalAI.generate({messages,maxTokens:384,temperature:0.65});const text=String(r?.text||'').trim();if(!text)throw new Error('مدل محلی پاسخ خالی برگرداند. مدل Instruct/Chat را انتخاب کنید.');return text;}finally{window.clearTimeout(timeout)}
}
