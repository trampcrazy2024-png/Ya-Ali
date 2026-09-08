export type TranslationMemoryEntry={id:string;source:string;target:string;sourceLanguage:string;targetLanguage:string;context?:string;quality:number;uses:number;updatedAt:string};
export function rankTranslationMemory(query:string, entries:TranslationMemoryEntry[], limit=5):TranslationMemoryEntry[]{
  const q=query.trim().toLocaleLowerCase();
  return entries.map(e=>{const s=e.source.toLocaleLowerCase();const exact=s===q?1:0;const contains=s.includes(q)||q.includes(s)?0.7:0;const quality=Math.max(0,Math.min(1,e.quality));return{e,score:exact*.6+contains*.25+quality*.15}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.e);
}
