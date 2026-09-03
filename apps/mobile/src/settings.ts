const K={
  openrouter:'yaali_openrouter_key',
  gemini:'yaali_gemini_key',
  groq:'yaali_groq_key',
  speed:'yaali_speech_speed'
};
const get=(k:string)=>{try{return localStorage.getItem(k)||''}catch{return ''}};
const set=(k:string,v:string)=>{try{v=v.trim();v?localStorage.setItem(k,v):localStorage.removeItem(k)}catch{}};
export const getOpenRouterApiKey=()=>get(K.openrouter);
export const setOpenRouterApiKey=(v:string)=>set(K.openrouter,v);
export const getGeminiApiKey=()=>get(K.gemini);
export const setGeminiApiKey=(v:string)=>set(K.gemini,v);
export const getGroqApiKey=()=>get(K.groq);
export const setGroqApiKey=(v:string)=>set(K.groq,v);
export const getSpeechSpeed=()=>Number(get(K.speed)||'0.95');
export const setSpeechSpeed=(v:number)=>set(K.speed,String(Math.max(.5,Math.min(1.5,v))));
export const getCustomEndpoint=()=>get('yaali_custom_endpoint');
export const setCustomEndpoint=(v:string)=>set('yaali_custom_endpoint',v);
export const getCustomModel=()=>get('yaali_custom_model');
export const setCustomModel=(v:string)=>set('yaali_custom_model',v);
