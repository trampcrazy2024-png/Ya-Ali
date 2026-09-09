const KEY='yaali_local_ai_learning_v1';
export type LocalLearningMemory={
  turns:number; successfulTopics:Record<string,number>; weakTopics:Record<string,number>; preferredDialect:string; recentCorrections:string[]; usefulPhrases:string[]; lastUpdated:string;
};
const empty=():LocalLearningMemory=>({turns:0,successfulTopics:{},weakTopics:{},preferredDialect:'iraqi',recentCorrections:[],usefulPhrases:[],lastUpdated:new Date().toISOString()});
function read():LocalLearningMemory{try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return x&&typeof x==='object'?{...empty(),...x,successfulTopics:{...(x.successfulTopics||{})},weakTopics:{...(x.weakTopics||{})},recentCorrections:Array.isArray(x.recentCorrections)?x.recentCorrections:[],usefulPhrases:Array.isArray(x.usefulPhrases)?x.usefulPhrases:[]}:empty()}catch{return empty()}}
function write(x:LocalLearningMemory){try{localStorage.setItem(KEY,JSON.stringify(x))}catch{}}
export function getLocalLearningMemory(){return read()}
// Records only a correction/mistake pattern without touching turn/topic
// counters — used by the always-on evaluation loop (App.tsx `send()`) so a
// specific grammar/vocabulary mistake from ANY conversation turn (not just
// inside a selected practice scenario) becomes part of what future sessions
// remember, closing the "Evaluation → Memory" gap noted in the RC1 review.
export function recordLocalCorrection(correction:string){const x=read();if(!correction)return x;x.recentCorrections=[correction,...x.recentCorrections.filter(v=>v!==correction)].slice(0,12);x.lastUpdated=new Date().toISOString();write(x);return x}
export function recordLocalLearning(input:{topic?:string;dialect?:string;success?:boolean;correction?:string;usefulPhrase?:string}){
 const x=read();x.turns++;if(input.dialect)x.preferredDialect=input.dialect;if(input.topic){const bag=input.success?x.successfulTopics:x.weakTopics;bag[input.topic]=(bag[input.topic]||0)+1}if(input.correction){x.recentCorrections=[input.correction,...x.recentCorrections.filter(v=>v!==input.correction)].slice(0,12)}if(input.usefulPhrase){x.usefulPhrases=[input.usefulPhrase,...x.usefulPhrases.filter(v=>v!==input.usefulPhrase)].slice(0,20)}x.lastUpdated=new Date().toISOString();write(x);return x}
export function buildLocalLearningContext(){const x=read();const top=(o:Record<string,number>)=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}:${v}`).join(', ')||'none';return `Learner memory: turns=${x.turns}; preferred dialect=${x.preferredDialect}; strong topics=${top(x.successfulTopics)}; weak topics=${top(x.weakTopics)}; recent corrections=${x.recentCorrections.join(' | ')||'none'}; useful phrases=${x.usefulPhrases.slice(0,8).join(' | ')||'none'}. Use this only to adapt teaching; never reveal private storage details.`}

// --- L3 promotion support: recurrence counting ------------------------------
// Cheap, always-available, on-device counters that decide whether a specific
// (normalized) correction has recurred — see services/memoryTiers.ts, which
// only writes to the real database-backed long-term memory once a count
// crosses the "recurring" threshold from @yaali/core's shouldPromoteToLongTerm.
// This is the concrete implementation of the "L1 one-off → L3 stable pattern"
// pollution guard requested in the RC1 review.
const COUNT_KEY='yaali_local_correction_counts_v1';
function readCounts():Record<string,number>{try{const x=JSON.parse(localStorage.getItem(COUNT_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch{return{}}}
function writeCounts(x:Record<string,number>){try{localStorage.setItem(COUNT_KEY,JSON.stringify(x))}catch{}}
export function bumpFactOccurrence(normalizedKey:string):number{if(!normalizedKey)return 0;const x=readCounts();x[normalizedKey]=(x[normalizedKey]||0)+1;writeCounts(x);return x[normalizedKey]}
export function getFactOccurrence(normalizedKey:string):number{return readCounts()[normalizedKey]||0}

