export type VoicePackStatus='not-installed'|'downloading'|'installed'|'error';
export type VoicePack={id:string;nameFa:string;dialect:string;locale:string;kind:'audio'|'tts-model';sizeBytes?:number;downloadUrl?:string;sourceUrl?:string;license?:string;status?:VoicePackStatus;version?:string;description?:string};
const KEY='yaali_voice_packs_v1';
const DEFAULTS:VoicePack[]=[
 {id:'iraqi-audio-v1',nameFa:'بسته صوتی عراقی',dialect:'iraqi',locale:'ar-IQ',kind:'audio',version:'1.0',description:'ساختار آماده برای بسته‌های عبارت و فایل صوتی عراقی. منبع صوتی باید مجوز قابل استفاده داشته باشد.'},
 {id:'lebanese-audio-v1',nameFa:'بسته صوتی لبنانی',dialect:'lebanese',locale:'ar-LB',kind:'audio',version:'1.0',description:'ساختار آماده برای بسته‌های عبارت و فایل صوتی لبنانی. منبع صوتی باید مجوز قابل استفاده داشته باشد.'},
 {id:'gulf-audio-v1',nameFa:'بسته صوتی خلیجی',dialect:'gulf',locale:'ar-AE',kind:'audio',version:'1.0',description:'بسته آموزشی خلیجی با معماری قابل دانلود؛ منبع صوتی پس از بررسی مجوز متصل می‌شود.'},
 {id:'saudi-audio-v1',nameFa:'بسته صوتی سعودی',dialect:'saudi',locale:'ar-SA',kind:'audio',version:'1.0',description:'بسته آموزشی سعودی با معماری قابل دانلود؛ منبع صوتی پس از بررسی مجوز متصل می‌شود.'},
 {id:'egyptian-audio-v1',nameFa:'بسته صوتی مصری',dialect:'egyptian',locale:'ar-EG',kind:'audio',version:'1.0',description:'بسته آموزشی مصری با معماری قابل دانلود؛ منبع صوتی پس از بررسی مجوز متصل می‌شود.'},
 {id:'american-en-v1',nameFa:'بسته صوتی انگلیسی آمریکایی',dialect:'american',locale:'en-US',kind:'audio',sourceUrl:'https://k2-fsa.github.io/sherpa/onnx/tts/all/English/vits-piper-en_US-lessac-medium.html',version:'1.0',description:'نمونه مسیر رسمی sherpa-onnx برای مدل‌های TTS انگلیسی.'}
];
function read():VoicePack[]{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
function write(v:VoicePack[]){try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}}
export function listVoicePacks(){const saved=read();return DEFAULTS.map(d=>({...d,...saved.find(s=>s.id===d.id)}))}
export function setVoicePack(p:VoicePack){write([...read().filter(x=>x.id!==p.id),p])}
export function removeVoicePack(id:string){write(read().filter(x=>x.id!==id))}
export async function downloadVoicePack(id:string,onProgress?:(pct:number)=>void){
 const pack=listVoicePacks().find(x=>x.id===id);if(!pack)throw new Error('بسته پیدا نشد');
 if(!pack.downloadUrl)throw new Error('این بسته هنوز منبع دانلود مستقیم معتبر و مجوزدار ندارد. از «افزودن منبع» برای CDN/manifest خود استفاده کنید.');
 setVoicePack({...pack,status:'downloading'});try{
  const r=await fetch(pack.downloadUrl);if(!r.ok)throw new Error(`HTTP ${r.status}`);const total=Number(r.headers.get('content-length')||0);const reader=r.body?.getReader();if(!reader)throw new Error('دانلود جریانی در این WebView در دسترس نیست');const chunks:ArrayBuffer[]=[];let loaded=0;while(true){const {done,value}=await reader.read();if(done)break;if(value){const buffer=new ArrayBuffer(value.byteLength);new Uint8Array(buffer).set(value);chunks.push(buffer);loaded+=value.byteLength;if(total&&onProgress)onProgress(Math.round(loaded/total*100))}}const blob=new Blob(chunks);const url=URL.createObjectURL(blob);try{await new Promise<void>((resolve,reject)=>{const req=indexedDB.open('yaali_voice_packs',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('blobs'))req.result.createObjectStore('blobs')};req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result;const tx=db.transaction('blobs','readwrite');tx.objectStore('blobs').put(blob,id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}})}finally{URL.revokeObjectURL(url)}setVoicePack({...pack,status:'installed',sizeBytes:blob.size});return blob.size;
 }catch(e){setVoicePack({...pack,status:'error'});throw e}
}
export async function getInstalledVoiceBlob(id:string):Promise<Blob|null>{return new Promise(resolve=>{const req=indexedDB.open('yaali_voice_packs',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('blobs'))req.result.createObjectStore('blobs')};req.onerror=()=>resolve(null);req.onsuccess=()=>{const db=req.result;const q=db.transaction('blobs','readonly').objectStore('blobs').get(id);q.onsuccess=()=>{db.close();resolve(q.result||null)};q.onerror=()=>{db.close();resolve(null)}}})}
export async function deleteDownloadedVoicePack(id:string){await new Promise<void>(resolve=>{const req=indexedDB.open('yaali_voice_packs',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('blobs'))req.result.createObjectStore('blobs')};req.onerror=()=>resolve();req.onsuccess=()=>{const db=req.result;const tx=db.transaction('blobs','readwrite');tx.objectStore('blobs').delete(id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();resolve()}}});const p=listVoicePacks().find(x=>x.id===id);if(p){const next={...p,status:'not-installed' as VoicePackStatus};delete next.sizeBytes;setVoicePack(next)}}
export function exportVoicePackManifest(){return JSON.stringify({schema:'yaali.voice-pack.v1',generatedAt:new Date().toISOString(),packs:listVoicePacks()},null,2)}
