export type ResearchSource = { title:string; url:string; publisher?:string; retrievedAt?:string; license?:string };
export type ResearchSection = {title:string;summary:string;examples:string[];terms:string[]};
export type ResearchReport = { id:string; topic:string; language?:string; dialect?:string; objective:string; sections:ResearchSection[]; sources:ResearchSource[]; createdAt:string };
export interface ResearchPlan { query:string; objective:string; stages:string[]; outputSections:string[]; sourceRequirements:string[]; }
export interface ResearchDocument { source:ResearchSource; text:string; }
export interface ResearchFetcher { fetch(url:string,signal?:AbortSignal):Promise<ResearchDocument>; }

export function createLanguageResearchPlan(query:string, options:{language?:string;dialect?:string}={}):ResearchPlan {
  const language=options.language||'target language';
  const dialect=options.dialect ? ` (${options.dialect})` : '';
  return { query:query.trim(), objective:`Deep research for ${language}${dialect}: real usage, terminology, examples, register and learning value.`, stages:['scope and terminology','source discovery','cross-source comparison','usage/example extraction','license/provenance validation','learner synthesis'], outputSections:['Executive summary','Core terminology','Real examples','Usage and register','Common mistakes','Practice recommendations','Sources'], sourceRequirements:['source URL','publisher/author when available','retrieval date','license/provenance when redistributable'] };
}

export function buildResearchReport(plan:ResearchPlan, documents:ResearchDocument[], now=new Date().toISOString()):ResearchReport {
  const all=documents.flatMap(d=>d.text.split(/\n+/).map(x=>x.trim()).filter(Boolean));
  const termCandidates=all.flatMap(line=>line.match(/[\p{L}][\p{L}\p{M}'’-]{2,}/gu)||[]);
  const counts=new Map<string,number>();
  for(const t of termCandidates) counts.set(t,(counts.get(t)||0)+1);
  const terms=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,30).map(([x])=>x);
  const examples=all.filter(x=>/[.!؟]/.test(x)).slice(0,12);
  return {
    id:`research_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    topic:plan.query, objective:plan.objective,
    sections:[
      {title:'Executive summary',summary:`${documents.length} source(s) reviewed for ${plan.query}.`,examples:[],terms:[]},
      {title:'Core terminology',summary:'Frequency-ranked lexical candidates extracted from collected text.',examples:[],terms},
      {title:'Real examples',summary:'Examples retained from the source corpus.',examples,terms:[]},
      {title:'Usage and register',summary:'Compare examples across sources before treating a phrase as colloquial or dialect-specific.',examples:all.filter(x=>/formal|informal|colloquial|عامیانه|رسمی|محاوره/i.test(x)).slice(0,8),terms:[]},
      {title:'Practice recommendations',summary:'Turn verified terms into sentence-mining and scenario practice items.',examples:[],terms:terms.slice(0,10)}
    ],
    sources:documents.map(x=>({...x.source,retrievedAt:x.source.retrievedAt||now})),createdAt:now
  };
}

export function researchReportToMarkdown(report:ResearchReport):string {
  const lines=[`# ${report.topic}`,``,report.objective,``];
  for(const section of report.sections){lines.push(`## ${section.title}`,``,section.summary,``);if(section.terms.length) lines.push('### Terms',...section.terms.map(x=>`- ${x}`),'');if(section.examples.length) lines.push('### Examples',...section.examples.map(x=>`- ${x}`),'');}
  lines.push('## Sources','',...report.sources.map(s=>`- ${s.title} — ${s.url}${s.publisher?` — ${s.publisher}`:''}`));
  return lines.join('\n');
}
