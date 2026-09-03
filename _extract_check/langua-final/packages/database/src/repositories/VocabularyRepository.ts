import { BaseRepository } from './BaseRepository';

export interface Vocabulary {
  id: string;
  language: string;
  dialect: string;
  word: string;
  meaning?: string;
  example?: string;
  level?: string;
  created_at: string;
}

export interface LanguageBankItem {
  id: string;
  kind: 'word' | 'phrase' | 'example';
  source_language: string;
  target_language: string;
  dialect?: string;
  text: string;
  normalized_text: string;
  translation?: string;
  transliteration?: string;
  pronunciation?: string;
  definition?: string;
  part_of_speech?: string;
  level?: string;
  topic?: string;
  tags?: string;
  synonyms?: string;
  antonyms?: string;
  speaker_gender?: string;
  listener_gender?: string;
  example_text?: string;
  example_translation?: string;
  source?: string;
  favorite?: number;
  learned?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export class VocabularyRepository extends BaseRepository {
  async create(vocabulary: Vocabulary): Promise<void> {
    await this.execute(
      `INSERT INTO vocabulary
       (id, language, dialect, word, meaning, example, level, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [vocabulary.id, vocabulary.language, vocabulary.dialect, vocabulary.word,
       vocabulary.meaning ?? null, vocabulary.example ?? null,
       vocabulary.level ?? null, vocabulary.created_at]
    );
  }

  async search(word: string): Promise<Vocabulary[]> {
    return this.query<Vocabulary>(
      `SELECT * FROM vocabulary
       WHERE word LIKE ?
       ORDER BY word COLLATE NOCASE ASC LIMIT 200`,
      [`%${word}%`]
    );
  }

  async upsertLanguageItem(item: LanguageBankItem): Promise<void> {
    await this.execute(
      `INSERT OR REPLACE INTO language_items
       (id,kind,source_language,target_language,dialect,text,normalized_text,
        translation,transliteration,pronunciation,definition,part_of_speech,level,
        topic,tags,synonyms,antonyms,speaker_gender,listener_gender,example_text,
        example_translation,source,favorite,learned,notes,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        item.id,item.kind,item.source_language,item.target_language,item.dialect ?? null,
        item.text,item.normalized_text,item.translation ?? null,item.transliteration ?? null,
        item.pronunciation ?? null,item.definition ?? null,item.part_of_speech ?? null,
        item.level ?? null,item.topic ?? null,item.tags ?? null,item.synonyms ?? null,
        item.antonyms ?? null,item.speaker_gender ?? null,item.listener_gender ?? null,
        item.example_text ?? null,item.example_translation ?? null,item.source ?? null,
        item.favorite ?? 0,item.learned ?? 0,item.notes ?? null,item.created_at,item.updated_at
      ]
    );
    await this.execute(`DELETE FROM language_items_fts WHERE item_id = ?`, [item.id]);
    await this.execute(
      `INSERT INTO language_items_fts
       (item_id,text,normalized_text,translation,transliteration,definition,tags)
       VALUES (?,?,?,?,?,?,?)`,
      [item.id,item.text,item.normalized_text,item.translation ?? '',
       item.transliteration ?? '',item.definition ?? '',item.tags ?? '']
    );
  }

  async searchLanguageItems(query: string, limit = 100): Promise<LanguageBankItem[]> {
    const q = query.trim();
    if (!q) return this.query<LanguageBankItem>(
      `SELECT * FROM language_items ORDER BY updated_at DESC LIMIT ?`, [limit]
    );
    try {
      return this.query<LanguageBankItem>(
        `SELECT li.* FROM language_items li
         JOIN language_items_fts f ON f.item_id = li.id
         WHERE language_items_fts MATCH ?
         ORDER BY rank LIMIT ?`,
        [q.replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + '*', limit]
      );
    } catch {
      return this.query<LanguageBankItem>(
        `SELECT * FROM language_items
         WHERE normalized_text LIKE ? OR text LIKE ? OR translation LIKE ?
         ORDER BY updated_at DESC LIMIT ?`,
        [`%${q}%`,`%${q}%`,`%${q}%`,limit]
      );
    }
  }
}
