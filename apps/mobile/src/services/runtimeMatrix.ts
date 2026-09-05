import { Capacitor } from '@capacitor/core';
import { edgeRuntimeCapabilities } from './edgeAiRuntime';
export type RuntimeId='llama.cpp'|'onnxruntime-genai'|'executorch'|'litert-lm'|'remote-endpoint';
export type RuntimeStatus={id:RuntimeId;label:string;formats:string[];available:boolean;native:boolean;reason:string};
export async function runtimeMatrix():Promise<RuntimeStatus[]>{
 const native=Capacitor.isNativePlatform(); const c=await edgeRuntimeCapabilities();
 return [
  {id:'llama.cpp',label:'llama.cpp',formats:['GGUF'],available:native,native,reason:native?'Native GGUF bridge registered.':'Android native runner required.'},
  {id:'onnxruntime-genai',label:'ONNX Runtime GenAI',formats:['ONNX'],available:c.onnxGenAI,native,reason:c.onnxGenAI?'ONNX GenAI AAR is loaded.':'Optional ONNX Runtime GenAI AAR is not installed; generic ONNX Runtime may still be available.'},
  {id:'executorch',label:'ExecuTorch',formats:['PTE'],available:c.executorch,native,reason:c.executorch?'ExecuTorch Android LLM runtime detected.':'ExecuTorch Android runtime is not available.'},
  {id:'litert-lm',label:'LiteRT-LM',formats:['LiteRT-LM'],available:c.litertLm,native,reason:c.litertLm?'LiteRT-LM Android runtime and generation bridge detected.':'LiteRT-LM library/bridge is not available.'},
  {id:'remote-endpoint',label:'Remote / LAN endpoint',formats:['OpenAI','Ollama','LM Studio','llama.cpp','LocalAI','vLLM','MLC'],available:true,native,reason:'Available when an endpoint is configured and reachable.'}
 ];
}
