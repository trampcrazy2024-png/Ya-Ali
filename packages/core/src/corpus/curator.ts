import type { CorpusRecord } from './types';
export type CorpusCuration={keep:CorpusRecord[];duplicates:CorpusRecord[];stale:CorpusRecord[];lowPriority:CorpusRecord[];reasons:Record<string,string[]>};
export interface CorpusCurationOptions { staleAfterDays?:number; frequency?:Record<string,number>; minFrequency?:number; now?:number; }

/** Conservative curator: it never deletes; it classifies records for review. */
export function curateCorpus(records:CorpusRecord[],options:CorpusCurationOptions={}):CorpusCuration{
  const now=options.now??Date.now(); const staleAfterDays=options.staleAfterDays??365; const minFrequency=options.minFrequency??1;
  const seen=new Map<string,CorpusRecord>(); const duplicates:CorpusRecord[]=[]; const stale:CorpusRecord[]=[]; const lowPriority:CorpusRecord[]=[]; const reasons:Record<string,string[]>={};
  for(const r of records){
    const prior=seen.get(r.normalizedText);
    if(prior){duplicates.push(r);(reasons[r.id]??=[]).push(`duplicate-of:${prior.id}`);continue;}
    seen.set(r.normalizedText,r);
    const age=now-Date.parse(r.createdAt); if(Number.isFinite(age)&&age>staleAfterDays*86400000){stale.push(r);(reasons[r.id]??=[]).push('stale-review-needed');}
    const frequency=options.frequency?.[r.normalizedText]??0; if(frequency<minFrequency){lowPriority.push(r);(reasons[r.id]??=[]).push(`low-frequency:${frequency}`);}
  }
  return {keep:[...seen.values()],duplicates,stale,lowPriority,reasons};
}
