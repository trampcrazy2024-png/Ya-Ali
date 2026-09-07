export type SkillName = 'vocabulary' | 'grammar' | 'fluency' | 'comprehension' | 'listening' | 'speaking' | 'writing' | 'pronunciation' | 'taskCompletion' | 'appropriateness';

export interface SkillVector {
  learnerId: string;
  updatedAt: string;
  scores: Partial<Record<SkillName, number>>;
  confidence: Partial<Record<SkillName, number>>;
}

export interface LearnerProfile {
  id: string;
  targetLanguage: string;
  dialect?: string;
  level?: string;
  goals: string[];
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LearningEvent {
  id: string;
  learnerId: string;
  sessionId?: string;
  skill?: SkillName;
  signal: string;
  value?: number;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface EvaluationDimension {
  name: string;
  score: number;
  weight: number;
  evidence?: string[];
}

export interface TurnEvaluation {
  overall: number;
  dimensions: EvaluationDimension[];
  corrections: string[];
  strengths: string[];
  nextActions: string[];
}
