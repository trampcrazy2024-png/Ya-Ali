import type { Migration } from './Migration';
export const migration009AdaptiveVoice: Migration = {
  version: 9,
  name: 'adaptive_voice_telemetry',
  async up(database) {
    await database.execute(`CREATE TABLE IF NOT EXISTS micro_challenges (
      id TEXT PRIMARY KEY NOT NULL, learner_id TEXT NOT NULL, skill TEXT NOT NULL,
      type TEXT NOT NULL, title TEXT NOT NULL, instruction TEXT NOT NULL,
      target_seconds INTEGER NOT NULL, difficulty REAL NOT NULL, target_items_json TEXT NOT NULL,
      success_metric TEXT NOT NULL, created_at TEXT NOT NULL, completed_at TEXT
    )`);
    await database.execute('CREATE INDEX IF NOT EXISTS idx_micro_challenges_learner_time ON micro_challenges(learner_id, created_at)');
    await database.execute(`CREATE TABLE IF NOT EXISTS privacy_telemetry_daily (
      day TEXT PRIMARY KEY NOT NULL, stt_count INTEGER NOT NULL DEFAULT 0, stt_ms INTEGER NOT NULL DEFAULT 0,
      tts_count INTEGER NOT NULL DEFAULT 0, tts_ms INTEGER NOT NULL DEFAULT 0,
      inference_count INTEGER NOT NULL DEFAULT 0, inference_ms INTEGER NOT NULL DEFAULT 0,
      failures INTEGER NOT NULL DEFAULT 0, crash_count INTEGER NOT NULL DEFAULT 0
    )`);
  }
};
