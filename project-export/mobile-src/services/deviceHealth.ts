export type DeviceHealth = {
  online: boolean;
  memory?: {usedMB?:number; limitMB?:number};
  storage?: {usageMB:number; quotaMB:number};
  hardwareConcurrency?: number;
  viewport: {width:number;height:number;dpr:number};
};

export async function getDeviceHealth(): Promise<DeviceHealth> {
  const nav:any = navigator;
  let storage: DeviceHealth['storage'];
  try {
    const estimate = await nav.storage?.estimate?.();
    if (estimate?.quota) storage = {usageMB:Math.round((estimate.usage||0)/1048576),quotaMB:Math.round(estimate.quota/1048576)};
  } catch {}
  const result: DeviceHealth = {online:navigator.onLine,hardwareConcurrency:nav.hardwareConcurrency,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio||1}};
  if(nav.deviceMemory) result.memory={limitMB:Math.round(nav.deviceMemory*1024)};
  if(storage) result.storage=storage;
  return result;
}
