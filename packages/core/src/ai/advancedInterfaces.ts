import type { ResearchPlan, ResearchReport } from '../research/deepResearch';
import type { PronunciationFeedback } from '../pronunciation/phonemeScoring';
import type { STTProvider, TTSProvider } from './interfaces';

export interface DeepResearchProvider { readonly id:string; research(plan:ResearchPlan):Promise<ResearchReport>; isAvailable():Promise<boolean>; }
export interface PhonemeScoringProvider { readonly id:string; score(expected:string, audio:Uint8Array, language:string):Promise<PronunciationFeedback>; isAvailable():Promise<boolean>; }
export interface OfflineSpeechProvider extends STTProvider { readonly languages:string[]; }
export interface VoiceCommand { id:string; intent:string; confidence:number; slots:Record<string,string>; }
export interface VoiceCommandProvider { readonly id:string; recognize(audio:Uint8Array, language:string):Promise<VoiceCommand>; }
export interface VoiceTtsProvider extends TTSProvider { listVoices(language?:string):Promise<Array<{id:string;language:string;gender?:string;dialect?:string}>>; }
export interface VoiceCloneProvider { readonly id:string; createVoice(samples:Uint8Array[],language:string):Promise<{voiceId:string}>; deleteVoice(voiceId:string):Promise<void>; }
export interface ShadowingProvider { readonly id:string; compare(nativeAudio:Uint8Array,userAudio:Uint8Array,language:string):Promise<{intonation:number;rhythm:number;alignment:number;overall:number}>; }
export interface CorpusCuratorProvider { readonly id:string; curate(itemIds:string[]):Promise<{keep:string[];remove:string[];review:string[]}>; }
export interface WikiOfflineProvider { readonly id:string; search(query:string,language:string):Promise<Array<{id:string;title:string;snippet:string}>>; get(id:string):Promise<string>; }
export interface SyncProvider { readonly id:string; push(changes:unknown[]):Promise<void>; pull(cursor?:string):Promise<{changes:unknown[];cursor?:string}>; }
export interface SocialLearningProvider { readonly id:string; joinGroup(groupId:string):Promise<void>; publishChallenge(payload:unknown):Promise<string>; getLeaderboard(groupId:string):Promise<Array<{learnerId:string;score:number}>>; }
