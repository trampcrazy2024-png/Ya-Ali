import { parseCorpusRecords, extractVocabularyCandidates, type SourceMetadata } from '@yaali/core';
import { AdaptiveLearningRepository } from '@yaali/database';
import { getDatabaseManager } from '../languageBank';

export interface CorpusImportReport { parsed: number; stored: number; candidates: number; rejected: number; }

export async function ingestCorpus(
  input: string | Array<Record<string, unknown>>,
  options: { language: string; dialect?: string; source: SourceMetadata; knownVocabulary?: Set<string>; scenarioTerms?: string[]; weakTerms?: string[] }
): Promise<CorpusImportReport> {
  const records = parseCorpusRecords(input, { source: options.source, language: options.language, ...(options.dialect !== undefined ? { dialect: options.dialect } : {}) });
  const db = await getDatabaseManager();
  const repo = new AdaptiveLearningRepository(db);
  let stored = 0;
  for (const record of records) { await repo.upsertCorpus(record); stored++; }
  const candidateContext = { known: options.knownVocabulary ?? new Set<string>(), ...(options.scenarioTerms !== undefined ? { scenarioTerms: options.scenarioTerms } : {}), ...(options.weakTerms !== undefined ? { weakTerms: options.weakTerms } : {}) };
  const candidates = extractVocabularyCandidates(records, candidateContext);
  return { parsed: records.length, stored, candidates: candidates.length, rejected: Math.max(0, records.length - stored) };
}
