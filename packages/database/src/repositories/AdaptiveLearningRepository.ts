import { BaseRepository } from './BaseRepository';
import type { CorpusRecord } from '@yaali/core';
import type { LearnerProfile, SkillVector, SkillVectorRepositoryPort, ScenarioRuntimeRepositoryPort } from '@yaali/core';

export class AdaptiveLearningRepository extends BaseRepository implements SkillVectorRepositoryPort {
  async upsertCorpus(record: CorpusRecord): Promise<void> {
    await this.execute(`INSERT OR REPLACE INTO corpus_items
      (id,item_type,language,dialect,text,normalized_text,translation,pos,estimated_level,level_confidence,level_method,
       source,dataset,dataset_version,license,attribution,source_url,provenance,audio_json,speaker_json,tags_json,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      record.id,record.type,record.language,record.dialect ?? null,record.text,record.normalizedText,record.translation ?? null,
      record.pos ?? null,record.estimatedLevel ?? null,record.levelConfidence ?? null,record.levelMethod ?? null,
      record.source.source,record.source.dataset ?? null,record.source.datasetVersion ?? null,record.source.license,
      record.source.attribution ?? null,record.source.url ?? null,record.source.provenance,
      record.audio ? JSON.stringify(record.audio) : null,record.speaker ? JSON.stringify(record.speaker) : null,
      record.tags ? JSON.stringify(record.tags) : null,record.createdAt
    ]);
    await this.execute('DELETE FROM corpus_items_fts WHERE item_id=?',[record.id]);
    await this.execute('INSERT INTO corpus_items_fts(item_id,text,normalized_text,translation,tags) VALUES (?,?,?,?,?)',[
      record.id,record.text,record.normalizedText,record.translation ?? '',record.tags?.join(' ') ?? ''
    ]);
  }

  async upsertLearner(profile: LearnerProfile): Promise<void> {
    await this.execute(`INSERT OR REPLACE INTO learner_profiles
      (id,target_language,dialect,level,goals_json,preferences_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?)`, [profile.id,profile.targetLanguage,profile.dialect ?? null,profile.level ?? null,
      JSON.stringify(profile.goals),JSON.stringify(profile.preferences),profile.createdAt,profile.updatedAt]);
  }

  async getSkillVector(learnerId: string): Promise<SkillVector | null> {
    const rows = await this.query<{learner_id:string;scores_json:string;confidence_json:string;updated_at:string}>(
      'SELECT learner_id,scores_json,confidence_json,updated_at FROM skill_vectors WHERE learner_id=? LIMIT 1',[learnerId]);
    const row = rows[0];
    if (!row) return null;
    return { learnerId: row.learner_id, scores: JSON.parse(row.scores_json || '{}'), confidence: JSON.parse(row.confidence_json || '{}'), updatedAt: row.updated_at };
  }

  async saveSkillVector(vector: SkillVector): Promise<void> {
    await this.execute(`INSERT OR REPLACE INTO skill_vectors(learner_id,scores_json,confidence_json,updated_at) VALUES (?,?,?,?)`,
      [vector.learnerId,JSON.stringify(vector.scores),JSON.stringify(vector.confidence),vector.updatedAt]);
  }

  async saveAdaptiveScenario(record:{id:string;learnerId:string;source:string;focusSkills:string[];definition:Record<string,unknown>;createdAt:string}): Promise<void> {
    await this.execute(`INSERT OR REPLACE INTO adaptive_scenarios(id,learner_id,source,focus_skills_json,definition_json,created_at) VALUES (?,?,?,?,?,?)`,[record.id,record.learnerId,record.source,JSON.stringify(record.focusSkills),JSON.stringify(record.definition),record.createdAt]);
  }

  async upsertScenarioSession(session: {id:string;learnerId:string;scenarioId:string;scenarioVersion:number;state:string;turnCount:number;goalProgress:number;startedAt:string;completedAt?:string}): Promise<void> {
    await this.execute(`INSERT OR REPLACE INTO scenario_sessions(id,learner_id,scenario_id,scenario_version,state,turn_count,goal_progress,started_at,completed_at) VALUES (?,?,?,?,?,?,?,?,?)`,[session.id,session.learnerId,session.scenarioId,session.scenarioVersion,session.state,session.turnCount,session.goalProgress,session.startedAt,session.completedAt ?? null]);
  }

  async appendLearnerEvent(event: {id:string;learnerId:string;sessionId?:string;skill?:string;signal:string;value?:number;payload?:Record<string,unknown>;createdAt:string}): Promise<void> {
    await this.execute(`INSERT INTO learner_events(id,learner_id,session_id,skill,signal,value,payload_json,created_at) VALUES (?,?,?,?,?,?,?,?)`,
      [event.id,event.learnerId,event.sessionId ?? null,event.skill ?? null,event.signal,event.value ?? null,event.payload ? JSON.stringify(event.payload) : null,event.createdAt]);
  }
}

export interface ScenarioTurnRecord {
  id: string;
  sessionId: string;
  turnIndex: number;
  role: 'learner' | 'partner';
  content: string;
  stateBefore?: string;
  stateAfter?: string;
  createdAt: string;
}

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

export class AdaptiveLearningRuntimeRepository extends AdaptiveLearningRepository implements ScenarioRuntimeRepositoryPort {
  async appendScenarioTurn(turn: ScenarioTurnRecord): Promise<void> {
    await this.execute(
      `INSERT INTO scenario_turns(id,session_id,turn_index,role,content,state_before,state_after,created_at) VALUES (?,?,?,?,?,?,?,?)`,
      [turn.id, turn.sessionId, turn.turnIndex, turn.role, turn.content, turn.stateBefore ?? null, turn.stateAfter ?? null, turn.createdAt]
    );
  }

  async saveEvaluation(evaluation: EvaluationRecord): Promise<void> {
    await this.execute(
      `INSERT INTO evaluations(id,session_id,turn_id,overall,dimensions_json,corrections_json,strengths_json,next_actions_json,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      [evaluation.id, evaluation.sessionId, evaluation.turnId ?? null, evaluation.overall, JSON.stringify(evaluation.dimensions), JSON.stringify(evaluation.corrections), JSON.stringify(evaluation.strengths), JSON.stringify(evaluation.nextActions), evaluation.createdAt]
    );
  }

  async getRecentEvaluations(sessionId: string, limit = 20): Promise<EvaluationRecord[]> {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    const rows = await this.query<Record<string, unknown>>(
      `SELECT id,session_id,turn_id,overall,dimensions_json,corrections_json,strengths_json,next_actions_json,created_at FROM evaluations WHERE session_id=? ORDER BY created_at DESC LIMIT ${safeLimit}`,
      [sessionId]
    );
    return rows.map((row) => ({
      id: String(row.id),
      sessionId: String(row.session_id),
      ...(row.turn_id != null ? { turnId: String(row.turn_id) } : {}),
      overall: Number(row.overall),
      dimensions: parseRecord(row.dimensions_json),
      corrections: parseStrings(row.corrections_json),
      strengths: parseStrings(row.strengths_json),
      nextActions: parseStrings(row.next_actions_json),
      createdAt: String(row.created_at)
    }));
  }
}

function parseRecord(value: unknown): Record<string, number> {
  try {
    const parsed = JSON.parse(String(value ?? '{}')) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, Number(item)]));
  } catch {
    return {};
  }
}

function parseStrings(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value ?? '[]')) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
