export type GrammarIssue={span:string;rule:string;explanation:string;suggestion:string;confidence:number};
export interface GrammarRule { id:string; pattern:RegExp; replacement:(m:RegExpMatchArray)=>string; explanation:string; }
export function checkGrammar(text:string,rules:GrammarRule[]):GrammarIssue[]{
  const out:GrammarIssue[]=[];
  for(const rule of rules){const m=text.match(rule.pattern); if(!m)continue; const suggestion=rule.replacement(m); out.push({span:m[0],rule:rule.id,explanation:rule.explanation,suggestion,confidence:.75});}
  return out;
}
