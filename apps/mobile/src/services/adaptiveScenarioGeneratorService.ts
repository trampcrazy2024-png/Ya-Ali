import { generateAdaptiveScenario, validateGeneratedScenario, type SkillVector } from '@yaali/core';
import { AdaptiveLearningRepository } from '@yaali/database';
import { getDatabaseManager } from '../languageBank';

export async function generateAndPersistAdaptiveScenario(learnerId:string,vector:SkillVector,options:{dialect?:string;level?:string;vocabulary?:string[]}={}){
  const definition=generateAdaptiveScenario(vector,{dialect:options.dialect,level:options.level,vocabulary:options.vocabulary});
  const errors=validateGeneratedScenario(definition);
  if(errors.length) throw new Error(`Generated scenario invalid: ${errors.join(', ')}`);
  const db=await getDatabaseManager();
  await new AdaptiveLearningRepository(db).saveAdaptiveScenario({id:definition.id,learnerId,source:'skill-vector-v1',focusSkills:definition.skills,definition:definition as unknown as Record<string,unknown>,createdAt:new Date().toISOString()});
  return definition;
}
