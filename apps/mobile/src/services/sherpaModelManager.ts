export interface SherpaSttModelConfig {
  id:string;
  language:string;
  dialect:string;
  modelDir:string;
  encoder:string;
  decoder:string;
  joiner:string;
  tokens:string;
  sampleRate:number;
  sourceUrl?:string;
  license?:string;
}
export interface SherpaTtsModelConfig {
  id:string;
  language:string;
  dialect:string;
  model:string;
  tokens:string;
  dataDir?:string;
  lexicon?:string;
  speakers?:number;
  sourceUrl?:string;
  license?:string;
}

const STT_KEY='yaali_sherpa_stt_models_v1';
const TTS_KEY='yaali_sherpa_tts_models_v1';
function read<T>(key:string):T[]{try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[]}catch{return []}}
function write<T>(key:string,value:T[]){localStorage.setItem(key,JSON.stringify(value))}

export function listSherpaSttModels(){return read<SherpaSttModelConfig>(STT_KEY)}
export function listSherpaTtsModels(){return read<SherpaTtsModelConfig>(TTS_KEY)}
export function saveSherpaSttModel(model:SherpaSttModelConfig){const rows=listSherpaSttModels().filter(x=>x.id!==model.id);rows.push({...model,sampleRate:model.sampleRate||16000});write(STT_KEY,rows);return model}
export function saveSherpaTtsModel(model:SherpaTtsModelConfig){const rows=listSherpaTtsModels().filter(x=>x.id!==model.id);rows.push(model);write(TTS_KEY,rows);return model}
export function removeSherpaSttModel(id:string){write(STT_KEY,listSherpaSttModels().filter(x=>x.id!==id))}
export function removeSherpaTtsModel(id:string){write(TTS_KEY,listSherpaTtsModels().filter(x=>x.id!==id))}

export function defaultSherpaModelGuidance(){return {
  stt:'Streaming Zipformer/Transducer directory: encoder.onnx + decoder.onnx + joiner.onnx + tokens.txt. Keep each language/dialect model as a separate managed bundle.',
  tts:'VITS/Piper-compatible directory: model.onnx + tokens.txt + optional espeak-ng-data/lexicon. Sherpa-ONNX runs it locally.',
  policy:'Ya-Ali does not silently download models. The user explicitly installs a model and records its source/license.'
}}
