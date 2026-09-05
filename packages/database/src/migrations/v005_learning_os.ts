import type { Migration } from './Migration';

/** v5: Learning OS event ledger, FSRS tuning telemetry and runtime benchmark history. */
export const migration005LearningOS: Migration = {
  version: 5,
  name: 'learning_os_event_ledger_and_runtime_benchmarks',
  async up(database) {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS learning_review_log (
        id TEXT PRIMARY KEY NOT NULL,
        item_id TEXT NOT NULL,
        rating TEXT NOT NULL,
        signal TEXT,
        retention_target REAL NOT NULL DEFAULT 0.90,
        elapsed_days REAL NOT NULL DEFAULT 0,
        stability REAL NOT NULL DEFAULT 0,
        difficulty REAL NOT NULL DEFAULT 0,
        due_at INTEGER NOT NULL,
        reviewed_at INTEGER NOT NULL,
        state_json TEXT NOT NULL
      )
    `);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_learning_review_log_item_time ON learning_review_log(item_id, reviewed_at)`);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_learning_review_log_rating_time ON learning_review_log(rating, reviewed_at)`);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS runtime_benchmarks (
        id TEXT PRIMARY KEY NOT NULL,
        runtime TEXT NOT NULL,
        model_path TEXT NOT NULL,
        backend TEXT,
        ok INTEGER NOT NULL DEFAULT 0,
        elapsed_ms INTEGER NOT NULL DEFAULT 0,
        output_chars INTEGER NOT NULL DEFAULT 0,
        chars_per_second REAL NOT NULL DEFAULT 0,
        error TEXT,
        created_at TEXT NOT NULL
      )
    `);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_runtime_benchmarks_runtime_time ON runtime_benchmarks(runtime, created_at)`);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS endpoint_route_events (
        id TEXT PRIMARY KEY NOT NULL,
        endpoint_id TEXT NOT NULL,
        capability TEXT NOT NULL,
        ok INTEGER NOT NULL,
        latency_ms INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        created_at TEXT NOT NULL
      )
    `);
    await database.execute(`CREATE INDEX IF NOT EXISTS idx_endpoint_route_events_endpoint_time ON endpoint_route_events(endpoint_id, created_at)`);
  }
};
