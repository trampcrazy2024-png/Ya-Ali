import type { Migration } from './Migration';

/**
 * v4 makes learning state durable and adds a SQLite projection for endpoint routing.
 * JSON snapshots preserve the scheduler contract while the append-only event log remains
 * the audit/source history for future event-sourced rebuilds.
 */
export const migration004LearningRuntime: Migration = {
  version: 4,
  name: 'learning_state_and_endpoint_runtime_projection',
  async up(database) {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS learning_review_states (
        item_id TEXT PRIMARY KEY NOT NULL,
        state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await database.execute(`
      CREATE INDEX IF NOT EXISTS idx_learning_review_states_updated
      ON learning_review_states(updated_at)
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS endpoint_profiles (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        base_url TEXT NOT NULL UNIQUE,
        model TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        priority INTEGER NOT NULL DEFAULT 50,
        protocols_json TEXT NOT NULL DEFAULT '[]',
        capabilities_json TEXT NOT NULL DEFAULT '[]',
        latency_ms INTEGER NOT NULL DEFAULT 99999,
        last_probe INTEGER,
        failures INTEGER NOT NULL DEFAULT 0,
        last_success INTEGER,
        last_failure INTEGER,
        updated_at TEXT NOT NULL
      )
    `);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_endpoint_profiles_enabled_priority ON endpoint_profiles(enabled, priority DESC)`);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_endpoint_profiles_health ON endpoint_profiles(last_success, failures)`);
  }
};
