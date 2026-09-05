import type { LanguageBankItem } from '@yaali/database';
import { appendLearningEvent, getPersistedReviewStates, persistReviewState, persistReviewLog, getLearningReviewAnalytics } from './services/learningPersistence';

/**
 * Ya-Ali learning engine.
 *
 * Scheduler: FSRS-6-compatible DSR model (21 default parameters).
 * Storage: versioned local state so older 0.3.x SM-2-like records migrate safely.
 * Adaptive layer: difficulty/overdue/lapse signals are used to order the queue.
 */
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';
export type LearningSignal = 'grammar' | 'vocabulary' | 'pronunciation' | 'listening' | 'conversation';
export type ReviewState = {
  due:number; interval:number; ease:number; reps:number; lapses:number; lastRating:ReviewRating; lastReview:number;
  stability:number; difficulty:number; elapsedDays:number; stateVersion:6;
  signalScores?:Partial<Record<LearningSignal,number>>;
};

type Store=Record<string,ReviewState>;
const KEY='yaali_srs_v2_fsrs6';
const OLD_KEY='yaali_srs_v1';
const DAY=86400000;
const FSRS6=[0.212,1.2931,2.3065,8.2956,6.4133,0.8334,3.0194,0.001,1.8722,0.1666,0.796,1.4835,0.0614,0.2629,1.6483,0.6014,1.8729,0.5425,0.0912,0.0658,0.1542] as const;
const MIN_STABILITY=0.1;
const MIN_DIFFICULTY=1;
const MAX_DIFFICULTY=10;
const DEFAULT_RETENTION=0.9;

function read():Store {
  try {
    const current=JSON.parse(localStorage.getItem(KEY)||'{}');
    if(Object.keys(current).length) return current;
    const old=JSON.parse(localStorage.getItem(OLD_KEY)||'{}');
    if(Object.keys(old).length){
      const migrated:Store={};
      for(const [id,s] of Object.entries<any>(old)){
        const interval=Math.max(0,Number(s?.interval)||0);
        const reps=Math.max(0,Number(s?.reps)||0);
        const rating=(s?.lastRating||'again') as ReviewRating;
        const grade=ratingToGrade(rating);
        migrated[id]={
          due:Number(s?.due)||0,interval,ease:Number(s?.ease)||2.3,reps,lapses:Number(s?.lapses)||0,
          lastRating:rating,lastReview:Number(s?.lastReview)||0,
          stability:Math.max(MIN_STABILITY,interval||initialStability(grade)),
          difficulty:clamp(8-(grade-3)*1.1,MIN_DIFFICULTY,MAX_DIFFICULTY),
          elapsedDays:interval,stateVersion:6
        };
      }
      try{localStorage.setItem(KEY,JSON.stringify(migrated));}catch{}
      return migrated;
    }
    return {};
  } catch{return {}}
}
function write(s:Store){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}


/** Hydrate the synchronous scheduler mirror from the durable SQLite projection. */
export async function hydrateLearningStateFromSQLite(): Promise<number> {
  const rows = await getPersistedReviewStates();
  if (!rows.length) return 0;
  const local = read();
  let changed = 0;
  for (const row of rows) {
    const incoming = row.state as Partial<ReviewState>;
    if (incoming.stateVersion !== 6) continue;
    const current = local[row.itemId];
    if (!current || Number(incoming.lastReview || 0) > Number(current.lastReview || 0)) {
      local[row.itemId] = incoming as ReviewState;
      changed++;
    }
  }
  if (changed) write(local);
  return changed;
}

