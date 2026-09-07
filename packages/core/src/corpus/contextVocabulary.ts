export type ContextSuggestion={term:string;score:number;reason:string[]};
export function suggestContextVocabulary(text:string,candidates:string[],weakTerms:string[]=[]):ContextSuggestion[]{
  const q=text.toLocaleLowerCase(); const weak=new Set(weakTerms.map(x=>x.toLocaleLowerCase()));
  return candidates.map(term=>{const t=term.toLocaleLowerCase();const hit=q.includes(t)||t.split(/\s+/).some(w=>q.includes(w));const weakHit=weak.has(t);const score=(hit?0.65:0)+(weakHit?.35:0);return{term,score,reason:[hit?'context-match':'',weakHit?'weak-skill-match':''].filter(Boolean)}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
}
