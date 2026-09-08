import { getDatabaseManager } from '../languageBank';

export type LearningEvent = {
  itemId?: string;
  dialect?: string;
  skill?: string;
  rating?: string;
  signal?: number;
  payload?: Record<string, unknown>;
  createdAt?: number;
};

type StoredReviewState = { itemId: string; state: Record<string, unknown>; updatedAt: string };
type StoredDialectState = { dialect: string; state: Record<string, unknown>; updatedAt: string };

let queue: Promise<unknown> = Promise.resolve();
function uid(prefix='learn') { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,10)}`; }
function enqueue<T>(job:()=>Promise<T>):Promise<T> {
  const next=queue.then(job,job);
  queue=next.then(()=>undefined,()=>undefined);
  return next;
}

export function appendLearningEvent(event: LearningEvent): Promise<void> {
  return enqueue(async () => {
    try {
      const db = await getDatabaseManager();
      await db.execute(`
        INSERT INTO learning_events
        (id,item_id,dialect,skill,rating,signal,payload,created_at)
        VALUES (?,?,?,?,?,?,?,?)
      `, [
        uid(), event.itemId || null, event.dialect || null, event.skill || null,
        event.rating || null, event.signal ?? null,
        event.payload ? JSON.stringify(event.payload) : null,
        new Date(event.createdAt || Date.now()).toISOString()
      ]);
    } catch {
      // Web/no-SQLite remains supported. The caller's versioned local state is the fallback mirror.
    }
  });
}

export async function persistReviewState(itemId:string,state:Record<string,unknown>):Promise<void>{
  return enqueue(async()=>{
    try{
      const db=await getDatabaseManager();
      await db.execute(`INSERT OR REPLACE INTO learning_review_states(item_id,state_json,updated_at) VALUES (?,?,?)`,[
        itemId,JSON.stringify(state),new Date().toISOString()
      ]);
    }catch{}
  });
}

export async function getPersistedReviewStates():Promise<StoredReviewState[]>{
  try{
    const db=await getDatabaseManager();
    const result=await db.query('SELECT item_id,state_json,updated_at FROM learning_review_states ORDER BY updated_at DESC');
    return (result.values||[]).map((row:any)=>{
      try{return {itemId:String(row.item_id),state:JSON.parse(String(row.state_json||'{}')),updatedAt:String(row.updated_at||'')}}catch{return null}
    }).filter(Boolean) as StoredReviewState[];
  }catch{return []}
}

export async function persistDialectState(state:{dialect:string;mastery:number;confidence:number;exposure:number;streak:number;reviews:number;successes:number;skills:Record<string,number>;confusions:Record<string,number>;lastRating?:string;lastReview?:number}):Promise<void>{
  return enqueue(async()=>{
    try {
      const db=await getDatabaseManager();
      await db.execute(`INSERT OR REPLACE INTO dialect_learning_state (dialect,mastery,confidence,exposure,streak,reviews,successes,skills_json,confusions_json,last_rating,last_review,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,[
        state.dialect,state.mastery,state.confidence,state.exposure,state.streak,state.reviews,state.successes,
        JSON.stringify(state.skills),JSON.stringify(state.confusions),state.lastRating||null,state.lastReview||null,new Date().toISOString()
      ]);
    } catch {}
  });
}

export async function getPersistedDialectStates():Promise<StoredDialectState[]>{
  try{
    const db=await getDatabaseManager();
    const result=await db.query('SELECT dialect,mastery,confidence,exposure,streak,reviews,successes,skills_json,confusions_json,last_rating,last_review,updated_at FROM dialect_learning_state');
    return (result.values||[]).map((row:any)=>({
      dialect:String(row.dialect),
      state:{dialect:String(row.dialect),mastery:Number(row.mastery||0),confidence:Number(row.confidence||0),exposure:Number(row.exposure||0),streak:Number(row.streak||0),reviews:Number(row.reviews||0),successes:Number(row.successes||0),skills:parseJson(row.skills_json,{}),confusions:parseJson(row.confusions_json,{}),lastRating:row.last_rating||undefined,lastReview:row.last_review==null?undefined:Number(row.last_review)},
      updatedAt:String(row.updated_at||'')
    }));
  }catch{return []}
}

function parseJson<T>(value:unknown,fallback:T):T{try{return JSON.parse(String(value||'')) as T}catch{return fallback}}