function clamp(n:number,a:number,b:number){return Math.min(b,Math.max(a,n));}
function ratingToGrade(r:ReviewRating){return r==='again'?1:r==='hard'?2:r==='good'?3:4;}
function initialStability(g:number){return Math.max(MIN_STABILITY,FSRS6[g-1]!);}
function initialDifficulty(g:number){return clamp(FSRS6[4]! - Math.exp(FSRS6[5]!*(g-1)) + 1,MIN_DIFFICULTY,MAX_DIFFICULTY);}
function retentionFactor(){return Math.pow(DEFAULT_RETENTION,-1/FSRS6[20]!)-1;}
function retrievability(s:number,elapsed:number){if(elapsed<=0)return 1;return Math.pow(1+retentionFactor()*elapsed/Math.max(MIN_STABILITY,s),-FSRS6[20]!);}
function nextInterval(s:number,retention=DEFAULT_RETENTION){return clamp(Math.round((s/retentionFactor())*(Math.pow(retention,1/(-FSRS6[20]!))-1)),1,36500);}
function nextDifficulty(d:number,g:number){
  const d0=initialDifficulty(4);
  const delta=-(FSRS6[6]!*(g-3));
  const damped=(10-d)*delta/9;
  return clamp(FSRS6[7]! * d0 + (1-FSRS6[7]!)*(d+damped),MIN_DIFFICULTY,MAX_DIFFICULTY);
}
function shortTermStability(s:number,g:number){
  let inc=Math.exp(FSRS6[17]!*(g-3+FSRS6[18]!))*Math.pow(Math.max(MIN_STABILITY,s),-FSRS6[19]!);
  if(g>=2)inc=Math.max(1,inc);
  return Math.max(MIN_STABILITY,s*inc);
}
function recallStability(d:number,s:number,r:number,g:number){
  const hard=g===2?FSRS6[15]!:1;
  const easy=g===4?FSRS6[16]!:1;
  return Math.max(MIN_STABILITY,s*(1+Math.exp(FSRS6[8]!)*(11-d)*Math.pow(Math.max(MIN_STABILITY,s),-FSRS6[9]!)*(Math.exp((1-r)*FSRS6[10]!)-1)*hard*easy));
}
function forgetStability(d:number,s:number,r:number){
  const long=FSRS6[11]!*Math.pow(d,-FSRS6[12]!)*(Math.pow(s+1,FSRS6[13]!)-1)*Math.exp((1-r)*FSRS6[14]!);
  const short=s/Math.exp(FSRS6[17]!*(FSRS6[18]!));
  return Math.max(MIN_STABILITY,Math.min(long,short));
}

export function getReviewState(id:string):ReviewState{
  const s=read()[id];
  if(s?.stateVersion===6)return s;
  return {due:0,interval:0,ease:2.3,reps:0,lapses:0,lastRating:'again',lastReview:0,stability:initialStability(3),difficulty:initialDifficulty(3),elapsedDays:0,stateVersion:6};
}

export function reviewItem(id:string,rating:ReviewRating,options?:{now?:number;retention?:number;signal?:LearningSignal}):ReviewState{
  const all=read(); const old=getReviewState(id); const now=options?.now??Date.now(); const g=ratingToGrade(rating);
  const elapsed=old.lastReview>0?Math.max(0,(now-old.lastReview)/DAY):0;
  let stability=old.lastReview>0?old.stability:initialStability(g);
  let difficulty=old.lastReview>0?nextDifficulty(old.difficulty,g):initialDifficulty(g);
  let interval=0;
  if(old.lastReview>0){
    const r=retrievability(stability,elapsed);
    stability=elapsed<1?shortTermStability(stability,g):(g===1?forgetStability(difficulty,stability,r):recallStability(difficulty,stability,r,g));
    interval=g===1?1:nextInterval(stability,options?.retention??DEFAULT_RETENTION);
  }else{
    interval=g===1?0:nextInterval(stability,options?.retention??DEFAULT_RETENTION);
  }
  const lapses=old.lapses+(g===1?1:0); const reps=old.reps+(g===1?0:1);
  const due=g===1?now+10*60*1000:now+interval*DAY;
  const signalScores={...(old.signalScores||{})};
  if(options?.signal)signalScores[options.signal]=clamp((signalScores[options.signal]||0)+(g===1?1:g===2?.35:-.15),-5,5);
  const state:ReviewState={due,interval,ease:clamp(2.5-(difficulty-5)*.05,1.3,3.2),reps,lapses,lastRating:rating,lastReview:now,stability,difficulty,elapsedDays:elapsed,stateVersion:6,signalScores};
  all[id]=state;write(all);
  void persistReviewState(id,state as unknown as Record<string,unknown>);
  void persistReviewLog({itemId:id,rating,...(options?.signal?{signal:options.signal}:{}),retentionTarget:options?.retention??DEFAULT_RETENTION,elapsedDays:elapsed,stability,difficulty,dueAt:due,reviewedAt:now,state:state as unknown as Record<string,unknown>});
  void appendLearningEvent({itemId:id,...(options?.signal?{skill:options.signal,signal:(g===1?1:g===2?.35:-.15)}:{}),rating,payload:{state,stability,difficulty,interval,lapses}});
  return state;
}

