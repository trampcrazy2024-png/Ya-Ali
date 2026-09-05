import { Capacitor } from '@capacitor/core';
import { configuredProviders, testProvider } from '../ai';
import { listLocalModels, localModelStatus } from '../modelManager';
import { speechAvailability } from '../speech';
import { listVoicePacks } from './voicePackManager';
import { runtimeMatrix } from './runtimeMatrix';
import { privacyReport } from './privacyCenter';
import { getDeviceHealth } from './deviceHealth';
import { edgeRuntimeCapabilities } from './edgeAiRuntime';
import { inspectCustomEndpoint } from '../ai';
import { endpointHealthSummary } from './endpointProfiles';
import { getLearningEventCount } from './learningPersistence';
import { secureSettingsStatus } from '../settings';
export type DiagnosticCheck={id:string;title:string;ok:boolean;severity:'info'|'ok'|'warn'|'error';message:string;latencyMs?:number};
export async function runDiagnostics():Promise<DiagnosticCheck[]>{
 const out:DiagnosticCheck[]=[];const t=performance.now();
 out.push({id:'platform',title:'Android / Runtime',ok:Capacitor.isNativePlatform(),severity:Capacitor.isNativePlatform()?'ok':'info',message:Capacitor.isNativePlatform()?'Native Android runtime فعال است.':'در مرورگر اجرا می‌شود؛ تست‌های Native محدود هستند.'});
 try{const s=await speechAvailability();out.push({id:'speech',title:'STT',ok:!!s.available,severity:s.available?'ok':'warn',message:s.onDeviceAvailable?'On-device STT در دسترس است.':s.available?'Speech Service در دسترس است.':'STT در دسترس نیست.'})}catch(e){out.push({id:'speech',title:'STT',ok:false,severity:'error',message:String(e)})}
 try{const s=await localModelStatus();out.push({id:'local-ai',title:'Local AI',ok:!!s.engineReady,severity:s.engineReady?'ok':'warn',message:s.engineReady?`مدل ${s.name||''} آماده است.`:(s.error||'مدل محلی آماده نیست.')})}catch(e){out.push({id:'local-ai',title:'Local AI',ok:false,severity:'error',message:String(e)})}
 try{const ms=await listLocalModels();out.push({id:'models',title:'Model Manager',ok:true,severity:'ok',message:`${ms.length} مدل محلی شناسایی شد.`})}catch(e){out.push({id:'models',title:'Model Manager',ok:false,severity:'error',message:String(e)})}
 const runtimes=await runtimeMatrix();
 try{const ec=await edgeRuntimeCapabilities();out.push({id:'edge-runtime',title:'Edge non-GGUF runtime',ok:!!(ec.executorch||ec.onnxRuntime||ec.onnxGenAI||ec.litertLm),severity:(ec.executorch||ec.onnxRuntime||ec.onnxGenAI||ec.litertLm)?'ok':'warn',message:`ExecuTorch=${ec.executorch} · ONNX=${ec.onnxRuntime} · ONNX GenAI=${ec.onnxGenAI} · LiteRT-LM=${ec.litertLm}`})}catch(e){out.push({id:'edge-runtime',title:'Edge non-GGUF runtime',ok:false,severity:'warn',message:String(e)})}
 const nativeReady=runtimes.filter(r=>r.id!=='remote-endpoint'&&r.available).map(r=>r.label);
 out.push({id:'runtime-matrix',title:'Runtime matrix',ok:nativeReady.length>0,severity:nativeReady.length?'ok':'warn',message:nativeReady.length?`Native runtimes: ${nativeReady.join(', ')}`:'No native non-remote runtime bridge is installed yet; remote endpoint remains available.'});
 const pr=privacyReport();out.push({id:'privacy',title:'Privacy hygiene',ok:true,severity:'info',message:`${pr.secretsConfigured} provider secret(s) configured; diagnostic exports must redact secrets.`});
 const dh=await getDeviceHealth();out.push({id:'device-health',title:'Device health',ok:true,severity:'info',message:`${dh.online?'Online':'Offline'} · CPU ${dh.hardwareConcurrency||'unknown'} · viewport ${dh.viewport.width}x${dh.viewport.height}${dh.storage?` · storage ${dh.storage.usageMB}/${dh.storage.quotaMB} MB`:''}`});
 if(providersConfiguredCustom(configuredProviders())){try{const ep=await inspectCustomEndpoint();out.push({id:'endpoint-probe',title:'Endpoint matrix',ok:ep.ok,severity:ep.ok?'ok':'warn',message:`${ep.protocols.join(', ')||'unknown'} · ${ep.models.length} model(s) · chat=${ep.chatPath||'unknown'}`,latencyMs:ep.latencyMs})}catch(e){out.push({id:'endpoint-probe',title:'Endpoint matrix',ok:false,severity:'warn',message:String(e)})}}
 const providers=configuredProviders();out.push({id:'providers-config',title:'AI Providers',ok:providers.length>0,severity:providers.length?'ok':'warn',message:providers.length?`${providers.length} Provider تنظیم شده: ${providers.join(', ')}`:'هیچ Provider آنلاین تنظیم نشده است.'});
 for(const id of providers){const r=await testProvider(id);out.push({id:`provider-${id}`,title:`Provider: ${id}`,ok:r.ok,severity:r.ok?'ok':'error',message:r.ok?'پاسخ OK دریافت شد.':r.message,latencyMs:r.latencyMs})}
 const eps=endpointHealthSummary();out.push({id:'endpoint-pool',title:'Endpoint pool',ok:eps.enabled===0||eps.healthy>0,severity:eps.enabled===0?'info':eps.healthy>0?'ok':'warn',message:eps.total?`${eps.enabled} فعال · ${eps.healthy} سالم · بهترین: ${eps.best||'—'}`:'هیچ endpoint ذخیره‌شده‌ای وجود ندارد.'});
 const secure=secureSettingsStatus();out.push({id:'secure-settings',title:'Secure settings',ok:!secure.native||secure.hydrated,severity:secure.native?(secure.hydrated?'ok':'warn'):'info',message:secure.native?`${secure.secureKeys} کلید حساس تحت Android Keystore؛ وضعیت hydration=${secure.hydrated}`:'در وب، Secure Storage native فعال نیست.'});
 try{const count=await getLearningEventCount();out.push({id:'learning-events',title:'Durable learning log',ok:true,severity:'ok',message:`${count} رویداد یادگیری در SQLite ثبت شده است.`})}catch(e){out.push({id:'learning-events',title:'Durable learning log',ok:false,severity:'warn',message:String(e)})}
 const storage=!!window.localStorage;out.push({id:'storage',title:'Local Storage',ok:storage,severity:storage?'ok':'error',message:storage?'دسترسی به ذخیره‌سازی محلی برقرار است.':'Local Storage در دسترس نیست.'});
 const packs=listVoicePacks();out.push({id:'voice-packs',title:'Voice Pack Manager',ok:true,severity:'ok',message:`${packs.length} بسته تعریف شده؛ ${packs.filter(p=>p.status==='installed').length} نصب شده.`});
 out.push({id:'network',title:'Network',ok:navigator.onLine,severity:navigator.onLine?'ok':'info',message:navigator.onLine?'اتصال شبکه فعال است.':'برنامه در حالت آفلاین است.'});
 out.push({id:'duration',title:'Diagnostic duration',ok:true,severity:'info',message:`زمان اجرای بررسی ${Math.round(performance.now()-t)}ms.`});
 return out;
}
function providersConfiguredCustom(p:string[]){return p.includes('custom')}
export function diagnosticsSummary(checks:DiagnosticCheck[]){return {total:checks.length,ok:checks.filter(x=>x.ok).length,errors:checks.filter(x=>x.severity==='error').length,warnings:checks.filter(x=>x.severity==='warn').length,checks,createdAt:new Date().toISOString()}}