/** Rebuild the scheduler mirror from the append-only event log. Review events carry a full v6 snapshot. */
export async function rebuildLearningMirrorFromEvents():Promise<number>{
  try{
    const db=await getDatabaseManager();
    const result=await db.query(`SELECT item_id,payload,created_at FROM learning_events WHERE item_id IS NOT NULL AND rating IS NOT NULL ORDER BY created_at ASC`);
    const latest=new Map<string,Record<string,unknown>>();
    for(const row of (result.values||[]) as any[]){
      try{const payload=JSON.parse(String(row.payload||'{}'));const state=payload?.state;if(state?.stateVersion===6)latest.set(String(row.item_id),state)}catch{}
    }
    if(!latest.size)return 0;
    return latest.size;
  }catch{return 0}
}

export async function getLearningEventCount(): Promise<number> {
  try {
    const db = await getDatabaseManager();
    const result = await db.query('SELECT COUNT(*) AS count FROM learning_events');
    return Number(result.values?.[0]?.count || 0);
  } catch { return 0; }
}

export async function getRecentLearningEvents(limit=100) {
  try {
    const db = await getDatabaseManager();
    const result = await db.query(
      'SELECT id,item_id,dialect,skill,rating,signal,payload,created_at FROM learning_events ORDER BY created_at DESC LIMIT ?',
      [Math.max(1, Math.min(1000, limit))]
    );
    return result.values || [];
  } catch { return []; }
}


export async function persistReviewLog(entry:{itemId:string;rating:string;signal?:string;retentionTarget:number;elapsedDays:number;stability:number;difficulty:number;dueAt:number;reviewedAt:number;state:Record<string,unknown>}):Promise<void>{
  return enqueue(async()=>{try{const db=await getDatabaseManager();await db.execute(`INSERT INTO learning_review_log (id,item_id,rating,signal,retention_target,elapsed_days,stability,difficulty,due_at,reviewed_at,state_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,[uid('review'),entry.itemId,entry.rating,entry.signal||null,entry.retentionTarget,entry.elapsedDays,entry.stability,entry.difficulty,entry.dueAt,entry.reviewedAt,JSON.stringify(entry.state)]);}catch{}});
}

export async function getLearningReviewAnalytics(){
  try{
    const db=await getDatabaseManager();
    const result=await db.query(`SELECT rating, COUNT(*) AS count, AVG(stability) AS stability, AVG(difficulty) AS difficulty FROM learning_review_log GROUP BY rating`);
    const rows=result.values||[];
    const total=rows.reduce((n:any,r:any)=>n+Number(r.count||0),0);
    const again=Number(rows.find((r:any)=>r.rating==='again')?.count||0);
    const hard=Number(rows.find((r:any)=>r.rating==='hard')?.count||0);
    const good=Number(rows.find((r:any)=>r.rating==='good')?.count||0);
    const easy=Number(rows.find((r:any)=>r.rating==='easy')?.count||0);
    return {total,again,hard,good,easy,lapseRate:total?again/total:0,successRate:total?(good+easy)/total:0,rows};
  }catch{return {total:0,again:0,hard:0,good:0,easy:0,lapseRate:0,successRate:0,rows:[] as any[]}}
}

export async function persistRuntimeBenchmark(result:{runtime:string;modelPath:string;backend?:string;ok:boolean;elapsedMs:number;outputChars:number;charsPerSecond:number;error?:string;createdAt?:string}):Promise<void>{
  return enqueue(async()=>{try{const db=await getDatabaseManager();await db.execute(`INSERT INTO runtime_benchmarks (id,runtime,model_path,backend,ok,elapsed_ms,output_chars,chars_per_second,error,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,[uid('bench'),result.runtime,result.modelPath,result.backend||null,result.ok?1:0,result.elapsedMs,result.outputChars,result.charsPerSecond,result.error||null,result.createdAt||new Date().toISOString()]);}catch{}});
}

export async function getRuntimeBenchmarkHistory(limit=50){
  try{const db=await getDatabaseManager();const r=await db.query(`SELECT runtime,model_path,backend,ok,elapsed_ms,output_chars,chars_per_second,error,created_at FROM runtime_benchmarks ORDER BY created_at DESC LIMIT ?`,[Math.max(1,Math.min(500,limit))]);return r.values||[];}catch{return []}
}

export async function appendEndpointRouteEvent(entry:{endpointId:string;capability:string;ok:boolean;latencyMs:number;error?:string;createdAt?:string}):Promise<void>{
  return enqueue(async()=>{try{const db=await getDatabaseManager();await db.execute(`INSERT INTO endpoint_route_events (id,endpoint_id,capability,ok,latency_ms,error,created_at) VALUES (?,?,?,?,?,?,?)`,[uid('route'),entry.endpointId,entry.capability,entry.ok?1:0,entry.latencyMs,entry.error||null,entry.createdAt||new Date().toISOString()]);}catch{}});
}
