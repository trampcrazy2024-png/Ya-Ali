import type { LanguageBankItem } from '@yaali/database';
import { adaptivePriority, type ReviewRating } from '../learning';
import { appendLearningEvent, getPersistedDialectStates, persistDialectState } from './learningPersistence';
import { DIALECT_PROFILES, type DialectId } from './dialectEngine';

export type DialectSkill = 'vocabulary'|'grammar'|'listening'|'pronunciation'|'conversation'|'recognition';
export type DialectLearningState = {
  dialect: DialectId;
  mastery: number;
  confidence: number;
  exposure: number;
  streak: number;
  reviews: number;
  successes: number;
  retention: number;
  level: 'starter'|'foundation'|'developing'|'advanced'|'mastery';
  nextReview: number;
  skills: Record<DialectSkill, number>;
  confusions: Partial<Record<DialectId, number>>;
  lastRating?: ReviewRating;
  lastReview?: number;
};

export type DialectPlanItem = {
  item: LanguageBankItem;
  dialect: DialectId;
  priority: number;
  focus: DialectSkill;
  reason: string;
};

const KEY='yaali_dialect_learning_v2';
const OLD_KEY='yaali_dialect_learning_v1';
const SKILLS:DialectSkill[]=['vocabulary','grammar','listening','pronunciation','conversation','recognition'];
const WEIGHTS:Record<DialectSkill,number>={vocabulary:1.0,grammar:1.0,listening:1.15,pronunciation:1.25,conversation:1.2,recognition:1.15};
const DAY=86400000;
const clamp=(n:number,a=0,b=100)=>Math.max(a,Math.min(b,n));
const EMPTY_SKILLS=()=>({vocabulary:0,grammar:0,listening:0,pronunciation:0,conversation:0,recognition:0});

export function isSupportedDialect(value?:string):boolean { const d=String(value||'').toLowerCase(); return ['عراقی','iraqi','iraq','ar-iq','لبنانی','شامی','leban','levant','مصری','egypt','سعودی','saudi','najdi','hejaz','خلیجی','gulf','ar-ae','آمریکایی','american','en-us','فصیح','msa','معیار'].some(x=>d.includes(x)); }

export function normalizeDialectId(value?:string):DialectId {
  const d=String(value||'').toLowerCase();
  if(d.includes('عراقی')||d.includes('iraq')||d.includes('ar-iq')) return 'iraqi';
  if(d.includes('لبنانی')||d.includes('شامی')||d.includes('leban')||d.includes('levant')) return 'lebanese';
  if(d.includes('مصری')||d.includes('egypt')) return 'egyptian';
  if(d.includes('سعودی')||d.includes('saudi')||d.includes('najdi')||d.includes('hejaz')) return 'saudi';
  if(d.includes('خلیجی')||d.includes('gulf')||d.includes('ar-ae')) return 'gulf';
  if(d.includes('آمریکایی')||d.includes('american')||d.includes('en-us')) return 'american';
  if(d.includes('فصیح')||d.includes('msa')||d.includes('معیار')) return 'msa';
  return 'iraqi';
}

function fresh(dialect:DialectId):DialectLearningState{return {dialect,mastery:0,confidence:0,exposure:0,streak:0,reviews:0,successes:0,retention:0.5,level:'starter',nextReview:0,skills:EMPTY_SKILLS(),confusions:{}};}
function read():Record<string,DialectLearningState>{
  try {
    const current=JSON.parse(localStorage.getItem(KEY)||'{}');
    if(Object.keys(current).length) return current;
    const old=JSON.parse(localStorage.getItem(OLD_KEY)||'{}');
    if(Object.keys(old).length){
      const migrated:Record<string,DialectLearningState>={};
      for(const [id,s] of Object.entries<any>(old)) migrated[id]={...fresh(id as DialectId),...s,retention:Number(s?.successes||0)/Math.max(1,Number(s?.reviews||0)),level:levelFor(Number(s?.mastery||0)),nextReview:Number(s?.nextReview||0)};
      try{localStorage.setItem(KEY,JSON.stringify(migrated));}catch{}
      return migrated;
    }
    return {};
  } catch{return {}}
}
function write(v:Record<string,DialectLearningState>){try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}}

export function getDialectLearningState(dialect:DialectId):DialectLearningState { const all=read(); return all[dialect] || fresh(dialect); }

/** Hydrate dialect projections from SQLite without overwriting newer local state. */
export async function hydrateDialectLearningFromSQLite():Promise<number>{
  const rows=await getPersistedDialectStates();
  if(!rows.length)return 0;
  const all=read(); let changed=0;
  for(const row of rows){
    const id=normalizeDialectId(row.dialect); const incoming=row.state as DialectLearningState; const current=all[id];
    if(!current || Number(incoming.lastReview||0)>Number(current.lastReview||0)){all[id]={...fresh(id),...incoming,dialect:id};changed++;}
  }
  if(changed)write(all); return changed;
}
export function getAllDialectLearningStates(){return DIALECT_PROFILES.map(p=>getDialectLearningState(p.id));}

