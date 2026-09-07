import type { SkillName, SkillVector } from './types';
import type { ScenarioDefinition, DecisionSignal } from '../scenarios/types';
import { weakestSkills } from './recommendation';

export type ScenarioGenerationBrief = {
  focusSkills:SkillName[];
  level:string;
  dialect:string;
  vocabulary:string[];
  constraints:string[];
  reason:string[];
};

export function buildAdaptiveScenarioBrief(vector:SkillVector, opts:{level?:string;dialect?:string;weakVocabulary?:string[];limit?:number}={}):ScenarioGenerationBrief {
  const focusSkills=weakestSkills(vector,opts.limit??3);
  return { focusSkills, level:opts.level||'adaptive', dialect:opts.dialect||'target', vocabulary:(opts.weakVocabulary||[]).slice(0,12), constraints:['natural spoken language','one clear learning objective','avoid unnecessary difficulty'], reason:focusSkills.map((s:SkillName)=>`weak-skill:${s}`) };
}

export interface AdaptiveScenarioGenerationOptions {
  id?:string;
  title?:string;
  level?:string;
  dialect?:string;
  vocabulary?:string[];
  context?:string;
  learnerRole?:string;
  partnerRole?:string;
}

function skillToGoal(skill:SkillName):string {
  const map:Partial<Record<SkillName,string>>={grammar:'produce accurate grammar',vocabulary:'use target vocabulary naturally',fluency:'respond without long pauses',pronunciation:'produce clearer target sounds'};
  return map[skill] || `improve ${skill}`;
}

/** Deterministically emits a new scenario JSON from the current Skill Vector. */
export function generateAdaptiveScenario(vector:SkillVector, opts:AdaptiveScenarioGenerationOptions={}):ScenarioDefinition {
  const brief=buildAdaptiveScenarioBrief(vector,{...(opts.level?{level:opts.level}:{}),...(opts.dialect?{dialect:opts.dialect}:{}),...(opts.vocabulary?{weakVocabulary:opts.vocabulary}:{})});
  const id=opts.id || `adaptive_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const skills:SkillName[]=brief.focusSkills.length?brief.focusSkills:['vocabulary'];
  const vocab=brief.vocabulary.length?brief.vocabulary:['hello','please','today'];
  const objective=`Practice ${skills.join(', ')} in ${brief.dialect} using ${vocab.slice(0,5).join(', ')}.`;
  const successSignals:DecisionSignal[]=[
    {type:'goalAchievement',threshold:.7,weight:1},
    {type:'skill',skill:skills[0]!,threshold:.6,weight:1}
  ];
  const states=['opening','active','challenge','success','completed'];
  const transitions=[
    {from:'opening',to:'active',signals:[{type:'intent',value:'meaningful_response',weight:1}] as DecisionSignal[]},
    {from:'active',to:'challenge',signals:[{type:'custom',name:'core_objective_attempted',weight:1}] as DecisionSignal[]},
    {from:'challenge',to:'success',signals:successSignals},
    {from:'success',to:'completed',signals:[{type:'goalAchievement',threshold:.9,weight:1}] as DecisionSignal[]}
  ];
  return {
    id,version:1,title:opts.title||`Adaptive practice: ${skills[0]!}`,
    level:brief.level || 'adaptive',dialects:[brief.dialect || 'target'],context:opts.context||'A realistic everyday conversation generated from learner weaknesses',
    learnerRole:opts.learnerRole||'Learner',partnerRole:opts.partnerRole||'Conversation partner',
    persona:'Respond naturally and create realistic pressure',
    goals:[objective,...skills.slice(1).map(skill => skillToGoal(skill as SkillName))],constraints:brief.constraints,
    successCriteria:['uses at least one target item','responds to the challenge','communicates the intended meaning'],
    states,transitions,skills,tags:['adaptive','generated','skill-vector']
  };
}

export function validateGeneratedScenario(s:ScenarioDefinition):string[] {
  const errors:string[]=[];
  if(!s.id||!s.title) errors.push('scenario id/title required');
  if(s.goals.length===0) errors.push('at least one goal required');
  if(s.skills.length===0) errors.push('at least one skill required');
  if(s.states.length<2) errors.push('at least two states required');
  if(s.transitions.length<1) errors.push('at least one transition required');
  if(s.dialects.length===0) errors.push('at least one dialect required');
  return errors;
}
