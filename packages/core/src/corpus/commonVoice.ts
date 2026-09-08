import { parseCorpusRecords, type CorpusParserOptions } from './parser';
import type { CorpusRecord, SourceMetadata } from './types';

export interface CommonVoiceOptions { language: string; dialect?: string; datasetVersion: string; license?: string; attribution?: string; dataset?: string; }

export function parseCommonVoiceTSV(tsv: string, options: CommonVoiceOptions): CorpusRecord[] {
  const source: SourceMetadata = {
    source: 'Mozilla Common Voice', dataset: options.dataset ?? 'Common Voice Scripted Speech', datasetVersion: options.datasetVersion,
    license: options.license || (() => { throw new Error('Common Voice license metadata is required; do not assume a license in code'); })(), attribution: options.attribution ?? 'Mozilla Common Voice',
    url: 'https://commonvoice.mozilla.org/datasets', provenance: 'public-domain'
  };
  const parserOptions: CorpusParserOptions = { source, language: options.language, ...(options.dialect !== undefined ? { dialect: options.dialect } : {}) };
  return parseCorpusRecords(tsv, parserOptions);
}

export function validateDatasetMetadata(source: SourceMetadata): void {
  if (!source.source.trim()) throw new Error('Dataset source is required');
  if (!source.license.trim()) throw new Error('Dataset license is required');
  if (!source.provenance || source.provenance === 'unknown') throw new Error('Dataset provenance must be explicit');
  if (source.dataset && !source.datasetVersion) throw new Error('Dataset version is required when dataset is provided');
}
