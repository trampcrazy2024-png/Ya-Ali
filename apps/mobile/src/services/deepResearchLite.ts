import { buildResearchReport, createLanguageResearchPlan, researchReportToMarkdown, type ResearchDocument, type ResearchFetcher, type ResearchReport } from '@yaali/core';

export class FetchResearchSource implements ResearchFetcher {
  async fetch(url:string,signal?:AbortSignal):Promise<ResearchDocument>{
    const parsed=new URL(url);
    if(parsed.protocol!=='https:') throw new Error('Research sources must use HTTPS.');
    const response=await fetch(url,{signal,headers:{Accept:'text/html,text/plain,application/json'}});
    if(!response.ok) throw new Error(`Research source HTTP ${response.status}`);
    const text=(await response.text()).slice(0,1_000_000);
    const clean=text.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    return {source:{title:parsed.hostname,url,retrievedAt:new Date().toISOString()},text:clean};
  }
}

export async function runDeepResearchLite(query:string,options:{language?:string;dialect?:string;urls?:string[];signal?:AbortSignal}={}):Promise<ResearchReport>{
  const plan=createLanguageResearchPlan(query,options);
  const fetcher=new FetchResearchSource();
  const docs:ResearchDocument[]=[];
  for(const url of (options.urls||[]).slice(0,8)) docs.push(await fetcher.fetch(url,options.signal));
  return buildResearchReport(plan,docs);
}

export function exportResearchMarkdown(report:ResearchReport){return researchReportToMarkdown(report)}
