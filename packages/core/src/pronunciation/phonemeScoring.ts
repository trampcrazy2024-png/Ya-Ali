export type PhonemeScore={phoneme:string;expected:string;observed:string;score:number;errorType:'ok'|'substitution'|'omission'|'insertion'};
export type PronunciationFeedback={overall:number;phonemes:PhonemeScore[];weakPhonemes:string[];practice:string[]};

export function scorePhonemes(expected:string[], observed:string[]):PronunciationFeedback {
  const n=Math.max(expected.length,observed.length); const rows:PhonemeScore[]=[];
  for(let i=0;i<n;i++){
    const e=expected[i]||''; const o=observed[i]||'';
    const errorType=!e?'insertion':!o?'omission':e===o?'ok':'substitution';
    rows.push({phoneme:e||o,expected:e,observed:o,score:errorType==='ok'?1:0.25,errorType});
  }
  const weak=[...new Set(rows.filter(x=>x.score<0.6).map(x=>x.phoneme))];
  return {overall:rows.length?rows.reduce((s,x)=>s+x.score,0)/rows.length:0,phonemes:rows,weakPhonemes:weak,practice:weak.map(p=>`repeat:${p} × 5`)};
}
