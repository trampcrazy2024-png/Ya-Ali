import { Capacitor, registerPlugin } from '@capacitor/core';
import { getOpenRouterApiKey, setOpenRouterApiKey, getGeminiApiKey, setGeminiApiKey, getGroqApiKey, setGroqApiKey, getCustomEndpoint, getCustomModel } from './settings';

const CapacitorHttp = registerPlugin<any>('CapacitorHttp');
export type ProviderId='openrouter'|'gemini'|'groq'|'custom';
export type ChatMessage={role:'user'|'assistant'|'system';content:string};
const timeoutMs=45000;
const OPENROUTER_MODELS=['openrouter/free','meta-llama/llama-3.3-8b-instruct:free','qwen/qwen3-8b:free'];
const GROQ_MODELS=['openai/gpt-oss-20b','openai/gpt-oss-120b'];

async function request(url:string,init:RequestInit):Promise<any>{
  if(Capacitor.isNativePlatform()){
    const headers:any=Object.fromEntries(new Headers(init.headers).entries());
    let data:any=init.body; if(typeof data==='string'){try{data=JSON.parse(data)}catch{}}
    try{
      const r=await CapacitorHttp.request({url,method:init.method||'GET',headers,data,connectTimeout:timeoutMs,readTimeout:timeoutMs});
      const payload=r?.data;
      if(r.status<200||r.status>=300){
        const detail=typeof payload==='string'?payload:(payload?.error?.message||payload?.message||JSON.stringify(payload||{}));
        throw new Error(`HTTP ${r.status}: ${detail}`);
      }
      return payload;
    }catch(e:any){throw new Error(e?.message||String(e))}
  }
  const c=new AbortController();const t=setTimeout(()=>c.abort(),timeoutMs);
  try{const r=await fetch(url,{...init,signal:c.signal});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`HTTP ${r.status}: ${data?.error?.message||data?.message||'request failed'}`);return data}finally{clearTimeout(t)}
}
export async function discoverCustomModels():Promise<string[]>{
  const endpoint=getCustomEndpoint().trim().replace(/\/$/,'');
  if(!endpoint) return [];
  const out:string[]=[];
  try{
    const base=endpoint.replace(/\/v1\/chat\/completions$/,'').replace(/\/v1$/,'');
    const d=await request(base+'/v1/models',{method:'GET'});
    for(const m of (d?.data||[])) if(m?.id) out.push(String(m.id));
  }catch{}
  if(!out.length){
    try{
      const d=await request(endpoint.replace(/\/v1$/,'')+'/api/tags',{method:'GET'});
      for(const m of (d?.models||[])) if(m?.name) out.push(String(m.name));
    }catch{}
  }
  return [...new Set(out)];
}

export function configuredProviders():ProviderId[]{const p:ProviderId[]=[];if(getOpenRouterApiKey())p.push('openrouter');if(getGeminiApiKey())p.push('gemini');if(getGroqApiKey())p.push('groq');if(getCustomEndpoint())p.push('custom');return p}

async function openrouter(messages:ChatMessage[]){const errors:string[]=[];for(const model of OPENROUTER_MODELS){try{const d=await request('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getOpenRouterApiKey()}`,'HTTP-Referer':'https://yaali.local','X-Title':'Ya Ali'},body:JSON.stringify({model,messages,temperature:.7,max_tokens:900})});const t=String(d?.choices?.[0]?.message?.content||'').trim();if(t)return t}catch(e:any){errors.push(`${model}: ${e?.message||e}`)}}throw new Error(errors.join(' | '))}

async function gemini(messages:ChatMessage[]){
  const key=getGeminiApiKey(); if(!key)throw new Error('Gemini API key is empty');
  const models:string[]=[];
  try{
    const d=await request(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,{method:'GET'});
    for(const m of (d?.models||[])){const methods=m?.supportedGenerationMethods||[];if(methods.includes('generateContent')&&m?.name){const n=String(m.name).replace(/^models\//,'');if(!/embedding|aqa|image|vision/i.test(n))models.push(n)}}
  }catch(e:any){throw new Error(`model discovery failed: ${e?.message||e}`)}
  const preferred=['gemini-2.5-flash','gemini-2.0-flash','gemini-2.0-flash-lite'];
  const order=[...preferred.filter(x=>models.includes(x)),...models.filter(x=>!preferred.includes(x)).slice(0,4)];
  if(!order.length)throw new Error('Gemini key works but no generateContent model is available for this project');
  const prompt=messages.map(m=>`${m.role.toUpperCase()}: ${m.content}`).join('\n');const errors:string[]=[];
  for(const model of order){try{const d=await request(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:.7,maxOutputTokens:700}})});const t=String(d?.candidates?.[0]?.content?.parts?.map((x:any)=>x?.text||'').join('')||'').trim();if(t)return t}catch(e:any){errors.push(`${model}: ${e?.message||e}`)}}
  throw new Error(errors.join(' | '));
}
async function groq(messages:ChatMessage[]){const errors:string[]=[];for(const model of GROQ_MODELS){try{const d=await request('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getGroqApiKey()}`},body:JSON.stringify({model,messages,temperature:.7,max_tokens:900})});const t=String(d?.choices?.[0]?.message?.content||'').trim();if(t)return t}catch(e:any){errors.push(`${model}: ${e?.message||e}`)}}throw new Error(errors.join(' | '))}
async function custom(messages:ChatMessage[]){let endpoint=getCustomEndpoint().trim().replace(/\/$/,'');if(!endpoint)throw new Error('Custom endpoint is empty');if(!/\/v1\/chat\/completions$/.test(endpoint))endpoint+='/v1/chat/completions';const d=await request(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:getCustomModel(),messages,temperature:.7,max_tokens:900,stream:false})});const t=String(d?.choices?.[0]?.message?.content||'').trim();if(!t)throw new Error('Custom endpoint returned an empty response');return t}
export async function testProvider(id:ProviderId):Promise<{ok:boolean;provider:ProviderId;latencyMs:number;message:string}>{const t=performance.now();try{const r=await chatFor(id,[{role:'user',content:'Reply with exactly: OK'}]);return{ok:!!r,provider:id,latencyMs:Math.round(performance.now()-t),message:r}}catch(e:any){return{ok:false,provider:id,latencyMs:Math.round(performance.now()-t),message:e?.message||String(e)}}}
async function chatFor(id:ProviderId,messages:ChatMessage[]){return id==='openrouter'?openrouter(messages):id==='gemini'?gemini(messages):id==='groq'?groq(messages):custom(messages)}
export async function chat(messages:ChatMessage[]):Promise<{text:string;provider:ProviderId}>{const errors:string[]=[];for(const id of ['openrouter','gemini','groq','custom'] as ProviderId[]){if(!configuredProviders().includes(id))continue;try{const text=await chatFor(id,messages);if(text)return{text,provider:id}}catch(e:any){errors.push(`${id}: ${e?.message||e}`)}}throw new Error(errors.length?`همه سرویس‌های تنظیم‌شده ناموفق بودند: ${errors.join(' | ')}`:'هیچ سرویس AI تنظیم نشده است.')}
export function providerLabel(id:ProviderId){return id==='openrouter'?'OpenRouter Free':id==='gemini'?'Gemini Free Tier':id==='groq'?'Groq Free Tier':'Custom OpenAI-compatible'}
export const keys={getOpenRouterApiKey,setOpenRouterApiKey,getGeminiApiKey,setGeminiApiKey,getGroqApiKey,setGroqApiKey};
