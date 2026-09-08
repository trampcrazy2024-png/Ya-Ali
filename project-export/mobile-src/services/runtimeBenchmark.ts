import { Capacitor } from '@capacitor/core';
import { edgeGenerate, edgeRuntimeCapabilities, edgeRuntimeStatus } from './edgeAiRuntime';
import { getLocalModelPath, localChat, localModelStatus } from '../modelManager';
import { persistRuntimeBenchmark, getRuntimeBenchmarkHistory } from './learningPersistence';

export type RuntimeBenchmark = {runtime:string;modelPath:string;backend?:string;ok:boolean;elapsedMs:number;outputChars:number;charsPerSecond:number;error?:string;createdAt:string};

async function timed(runtime:string,modelPath:string,run:()=>Promise<string>,backend?:string):Promise<RuntimeBenchmark>{
  const started=performance.now();
  try{
    const text=String(await run()).trim();
    const elapsedMs=Math.max(1,Math.round(performance.now()-started));
    const result:RuntimeBenchmark={
      runtime,modelPath,ok:!!text,elapsedMs,outputChars:text.length,
      charsPerSecond:Number((text.length/(elapsedMs/1000)).toFixed(1)),
      error:text?'':'Runtime returned empty output.',createdAt:new Date().toISOString(),
      ...(backend?{backend}: {})
    };
    void persistRuntimeBenchmark(result);
    return result;
  }catch(e:any){
    const elapsedMs=Math.max(1,Math.round(performance.now()-started));
    const result:RuntimeBenchmark={
      runtime,modelPath,ok:false,elapsedMs,outputChars:0,charsPerSecond:0,
      error:e?.message||String(e),createdAt:new Date().toISOString(),
      ...(backend?{backend}: {})
    };
    void persistRuntimeBenchmark(result);
    return result;
  }
}

export async function benchmarkAvailableRuntimes(prompt='Reply with one short Iraqi Arabic sentence.'):Promise<RuntimeBenchmark[]>{
  if(!Capacitor.isNativePlatform()) return [];
  const path=getLocalModelPath(); if(!path)return [];
  const status=await localModelStatus(); const out:RuntimeBenchmark[]=[];
  if(status.format==='gguf') out.push(await timed('llama.cpp',path,()=>localChat([{role:'system',content:'Be concise.'},{role:'user',content:prompt}]),'CPU'));
  const caps=await edgeRuntimeCapabilities();
  if(status.format==='pte'&&caps.executorch) out.push(await timed('executorch',path,()=>edgeGenerate({runtime:'executorch',modelPath:path,prompt,maxTokens:128,temperature:.2}).then((r:any)=>String(r?.text||'')),'auto'));
  if(status.format==='onnx'&&caps.onnxGenAI) out.push(await timed('onnx-genai',path,()=>edgeGenerate({runtime:'onnx-genai',modelPath:path,prompt,maxTokens:128,temperature:.2}).then((r:any)=>String(r?.text||'')),'auto'));
  if(status.format==='litertlm'&&caps.litertLm){
    const backend=String((await edgeRuntimeStatus())?.backend||'CPU');
    out.push(await timed('litert-lm',path,()=>edgeGenerate({runtime:'litert-lm',modelPath:path,prompt,maxTokens:128,temperature:.2}).then((r:any)=>String(r?.text||'')),backend));
  }
  return out;
}

export async function chooseFastestSuccessfulRuntime(){
  const rows=await getRuntimeBenchmarkHistory(100); const good=rows.filter((r:any)=>Number(r.ok)===1 && Number(r.chars_per_second)>0);
  if(!good.length)return undefined;
  good.sort((a:any,b:any)=>Number(b.chars_per_second)-Number(a.chars_per_second));
  return good[0];
}
