import { endpointRoot, probeEndpoint, type EndpointCapability, type EndpointProbe, type EndpointProtocol } from './endpointMatrix';
import { deleteEndpointProfile, loadEndpointProfilesFromSQLite, persistEndpointProfile } from './endpointPersistence';

export type EndpointProfile = {
  id:string; name:string; baseUrl:string; model?:string; enabled:boolean; priority:number;
  protocols:EndpointProtocol[]; capabilities:EndpointCapability[]; latencyMs:number; lastProbe?:number; failures:number; lastSuccess?:number; lastFailure?:number;
};
const KEY='yaali_endpoint_profiles_v1';
const ACTIVE='yaali_endpoint_active_v1';
function read():EndpointProfile[]{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return []}}
function write(x:EndpointProfile[]){try{localStorage.setItem(KEY,JSON.stringify(x.slice(0,32)))}catch{}}
function uid(){return `ep_${Date.now()}_${Math.random().toString(36).slice(2,7)}`}
export function getEndpointProfiles(){return read().sort((a,b)=>b.priority-a.priority)}
export function getActiveEndpointProfile(){const id=localStorage.getItem(ACTIVE)||'';return read().find(x=>x.id===id && x.enabled)||getEndpointProfiles().find(x=>x.enabled)}

/** Hydrate the endpoint pool from SQLite when the web mirror is empty. */
export async function hydrateEndpointProfilesFromSQLite():Promise<number>{
  const local=read(); if(local.length)return 0;
  const rows=await loadEndpointProfilesFromSQLite(); if(!rows.length)return 0;
  write(rows); return rows.length;
}
export function setActiveEndpointProfile(id:string){try{localStorage.setItem(ACTIVE,id)}catch{}}
export function upsertEndpointProfile(input:Partial<EndpointProfile>&Pick<EndpointProfile,'baseUrl'>){
  const all=read();const base=endpointRoot(input.baseUrl);const existing=all.find(x=>x.id===input.id) || all.find(x=>endpointRoot(x.baseUrl)===base);
  const modelValue=input.model??existing?.model;
  const lastProbeValue=input.lastProbe??existing?.lastProbe;
  const lastSuccessValue=input.lastSuccess??existing?.lastSuccess;
  const lastFailureValue=input.lastFailure??existing?.lastFailure;
  const next:EndpointProfile={id:existing?.id||input.id||uid(),name:input.name||existing?.name||base,baseUrl:base,enabled:input.enabled??existing?.enabled??true,priority:input.priority??existing?.priority??50,protocols:input.protocols??existing?.protocols??[],capabilities:input.capabilities??existing?.capabilities??[],latencyMs:input.latencyMs??existing?.latencyMs??99999,failures:input.failures??existing?.failures??0,...(modelValue!=null?{model:modelValue}:{}),...(lastProbeValue!=null?{lastProbe:lastProbeValue}:{}),...(lastSuccessValue!=null?{lastSuccess:lastSuccessValue}:{}),...(lastFailureValue!=null?{lastFailure:lastFailureValue}:{})};
  write([next,...all.filter(x=>x.id!==next.id)]); void persistEndpointProfile(next); return next;
}
export function removeEndpointProfile(id:string){write(read().filter(x=>x.id!==id));if(localStorage.getItem(ACTIVE)===id)try{localStorage.removeItem(ACTIVE)}catch{};void deleteEndpointProfile(id)}
export function scoreEndpoint(p:EndpointProfile,need:EndpointCapability[]=['chat']){const caps=new Set(p.capabilities);const coverage=need.filter(x=>caps.has(x)).length/Math.max(1,need.length);const latency=Math.max(0,1-Math.min(1,p.latencyMs/5000));return coverage*70+latency*20+Math.max(0,Math.min(10,p.priority/10))-p.failures*8}
export function chooseBestEndpoint(need:EndpointCapability[]=['chat']){return getEndpointProfiles().filter(x=>x.enabled).sort((a,b)=>scoreEndpoint(b,need)-scoreEndpoint(a,need))[0]}
export async function probeAndSaveEndpoint(input:string,name?:string):Promise<EndpointProfile>{const probe:EndpointProbe=await probeEndpoint(input);const p=upsertEndpointProfile({baseUrl:probe.baseUrl,name:name||probe.baseUrl,protocols:probe.protocols,capabilities:probe.capabilities,latencyMs:probe.latencyMs,lastProbe:Date.now(),failures:probe.ok?0:1});if(probe.ok)setActiveEndpointProfile(p.id);return p}
export function recordEndpointSuccess(id:string,latencyMs?:number){
  const now=Date.now(); const all=read(); const p=all.find(x=>x.id===id); if(!p)return; p.failures=0; p.lastSuccess=now; p.lastProbe=now; if(Number.isFinite(latencyMs))p.latencyMs=Math.max(0,Math.round(latencyMs as number)); write(all); void persistEndpointProfile(p);
}
export function recordEndpointFailure(id:string){
  const now=Date.now(); const all=read(); const p=all.find(x=>x.id===id); if(!p)return; p.failures=Math.min(20,(p.failures||0)+1); p.lastFailure=now; write(all); void persistEndpointProfile(p);
}

export function getEndpointCandidates(need:EndpointCapability[]=['chat'],limit=6){
  return getEndpointProfiles().filter(x=>x.enabled).sort((a,b)=>scoreEndpoint(b,need)-scoreEndpoint(a,need)).slice(0,Math.max(1,Math.min(12,limit)));
}

export function endpointHealthSummary(){const all=getEndpointProfiles();return {total:all.length,enabled:all.filter(x=>x.enabled).length,healthy:all.filter(x=>x.lastProbe && Date.now()-x.lastProbe<86400000 && x.failures===0).length,best:chooseBestEndpoint()?.name||''}}

export async function chooseHealthyEndpoint(need:EndpointCapability[]=['chat']):Promise<EndpointProfile|undefined>{
  const candidates=getEndpointCandidates(need,8);
  if(!candidates.length)return undefined;
  const now=Date.now();
  for(const candidate of candidates){
    const stale=!candidate.lastProbe || now-candidate.lastProbe>15*60*1000;
    if(stale){try{const probe=await probeEndpoint(candidate.baseUrl);if(probe.ok){const updated=upsertEndpointProfile({id:candidate.id,baseUrl:candidate.baseUrl,protocols:probe.protocols,capabilities:probe.capabilities,latencyMs:probe.latencyMs,lastProbe:Date.now(),failures:0});setActiveEndpointProfile(updated.id);return updated;}recordEndpointFailure(candidate.id);}catch{recordEndpointFailure(candidate.id)}}
    else {setActiveEndpointProfile(candidate.id);return candidate;}
  }
  return undefined;
}
