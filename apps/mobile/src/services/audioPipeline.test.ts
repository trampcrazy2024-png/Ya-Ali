import { describe, expect, it } from 'vitest';
import { listSherpaSttModels, saveSherpaSttModel, listSherpaTtsModels, saveSherpaTtsModel } from './sherpaModelManager';

describe('offline audio model registry',()=>{
  it('keeps explicit STT/TTS model provenance and paths',()=>{
    localStorage.clear();
    saveSherpaSttModel({id:'ar-iq',language:'ar',dialect:'ar-IQ',modelDir:'/models/ar-iq',encoder:'/models/ar-iq/encoder.onnx',decoder:'/models/ar-iq/decoder.onnx',joiner:'/models/ar-iq/joiner.onnx',tokens:'/models/ar-iq/tokens.txt',sampleRate:16000,license:'model-license'});
    saveSherpaTtsModel({id:'fa-vits',language:'fa',dialect:'fa-IR',model:'/models/fa/model.onnx',tokens:'/models/fa/tokens.txt',license:'model-license'});
    expect(listSherpaSttModels()[0].encoder).toContain('encoder.onnx');
    expect(listSherpaTtsModels()[0].model).toContain('model.onnx');
  });
});
