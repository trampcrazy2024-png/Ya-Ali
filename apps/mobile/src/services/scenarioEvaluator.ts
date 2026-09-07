import { applyEvaluation, evaluateTurn } from '@yaali/core';
import { AdaptiveLearningRepository, AdaptiveLearningRuntimeRepository } from '@yaali/database';
import { getDatabaseManager } from '../languageBank';
import type { ChatMessage } from '../ai';

export interface ScenarioEvaluationInput { learnerText: string; partnerText: string; objective: string; level: string; context: string; }
export interface ScenarioEvaluationResult { overall: number; scores: Record<string, number>; corrections: string[]; strengths: string[]; nextActions: string[]; }

export async function evaluateScenarioResponse(generate: (messages: ChatMessage[]) => Promise<string>, input: ScenarioEvaluationInput): Promise<ScenarioEvaluationResult | null> {
  const prompt = `Return ONLY valid JSON. Evaluate a language learner response in a role-play. Do not invent facts. Score each 0..1: languageAccuracy, fluency, vocabulary, taskCompletion, intent, appropriateness, grammar, pronunciation. Also return corrections (max 2), strengths (max 3), nextActions (max 3). Objective: ${input.objective}. Level: ${input.level}. Context: ${input.context}. Learner: ${input.learnerText}. Partner response: ${input.partnerText}.`;
  try {
    const raw = await generate([{ role: 'system', content: prompt }]);
    const jsonText = raw.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonText) return null;
    const parsed = JSON.parse(jsonText) as any;
    const scores: Record<string, number> = {};
    for (const key of ['languageAccuracy','fluency','vocabulary','taskCompletion','intent','appropriateness','grammar','pronunciation']) scores[key] = clamp(Number(parsed[key] ?? parsed.scores?.[key] ?? 0.5));
    const evaluation = evaluateTurn(scores, arrayStrings(parsed.corrections));
    evaluation.strengths = arrayStrings(parsed.strengths).slice(0,3);
    evaluation.nextActions = arrayStrings(parsed.nextActions).slice(0,3);
    return { overall: evaluation.overall, scores, corrections: evaluation.corrections, strengths: evaluation.strengths, nextActions: evaluation.nextActions };
  } catch { return null; }
}

export function getLearnerId(): string {
  const key = 'yaali_learner_id';
  try { const existing = localStorage.getItem(key); if (existing) return existing; const id = `learner_${crypto.randomUUID()}`; localStorage.setItem(key,id); return id; } catch { return 'local-learner'; }
}

export async function persistScenarioEvaluation(learnerId: string, sessionId: string | undefined, result: ScenarioEvaluationResult): Promise<void> {
  const db = await getDatabaseManager();
  const repo = new AdaptiveLearningRepository(db);
  const runtimeRepo = new AdaptiveLearningRuntimeRepository(db);
  const existing = await repo.getSkillVector(learnerId);
  const vector = existing ?? { learnerId, updatedAt: new Date().toISOString(), scores: {}, confidence: {} };
  const evaluation = evaluateTurn(result.scores, result.corrections);
  const applied = applyEvaluation(vector, evaluation, learnerId);
  await repo.saveSkillVector(applied.vector);
  for (const event of applied.events) await repo.appendLearnerEvent({ ...event, ...(sessionId !== undefined ? { sessionId } : {}) });
  if (sessionId !== undefined) {
    await runtimeRepo.saveEvaluation({
      id: `eval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      overall: result.overall,
      dimensions: result.scores,
      corrections: result.corrections,
      strengths: result.strengths,
      nextActions: result.nextActions,
      createdAt: new Date().toISOString()
    });
  }
}

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const arrayStrings=(v:unknown)=>Array.isArray(v)?v.map(String).filter(Boolean):[];
