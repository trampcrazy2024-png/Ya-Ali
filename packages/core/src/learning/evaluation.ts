import type { TurnEvaluation } from './types';

const DEFAULT_WEIGHTS = { languageAccuracy: 0.18, fluency: 0.14, vocabulary: 0.12, taskCompletion: 0.18, intent: 0.12, appropriateness: 0.1, grammar: 0.08, pronunciation: 0.08 };

export function evaluateTurn(scores: Partial<Record<keyof typeof DEFAULT_WEIGHTS, number>>, corrections: string[] = []): TurnEvaluation {
  const dimensions = Object.entries(DEFAULT_WEIGHTS).map(([name, weight]) => ({ name, weight, score: clamp(scores[name as keyof typeof DEFAULT_WEIGHTS] ?? 0.5) }));
  const overall = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / dimensions.reduce((sum,d) => sum+d.weight,0);
  return { overall, dimensions, corrections, strengths: dimensions.filter(d => d.score >= 0.8).map(d => d.name), nextActions: dimensions.filter(d => d.score < 0.6).sort((a,b)=>a.score-b.score).slice(0,3).map(d=>`improve:${d.name}`) };
}
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
