export type MinedTerm={text:string;frequency:number;novelty:number;priority:number;reason:string[]};
export function mineSentence(sentence:string, known:Set<string>, weakTerms:Set<string>=new Set()):MinedTerm[]{
  const tokens=sentence.normalize('NFKC').toLocaleLowerCase().split(/[^\p{L}\p{N}'-]+/u).filter(x=>x.length>=2);
  const freq=new Map<string,number>(); for(const t of tokens)freq.set(t,(freq.get(t)||0)+1);
  return [...freq].map(([text,frequency])=>{const novelty=known.has(text)?0:1;const weak=weakTerms.has(text)?1:0;const priority=frequency*.35+novelty*.4+weak*.25;return{text,frequency,novelty,priority,reason:[novelty?'new':'known',weak?'weak-area':''].filter(Boolean)}}).sort((a,b)=>b.priority-a.priority);
}
