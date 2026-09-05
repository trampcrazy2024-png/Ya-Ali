import { Capacitor, registerPlugin } from '@capacitor/core';
const Diagnostics=registerPlugin<any>('Diagnostics');
const KEY='yaali_diagnostics';
export type LogLevel='debug'|'info'|'warn'|'error';
export type LogEntry={time:string;level:LogLevel;message:string};
function read():LogEntry[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}}
function write(x:LogEntry[]){try{localStorage.setItem(KEY,JSON.stringify(x.slice(-1000)))}catch{}}
export function getLogs(){return read()}
export async function addLog(level:LogLevel,message:string){const e={time:new Date().toISOString(),level,message};write([...read(),e]);if(Capacitor.isNativePlatform()){try{await Diagnostics.log({level,message})}catch{}}}
export async function getNativeLogcat(){if(!Capacitor.isNativePlatform())return 'Native Android logcat فقط روی Android در دسترس است.';try{return String((await Diagnostics.getLogcat())?.text||'')}catch(e:any){return `logcat unavailable: ${e?.message||String(e)}`}}
export async function copyNativeLogcat(text:string){if(!Capacitor.isNativePlatform()) return false;try{return !!(await Diagnostics.copyToClipboard({text}))?.ok}catch{return false}}
export function clearLogs(){try{localStorage.removeItem(KEY)}catch{}}
export function exportLogs(){return JSON.stringify({app:'Ya Ali',exportedAt:new Date().toISOString(),logs:read()},null,2)}
