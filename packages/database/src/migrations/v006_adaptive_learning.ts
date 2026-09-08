import type { Migration } from './Migration';

/** v6: normalized corpus, scenario runtime, evaluations, skills and learner events. */
export const migration006AdaptiveLearning: Migration = {
  version: 6,
  name: 'adaptive_learning_platform_foundation',
  async up(database) {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS corpus_items (
        id TEXT PRIMARY KEY NOT NULL,
        item_type TEXT NOT NULL CHECK(item_type IN ('word','phrase','sentence','dialogue','audio')),
        language TEXT NOT NULL,
        dialect TEXT,
        text TEXT NOT NULL,
        normalized_text TEXT NOT NULL,
        translation TEXT,
        pos TEXT,
        estimated_level TEXT,
        level_confidence REAL,
        level_method TEXT,
        source TEXT NOT NULL,
        dataset TEXT,
        dataset_version TEXT,
        license TEXT NOT NULL,
        attribution TEXT,
        source_url TEXT,
        provenance TEXT NOT NULL,
        audio_json TEXT,
        speaker_json TEXT,
        tags_json TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(language, dialect, normalized_text, source, dataset, dataset_version)
      )
    `);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_corpus_language_level ON corpus_items(language, estimated_level)`);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_corpus_dialect ON corpus_items(dialect)`);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_corpus_source ON corpus_items(source, dataset, dataset_version)`);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS learner_profiles (
        id TEXT PRIMARY KEY NOT NULL,
        target_language TEXT NOT NULL,
        dialect TEXT,
        level TEXT,
        goals_json TEXT NOT NULL DEFAULT '[]',
        preferences_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await database.execute(`
      CREATE TABLE IF NOT EXISTS skill_vectors (
        learner_id TEXT PRIMARY KEY NOT NULL,
        scores_json TEXT NOT NULL DEFAULT '{}',
        confidence_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL
      )
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS scenario_definitions (
        id TEXT PRIMARY KEY NOT NULL,
        version INTEGER NOT NULL,
        title TEXT NOT NULL,
        level TEXT NOT NULL,
        dialects_json TEXT NOT NULL,
        definition_json TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(id, version)
      )
    `);
    await database.execute(`
      CREATE TABLE IF NOT EXISTS scenario_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        learner_id TEXT NOT NULL,
        scenario_id TEXT NOT NULL,
        scenario_version INTEGER NOT NULL,
        state TEXT NOT NULL,
        turn_count INTEGER NOT NULL DEFAULT 0,
        goal_progress REAL NOT NULL DEFAULT 0,
        started_at TEXT NOT NULL,
        completed_at TEXT
      )
    `);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_scenario_sessions_learner_time ON scenario_sessions(learner_id, started_at)`);
    await database.execute(`
      CREATE TABLE IF NOT EXISTS scenario_turns (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        turn_index INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('learner','partner')),
        content TEXT NOT NULL,
        state_before TEXT,
        state_after TEXT,
        created_at TEXT NOT NULL
      )
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        turn_id TEXT,
        overall REAL NOT NULL,
        dimensions_json TEXT NOT NULL,
        corrections_json TEXT NOT NULL DEFAULT '[]',
        strengths_json TEXT NOT NULL DEFAULT '[]',
        next_actions_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      )
    `);
    await database.execute(`
      CREATE TABLE IF NOT EXISTS learner_events (
        id TEXT PRIMARY KEY NOT NULL,
        learner_id TEXT NOT NULL,
        session_id TEXT,
        skill TEXT,
        signal TEXT NOT NULL,
        value REAL,
        payload_json TEXT,
        created_at TEXT NOT NULL
      )
    `);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_learner_events_learner_time ON learner_events(learner_id, created_at)`);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_learner_events_skill_time ON learner_events(skill, created_at)`);

    await database.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS corpus_items_fts USING fts5(
        item_id UNINDEXED, text, normalized_text, translation, tags,
        tokenize='unicode61 remove_diacritics 2'
      )
    `);
  }
};
