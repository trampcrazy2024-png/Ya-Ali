import { isSecureStorageAvailable, secureGet, secureRemove, secureSet } from './services/secureStorage';

const K={
  openrouter:'yaali_openrouter_key', gemini:'yaali_gemini_key', groq:'yaali_groq_key', huggingface:'yaali_huggingface_key',
  cloudflareToken:'yaali_cloudflare_token', cloudflareAccount:'yaali_cloudflare_account', cloudflareModel:'yaali_cloudflare_model',
  speed:'yaali_speech_speed', customEndpoint:'yaali_custom_endpoint', customModel:'yaali_custom_model', customEndpointKey:'yaali_custom_endpoint_key'
};
const SECURE=new Set([K.openrouter,K.gemini,K.groq,K.huggingface,K.cloudflareToken,K.cloudflareAccount,K.customEndpointKey]);
const memory=new Map<string,string>();
let hydrated=false;
const getLocal=(k:string)=>{try{return localStorage.getItem(k)||''}catch{return ''}};
const setLocal=(k:string,v:string)=>{try{v=v.trim();v?localStorage.setItem(k,v):localStorage.removeItem(k)}catch{}};

export async function initSecureSettings():Promise<void>{
  if(hydrated) return;
  if(!isSecureStorageAvailable()){hydrated=true;return;}
  for(const key of SECURE){
    const legacy=getLocal(key);
    const secure=await secureGet(key);
    const value=secure||legacy;
    if(value){memory.set(key,value);await secureSet(key,value);if(legacy) setLocal(key,'');}
    else memory.set(key,'');
  }
  hydrated=true;
}
function get(k:string){ if(SECURE.has(k)&&hydrated) return memory.get(k)||''; return getLocal(k); }
function set(k:string,v:string){ v=v.trim(); if(SECURE.has(k)&&isSecureStorageAvailable()){memory.set(k,v);void (v?secureSet(k,v):secureRemove(k));setLocal(k,'');} else setLocal(k,v); }

export const getOpenRouterApiKey=()=>get(K.openrouter); export const setOpenRouterApiKey=(v:string)=>set(K.openrouter,v);
export const getGeminiApiKey=()=>get(K.gemini); export const setGeminiApiKey=(v:string)=>set(K.gemini,v);
export const getGroqApiKey=()=>get(K.groq); export const setGroqApiKey=(v:string)=>set(K.groq,v);
export const getHuggingFaceApiKey=()=>get(K.huggingface); export const setHuggingFaceApiKey=(v:string)=>set(K.huggingface,v);
export const getCloudflareToken=()=>get(K.cloudflareToken); export const setCloudflareToken=(v:string)=>set(K.cloudflareToken,v);
export const getCloudflareAccount=()=>get(K.cloudflareAccount); export const setCloudflareAccount=(v:string)=>set(K.cloudflareAccount,v);
export const getCloudflareModel=()=>get(K.cloudflareModel)||'@cf/meta/llama-3.1-8b-instruct'; export const setCloudflareModel=(v:string)=>set(K.cloudflareModel,v);
export const getSpeechSpeed=()=>Number(get(K.speed)||'0.95'); export const setSpeechSpeed=(v:number)=>set(K.speed,String(Math.max(.5,Math.min(1.5,v))));
export const getCustomEndpoint=()=>{ const activeId=getLocal('yaali_endpoint_active_v1'); if(activeId){try{const profiles=JSON.parse(getLocal('yaali_endpoint_profiles_v1')); const active=Array.isArray(profiles)?profiles.find((x:any)=>x?.id===activeId&&x?.enabled):null; if(active?.baseUrl)return String(active.baseUrl);}catch{}} return get(K.customEndpoint); }; export const setCustomEndpoint=(v:string)=>set(K.customEndpoint,v);
export const getCustomModel=()=>get(K.customModel); export const setCustomModel=(v:string)=>set(K.customModel,v);
export const getCustomEndpointKey=()=>get(K.customEndpointKey); export const setCustomEndpointKey=(v:string)=>set(K.customEndpointKey,v);
export const secureSettingsStatus=()=>({native:isSecureStorageAvailable(),hydrated,secureKeys:SECURE.size});
