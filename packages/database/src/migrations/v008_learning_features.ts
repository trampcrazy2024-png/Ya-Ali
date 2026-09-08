import type { Migration } from './Migration';

/** v8: durable 1.0.5 learning features; derived analytics remain queryable from event ledgers. */
export const migration008LearningFeatures: Migration = {
  version: 8,
  name: 'learning_features_v105',
  async up(database) {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS research_reports (
        id TEXT PRIMARY KEY NOT NULL,
        learner_id TEXT,
        topic TEXT NOT NULL,
        language TEXT,
        dialect TEXT,
        objective TEXT NOT NULL,
        report_json TEXT NOT NULL,
        sources_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      )
    `);
    await database.execute('CREATE INDEX IF NOT EXISTS idx_research_reports_learner_time ON research_reports(learner_id, created_at)');

    await database.execute(`
      CREATE TABLE IF NOT EXISTS adaptive_scenarios (
        id TEXT PRIMARY KEY NOT NULL,
        learner_id TEXT NOT NULL,
        source TEXT NOT NULL,
        focus_skills_json TEXT NOT NULL,
        definition_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    await database.execute('CREATE INDEX IF NOT EXISTS idx_adaptive_scenarios_learner_time ON adaptive_scenarios(learner_id, created_at)');

    await database.execute(`
      CREATE TABLE IF NOT EXISTS pronunciation_phonemes (
        id TEXT PRIMARY KEY NOT NULL,
        learner_id TEXT NOT NULL,
        session_id TEXT,
        item_id TEXT,
        phoneme TEXT NOT NULL,
        expected TEXT,
        observed TEXT,
        score REAL NOT NULL,
        error_type TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    await database.execute('CREATE INDEX IF NOT EXISTS idx_pronunciation_phonemes_learner_time ON pronunciation_phonemes(learner_id, phoneme, created_at)');

    await database.execute(`
      CREATE TABLE IF NOT EXISTS translation_memory (
        id TEXT PRIMARY KEY NOT NULL,
        learner_id TEXT,
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        source_language TEXT NOT NULL,
        target_language TEXT NOT NULL,
        context TEXT,
        quality REAL NOT NULL DEFAULT 0.5,
        uses INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        UNIQUE(learner_id, source, target, source_language, target_language)
      )
    `);
    await database.execute('CREATE INDEX IF NOT EXISTS idx_translation_memory_lookup ON translation_memory(learner_id, source_language, target_language, source)');

    await database.execute(`
      CREATE TABLE IF NOT EXISTS grammar_mistakes (
        id TEXT PRIMARY KEY NOT NULL,
        learner_id TEXT NOT NULL,
        source_text TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        explanation TEXT NOT NULL,
        suggestion TEXT NOT NULL,
        confidence REAL NOT NULL,
        occurrences INTEGER NOT NULL DEFAULT 1,
        last_seen_at TEXT NOT NULL
      )
    `);
    await database.execute('CREATE INDEX IF NOT EXISTS idx_grammar_mistakes_learner_rule ON grammar_mistakes(learner_id, rule_id, last_seen_at)');

    await database.execute(`
      CREATE TABLE IF NOT EXISTS gamification_state (
        learner_id TEXT PRIMARY KEY NOT NULL,
        xp INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        streak_days INTEGER NOT NULL DEFAULT 0,
        badges_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL
      )
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS immersion_events (
        id TEXT PRIMARY KEY NOT NULL,
        learner_id TEXT NOT NULL,
        target_language TEXT NOT NULL,
        actual_language TEXT NOT NULL,
        minutes REAL NOT NULL DEFAULT 0,
        strict INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `);
    await database.execute('CREATE INDEX IF NOT EXISTS idx_immersion_events_learner_time ON immersion_events(learner_id, created_at)');
  }
};
