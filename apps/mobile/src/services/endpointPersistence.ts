import { getDatabaseManager } from '../languageBank';
import type { EndpointCapability, EndpointProtocol } from './endpointMatrix';
import type { EndpointProfile } from './endpointProfiles';

export async function persistEndpointProfile(profile:EndpointProfile):Promise<void>{
  try{
    const db=await getDatabaseManager();
    await db.execute(`INSERT OR REPLACE INTO endpoint_profiles (id,name,base_url,model,enabled,priority,protocols_json,capabilities_json,latency_ms,last_probe,failures,last_success,last_failure,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[
      profile.id,profile.name,profile.baseUrl,profile.model||null,profile.enabled?1:0,profile.priority,
      JSON.stringify(profile.protocols),JSON.stringify(profile.capabilities),profile.latencyMs,profile.lastProbe||null,profile.failures||0,
      profile.lastSuccess||null,profile.lastFailure||null,new Date().toISOString()
    ]);
  }catch{}
}

export async function deleteEndpointProfile(id:string):Promise<void>{try{const db=await getDatabaseManager();await db.execute('DELETE FROM endpoint_profiles WHERE id=?',[id]);}catch{}}

export async function loadEndpointProfilesFromSQLite():Promise<EndpointProfile[]>{
  try{
    const db=await getDatabaseManager();
    const result=await db.query('SELECT id,name,base_url,model,enabled,priority,protocols_json,capabilities_json,latency_ms,last_probe,failures,last_success,last_failure FROM endpoint_profiles ORDER BY priority DESC');
    return (result.values||[]).map((row:any)=>({
      id:String(row.id),name:String(row.name),baseUrl:String(row.base_url),
      enabled:Number(row.enabled)!==0,priority:Number(row.priority||50),protocols:jsonEnumArray<EndpointProtocol>(row.protocols_json, ['openai-v1','openai-responses','ollama-v1','ollama-native','lmstudio-v1','llamacpp','localai','vllm','mlc','unknown']),capabilities:jsonEnumArray<EndpointCapability>(row.capabilities_json, ['chat','responses','models','embeddings','generate','tags','health','streaming']),
      latencyMs:Number(row.latency_ms||99999),failures:Number(row.failures||0),
      ...(row.model!=null && row.model!=='' ? {model:String(row.model)} : {}),
      ...(row.last_probe!=null ? {lastProbe:Number(row.last_probe)} : {}),
      ...(row.last_success!=null ? {lastSuccess:Number(row.last_success)} : {}),
      ...(row.last_failure!=null ? {lastFailure:Number(row.last_failure)} : {})
    }));
  }catch{return []}
}
function jsonEnumArray<T extends string>(value:unknown,allowed:readonly T[]):T[]{try{const x=JSON.parse(String(value||'[]'));if(!Array.isArray(x))return [];const set=new Set(allowed);return x.map(String).filter((item):item is T=>set.has(item as T));}catch{return []}}
