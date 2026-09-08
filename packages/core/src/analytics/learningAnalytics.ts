import type { SkillVector } from '../learning/types';
export type LearningSessionMetric={date:string;minutes:number;items:number;score:number};
export function summarizeLearning(sessions:LearningSessionMetric[],vector:SkillVector){
  const totalMinutes=sessions.reduce((s,x)=>s+x.minutes,0); const avgScore=sessions.length?sessions.reduce((s,x)=>s+x.score,0)/sessions.length:0;
  const strongest=Object.entries(vector.scores).sort((a,b)=>(b[1]??0)-(a[1]??0)).slice(0,3).map(([skill,score])=>({skill,score:score??0}));
  const weakest=Object.entries(vector.scores).sort((a,b)=>(a[1]??0)-(b[1]??0)).slice(0,3).map(([skill,score])=>({skill,score:score??0}));
  return {totalMinutes,avgScore,strongest,weakest,sessions:sessions.length};
}
