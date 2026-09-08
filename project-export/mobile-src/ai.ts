import { Capacitor, registerPlugin } from '@capacitor/core';
import { getOpenRouterApiKey, getGeminiApiKey, getGroqApiKey, getHuggingFaceApiKey, getCloudflareToken, getCloudflareAccount, getCloudflareModel, getCustomEndpoint, getCustomModel, getCustomEndpointKey } from './settings';
import { endpointRoot, probeEndpoint } from './services/endpointMatrix';
import { getEndpointCandidates, recordEndpointFailure, recordEndpointSuccess, type EndpointProfile } from './services/endpointProfiles';

const CapacitorHttp = registerPlugin<any>('CapacitorHttp');
export type ProviderId='openrouter'|'gemini'|'groq'|'huggingface'|'cloudflare'|'custom';
export type ChatMessage={role:'user'|'assistant'|'system';content:string};
const timeoutMs=45000;
const OPENROUTER_MODELS=['openrouter/free'];
const GROQ_MODELS=['openai/gpt-oss-20b','openai/gpt-oss-120b'];
const HF_MODELS=['openai/gpt-oss-20b:fastest','Qwen/Qwen3-4B-Thinking-2507:fastest','google/gemma-2-2b-it:fastest'];

async function request(url:string,init:RequestInit):Promise<any>{
  if(Capacitor.isNativePlatform()){
    const headers:any=Object.fromEntries(new Headers(init.headers).entries());
    let data:any=init.body; if(typeof data==='string'){try{data=JSON.parse(data)}catch{}}
    try{
      const r=await CapacitorHttp.request({url,method:init.method||'GET',headers,data,connectTimeout:timeoutMs,readTimeout:timeoutMs});
      const payload=r?.data;
      if(r.status<200||r.status>=300){const detail=typeof payload==='string'?payload:(payload?.error?.message||payload?.message||JSON.stringify(payload||{}));throw new Error(`HTTP ${r.status}: ${detail}`)}
      return payload;
    }catch(e:any){throw new Error(e?.message||String(e))}
  }
  const c=new AbortController();const t=setTimeout(()=>c.abort(),timeoutMs);
  try{const r=await fetch(url,{...init,signal:c.signal});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`HTTP ${r.status}: ${data?.error?.message||data?.message||'request failed'}`);return data}finally{clearTimeout(t)}
}

async function openaiCompatible(url:string,key:string,model:string,messages:ChatMessage[]){
  const headers:any={'Content-Type':'application/json'}; if(key) headers.Authorization=`Bearer ${key}`;
  const d=await request(url,{method:'POST',headers,body:JSON.stringify({model,messages,temperature:.65,max_tokens:900,stream:false})});
  const t=String(d?.choices?.[0]?.message?.content||'').trim(); if(!t)throw new Error('provider returned an empty response'); return t;
}

function normalizeEndpoint(value:string): string {
  return value.trim().replace(/\s+/g,'').replace(/\/$/,'');
}

export async function discoverCustomModels():Promise<string[]>{
  const endpoint=normalizeEndpoint(getCustomEndpoint()); if(!endpoint)return [];
  const base=endpoint.replace(/\/v1\/(chat\/completions|responses|models)$/,'').replace(/\/v1$/,'').replace(/\/api\/v1\/(chat|models)$/,'').replace(/\/api\/chat$/,'').replace(/\/api\/tags$/,'');
  const out:string[]=[];
  const paths=['/v1/models','/api/v1/models','/api/tags'];
  for(const path of paths){try{const d=await request(base+path,{method:'GET'});const xs=path==='/api/tags'?(d?.models||[]):(d?.data||d?.models||[]);for(const m of xs){const id=String(m?.id||m?.name||m?.model||m?.key||'');if(id)out.push(id)}}catch{}}
  return [...new Set(out)];
}
export async function inspectCustomEndpoint(){return probeEndpoint(getCustomEndpoint())}


