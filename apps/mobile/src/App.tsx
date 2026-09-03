import { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { BookOpen, Brain, Bot, Search, Languages, Settings as SettingsIcon, Send, Mic, Volume2, Star, Download, Upload, Trash2, Wifi, WifiOff } from 'lucide-react';
import { PHRASES } from './data';
import { getLangCode } from './data';
import { initLanguageBank, getBankItems, searchBank, saveBankItem, exportBank, importBank } from './languageBank';
import { chat, configuredProviders, providerLabel, testProvider, discoverCustomModels } from './ai';
import { getLogs, addLog, clearLogs, exportLogs, getNativeLogcat } from './diagnostics';
import { listenSpeech } from './speech';
import { localChat, localModelStatus, loadLocalModel, listLocalModels, deleteLocalModel } from './modelManager';
import { getSpeechSpeed, setSpeechSpeed, getOpenRouterApiKey, setOpenRouterApiKey, getGeminiApiKey, setGeminiApiKey, getGroqApiKey, setGroqApiKey, getCustomEndpoint, setCustomEndpoint, getCustomModel, setCustomModel } from './settings';

const NativeTTS = registerPlugin<any>('NativeTTS');

type Msg={id:string;role:'user'|'assistant';text:string;provider?:string};
type Tab='chat'|'search'|'learn'|'dictionary'|'translator'|'settings'|'diagnostics';

async function speak(text:string,lang='ar-SA'){
  if(Capacitor.isNativePlatform()){
    try{ await NativeTTS.speak({text,lang,rate:getSpeechSpeed(),pitch:1}); }catch(e:any){ await addLog('warn',`TTS failed: ${e?.message||e}`); }
    return;
  }
  try{const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=getSpeechSpeed();speechSynthesis.cancel();speechSynthesis.speak(u)}catch{}
}

async function copyText(text:string){
  try{await navigator.clipboard.writeText(text);return true}catch{}
  try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();const ok=document.execCommand('copy');ta.remove();return ok}catch{return false}
}

function localAnswer(text:string){
  const q=text.trim();
  const exact=searchBank(q,3)[0];
  if(exact) return `پاسخ محلی:\n${exact.translation || exact.definition || exact.text}\n\nعبارت مرتبط: ${exact.text}`;
  const fa=/[\u0600-\u06FF]/.test(q);
  return fa
    ? 'فعلاً هوش مصنوعی آنلاین در دسترس نیست. اتصال اینترنت و حداقل یک کلید سرویس رایگان را در «تنظیمات» فعال کنید. بانک زبان محلی همچنان فعال است.'
    : 'The online AI is not configured or unavailable. Open Settings and add at least one free-tier AI key. The local language bank is still available.';
}

