import type { LearningEvent, SkillName, SkillVector } from '../learning/types';
import type { TurnEvaluation } from '../learning/types';

export interface LearningLoopResult { vector: SkillVector; events: LearningEvent[]; recommendedSkills: SkillName[]; }

export function applyEvaluation(vector: SkillVector, evaluation: TurnEvaluation, learnerId = vector.learnerId): LearningLoopResult {
  const now = new Date().toISOString();
  const next: SkillVector = { ...vector, learnerId, updatedAt: now, scores: { ...vector.scores }, confidence: { ...vector.confidence } };
  const events: LearningEvent[] = [];
  for (const dimension of evaluation.dimensions) {
    const skill = mapDimension(dimension.name);
    if (!skill) continue;
    const old = next.scores[skill] ?? 0.5;
    const confidence = Math.min(1, (next.confidence[skill] ?? 0) + 0.08);
    const alpha = 0.2 + confidence * 0.2;
    next.scores[skill] = old + (dimension.score - old) * alpha;
    next.confidence[skill] = confidence;
    events.push({ id: `learn_${Date.now()}_${skill}`, learnerId, skill, signal: 'evaluation', value: dimension.score, payload: { overall: evaluation.overall }, createdAt: now });
  }
  const recommendedSkills = Object.entries(next.scores).sort((a,b)=>(a[1]??0)-(b[1]??0)).slice(0,3).map(([k])=>k as SkillName);
  return { vector: next, events, recommendedSkills };
}
function mapDimension(name:string):SkillName|undefined { const map:Record<string,SkillName>={languageAccuracy:'grammar',grammar:'grammar',fluency:'fluency',vocabulary:'vocabulary',taskCompletion:'taskCompletion',intent:'comprehension',appropriateness:'appropriateness',pronunciation:'pronunciation'}; return map[name]; }
