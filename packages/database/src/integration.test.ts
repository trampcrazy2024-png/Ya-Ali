import { describe, expect, it } from 'vitest';
import { MigrationRunner } from './migrations/MigrationRunner';
import { migration008LearningFeatures } from './migrations/v008_learning_features';
import { AdaptiveLearningRuntimeRepository } from './repositories/AdaptiveLearningRepository';

class MemoryDb {
  statements:string[]=[];
  rows:Record<string,unknown>[]=[];
  async execute(sql:string,values:unknown[]=[]){this.statements.push(sql);return {changes:1};}
  async query(sql:string){this.statements.push(sql);return {values:[]};}
  async transaction(cb:(db:any)=>Promise<void>){await cb(this);}
}

describe('database-learning integration contract',()=>{
  it('runs v8 schema and repository SQL through the same executor contract',async()=>{
    const db:any=new MemoryDb();
    await new MigrationRunner(db).run([migration008LearningFeatures]);
    const repo=new AdaptiveLearningRuntimeRepository(db);
    await repo.appendLearnerEvent({id:'e1',learnerId:'u1',skill:'grammar',signal:'score',value:.8,createdAt:new Date().toISOString()});
    await repo.saveEvaluation({id:'ev1',sessionId:'s1',overall:.8,dimensions:{grammar:.8},corrections:[],strengths:['grammar'],nextActions:['practice'],createdAt:new Date().toISOString()});
    expect(db.statements.some((x:string)=>x.includes('research_reports'))).toBe(true);
    expect(db.statements.some((x:string)=>x.includes('learner_events'))).toBe(true);
    expect(db.statements.some((x:string)=>x.includes('evaluations'))).toBe(true);
  });
});