function levelFor(mastery:number):DialectLearningState['level'] { if(mastery<20)return 'starter'; if(mastery<40)return 'foundation'; if(mastery<65)return 'developing'; if(mastery<85)return 'advanced'; return 'mastery'; }
function weightedMastery(skills:Record<DialectSkill,number>) { const total=SKILLS.reduce((a,k)=>a+WEIGHTS[k],0); return SKILLS.reduce((a,k)=>a+skills[k]*WEIGHTS[k],0)/total; }
function reviewDelay(state:DialectLearningState,rating:ReviewRating) { const base=state.mastery<40?1:state.mastery<70?3:7; return (rating==='again'?0.04:rating==='hard'?0.7:rating==='good'?base:base*1.8)*DAY; }

export function recordDialectOutcome(dialect:DialectId,rating:ReviewRating,skill:DialectSkill='recognition',confusedWith?:DialectId,now=Date.now()):DialectLearningState {
  const all=read(); const prev=getDialectLearningState(dialect); const success=rating==='good'||rating==='easy';
  const delta=rating==='again'?-4:rating==='hard'?1:rating==='good'?3:5;
  const skills={...prev.skills}; skills[skill]=clamp((skills[skill]||0)+delta);
  const confusions={...prev.confusions}; if(confusedWith&&confusedWith!==dialect) confusions[confusedWith]=Math.max(0,(confusions[confusedWith]||0)+1);
  const dayGap=prev.lastReview?Math.floor((now-prev.lastReview)/DAY):999;
  const reviews=prev.reviews+1; const successes=prev.successes+(success?1:0);
  const retention=successes/reviews;
  const rawMastery=weightedMastery(skills);
  const next:DialectLearningState={...prev,dialect,mastery:clamp(rawMastery),confidence:clamp(prev.confidence+(success?2:-3)),exposure:prev.exposure+1,streak:success&&dayGap<=2?prev.streak+1:(success?1:0),reviews,successes,retention,level:levelFor(rawMastery),nextReview:now+reviewDelay({...prev,mastery:rawMastery},rating),lastRating:rating,lastReview:now,skills,confusions};
  all[dialect]=next;write(all);
  void appendLearningEvent({dialect,skill,rating,payload:{mastery:next.mastery,confidence:next.confidence,retention:next.retention,level:next.level,confusedWith}});
  void persistDialectState(next);
  return next;
}

export function recordDialectConfusion(source:DialectId,confusedWith:DialectId){return recordDialectOutcome(source,'again','recognition',confusedWith);}
export function dialectMasteryLabel(mastery:number){if(mastery<25)return 'شروع';if(mastery<50)return 'در حال شکل‌گیری';if(mastery<75)return 'خوب';if(mastery<90)return 'پیشرفته';return 'مسلط';}
export function dialectItemMatches(item:LanguageBankItem,dialect:DialectId):boolean { return normalizeDialectId(item.dialect||item.source_language)===dialect; }

export function buildDialectLearningPlan(items:LanguageBankItem[],dialect:DialectId,limit=12):DialectPlanItem[] {
  const state=getDialectLearningState(dialect); const pool=items.filter(x=>dialectItemMatches(x,dialect));
  const weak=SKILLS.slice().sort((a,b)=>(state.skills[a]||0)-(state.skills[b]||0));
  const confusionRisk=Object.values(state.confusions).reduce((a,v)=>a+(Number(v)||0),0);
  return pool.map(item=>{
    const p=adaptivePriority(item.id); const focus=confusionRisk>0&&Math.abs(hash(item.id))%4===0?'recognition':weak[Math.abs(hash(item.id))%weak.length]!;
    const dueBoost=state.nextReview<=Date.now()?6:0; const dialectBonus=Math.max(0,(75-state.mastery)/10); const confusionBoost=confusionRisk>0?Math.min(8,confusionRisk):0;
    return {item,dialect,priority:p+dialectBonus+dueBoost+confusionBoost,focus,reason:p>8?'مرور عقب‌افتاده':focus==='recognition'?'تشخیص لهجه و جلوگیری از اختلاط':state.mastery<40?'ساخت پایه لهجه':`تقویت ${skillLabel(focus)}`};
  }).sort((a,b)=>b.priority-a.priority).slice(0,limit);
}

export function getDialectWeakest(dialect:DialectId){const s=getDialectLearningState(dialect);return SKILLS.slice().sort((a,b)=>s.skills[a]-s.skills[b]).slice(0,3);}
export function getDialectConfusionRisk(dialect:DialectId){const s=getDialectLearningState(dialect);return Object.entries(s.confusions).sort((a,b)=>(b[1]||0)-(a[1]||0)).map(([id,count])=>({dialect:id as DialectId,count:count||0}));}
export function getDialectLearningInsights(dialect:DialectId){const s=getDialectLearningState(dialect);const weakest=getDialectWeakest(dialect);const risks=getDialectConfusionRisk(dialect);return {dialect,level:s.level,mastery:s.mastery,confidence:s.confidence,retention:Number(s.retention.toFixed(3)),weakest,confusionRisk:risks.slice(0,3),nextReview:s.nextReview,focus:weakest[0]};}
export function getDialectDailyGoal(dialect:DialectId){const s=getDialectLearningState(dialect);return Math.max(5,Math.min(25,10+Math.round((70-s.mastery)/10)+Math.min(5,s.confusions ? Object.values(s.confusions).length : 0)));}
function hash(s:string){let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return h>>>0;}
function skillLabel(s:DialectSkill){return ({vocabulary:'واژگان',grammar:'دستور زبان',listening:'شنیدار',pronunciation:'تلفظ',conversation:'مکالمه',recognition:'تشخیص لهجه'} as Record<DialectSkill,string>)[s];}
