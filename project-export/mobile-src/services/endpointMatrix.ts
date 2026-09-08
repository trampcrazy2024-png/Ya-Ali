import { Capacitor, registerPlugin } from '@capacitor/core';
import { getCustomEndpointKey } from '../settings';
const CapacitorHttp=registerPlugin<any>('CapacitorHttp');

export type EndpointProtocol='openai-v1'|'openai-responses'|'ollama-v1'|'ollama-native'|'lmstudio-v1'|'llamacpp'|'localai'|'vllm'|'mlc'|'unknown';
export type EndpointCapability='chat'|'responses'|'models'|'embeddings'|'generate'|'tags'|'health'|'streaming';
export type EndpointProbe={baseUrl:string;ok:boolean;latencyMs:number;protocols:EndpointProtocol[];capabilities:EndpointCapability[];models:string[];endpoints:string[];chatPath?:string;message:string};

function clean(v:string){return String(v||'').trim().replace(/\s+/g,'').replace(/\/$/,'')}
export function endpointRoot(v:string){return clean(v).replace(/\/(v1|api\/v1)\/(chat\/completions|responses|models|embeddings|chat|models)$/,'').replace(/\/v1$/,'').replace(/\/api\/(chat|generate|tags|show|embeddings|embed|models)$/,'')}
async function fetchJson(url:string,init:RequestInit={},timeout=9000){
  if(Capacitor.isNativePlatform()){
    const headers:any=Object.fromEntries(new Headers(init.headers).entries());const key=getCustomEndpointKey();if(key)headers.Authorization=`Bearer ${key}`;let data:any=init.body;if(typeof data==='string'){try{data=JSON.parse(data)}catch{}}
    const r=await CapacitorHttp.request({url,method:init.method||'GET',headers,data,connectTimeout:timeout,readTimeout:timeout});let d:any=r?.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch{}}return {r:{ok:r.status>=200&&r.status<300,status:r.status},d:d||{}};
  }
  const c=new AbortController();const t=window.setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{...init,signal:c.signal});const text=await r.text();let d:any={};try{d=text?JSON.parse(text):{}}catch{d={raw:text}};return {r,d}}finally{window.clearTimeout(t)}
}
function modelsFrom(d:any){const xs=d?.data||d?.models||[];return Array.isArray(xs)?xs.map((x:any)=>String(x?.id||x?.name||x?.model||x?.key||'')).filter(Boolean):[]}
export async function probeEndpoint(input:string):Promise<EndpointProbe>{
  const base=endpointRoot(input);if(!base)return {baseUrl:'',ok:false,latencyMs:0,protocols:['unknown'],capabilities:[],models:[],endpoints:[],message:'Endpoint خالی است.'};
  const start=performance.now();const protocols=new Set<EndpointProtocol>();const capabilities=new Set<EndpointCapability>();const endpoints:string[]=[];const models:string[]=[];
  const probes:Array<[string,EndpointProtocol,EndpointCapability,(d:any)=>string[]]>=[
    ['/v1/models','openai-v1','models',modelsFrom],['/api/v1/models','lmstudio-v1','models',modelsFrom],['/api/tags','ollama-native','tags',modelsFrom],
    ['/v1/responses','openai-responses','responses',()=>[]],['/v1/embeddings','openai-v1','embeddings',()=>[]],['/api/embed','ollama-native','embeddings',()=>[]],
    ['/api/embeddings','ollama-native','embeddings',()=>[]],['/api/generate','ollama-native','generate',()=>[]],['/health','vllm','health',()=>[]],['/healthz','localai','health',()=>[]],['/readyz','localai','health',()=>[]],
    ['/api/v1/chat','lmstudio-v1','chat',()=>[]],['/completion','llamacpp','chat',()=>[]]
  ];
  for(const [path,kind,cap,map] of probes){try{const {r,d}=await fetchJson(base+path);if(r.ok||(r.status===405&&['responses','chat'].includes(cap))||(r.status===401)){protocols.add(kind);capabilities.add(cap);endpoints.push(path);models.push(...map(d));}}catch{}}
  if(endpoints.includes('/v1/models')){protocols.add('llamacpp');protocols.add('localai');protocols.add('vllm');protocols.add('mlc');}
  if(base.includes(':11434'))protocols.add('ollama-v1');
  const hasOpenAI=protocols.has('openai-v1')||protocols.has('llamacpp')||protocols.has('localai')||protocols.has('vllm')||protocols.has('mlc');
  let chatPath:string|undefined;if(endpoints.includes('/api/v1/chat'))chatPath='/api/v1/chat';else if(hasOpenAI)chatPath='/v1/chat/completions';else if(endpoints.includes('/api/generate'))chatPath='/api/generate';else if(endpoints.includes('/api/tags'))chatPath='/api/chat';else if(endpoints.includes('/completion'))chatPath='/completion';
  if(chatPath)capabilities.add('chat');
  const unique=[...new Set(models)];const latencyMs=Math.round(performance.now()-start);
  return {baseUrl:base,ok:endpoints.length>0,latencyMs,protocols:[...protocols],capabilities:[...capabilities],models:unique,endpoints,message:endpoints.length?`Endpoint شناسایی شد · ${unique.length} مدل · ${latencyMs}ms`:'هیچ API شناخته‌شده‌ای پاسخ نداد.',...(chatPath?{chatPath}:{})};
}
export function endpointPreset(id:'ollama'|'lmstudio'|'llamacpp'|'localai'|'vllm'|'mlc'){const p={ollama:'http://192.168.1.10:11434',lmstudio:'http://192.168.1.10:1234',llamacpp:'http://192.168.1.10:8080',localai:'http://192.168.1.10:8080',vllm:'http://192.168.1.10:8000',mlc:'http://192.168.1.10:8000'};return p[id]}
export const ENDPOINT_CATALOG=[
  {id:'openai',label:'OpenAI-compatible',routes:['/v1/models','/v1/chat/completions','/v1/responses','/v1/embeddings']},
  {id:'ollama',label:'Ollama',routes:['/api/tags','/api/chat','/api/generate','/api/embed','/api/embeddings','/api/show']},
  {id:'lmstudio',label:'LM Studio',routes:['/api/v1/models','/api/v1/chat','/v1/models','/v1/chat/completions']},
  {id:'llamacpp',label:'llama.cpp server',routes:['/v1/models','/v1/chat/completions','/completion']},
  {id:'localai',label:'LocalAI',routes:['/v1/models','/v1/chat/completions','/readyz']},
  {id:'vllm',label:'vLLM',routes:['/v1/models','/v1/chat/completions','/health']},
  {id:'mlc',label:'MLC LLM',routes:['/v1/models','/v1/chat/completions']}
] as const;
