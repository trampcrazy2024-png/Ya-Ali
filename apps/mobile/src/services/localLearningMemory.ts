const KEY='yaali_local_ai_learning_v1';
export type LocalLearningMemory={
  turns:number; successfulTopics:Record<string,number>; weakTopics:Record<string,number>; preferredDialect:string; recentCorrections:string[]; usefulPhrases:string[]; lastUpdated:string;
};
const empty=():LocalLearningMemory=>({turns:0,successfulTopics:{},weakTopics:{},preferredDialect:'iraqi',recentCorrections:[],usefulPhrases:[],lastUpdated:new Date().toISOString()});
function read():LocalLearningMemory{try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return x&&typeof x==='object'?{...empty(),...x,successfulTopics:{...(x.successfulTopics||{})},weakTopics:{...(x.weakTopics||{})},recentCorrections:Array.isArray(x.recentCorrections)?x.recentCorrections:[],usefulPhrases:Array.isArray(x.usefulPhrases)?x.usefulPhrases:[]}:empty()}catch{return empty()}}
function write(x:LocalLearningMemory){try{localStorage.setItem(KEY,JSON.stringify(x))}catch{}}
export function getLocalLearningMemory(){return read()}
export function recordLocalLearning(input:{topic?:string;dialect?:string;success?:boolean;correction?:string;usefulPhrase?:string}){
 const x=read();x.turns++;if(input.dialect)x.preferredDialect=input.dialect;if(input.topic){const bag=input.success?x.successfulTopics:x.weakTopics;bag[input.topic]=(bag[input.topic]||0)+1}if(input.correction){x.recentCorrections=[input.correction,...x.recentCorrections.filter(v=>v!==input.correction)].slice(0,12)}if(input.usefulPhrase){x.usefulPhrases=[input.usefulPhrase,...x.usefulPhrases.filter(v=>v!==input.usefulPhrase)].slice(0,20)}x.lastUpdated=new Date().toISOString();write(x);return x}
export function buildLocalLearningContext(){const x=read();const top=(o:Record<string,number>)=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}:${v}`).join(', ')||'none';return `Learner memory: turns=${x.turns}; preferred dialect=${x.preferredDialect}; strong topics=${top(x.successfulTopics)}; weak topics=${top(x.weakTopics)}; recent corrections=${x.recentCorrections.join(' | ')||'none'}; useful phrases=${x.usefulPhrases.slice(0,8).join(' | ')||'none'}. Use this only to adapt teaching; never reveal private storage details.`}
