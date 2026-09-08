import { Capacitor, registerPlugin } from '@capacitor/core';
export type EdgeRuntimeCaps={executorch:boolean;onnxRuntime:boolean;onnxGenAI:boolean;litertLm:boolean;native:boolean;version?:string};
const EdgeAI=registerPlugin<any>('EdgeAI');
export async function edgeRuntimeCapabilities():Promise<EdgeRuntimeCaps>{
  if(!Capacitor.isNativePlatform()) return {executorch:false,onnxRuntime:false,onnxGenAI:false,litertLm:false,native:false};
  try{return await EdgeAI.capabilities()}catch{return {executorch:false,onnxRuntime:false,onnxGenAI:false,litertLm:false,native:true}}
}
export async function edgeRuntimeStatus(){if(!Capacitor.isNativePlatform())return {native:false};try{return await EdgeAI.status()}catch(e:any){return {native:true,error:e?.message||String(e)}}}
export async function edgeGenerate(args:{runtime:'executorch'|'onnx-genai'|'litert-lm';modelPath:string;prompt:string;tokenizerPath?:string;maxTokens?:number;temperature?:number}){
  if(!Capacitor.isNativePlatform()) throw new Error('Edge Runtime فقط روی Android اجرا می‌شود.');
  return EdgeAI.generate(args);
}