export default function App(){
  const [tab,setTab]=useState<Tab>('chat');
  const [online,setOnline]=useState(()=>navigator.onLine);
  const [messages,setMessages]=useState<Msg[]>([]);
  const [input,setInput]=useState('');
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState('');
  const [bank,setBank]=useState(getBankItems());
  const [query,setQuery]=useState('');
  const [targetLang,setTargetLang]=useState('ar-IQ');
  const [dialect,setDialect]=useState<'iraqi'|'lebanese'|'american'>('iraqi');
  const [localModel,setLocalModel]=useState<any>({loaded:false});
  const [localModels,setLocalModels]=useState<any[]>([]);
  const [customModels,setCustomModels]=useState<string[]>([]);
  const [customModelReady,setCustomModelReady]=useState(false);
  const [logs,setLogs]=useState(getLogs());
  const [nativeLogcat,setNativeLogcat]=useState('');
  const [translateOut,setTranslateOut]=useState('');
  const [learnIndex,setLearnIndex]=useState(0);
  const [learnScore,setLearnScore]=useState(0);
  const [backArmed,setBackArmed]=useState(false);
  const [orKey,setOrKey]=useState(getOpenRouterApiKey());
  const [gemKey,setGemKey]=useState(getGeminiApiKey());
  const [groqKey,setGroqKey]=useState(getGroqApiKey());
  const [customEndpoint,setCustomEndpointState]=useState(getCustomEndpoint());
  const [customModel,setCustomModelState]=useState(getCustomModel());
  const [speechSpeed,setSpeed]=useState(getSpeechSpeed());
  const fileRef=useRef<HTMLInputElement>(null);
  const endRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{initLanguageBank().then(()=>setBank(getBankItems())); Promise.all([localModelStatus(),listLocalModels()]).then(([s,m])=>{setLocalModel(s);setLocalModels(m)}); if(getCustomEndpoint()){discoverCustomModels().then(m=>{setCustomModels(m);setCustomModelReady(true);if(m.length&&!getCustomModel()){setCustomModelState(m[0]);setCustomModel(m[0])}})}},[]);
  useEffect(()=>{ const onResize=()=>document.documentElement.style.setProperty('--vh', `${window.innerHeight*0.01}px`); onResize(); addEventListener('resize',onResize); return()=>removeEventListener('resize',onResize); },[]);
  useEffect(()=>{
    const on=()=>setOnline(true),off=()=>setOnline(false);
    addEventListener('online',on);addEventListener('offline',off);
    return()=>{removeEventListener('online',on);removeEventListener('offline',off)};
  },[]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[messages,busy]);
  useEffect(()=>{
    if(!Capacitor.isNativePlatform()) return;
    const onBack=()=>{
      if(tab!=='chat'){setTab('chat');setBackArmed(false);return}
      setBackArmed(true);
      setToast('برای خروج، دوباره دکمه بازگشت را بزنید');
      window.setTimeout(()=>setBackArmed(false),2200);
    };
    window.addEventListener('yaaliBack',onBack);
    return()=>window.removeEventListener('yaaliBack',onBack);
  },[tab,backArmed]);

  const results=useMemo(()=>searchBank(query,120),[query,bank]);
  const supportedPhrases=useMemo(()=>PHRASES.filter((p:any)=>{const d=String(p.dialect||'');return d.includes('عراقی')||d.includes('لبنانی')||d.includes('آمریکایی')}),[]);
  const learningItems=useMemo(()=>bank.filter((x:any)=>String(x.dialect||'').includes('عراقی')||String(x.dialect||'').includes('لبنانی')||String(x.dialect||'').includes('آمریکایی')), [bank]);
  const current=(learningItems.length?learningItems[learnIndex%learningItems.length]:supportedPhrases[learnIndex%supportedPhrases.length]) as any;

  const send=async()=>{
    const text=input.trim();if(!text||busy)return;
    setInput('');
    const u:Msg={id:crypto.randomUUID(),role:'user',text};
    const history=[...messages,u];
    setMessages(history);setBusy(true);
    try{
      let reply:string;let provider:string|undefined;
      const dialectName=dialect==='iraqi'?'Iraqi Arabic':dialect==='lebanese'?'Lebanese Arabic':'American English';
      const system=`You are Ya Ali, a warm intelligent language partner for a Persian-speaking learner. Primary UI/native language is Persian. Teach and converse naturally in ${dialectName}. Only use Iraqi Arabic, Lebanese Arabic, or American English for the supported learning targets. Explain difficult points briefly in Persian, correct meaningful mistakes gently, preserve conversational flow, and prefer practical colloquial language.`;
      if(online && configuredProviders().length){
        try {
          const r=await chat([{role:'system',content:system},...history.slice(-12).map(m=>({role:m.role,content:m.text}))]);
          reply=r.text;provider=providerLabel(r.provider);
        } catch (onlineError:any) {
          await addLog('warn',`online AI failed; trying Local AI: ${onlineError?.message||onlineError}`);
          try { reply=await localChat([{role:'system',content:system},{role:'user',content:text}]); provider='Local AI fallback'; }
          catch(localError:any) { await addLog('warn',`local AI failed: ${localError?.message||localError}`); reply=localAnswer(text); provider='Local Search'; }
        }
      } else {
        try { reply=await localChat([{role:'system',content:system},{role:'user',content:text}]); provider='Local AI'; }
        catch(localError:any) { await addLog('warn',`local AI failed: ${localError?.message||localError}`); reply=localAnswer(text); provider='Local Search'; }
      }
      setMessages(m=>[...m,{id:crypto.randomUUID(),role:'assistant',text:reply,...(provider?{provider}: {})}]);
      await addLog('info',`chat completed provider=${provider||'local-search'}`); setLogs(getLogs());
    }catch(e:any){
      await addLog('error',`chat failed: ${e?.message||String(e)}`); setLogs(getLogs());
      setMessages(m=>[...m,{id:crypto.randomUUID(),role:'assistant',text:localAnswer(text)}]);
      setToast(e?.message||'سرویس AI در دسترس نیست');
    }finally{setBusy(false)}
  };


  const translate=async()=>{
    const text=input.trim();if(!text)return;
    setBusy(true);
    try{
      if(online&&configuredProviders().length){
        const targetName=targetLang==='ar-IQ'?'Iraqi Arabic':targetLang==='ar-LB'?'Lebanese Arabic':'American English';
        const r=await chat([{role:'system',content:`You are a professional Persian-first language tutor. Translate the user's text into ${targetName}. Return exactly four short labeled lines in Persian: «ترجمه طبیعی: ...», «ترجمه تحت‌اللفظی: ...», «تلفظ: ...», «نکته: ...». For Iraqi/Lebanese Arabic use genuinely colloquial forms, not Modern Standard Arabic. For American English use natural everyday US English. Do not add other sections.`},{role:'user',content:text}]);
        setTranslateOut(r.text);
      }else{
        const x=searchBank(text,5)[0];
        setTranslateOut(x?`${x.translation||x.definition}\n\n${x.text}\n${x.pronunciation||x.transliteration||''}`:'ترجمه محلی برای این متن پیدا نشد.');
      }
    }catch{setTranslateOut('ترجمه آنلاین ناموفق بود؛ بانک محلی را امتحان کنید.')}
    finally{setBusy(false)}
  };

  const nav=[
    ['chat','مکالمه',Bot],['search','جستجو',Search],['learn','یادگیری',Brain],
    ['dictionary','واژه‌نامه',BookOpen],['translator','مترجم',Languages],['settings','تنظیمات',SettingsIcon],['diagnostics','عیب‌یابی',SettingsIcon]
  ] as const;

  return <div dir="rtl" className={`app tab-${tab}`}>
    <header className="topbar">
      <div><div className="brand">Ya Ali</div><div className="subtitle">یا امیرالمؤمنین علی علیه السلام · دستیار هوشمند فارسی‌محور</div></div>
      <div className={online?'status online':'status'}>{online?<Wifi size={15}/>:<WifiOff size={15}/>} {online?'آنلاین':'آفلاین'}</div>
    </header>

    <main className="main">
      {tab==='chat'&&<section className="panel chat-panel">
        <div className="hero"><Bot size={28}/><div><h1>مکالمه هوشمند</h1><p>مکالمه طبیعی با AI آنلاین یا مدل محلی</p></div></div><div className="selectors"><label>زبان هدف<select value={dialect} onChange={e=>{const v=e.target.value as any;setDialect(v);setTargetLang(v==='american'?'en-US':v==='lebanese'?'ar-LB':'ar-IQ')}}><option value="iraqi">عربی عراقی</option><option value="lebanese">عربی لبنانی</option><option value="american">انگلیسی آمریکایی</option></select></label></div>
        <div className="messages">
          {messages.length===0&&<div className="empty"><Bot size={44}/><h2>سلام! 👋</h2><p>به فارسی بنویسید و با هوش مصنوعی مکالمه کنید.</p><p className="muted">برای AI رایگان، در تنظیمات یک یا چند کلید Free Tier وارد کنید.</p></div>}
          {messages.map(m=><div key={m.id} className={'bubble '+m.role}><div className="bubbleText">{m.text}</div>{m.provider&&<small>{m.provider}</small>}{m.role==='assistant'&&<div className="bubbleActions"><button className="iconBtn" onClick={()=>speak(m.text,targetLang.startsWith('ar')?targetLang:'en-US')}><Volume2 size={17}/></button><button className="iconBtn" onClick={async()=>setToast((await copyText(m.text))?'کپی شد':'کپی ناموفق بود')} aria-label="کپی">کپی</button></div>}</div>)}
          {busy&&<div className="typing">در حال دریافت پاسخ هوشمند…</div>}<div ref={endRef}/>
        </div>
        <div className="composer">
          <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder="پیام خود را بنویسید…" rows={2}/>
          <button className="iconBtn micBtn" aria-label="ضبط صدا" onClick={async()=>{try{setToast('در حال گوش دادن…');const text=await listenSpeech('fa-IR');if(text)setInput(v=>v?`${v} ${text}`:text);setToast('صدای شما دریافت شد')}catch(e:any){await addLog('warn',`speech failed: ${e?.message||e}`);setToast(`تشخیص گفتار انجام نشد: ${e?.message||'سرویس گفتار دستگاه در دسترس نیست'}`)}}}><Mic size={20}/></button>
          <button className="sendBtn" onClick={send} disabled={busy||!input.trim()}><Send size={20}/></button>
        </div>
      </section>}

      {tab==='search'&&<section className="panel">
        <h1>🔎 جستجوی بانک زبان</h1><p className="muted">جستجوی فارسی، عربی، انگلیسی، تلفظ، ترجمه، لهجه و موضوع.</p>
        <input className="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="مثلاً: فرودگاه، سلام، airport…"/>
        <div className="count">{results.length} نتیجه از {bank.length.toLocaleString('fa-IR')} مورد</div>
        <div className="cards">{results.map(x=><div className="wordCard" key={x.id}><div className="word">{x.text}</div><div>{x.translation||x.definition}</div><div className="phon">{x.pronunciation||x.transliteration}</div><small>{x.dialect||'—'} · {x.topic||'عمومی'} · {x.level||'—'}</small><div className="cardActions"><button onClick={()=>speak(x.text,getLangCode(x.dialect,x.source_language==='en'?'english':'arabic'))}><Volume2 size={16}/> تلفظ</button><button onClick={()=>saveBankItem({...x,id:`fav_${Date.now()}`,favorite:1})}><Star size={16}/> ذخیره</button></div></div>)}</div>
      </section>}

      {tab==='learn'&&<section className="panel learn">
        <h1>🧠 یادگیری و مرور</h1><p className="muted">مرور واقعی از بانک زبان؛ بدون آمار ساختگی.</p>
        <div className="learnCard"><div className="label">واژه / عبارت</div><div className="big">{current.text||current.arabic}</div><div className="phon">{current.transliteration||current.arabicPhoneticLatin}</div><button onClick={()=>speak(current.text||current.arabic,getLangCode(current.dialect,current.source_language==='en'?'english':'arabic'))} className="wide"><Volume2/> شنیدن تلفظ</button><div className="translation">{current.translation||current.farsi}</div><div className="muted">{current.example_text||''}<br/>{current.example_translation||''}</div></div>
        <div className="learnActions"><button onClick={()=>{setLearnScore(s=>s+1);setLearnIndex(i=>i+1)}}>بلدم ✓</button><button onClick={()=>setLearnIndex(i=>i+1)}>دوباره</button></div><div className="score">مرورهای موفق این نشست: {learnScore}</div>
      </section>}

      {tab==='dictionary'&&<section className="panel">
        <h1>📚 واژه‌نامه</h1><p className="muted">تعریف، ترجمه، تلفظ، لهجه و مثال از بانک محلی.</p>
        <input className="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="واژه را وارد کنید…"/>
        <div className="dictionary">{results.slice(0,30).map(x=><article key={x.id}><h2>{x.text}</h2><p>{x.definition||x.translation}</p><p className="phon">{x.pronunciation||x.transliteration}</p><p>{x.example_translation}</p><button onClick={()=>speak(x.text,getLangCode(x.dialect,x.source_language==='en'?'english':'arabic'))}><Volume2 size={15}/> تلفظ</button></article>)}</div>
      </section>}

      {tab==='translator'&&<section className="panel">
        <h1>🌐 مترجم</h1><p className="muted">ترجمه با AI رایگان یا fallback به بانک محلی.</p>
        <select value={targetLang} onChange={e=>setTargetLang(e.target.value)}><option value="ar-IQ">عربی عراقی</option><option value="ar-LB">عربی لبنانی</option><option value="en-US">انگلیسی آمریکایی</option></select>
        <textarea className="translateInput" value={input} onChange={e=>setInput(e.target.value)} placeholder="متن فارسی یا زبان مبدأ…"/>
        <button className="primary wide" onClick={translate} disabled={busy||!input.trim()}>ترجمه</button>
        {translateOut&&<div className="resultBox"><div>{translateOut}</div><button onClick={()=>speak(translateOut,targetLang.startsWith('ar')?targetLang:'en-US')}><Volume2 size={16}/> پخش</button></div>}
      </section>}

      {tab==='settings'&&<section className="panel settings">
        <h1>⚙️ تنظیمات</h1>
        <div className="notice"><strong>AI رایگان بدون سرور شخصی</strong><br/>می‌توانید یک یا چند سرویس Free Tier را فعال کنید. برنامه در صورت شکست سرویس اول، سرویس بعدی را امتحان می‌کند. کلیدها فقط روی همین دستگاه نگهداری می‌شوند.</div>
        <label>OpenRouter Free<input type="password" value={orKey} onChange={e=>{setOrKey(e.target.value);setOpenRouterApiKey(e.target.value)}} placeholder="کلید OpenRouter"/></label>
        <label>Gemini Free Tier<input type="password" value={gemKey} onChange={e=>{setGemKey(e.target.value);setGeminiApiKey(e.target.value)}} placeholder="کلید Gemini"/></label>
        <label>Groq Free Tier<input type="password" value={groqKey} onChange={e=>{setGroqKey(e.target.value);setGroqApiKey(e.target.value)}} placeholder="کلید Groq"/></label>
        <label>Local/Custom OpenAI-compatible Endpoint<input value={customEndpoint} onChange={e=>{setCustomEndpointState(e.target.value);setCustomEndpoint(e.target.value)}} placeholder="مثلاً http://192.168.1.10:11434"/></label>
        <label>مدل Endpoint محلی<select value={customModel} onChange={e=>{setCustomModelState(e.target.value);setCustomModel(e.target.value)}}><option value="">انتخاب خودکار / مدل پیش‌فرض</option>{customModels.map(m=><option key={m} value={m}>{m}</option>)}</select></label><div className="muted">{customModelReady?(customModels.length?`${customModels.length} مدل شناسایی شد`:'مدلی از Endpoint پیدا نشد'):'برای شناسایی مدل‌ها دکمه کشف را بزنید.'}</div><div className="settingsRow"><button onClick={async()=>{const m=await discoverCustomModels();setCustomModels(m);setCustomModelReady(true);if(m.length&&!customModel){setCustomModelState(m[0]);setCustomModel(m[0])}setToast(m.length?`${m.length} مدل پیدا شد`:'مدلی پیدا نشد')}}>کشف مدل‌های Endpoint</button></div>
        <label>سرعت تلفظ: {speechSpeed.toFixed(2)}<input type="range" min=".5" max="1.5" step=".05" value={speechSpeed} onChange={e=>{const v=Number(e.target.value);setSpeed(v);setSpeechSpeed(v)}}/></label>
        <div className="notice"><strong>مدل‌های محلی</strong><br/>مدل فعال: {localModel.engineReady?localModel.name:'هیچ مدل محلی فعال نیست'}<br/>مدل‌های موجود: {localModels.length.toLocaleString('fa-IR')} فایل GGUF · {localModel.generating?'در حال تولید پاسخ…':''}<br/><select value={localModel.path||''} onChange={async e=>{const path=e.target.value;if(!path)return;const r=await loadLocalModel(path);setLocalModel(r);setLocalModels(await listLocalModels());setToast(r.engineReady?`مدل ${r.name||''} فعال شد`:(r.error||'بارگذاری ناموفق بود'))}}><option value="">انتخاب مدل محلی…</option>{localModels.map(m=><option key={m.path} value={m.path}>{m.name} · {(Number(m.sizeBytes)/1024/1024).toFixed(0)}MB</option>)}</select><div className="settingsRow"><button disabled={!localModel.path} onClick={async()=>{if(!localModel.path)return;const ok=await deleteLocalModel(localModel.path);setLocalModel({loaded:false});setLocalModels(await listLocalModels());setToast(ok?'مدل حذف شد':'حذف مدل ناموفق بود')}}>حذف مدل انتخاب‌شده</button></div><br/>{localModel.engineReady?`✅ مدل فعال و آماده مکالمه: ${localModel.name||localModel.path}`:localModel.imported||localModel.path?`📦 مدل وارد شده: ${localModel.name||localModel.path} — موتور inference هنوز فعال نیست.`:'⏺ هیچ مدل محلی بارگذاری نشده است.'}<br/>مدل‌های GGUF برای اجرای مستقیم روی گوشی مناسب‌اند؛ مدل‌های دیگر را می‌توان از طریق Custom OpenAI-compatible endpoint (Ollama/LM Studio/LocalAI روی یک دستگاه در شبکه) استفاده کرد.<div className="settingsRow"><button onClick={async()=>{const r=await loadLocalModel();setLocalModel(r);setLocalModels(await listLocalModels());setToast(r.engineReady?`مدل ${r.name||''} فعال شد`:(r.imported?`مدل ${r.name||''} وارد شد`:(r.error||'مدل بارگذاری نشد')));await addLog(r.loaded?'info':'warn',`local model load: ${r.loaded?'ok':r.error||'failed'}`);setLogs(getLogs())}}>انتخاب و بارگذاری مدل محلی</button></div></div>
        <div className="notice"><strong>فرمت مدل</strong><br/>اجرای مستقیم داخل گوشی در این نسخه برای GGUF/llama.cpp است. مدل‌های غیر-GGUF (مثل مدل‌های سرویس‌محور یا فرمت‌های دیگر) از طریق Endpoint محلی OpenAI-compatible / Ollama / LM Studio قابل انتخاب‌اند؛ برنامه فرمت نامعتبر را به‌عنوان مدل گوشی وارد نمی‌کند.</div><div className="providerGrid"><span>🎯 هدف: Persian → Iraqi / Lebanese / American English</span>{configuredProviders().map(p=><span key={p}>✓ {providerLabel(p)}</span>)}{configuredProviders().length===0&&<span>⚠️ هنوز AI آنلاین تنظیم نشده</span>}</div><div className="settingsRow"><button onClick={async()=>{for(const p of configuredProviders()){const r=await testProvider(p);await addLog(r.ok?'info':'error',`${providerLabel(p)} test ${r.ok?'OK':'FAILED'} ${r.latencyMs}ms — ${r.message}`)}setLogs(getLogs());setToast('تست سرویس‌ها انجام شد؛ نتیجه در عیب‌یابی ثبت شد')}}>تست اتصال همه AI</button></div>
        <div className="settingsRow"><button onClick={()=>fileRef.current?.click()}><Upload/> وارد کردن بانک</button><button onClick={()=>{const blob=new Blob([exportBank()],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ya-ali-language-bank.json';a.click();URL.revokeObjectURL(a.href)}}><Download/> خروجی بانک</button><button onClick={()=>{localStorage.removeItem('yaali_language_bank_v2');setBank([]);setToast('بانک محلی پاک شد')}}><Trash2/> پاک‌سازی داده‌های محلی</button></div>
        <input ref={fileRef} type="file" accept=".json" hidden onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{const d=JSON.parse(await f.text());const n=await importBank(Array.isArray(d)?d:d.items||[]);setBank(getBankItems());setToast(`${n} مورد وارد شد`)}catch{setToast('فایل JSON معتبر نیست')}}}/>
      </section>}
      {tab==='diagnostics'&&<section className="panel diagnostics">
        <h1>🛠 عیب‌یابی و Log</h1>
        <p className="muted">گزارش‌های برنامه و در Android، logcat قابل مشاهده است. اطلاعاتی که سیستم‌عامل اجازه خواندن بدهد نمایش داده می‌شود.</p>
        <div className="settingsRow"><button onClick={async()=>{const x=await getNativeLogcat();setNativeLogcat(x);await addLog('debug','native logcat refreshed');setLogs(getLogs())}}>دریافت Logcat</button><button onClick={async()=>setToast((await copyText(nativeLogcat))?'Logcat کپی شد':'کپی Logcat ناموفق بود')}>کپی Logcat</button><button onClick={()=>setLogs(getLogs())}>به‌روزرسانی</button><button onClick={()=>{const b=new Blob([exportLogs()],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='ya-ali-diagnostics.json';a.click();URL.revokeObjectURL(a.href)}}>خروجی لاگ</button><button onClick={()=>{clearLogs();setLogs([])}}>پاک کردن لاگ برنامه</button></div>
        <div className="logbox">{logs.slice().reverse().map((x,i)=><div key={i}>[{x.time}] [{x.level}] {x.message}</div>)}</div>
        <h2>Android Logcat</h2><pre className="logbox native">{nativeLogcat||'برای دریافت، دکمه Logcat را بزنید.'}</pre>
        <h2>Local AI</h2><div className="notice">{localModel.loaded?`✅ مدل فعال: ${localModel.name||localModel.path}`:localModel.imported?`📦 مدل وارد شده ولی آماده اجرا نیست: ${localModel.name||localModel.path}`:'⏺ مدل محلی بارگذاری نشده است.'}<br/>{localModel.error||''}</div>
        <button className="primary wide" onClick={async()=>{const r=await loadLocalModel();setLocalModel(r);await addLog(r.loaded?'info':'warn',`local model: ${r.loaded?'loaded':'not loaded'} ${r.error||''}`);setLogs(getLogs())}}>بررسی/بارگذاری مدل محلی</button>
      </section>}

    </main>

    <nav className="bottomNav">{nav.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>{setTab(id);setBackArmed(false)}}><Icon size={21}/><span>{label}</span></button>)}</nav>
    {toast&&<div className="toast">{toast}<button onClick={()=>setToast('')}>×</button></div>}
  </div>
}
