import type { LearningEvent, SkillVector } from "../learning/types";

export interface EvaluationRecord {
  id: string;
  sessionId: string;
  turnId?: string;
  overall: number;
  dimensions: Record<string, number>;
  corrections: string[];
  strengths: string[];
  nextActions: string[];
  createdAt: string;
}

export interface SkillVectorRepositoryPort {
  getSkillVector(learnerId: string): Promise<SkillVector | null>;
  saveSkillVector(vector: SkillVector): Promise<void>;
  appendLearnerEvent(event: LearningEvent & { sessionId?: string }): Promise<void>;
}

export interface ScenarioRuntimeRepositoryPort {
  appendScenarioTurn(turn: {
    id: string;
    sessionId: string;
    turnIndex: number;
    role: 'learner' | 'partner';
    content: string;
    stateBefore?: string;
    stateAfter?: string;
    createdAt: string;
  }): Promise<void>;
  saveEvaluation(evaluation: EvaluationRecord): Promise<void>;
  getRecentEvaluations(sessionId: string, limit?: number): Promise<EvaluationRecord[]>;
}
