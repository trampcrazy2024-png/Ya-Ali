import { Capacitor, registerPlugin } from '@capacitor/core';

type SecureStorageApi = { get(options:{key:string}):Promise<{value:string;present:boolean}>; set(options:{key:string;value:string}):Promise<void>; remove(options:{key:string}):Promise<void> };
const NativeSecure = registerPlugin<SecureStorageApi>('YaAliSecureStorage');

export const isSecureStorageAvailable = () => Capacitor.isNativePlatform();
export async function secureGet(key:string):Promise<string>{ if(!isSecureStorageAvailable()) return ''; try{return (await NativeSecure.get({key})).value||'';}catch{return '';} }
export async function secureSet(key:string,value:string):Promise<void>{ if(!isSecureStorageAvailable()) return; try{await NativeSecure.set({key,value});}catch{} }
export async function secureRemove(key:string):Promise<void>{ if(!isSecureStorageAvailable()) return; try{await NativeSecure.remove({key});}catch{} }
