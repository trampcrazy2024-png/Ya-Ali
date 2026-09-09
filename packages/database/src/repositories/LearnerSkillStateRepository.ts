import { BaseRepository } from './BaseRepository';
import type { SkillDimensions, SkillEvidence } from '@yaali/core';

/**
 * LAILI Phase 1 (see migrations/v010_laili_phase1.ts). Additive alongside
 * AdaptiveLearningRepository's existing skill_vectors table — this is the
 * new, richer, per-dimension model, not a replacement.
 */
export class LearnerSkillStateRepository extends BaseRepository {
  async getSkillState(learnerId: string, skill: string): Promise<SkillDimensions | null> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT recognition,recall,controlled_production,free_production,contextual_use,automatic_use,confidence
       FROM learner_skill_state WHERE learner_id=? AND skill=? LIMIT 1`,
      [learnerId, skill]
    );
    const row = rows[0];
    if (!row) return null;
    return {
      recognition: Number(row.recognition ?? 0),
      recall: Number(row.recall ?? 0),
      controlledProduction: Number(row.controlled_production ?? 0),
      freeProduction: Number(row.free_production ?? 0),
      contextualUse: Number(row.contextual_use ?? 0),
      automaticUse: Number(row.automatic_use ?? 0),
      confidence: Number(row.confidence ?? 0),
    };
  }

  async saveSkillState(learnerId: string, skill: string, dims: SkillDimensions): Promise<void> {
    await this.execute(
      `INSERT OR REPLACE INTO learner_skill_state
        (learner_id,skill,recognition,recall,controlled_production,free_production,contextual_use,automatic_use,confidence,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [learnerId, skill, dims.recognition, dims.recall, dims.controlledProduction, dims.freeProduction,
       dims.contextualUse, dims.automaticUse, dims.confidence, new Date().toISOString()]
    );
  }

  async listSkillStates(learnerId: string): Promise<Array<SkillDimensions & { skill: string }>> {
    const rows = await this.query<Record<string, unknown>>(
      `SELECT skill,recognition,recall,controlled_production,free_production,contextual_use,automatic_use,confidence
       FROM learner_skill_state WHERE learner_id=?`,
      [learnerId]
    );
    return rows.map(row => ({
      skill: String(row.skill),
      recognition: Number(row.recognition ?? 0),
      recall: Number(row.recall ?? 0),
      controlledProduction: Number(row.controlled_production ?? 0),
      freeProduction: Number(row.free_production ?? 0),
      contextualUse: Number(row.contextual_use ?? 0),
      automaticUse: Number(row.automatic_use ?? 0),
      confidence: Number(row.confidence ?? 0),
    }));
  }

  async appendEvidence(evidence: SkillEvidence): Promise<void> {
    await this.execute(
      `INSERT INTO skill_evidence
        (id,learner_id,skill,source,target_detected,meaning,grammar,naturalness,context,confidence,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        evidence.id, evidence.learnerId, evidence.skill, evidence.source,
        evidence.targetDetected === undefined ? null : (evidence.targetDetected ? 1 : 0),
        evidence.meaning ?? null, evidence.grammar ?? null, evidence.naturalness ?? null, evidence.context ?? null,
        evidence.confidence, evidence.createdAt,
      ]
    );
  }
}
