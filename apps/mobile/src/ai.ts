import { Capacitor, registerPlugin } from '@capacitor/core';
const CapacitorHttp = registerPlugin<any>('CapacitorHttp');
import {
  getOpenRouterApiKey, setOpenRouterApiKey,
  getGeminiApiKey, setGeminiApiKey,
  getGroqApiKey, setGroqApiKey, getCustomEndpoint, getCustomModel
} from './settings';

export type ProviderId = 'openrouter'|'gemini'|'groq'|'custom';
export type ChatMessage = { role:'user'|'assistant'|'system'; content:string };

const timeoutMs = 45000;
const OPENROUTER_MODELS=['openrouter/free','meta-llama/llama-3.3-8b-instruct:free','qwen/qwen3-8b:free'];
const GROQ_MODELS=['llama-3.3-70b-versatile','llama-3.1-8b-instant'];

async function request(url:string, init:RequestInit):Promise<any> {
  if (Capacitor.isNativePlatform()) {
    const headers:any = Object.fromEntries(new Headers(init.headers).entries());
    let body:any = init.body;
    if (typeof body === 'string') { try { body=JSON.parse(body); } catch {} }
    const r = await CapacitorHttp.request({url,method:init.method || 'GET',headers,data:body,connectTimeout:timeoutMs,readTimeout:timeoutMs});
    if (r.status < 200 || r.status >= 300) throw new Error(`HTTP ${r.status}`);
    return r.data;
  }
  const controller=new AbortController(); const t=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const r=await fetch(url,{...init,signal:controller.signal});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(`HTTP ${r.status}: ${data?.error?.message || 'request failed'}`);
    return data;
  } finally { clearTimeout(t); }
}

export function configuredProviders(): ProviderId[] {
  const p:ProviderId[]=[];
  if(getOpenRouterApiKey()) p.push('openrouter');
  if(getGeminiApiKey()) p.push('gemini');
  if(getGroqApiKey()) p.push('groq');
  if(getCustomEndpoint()) p.push('custom');
  return p;
}

async function openrouter(messages:ChatMessage[]) {
  const errors:string[]=[];
  for(const model of OPENROUTER_MODELS){try{
    const data=await request('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getOpenRouterApiKey()}`,'HTTP-Referer':'https://yaali.local','X-Title':'Ya Ali'},body:JSON.stringify({model,messages,temperature:.7,max_tokens:900})});
    const text=String(data?.choices?.[0]?.message?.content||'').trim(); if(text)return text;
  }catch(e:any){errors.push(`${model}: ${e?.message||String(e)}`)}}
  throw new Error(errors.join(' | '));
}
async function gemini(messages:ChatMessage[]) {
  const prompt=messages.map(m=>`${m.role.toUpperCase()}: ${m.content}`).join('\n');
  const data=await request(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(getGeminiApiKey())}`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:.7,maxOutputTokens:700}})
  });
  return String(data?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text||'').join('')||'').trim();
}
async function groq(messages:ChatMessage[]) {
  const errors:string[]=[];
  for(const model of GROQ_MODELS){try{
    const data=await request('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getGroqApiKey()}`},body:JSON.stringify({model,messages,temperature:.7,max_tokens:900})});
    const text=String(data?.choices?.[0]?.message?.content||'').trim(); if(text)return text;
  }catch(e:any){errors.push(`${model}: ${e?.message||String(e)}`)}}
  throw new Error(errors.join(' | '));
}


async function custom(messages:ChatMessage[]) {
  const endpoint=getCustomEndpoint().replace(/\/$/,'');
  const data=await request(`${endpoint}/v1/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:getCustomModel(),messages,temperature:.7,max_tokens:900})});
  return String(data?.choices?.[0]?.message?.content||'').trim();
}

export async function chat(messages:ChatMessage[]):Promise<{text:string;provider:ProviderId}> {
  const order:ProviderId[] = ['openrouter','gemini','groq','custom'];
  const errors:string[]=[];
  for(const id of order) {
    if(!configuredProviders().includes(id)) continue;
    try {
      const text = id==='openrouter'?await openrouter(messages):id==='gemini'?await gemini(messages):id==='groq'?await groq(messages):await custom(messages);
      if(text) return {text,provider:id};
    } catch(e:any) { errors.push(`${id}: ${e?.message||String(e)}`); }
  }
  throw new Error(errors.length ? `همه سرویس‌های رایگان تنظیم‌شده ناموفق بودند: ${errors.join(' | ')}` : 'هیچ سرویس رایگان AI تنظیم نشده است.');
}

export function providerLabel(id:ProviderId) {
  return id==='openrouter'?'OpenRouter Free':id==='gemini'?'Gemini Free Tier':id==='groq'?'Groq Free Tier':'Custom OpenAI-compatible';
}
export const keys = {
  getOpenRouterApiKey,setOpenRouterApiKey,getGeminiApiKey,setGeminiApiKey,getGroqApiKey,setGroqApiKey
};
