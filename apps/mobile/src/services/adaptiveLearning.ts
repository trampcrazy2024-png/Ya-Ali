import type { LanguageBankItem } from '@yaali/database';
import { adaptivePriority, getLearningInsights, recordLearningSignal, reviewItem, type LearningSignal, type ReviewRating } from '../learning';

export type SkillVector={grammar:number;vocabulary:number;pronunciation:number;listening:number;conversation:number};
export type LearningMode='recall'|'recognition'|'listening'|'pronunciation'|'cloze'|'conversation';
export type LearningPlanItem={item:LanguageBankItem;reason:string;priority:number;focus:LearningSignal;mode:LearningMode;estimatedSeconds:number;cefr:string};
const SKILLS=['grammar','vocabulary','pronunciation','listening','conversation'] as const;
const MODES:LearningMode[]=['recall','recognition','listening','pronunciation','cloze','conversation'];
const KEY='yaali_learning_profile_v2';
function read():SkillVector{try{const x=JSON.parse(localStorage.getItem(KEY)||'{}');return {grammar:x.grammar||0,vocabulary:x.vocabulary||0,pronunciation:x.pronunciation||0,listening:x.listening||0,conversation:x.conversation||0}}catch{return {grammar:0,vocabulary:0,pronunciation:0,listening:0,conversation:0}}}
function write(v:SkillVector){try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}}
function clamp(n:number){return Math.max(-100,Math.min(100,n));}
export function getSkillVector():SkillVector{return read()}
export function recordSkillOutcome(skill:LearningSignal,success:boolean,weight=1){const v=read();v[skill]=clamp(v[skill]+(success?weight:-weight*1.4));write(v);return v}
export function cefrRank(level?:string){const m=String(level||'A1').toUpperCase().match(/[ABC][12]|PRE-A1/);return ['PRE-A1','A1','A2','B1','B2','C1','C2'].indexOf(m?.[0]||'A1')}
function modeFor(focus:LearningSignal,index:number):LearningMode{const by:Record<LearningSignal,LearningMode[]>={grammar:['cloze','recall'],vocabulary:['recall','recognition'],pronunciation:['pronunciation','listening'],listening:['listening','recognition'],conversation:['conversation','recall']};return by[focus][index%by[focus].length] ?? MODES[index%MODES.length]!}
export function buildLearningPlan(items:LanguageBankItem[],limit=12,timeBudgetMinutes=15):LearningPlanItem[]{
 const insights=getLearningInsights(items);const skills=read();const weakest=[...SKILLS].sort((a,b)=>skills[a]-skills[b]);
 const pool=insights.recommended.concat(insights.weakest,items.filter(x=>!insights.recommended.some(y=>y.id===x.id))).filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i);
 const out:LearningPlanItem[]=[];let seconds=0;
 for(let i=0;i<pool.length&&out.length<limit;i++){const item=pool[i]!;const focus=weakest[i%weakest.length]!;const mode:LearningMode=modeFor(focus,i);const estimatedSeconds=mode==='conversation'?70:mode==='listening'||mode==='pronunciation'?45:30;if(seconds+estimatedSeconds>timeBudgetMinutes*60&&out.length)continue;const p=adaptivePriority(item.id)+(focus==='vocabulary'?1:0);out.push({item,priority:p,focus,mode,estimatedSeconds,cefr:String(item.level||'A1-A2').split(/[–-]/)[0]||'A1',reason:p>8?'مرور فوری و عقب‌افتاده':`تقویت ${focus} با حالت ${mode}`});seconds+=estimatedSeconds;}
 return out.sort((a,b)=>b.priority-a.priority);
}
export function applyLearningReview(id:string,rating:ReviewRating,focus:LearningSignal){recordSkillOutcome(focus,rating!=='again');recordLearningSignal(id,focus,rating==='again'?1:-.25);return reviewItem(id,rating,{signal:focus});}
export function recommendDailyMinutes(skill?:LearningSignal){const v=read();const weakest=Math.min(...Object.values(v));return skill&&v[skill]===weakest?20:15}
