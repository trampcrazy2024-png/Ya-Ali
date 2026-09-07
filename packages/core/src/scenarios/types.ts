import type { TurnEvaluation } from '../learning/types';

export type DecisionSignal =
  | { type: 'keyword'; value: string; weight?: number }
  | { type: 'intent'; value: string; weight?: number }
  | { type: 'semantic'; value: string; threshold?: number; weight?: number }
  | { type: 'goalAchievement'; threshold: number; weight?: number }
  | { type: 'skill'; skill: string; threshold: number; weight?: number }
  | { type: 'custom'; name: string; weight?: number };

export interface ScenarioDefinition {
  id: string;
  version: number;
  title: string;
  level: string;
  dialects: string[];
  context: string;
  learnerRole: string;
  partnerRole: string;
  persona: string;
  goals: string[];
  constraints: string[];
  successCriteria: string[];
  states: string[];
  transitions: Array<{ from: string; to: string; signals: DecisionSignal[] }>;
  hints?: string[];
  skills: string[];
  tags: string[];
}

export interface ScenarioContext {
  sessionId: string;
  learnerId: string;
  scenario: ScenarioDefinition;
  state: string;
  turn: number;
  transcript: Array<{ role: 'learner' | 'partner'; text: string }>;
  goalProgress: number;
  evaluations: TurnEvaluation[];
  metadata: Record<string, unknown>;
}

export interface ScenarioDecision {
  nextState: string;
  confidence: number;
  reasons: string[];
}
