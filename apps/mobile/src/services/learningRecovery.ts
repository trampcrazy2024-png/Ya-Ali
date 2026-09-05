import { getLearningReviewAnalytics, getRecentLearningEvents } from './learningPersistence';

export type RecoveryReport = {
  eventCount:number;
  reviewEvents:number;
  latestEventAt?:string;
  itemCount:number;
  dialectCount:number;
  replayReady:boolean;
};

/** Audits the append-only ledger before a future full replay/restore operation. */
export async function auditLearningLedger(limit=1000):Promise<RecoveryReport>{
  const rows:any[]=await getRecentLearningEvents(limit);
  const itemIds=new Set<string>(); const dialects=new Set<string>();
  let reviewEvents=0;
  for(const row of rows){if(row.item_id)itemIds.add(String(row.item_id));if(row.dialect)dialects.add(String(row.dialect));if(row.rating)reviewEvents++;}
  const analytics=await getLearningReviewAnalytics();
  const report: RecoveryReport = {eventCount:rows.length,reviewEvents:Math.max(reviewEvents,analytics.total),itemCount:itemIds.size,dialectCount:dialects.size,replayReady:rows.every(r=>!!r.created_at)};
  if(rows[0]?.created_at) report.latestEventAt=String(rows[0].created_at);
  return report;
}
