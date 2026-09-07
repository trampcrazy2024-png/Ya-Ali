import { BaseRepository } from './BaseRepository';
import type { ScenarioDefinition } from '@yaali/core';

export class ScenarioRepository extends BaseRepository {
  async upsert(definition: ScenarioDefinition, source = 'yaali-authored scenario library'): Promise<void> {
    await this.execute(`INSERT OR REPLACE INTO scenario_definitions(id,version,title,level,dialects_json,definition_json,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,[
      definition.id,definition.version,definition.title,definition.level,JSON.stringify(definition.dialects),JSON.stringify(definition),source,new Date().toISOString(),new Date().toISOString()
    ]);
  }

  async get(id: string, version?: number): Promise<ScenarioDefinition | null> {
    const rows = await this.query<{definition_json:string}>(version == null
      ? `SELECT definition_json FROM scenario_definitions WHERE id=? ORDER BY version DESC LIMIT 1`
      : `SELECT definition_json FROM scenario_definitions WHERE id=? AND version=? LIMIT 1`, version == null ? [id] : [id,version]);
    return rows[0] ? JSON.parse(rows[0].definition_json) as ScenarioDefinition : null;
  }
}
