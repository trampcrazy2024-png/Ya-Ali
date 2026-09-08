import type { LanguageBankItem } from '@yaali/database';
import { adaptivePriority, getLearningInsights, recordLearningSignal, reviewItem, type LearningSignal, type ReviewRating } from '../learning';

export type SkillVector = {grammar:number;vocabulary:number;pronunciation:number;listening:number;conversation:number};
export type LearningPlanItem = {item:LanguageBankItem;reason:string;priority:number;focus:LearningSignal};

const SKILLS:['grammar','vocabulary','pronunciation','listening','conversation']=['grammar','vocabulary','pronunciation','listening','conversation'];
const KEY='yaali_learning_profile_v1';
function read():SkillVector{try{return JSON.parse(localStorage.getItem(KEY)||'{}') as SkillVector}catch{return {grammar:0,vocabulary:0,pronunciation:0,listening:0,conversation:0}}}
function write(v:SkillVector){try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}}
function clamp(n:number){return Math.max(-100,Math.min(100,n));}
export function getSkillVector():SkillVector{const x=read();return {grammar:x.grammar||0,vocabulary:x.vocabulary||0,pronunciation:x.pronunciation||0,listening:x.listening||0,conversation:x.conversation||0};}
export function recordSkillOutcome(skill:LearningSignal,success:boolean,weight=1){const v=getSkillVector();v[skill]=clamp(v[skill]+(success?weight:-weight*1.4));write(v);return v;}
export function buildLearningPlan(items:LanguageBankItem[],limit=12):LearningPlanItem[]{
  const insights=getLearningInsights(items);const skills=getSkillVector();
  const weakest=SKILLS.slice().sort((a,b)=>skills[a]-skills[b]);
  return insights.recommended.concat(insights.weakest).filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i).slice(0,limit).map((item,index)=>{
    const focus=weakest[index%weakest.length]!;const p=adaptivePriority(item.id);return {item,priority:p,focus,reason:p>8?'عقب‌افتاده/دشوار':focus==='pronunciation'?'تمرکز تلفظ':focus==='grammar'?'تمرکز دستور زبان':'تقویت مهارت ضعیف‌تر'};
  });
}
export function applyLearningReview(id:string,rating:ReviewRating,focus:LearningSignal){recordSkillOutcome(focus,rating!=='again');recordLearningSignal(id,focus,rating==='again'?1:-.25);return reviewItem(id,rating,{signal:focus});}
