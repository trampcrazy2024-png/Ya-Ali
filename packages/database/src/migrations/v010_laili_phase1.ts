import type { Migration } from './Migration';

/**
 * v10 — LAILI Phase 1 (report "LAILI — Langua Adaptive Learning
 * Intelligence"): the multidimensional Learner Model (§6-8) and its
 * Evidence log (§9).
 *
 * This is purely additive, per the report's own Phase-0/§35 rule
 * ("Existing RC1 → Still Builds → Still Runs → New LAILI Layer"):
 *  - `skill_vectors` (flat per-skill scores, v6) is untouched and keeps
 *    being what `weakestSkills` / `applyEvaluation` / the adaptive-scenario
 *    button use today.
 *  - `learner_skill_state` is the NEW, separate, richer model — one row
 *    per (learner, skill) with the seven LAILI dimensions (§7). Per §8,
 *    "Skill State ≠ FSRS State"; this file adds the skill-state side only,
 *    it does not touch FSRS/review scheduling.
 *  - `skill_evidence` is the append-only log every interaction should
 *    produce (§9) — the raw material `learner_skill_state` is derived from.
 */
export const migration010LailiPhase1: Migration = {
  version: 10,
  name: 'laili_learner_model_phase1',
  async up(database) {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS learner_skill_state (
        learner_id TEXT NOT NULL,
        skill TEXT NOT NULL,
        recognition REAL NOT NULL DEFAULT 0,
        recall REAL NOT NULL DEFAULT 0,
        controlled_production REAL NOT NULL DEFAULT 0,
        free_production REAL NOT NULL DEFAULT 0,
        contextual_use REAL NOT NULL DEFAULT 0,
        automatic_use REAL NOT NULL DEFAULT 0,
        confidence REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (learner_id, skill)
      )
    `);
    await database.execute(`
      CREATE TABLE IF NOT EXISTS skill_evidence (
        id TEXT PRIMARY KEY NOT NULL,
        learner_id TEXT NOT NULL,
        skill TEXT NOT NULL,
        source TEXT NOT NULL,
        target_detected INTEGER,
        meaning REAL,
        grammar REAL,
        naturalness REAL,
        context REAL,
        confidence REAL NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    await database.execute('CREATE INDEX IF NOT EXISTS idx_skill_evidence_learner_time ON skill_evidence(learner_id, created_at)');
    await database.execute('CREATE INDEX IF NOT EXISTS idx_skill_evidence_skill_time ON skill_evidence(skill, created_at)');
  }
};
