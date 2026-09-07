import { decideNextState, evaluateTurn, applyEvaluation, type ScenarioContext, type ScenarioDefinition, type SkillVector, type TurnEvaluation } from '@yaali/core';
import { AdaptiveLearningRepository, ScenarioRepository } from '@yaali/database';
import { getDatabaseManager } from '../languageBank';

export interface RuntimeTurnResult { evaluation: TurnEvaluation; nextState: string; goalProgress: number; }

export async function evaluateScenarioTurn(
  context: ScenarioContext,
  learnerId: string,
  skillVector: SkillVector,
  scores: Parameters<typeof evaluateTurn>[0],
  signals: Record<string, number | boolean | string>,
  corrections: string[] = []
): Promise<RuntimeTurnResult> {
  const evaluation = evaluateTurn(scores, corrections);
  const decision = decideNextState(context, signals);
  const progress = Math.max(context.goalProgress, Number(signals.goalAchievement ?? 0));
  const result = applyEvaluation(skillVector, evaluation, learnerId);
  const db = await getDatabaseManager();
  const repo = new AdaptiveLearningRepository(db);
  await repo.saveSkillVector(result.vector);
  for (const event of result.events) await repo.appendLearnerEvent(event);
  return { evaluation, nextState: decision.nextState, goalProgress: progress };
}

export function scenarioFromLibrary(input: {
  id: string; version?: number; title: string; level: string; dialects: string[]; context: string; learnerRole: string; partnerRole: string; persona: string; goals: string[]; constraints: string[]; successCriteria?: string[]; states?: string[]; skills?: string[]; tags?: string[];
}): ScenarioDefinition {
  return { id: input.id, version: input.version ?? 1, title: input.title, level: input.level, dialects: input.dialects, context: input.context, learnerRole: input.learnerRole, partnerRole: input.partnerRole, persona: input.persona, goals: input.goals, constraints: input.constraints, successCriteria: input.successCriteria ?? [], states: input.states ?? ['opening','active','success','completed'], transitions: [], skills: input.skills ?? [], tags: input.tags ?? [] };
}

export async function syncScenarioDefinition(definition: ScenarioDefinition): Promise<void> { const db=await getDatabaseManager(); await new ScenarioRepository(db).upsert(definition); }
