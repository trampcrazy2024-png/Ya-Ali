import { Capacitor } from '@capacitor/core';
import { localChat, localModelStatus } from '../modelManager';

export type PerformanceResult = {
  ok: boolean;
  runtime: string;
  elapsedMs: number;
  chars: number;
  charsPerSecond: number;
  error?: string;
  createdAt: string;
};

export async function benchmarkLocalModel(prompt = 'Say hello in Iraqi Arabic in one short sentence.'): Promise<PerformanceResult> {
  const started = performance.now();
  if (!Capacitor.isNativePlatform()) {
    return {ok:false,runtime:'browser',elapsedMs:0,chars:0,charsPerSecond:0,error:'Benchmark requires the Android native Local AI runtime.',createdAt:new Date().toISOString()};
  }
  const status = await localModelStatus();
  if (!status.engineReady) {
    return {ok:false,runtime:status.execution || 'unknown',elapsedMs:Math.round(performance.now()-started),chars:0,charsPerSecond:0,error:status.error || 'Local model is not ready.',createdAt:new Date().toISOString()};
  }
  try {
    const text = await localChat([{role:'system',content:'Be concise.'},{role:'user',content:prompt}]);
    const elapsedMs = Math.max(1, Math.round(performance.now()-started));
    const chars = text.length;
    return {ok:true,runtime:status.execution || 'llama.cpp',elapsedMs,chars,charsPerSecond:Number((chars/(elapsedMs/1000)).toFixed(1)),createdAt:new Date().toISOString()};
  } catch (e:any) {
    return {ok:false,runtime:status.execution || 'unknown',elapsedMs:Math.round(performance.now()-started),chars:0,charsPerSecond:0,error:e?.message||String(e),createdAt:new Date().toISOString()};
  }
}