export type DiscoveredModel={id:string;provider:ProviderId;contextWindow?:number;active?:boolean;source:string};
export async function discoverProviderModels(id:ProviderId):Promise<DiscoveredModel[]>{
  if(id==='openrouter'){const d=await request('https://openrouter.ai/api/v1/models',{method:'GET'});return (d?.data||[]).filter((m:any)=>String(m?.id||'').endsWith(':free')).map((m:any)=>({id:String(m.id),provider:id,contextWindow:Number(m?.context_length||0)||undefined,source:'OpenRouter'}));}
  if(id==='groq'){const d=await request('https://api.groq.com/openai/v1/models',{method:'GET',headers:{Authorization:`Bearer ${getGroqApiKey()}`}});return (d?.data||[]).filter((m:any)=>m?.active!==false).map((m:any)=>({id:String(m.id),provider:id,contextWindow:Number(m?.context_window||0)||undefined,active:m?.active,source:'Groq'}));}
  if(id==='huggingface'){const d=await request('https://router.huggingface.co/v1/models',{method:'GET',headers:{Authorization:`Bearer ${getHuggingFaceApiKey()}`}});return (d?.data||d?.models||[]).map((m:any)=>({id:String(m?.id||m?.model||''),provider:id,source:'Hugging Face'})).filter((m:any)=>m.id);}
  if(id==='gemini'){const key=getGeminiApiKey();const d=await request(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,{method:'GET'});return (d?.models||[]).filter((m:any)=>(m?.supportedGenerationMethods||[]).includes('generateContent')).map((m:any)=>({id:String(m.name).replace(/^models\//,''),provider:id,contextWindow:Number(m?.inputTokenLimit||0)||undefined,source:'Gemini'}));}
  if(id==='custom'){return (await discoverCustomModels()).map(x=>({id:x,provider:id,source:'Custom endpoint'}));}
  return [];
}
export async function discoverAllConfiguredModels(){const ids=configuredProviders();const rows:DiscoveredModel[]=[];for(const id of ids){try{rows.push(...await discoverProviderModels(id))}catch{}}return rows;}
export function configuredProviders():ProviderId[]{const p:ProviderId[]=[];if(getOpenRouterApiKey())p.push('openrouter');if(getGeminiApiKey())p.push('gemini');if(getGroqApiKey())p.push('groq');if(getHuggingFaceApiKey())p.push('huggingface');if(getCloudflareToken()&&getCloudflareAccount())p.push('cloudflare');if(getCustomEndpoint())p.push('custom');return p}

async function openrouter(messages:ChatMessage[]){const errors:string[]=[];let models=OPENROUTER_MODELS;try{const discovered=await discoverProviderModels('openrouter');if(discovered.length)models=discovered.slice(0,6).map(x=>x.id)}catch{};for(const model of models){try{const d=await request('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getOpenRouterApiKey()}`,'HTTP-Referer':'https://yaali.local','X-Title':'Ya Ali'},body:JSON.stringify({model,messages,temperature:.65,max_tokens:900})});const t=String(d?.choices?.[0]?.message?.content||'').trim();if(t)return t}catch(e:any){errors.push(`${model}: ${e?.message||e}`)}}throw new Error(errors.join(' | '))}

async function gemini(messages:ChatMessage[]){
  const key=getGeminiApiKey();if(!key)throw new Error('Gemini API key is empty');const models:string[]=[];
  try{const d=await request(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,{method:'GET'});for(const m of (d?.models||[])){const methods=m?.supportedGenerationMethods||[];if(methods.includes('generateContent')&&m?.name){const n=String(m.name).replace(/^models\//,'');if(!/embedding|aqa|image|vision/i.test(n))models.push(n)}}}catch(e:any){throw new Error(`model discovery failed: ${e?.message||e}`)}
  const preferred=['gemini-2.5-flash','gemini-2.0-flash','gemini-2.0-flash-lite'];const order=[...preferred.filter(x=>models.includes(x)),...models.filter(x=>!preferred.includes(x)).slice(0,4)];if(!order.length)throw new Error('Gemini key works but no generateContent model is available for this project');
  const contents=messages.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]}));const system=messages.find(m=>m.role==='system')?.content;
  const errors:string[]=[];for(const model of order){try{const d=await request(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:system?{parts:[{text:system}]}:undefined,contents,generationConfig:{temperature:.65,maxOutputTokens:700}})});const t=String(d?.candidates?.[0]?.content?.parts?.map((x:any)=>x?.text||'').join('')||'').trim();if(t)return t}catch(e:any){errors.push(`${model}: ${e?.message||e}`)}}throw new Error(errors.join(' | '));
}
async function groq(messages:ChatMessage[]){const errors:string[]=[];let models=GROQ_MODELS;try{const discovered=await discoverProviderModels('groq');const preferred=discovered.filter(x=>/gpt-oss-20b|gpt-oss-120b/i.test(x.id)).map(x=>x.id);if(preferred.length)models=preferred}catch{};for(const model of models){try{const t=await openaiCompatible('https://api.groq.com/openai/v1/chat/completions',getGroqApiKey(),model,messages);if(t)return t}catch(e:any){errors.push(`${model}: ${e?.message||e}`)}}throw new Error(errors.join(' | '))}
async function huggingface(messages:ChatMessage[]){const errors:string[]=[];for(const model of HF_MODELS){try{const t=await openaiCompatible('https://router.huggingface.co/v1/chat/completions',getHuggingFaceApiKey(),model,messages);if(t)return t}catch(e:any){errors.push(`${model}: ${e?.message||e}`)}}throw new Error(errors.join(' | '))}
async function cloudflare(messages:ChatMessage[]){const account=getCloudflareAccount();const token=getCloudflareToken();const model=getCloudflareModel();if(!account||!token)throw new Error('Cloudflare Account ID و API Token را وارد کنید');const prompt=messages.map(m=>`${m.role.toUpperCase()}: ${m.content}`).join('\n\n')+'\n\nASSISTANT:';const d=await request(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/${encodeURIComponent(model)}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({prompt,max_tokens:900,temperature:.65})});const t=String(d?.result?.response||'').trim();if(!t)throw new Error('Cloudflare Workers AI returned an empty response');return t}
async function discoverModelsAtEndpoint(endpoint:string):Promise<string[]>{
  const base=endpointRoot(endpoint); const out:string[]=[];
  for(const path of ['/v1/models','/api/v1/models','/api/tags']){
    try{const d=await request(base+path,{method:'GET'});const xs=path==='/api/tags'?(d?.models||[]):(d?.data||d?.models||[]);for(const m of xs){const id=String(m?.id||m?.name||m?.model||m?.key||'');if(id)out.push(id)}}catch{}
  }
  return [...new Set(out)];
}

async function customAt(profile:EndpointProfile|undefined,messages:ChatMessage[],fallbackEndpoint:string,fallbackModel:string){
  const endpoint=normalizeEndpoint(profile?.baseUrl||fallbackEndpoint); if(!endpoint)throw new Error('Custom endpoint تنظیم نشده است.');
  const model=profile?.model || fallbackModel || (await discoverModelsAtEndpoint(endpoint))[0] || '';
  if(!model)throw new Error('هیچ مدل قابل استفاده‌ای از endpoint کشف نشد.');
  const modelKey=getCustomEndpointKey(); const base=endpointRoot(endpoint); const errors:string[]=[];
  const headers=(json=true)=>{const h:any=json?{'Content-Type':'application/json'}:{};if(modelKey)h.Authorization=`Bearer ${modelKey}`;return h};
  const started=performance.now();
  try{const t=await openaiCompatible(base+'/v1/chat/completions',modelKey,model,messages);if(profile)recordEndpointSuccess(profile.id,performance.now()-started);return t}catch(e:any){errors.push(`OpenAI /v1: ${e?.message||e}`)}
  try{const d=await request(base+'/v1/responses',{method:'POST',headers:headers(),body:JSON.stringify({model,input:messages.map(m=>({role:m.role,content:m.content})),temperature:.65,max_output_tokens:900,stream:false})});const t=String(d?.output_text||d?.output?.map((x:any)=>x?.content?.map((c:any)=>c?.text||'').join('')).join('')||'').trim();if(t){if(profile)recordEndpointSuccess(profile.id,performance.now()-started);return t}throw new Error('empty response')}catch(e:any){errors.push(`Responses: ${e?.message||e}`)}
  try{const d=await request(base+'/api/v1/chat',{method:'POST',headers:headers(),body:JSON.stringify({model,input:messages.map(m=>({type:'message',role:m.role,content:m.content})),temperature:.65,max_tokens:900,stream:false})});const t=String(d?.output_text||d?.output?.text||d?.message?.content||'').trim();if(t){if(profile)recordEndpointSuccess(profile.id,performance.now()-started);return t}throw new Error('empty response')}catch(e:any){errors.push(`LM Studio: ${e?.message||e}`)}
  try{const d=await request(base+'/api/chat',{method:'POST',headers:headers(),body:JSON.stringify({model,messages,stream:false,options:{temperature:.65}})});const t=String(d?.message?.content||'').trim();if(t){if(profile)recordEndpointSuccess(profile.id,performance.now()-started);return t}throw new Error('empty response')}catch(e:any){errors.push(`Ollama chat: ${e?.message||e}`)}
  try{const prompt=messages.map(m=>`${m.role.toUpperCase()}: ${m.content}`).join('\n\n');const d=await request(base+'/api/generate',{method:'POST',headers:headers(),body:JSON.stringify({model,prompt,stream:false,options:{temperature:.65}})});const t=String(d?.response||'').trim();if(t){if(profile)recordEndpointSuccess(profile.id,performance.now()-started);return t}throw new Error('empty response')}catch(e:any){errors.push(`Ollama generate: ${e?.message||e}`)}
  try{const prompt=messages.map(m=>`${m.role}: ${m.content}`).join('\n');const d=await request(base+'/completion',{method:'POST',headers:headers(),body:JSON.stringify({prompt,n_predict:900,temperature:.65,stream:false})});const t=String(d?.content||d?.response||'').trim();if(t){if(profile)recordEndpointSuccess(profile.id,performance.now()-started);return t}throw new Error('empty response')}catch(e:any){errors.push(`llama.cpp legacy: ${e?.message||e}`)}
  if(profile)recordEndpointFailure(profile.id);
  throw new Error(errors.join(' | '));
}
async function custom(messages:ChatMessage[]){
  const fallbackEndpoint=normalizeEndpoint(getCustomEndpoint()); if(!fallbackEndpoint)throw new Error('Custom endpoint تنظیم نشده است.');
  const fallbackModel=getCustomModel();
  const pool=getEndpointCandidates(['chat'],6);
  const candidates:EndpointProfile[] = pool.length ? pool : [{id:'ep_fallback',name:'Custom endpoint',baseUrl:endpointRoot(fallbackEndpoint),model:fallbackModel,enabled:true,priority:50,protocols:[],capabilities:['chat'],latencyMs:99999,failures:0}];
  const errors:string[]=[];
  for(const profile of candidates){
    try{return await customAt(profile,messages,fallbackEndpoint,fallbackModel)}catch(e:any){errors.push(`${profile.name}: ${e?.message||e}`)}
  }
  throw new Error(errors.join(' | '));
}
async function chatFor(id:ProviderId,messages:ChatMessage[]){return id==='openrouter'?openrouter(messages):id==='gemini'?gemini(messages):id==='groq'?groq(messages):id==='huggingface'?huggingface(messages):id==='cloudflare'?cloudflare(messages):custom(messages)}
export async function testProvider(id:ProviderId){const t=performance.now();try{const r=await chatFor(id,[{role:'user',content:'Reply with exactly: OK'}]);return{ok:!!r,provider:id,latencyMs:Math.round(performance.now()-t),message:r}}catch(e:any){return{ok:false,provider:id,latencyMs:Math.round(performance.now()-t),message:e?.message||String(e)}}}
export async function chat(messages:ChatMessage[]):Promise<{text:string;provider:ProviderId}>{const errors:string[]=[];for(const id of ['openrouter','gemini','groq','huggingface','cloudflare','custom'] as ProviderId[]){if(!configuredProviders().includes(id))continue;if(!navigator.onLine&&id!=='custom')continue;try{const text=await chatFor(id,messages);if(text)return{text,provider:id}}catch(e:any){errors.push(`${id}: ${e?.message||e}`)}}throw new Error(errors.length?`همه سرویس‌های تنظیم‌شده ناموفق بودند: ${errors.join(' | ')}`:'هیچ سرویس AI تنظیم نشده است.')}
export function providerLabel(id:ProviderId){return id==='openrouter'?'OpenRouter Free':id==='gemini'?'Gemini Free Tier':id==='groq'?'Groq':id==='huggingface'?'Hugging Face':id==='cloudflare'?'Cloudflare Workers AI':'Custom OpenAI-compatible'}
