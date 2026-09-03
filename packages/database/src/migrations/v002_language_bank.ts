import type { Migration } from './Migration';

export const migration002LanguageBank: Migration = {
  version: 2,
  name: 'strong_language_bank',
  async up(database) {
    await database.execute(`
      CREATE TABLE IF NOT EXISTS language_items (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('word','phrase','example')),
        source_language TEXT NOT NULL,
        target_language TEXT NOT NULL,
        dialect TEXT,
        text TEXT NOT NULL,
        normalized_text TEXT NOT NULL,
        translation TEXT,
        transliteration TEXT,
        pronunciation TEXT,
        definition TEXT,
        part_of_speech TEXT,
        level TEXT,
        topic TEXT,
        tags TEXT,
        synonyms TEXT,
        antonyms TEXT,
        speaker_gender TEXT,
        listener_gender TEXT,
        example_text TEXT,
        example_translation TEXT,
        source TEXT,
        favorite INTEGER NOT NULL DEFAULT 0,
        learned INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await database.execute(`
      CREATE INDEX IF NOT EXISTS idx_language_items_normalized
      ON language_items(normalized_text)
    `);
    await database.execute(`
      CREATE INDEX IF NOT EXISTS idx_language_items_language
      ON language_items(source_language, target_language)
    `);
    await database.execute(`
      CREATE INDEX IF NOT EXISTS idx_language_items_dialect
      ON language_items(dialect)
    `);
    await database.execute(`
      CREATE INDEX IF NOT EXISTS idx_language_items_topic
      ON language_items(topic)
    `);
    await database.execute(`
      CREATE INDEX IF NOT EXISTS idx_language_items_level
      ON language_items(level)
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS translations (
        id TEXT PRIMARY KEY NOT NULL,
        source_text TEXT NOT NULL,
        source_language TEXT NOT NULL,
        target_text TEXT NOT NULL,
        target_language TEXT NOT NULL,
        dialect TEXT,
        pronunciation TEXT,
        provider TEXT,
        created_at TEXT NOT NULL
      )
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS import_batches (
        id TEXT PRIMARY KEY NOT NULL,
        filename TEXT NOT NULL,
        format TEXT NOT NULL,
        item_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS practice_attempts (
        id TEXT PRIMARY KEY NOT NULL,
        item_id TEXT,
        prompt TEXT NOT NULL,
        answer TEXT,
        score REAL,
        result TEXT,
        created_at TEXT NOT NULL
      )
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY NOT NULL,
        layer INTEGER NOT NULL CHECK(layer IN (1,2,3)),
        memory_key TEXT NOT NULL,
        memory_value TEXT NOT NULL,
        importance REAL NOT NULL DEFAULT 0.5,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await database.execute(`
      CREATE TABLE IF NOT EXISTS conversation_turns (
        id TEXT PRIMARY KEY NOT NULL,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    await database.execute(`
      CREATE INDEX IF NOT EXISTS idx_conversation_turns_conversation
      ON conversation_turns(conversation_id, created_at)
    `);

    await database.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS language_items_fts USING fts5(
        item_id UNINDEXED,
        text,
        normalized_text,
        translation,
        transliteration,
        definition,
        tags,
        tokenize='unicode61 remove_diacritics 2'
      )
    `);
  }
};
