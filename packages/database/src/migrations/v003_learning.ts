import type { Migration } from './Migration';

/** Durable learning event log. State can be rebuilt from this append-only history. */
export const migration003Learning: Migration = {
  version: 3,
  name: 'durable_learning_events_and_dialect_state',
  async up(database) {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS learning_events (
        id TEXT PRIMARY KEY NOT NULL,
        item_id TEXT,
        dialect TEXT,
        skill TEXT,
        rating TEXT,
        signal REAL,
        payload TEXT,
        created_at TEXT NOT NULL
      )
    `);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_learning_events_item ON learning_events(item_id, created_at)`);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_learning_events_dialect ON learning_events(dialect, created_at)`);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_learning_events_skill ON learning_events(skill, created_at)`);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS dialect_learning_state (
        dialect TEXT PRIMARY KEY NOT NULL,
        mastery REAL NOT NULL DEFAULT 0,
        confidence REAL NOT NULL DEFAULT 0,
        exposure INTEGER NOT NULL DEFAULT 0,
        streak INTEGER NOT NULL DEFAULT 0,
        reviews INTEGER NOT NULL DEFAULT 0,
        successes INTEGER NOT NULL DEFAULT 0,
        skills_json TEXT NOT NULL DEFAULT '{}',
        confusions_json TEXT NOT NULL DEFAULT '{}',
        last_rating TEXT,
        last_review INTEGER,
        updated_at TEXT NOT NULL
      )
    `);
  }
};
