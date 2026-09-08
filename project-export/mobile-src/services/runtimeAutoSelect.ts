import { benchmarkAvailableRuntimes, chooseFastestSuccessfulRuntime } from './runtimeBenchmark';

/** Benchmarks the installed local model and returns the fastest successful runtime. */
export async function autoSelectRuntime(prompt?:string){
  const fresh=await benchmarkAvailableRuntimes(prompt);
  const fastest=fresh.filter(x=>x.ok).sort((a,b)=>b.charsPerSecond-a.charsPerSecond)[0];
  if(fastest)return fastest;
  return chooseFastestSuccessfulRuntime();
}
