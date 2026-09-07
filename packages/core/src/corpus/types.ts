export type CorpusItemType = 'word' | 'phrase' | 'sentence' | 'dialogue' | 'audio';

export interface SourceMetadata {
  source: string;
  dataset?: string;
  datasetVersion?: string;
  license: string;
  attribution?: string;
  url?: string;
  retrievedAt?: string;
  provenance: 'first-party' | 'public-domain' | 'open-license' | 'user' | 'unknown';
}

export interface AudioMetadata {
  uri?: string;
  durationMs?: number;
  sampleRate?: number;
  format?: string;
  speakerId?: string;
}

export interface CorpusRecord {
  id: string;
  type: CorpusItemType;
  language: string;
  dialect?: string;
  text: string;
  normalizedText: string;
  translation?: string;
  pos?: string;
  estimatedLevel?: string;
  levelConfidence?: number;
  levelMethod?: string;
  source: SourceMetadata;
  audio?: AudioMetadata;
  speaker?: { id?: string; gender?: string; ageRange?: string; accent?: string };
  tags?: string[];
  createdAt: string;
}

export interface VocabularyCandidate {
  text: string;
  score: number;
  frequency: number;
  novelty: number;
  semanticRelevance: number;
  scenarioRelevance: number;
  estimatedLevel?: string;
  reason: string[];
}
