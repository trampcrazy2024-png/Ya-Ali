import type { SkillName, SkillVector } from './types';

export interface LearningCandidate {
  id: string;
  level?: string;
  skills: string[];
  difficulty?: number;
  due?: boolean;
  relevance?: number;
  recentPerformance?: number;
}

export interface LearningRecommendation {
  id: string;
  score: number;
  reasons: string[];
  focusSkills: SkillName[];
}

const SKILL_NAMES: SkillName[] = [
  'vocabulary', 'grammar', 'fluency', 'comprehension', 'listening',
  'speaking', 'writing', 'pronunciation', 'taskCompletion', 'appropriateness'
];

export function weakestSkills(vector: SkillVector, limit = 3): SkillName[] {
  return [...SKILL_NAMES]
    .sort((a, b) => (vector.scores[a] ?? 0.5) - (vector.scores[b] ?? 0.5))
    .slice(0, Math.max(1, limit));
}

export function rankLearningCandidates(
  vector: SkillVector,
  candidates: LearningCandidate[],
  limit = 5
): LearningRecommendation[] {
  const weak = weakestSkills(vector, 3);
  return candidates
    .map((candidate) => {
      const matched = candidate.skills
        .map((skill) => normalizeSkill(skill))
        .filter((skill): skill is SkillName => skill !== undefined && weak.includes(skill));
      const weaknessBoost = matched.length * 0.25;
      const dueBoost = candidate.due ? 0.2 : 0;
      const relevance = clamp01(candidate.relevance ?? 0.5) * 0.2;
      const performancePenalty = (1 - clamp01(candidate.recentPerformance ?? 0.5)) * 0.15;
      const difficultyFit = difficultyFitScore(candidate.difficulty ?? 0.5, matched.length > 0);
      const score = weaknessBoost + dueBoost + relevance + performancePenalty + difficultyFit;
      const reasons = [
        ...(matched.length ? [`weak-skill match: ${matched.join(', ')}`] : []),
        ...(candidate.due ? ['review is due'] : []),
        ...(relevance >= 0.12 ? ['high contextual relevance'] : []),
        ...(performancePenalty >= 0.08 ? ['recent performance needs reinforcement'] : [])
      ];
      return { id: candidate.id, score, reasons, focusSkills: matched.length ? matched : weak.slice(0, 1) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit));
}

function normalizeSkill(value: string): SkillName | undefined {
  const aliases: Record<string, SkillName> = {
    vocabulary: 'vocabulary', grammar: 'grammar', fluency: 'fluency', comprehension: 'comprehension',
    listening: 'listening', speaking: 'speaking', writing: 'writing', pronunciation: 'pronunciation',
    taskCompletion: 'taskCompletion', task_completion: 'taskCompletion', appropriateness: 'appropriateness'
  };
  return aliases[value];
}

function difficultyFitScore(difficulty: number, hasWeakSkillMatch: boolean): number {
  const normalized = clamp01(difficulty);
  return hasWeakSkillMatch ? 0.15 * (1 - normalized * 0.35) : 0.05 * (1 - normalized);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