export function recordLearningSignal(id:string,signal:LearningSignal,weight=1){
  const all=read();const s=getReviewState(id);const scores={...(s.signalScores||{})};scores[signal]=clamp((scores[signal]||0)+clamp(weight,-2,2),-5,5);all[id]={...s,signalScores:scores,stateVersion:6};write(all);void appendLearningEvent({itemId:id,skill:signal,signal:weight,payload:{kind:'learning-signal'}});return all[id];
}

export function getDueItems(items:LanguageBankItem[],now=Date.now()):LanguageBankItem[]{
  const store=read();
  return items.filter(x=>(store[x.id]?.due||0)<=now).sort((a,b)=>adaptivePriority(b.id,now)-adaptivePriority(a.id,now));
}

export function adaptivePriority(id:string,now=Date.now()){
  const s=getReviewState(id); if(!s.lastReview)return 100;
  const overdue=Math.max(0,now-s.due)/DAY; const difficulty=(s.difficulty-1)/9; const lapse=Math.min(3,s.lapses)*1.5;
  const signals=Object.values(s.signalScores||{}).reduce((a,v)=>a+(v||0),0);
  return overdue*4+difficulty*3+lapse-Math.max(0,signals);
}

export function getLearningStats(items:LanguageBankItem[]){
  const store=read(); const now=Date.now(); let due=0,reviewed=0,learned=0; const days=new Set<string>(); let totalStability=0,totalDifficulty=0,lapses=0;
  for(const x of items){const s=store[x.id];if(!s)due++;else{reviewed++;totalStability+=s.stability;totalDifficulty+=s.difficulty;lapses+=s.lapses;if((s.due||0)>now)learned++;else due++;if(s.lastReview)days.add(new Date(s.lastReview).toLocaleDateString('en-CA'));}}
  let streak=0;for(let i=0;i<365;i++){const d=new Date(now-i*DAY).toLocaleDateString('en-CA');if(days.has(d))streak++;else if(i>0)break;}
  return {total:items.length,due,reviewed,learned,streak,averageStability:reviewed?Number((totalStability/reviewed).toFixed(2)):0,averageDifficulty:reviewed?Number((totalDifficulty/reviewed).toFixed(2)):0,lapses};
}

export function getLearningInsights(items:LanguageBankItem[]){
  const stats=getLearningStats(items);const due=getDueItems(items).slice(0,20);const weakest=items.map(x=>({x,p:adaptivePriority(x.id)})).sort((a,b)=>b.p-a.p).slice(0,10).map(x=>x.x);
  return {stats,recommended:due,weakest,retentionTarget:DEFAULT_RETENTION,algorithm:'FSRS-6'};
}
export function nextDueText(id:string){const s=getReviewState(id);if(!s.due)return 'جدید';const diff=s.due-Date.now();if(diff<=0)return 'اکنون';if(diff<3600000)return `تا ${Math.ceil(diff/60000)} دقیقه دیگر`;if(diff<DAY)return `تا ${Math.ceil(diff/3600000)} ساعت دیگر`;return `تا ${Math.ceil(diff/DAY)} روز دیگر`;}
export async function getLearningOptimizerReport(){
  const analytics=await getLearningReviewAnalytics();
  const observed=analytics.successRate;
  // FSRS guidance is to choose a retention target rather than hand-tune its 21 parameters.
  // We therefore optimize only the target in a conservative 0.85..0.95 range.
  const recommendedRetention=analytics.total<20?DEFAULT_RETENTION:Math.max(0.85,Math.min(0.95,0.88+observed*0.08));
  return {algorithm:'FSRS-6',totalReviews:analytics.total,successRate:Number(observed.toFixed(3)),lapseRate:Number(analytics.lapseRate.toFixed(3)),currentRetentionTarget:DEFAULT_RETENTION,recommendedRetention:Number(recommendedRetention.toFixed(3)),confidence:Math.min(1,analytics.total/100),reason:analytics.total<20?'داده کافی برای بهینه‌سازی نیست؛ مقدار 0.90 حفظ شود.':'هدف نگهداری بر اساس نرخ موفقیت مشاهده‌شده تنظیم شده؛ پارامترهای اصلی FSRS دست‌کاری نمی‌شوند.'};
}

export function exportLearningState(){return JSON.stringify({version:6,algorithm:'FSRS-6',retention:DEFAULT_RETENTION,items:read()},null,2);}
