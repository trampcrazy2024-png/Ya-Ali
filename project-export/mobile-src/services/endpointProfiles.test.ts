import { describe, expect, it, beforeEach } from 'vitest';
import { chooseBestEndpoint, getEndpointProfiles, upsertEndpointProfile } from './endpointProfiles';

describe('endpoint pool routing',()=>{
  beforeEach(()=>localStorage.clear());
  it('prefers a capable low-latency endpoint',()=>{
    upsertEndpointProfile({id:'slow',name:'slow',baseUrl:'http://slow:8000',enabled:true,priority:50,capabilities:['models'],protocols:[],latencyMs:4000,failures:0});
    upsertEndpointProfile({id:'fast',name:'fast',baseUrl:'http://fast:8000',enabled:true,priority:50,capabilities:['chat'],protocols:[],latencyMs:100,failures:0});
    expect(chooseBestEndpoint(['chat'])?.id).toBe('fast');
    expect(getEndpointProfiles()).toHaveLength(2);
  });
});
