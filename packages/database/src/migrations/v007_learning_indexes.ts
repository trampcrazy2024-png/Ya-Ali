import type { Migration } from './Migration';

/** v7: query/index hardening for the adaptive learning runtime. */
export const migration007LearningIndexes: Migration = {
  version: 7,
  name: 'adaptive_learning_query_indexes',
  async up(database) {
    await database.execute('CREATE INDEX IF NOT EXISTS idx_scenario_turns_session_turn ON scenario_turns(session_id, turn_index)');
    await database.execute('CREATE INDEX IF NOT EXISTS idx_evaluations_session_turn ON evaluations(session_id, turn_id)');
    await database.execute('CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at)');
    await database.execute('CREATE INDEX IF NOT EXISTS idx_corpus_items_type_language ON corpus_items(item_type, language)');
  }
};
