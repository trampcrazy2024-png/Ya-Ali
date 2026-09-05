import { describe, expect, it, beforeEach } from 'vitest';
import { createConversation, getConversation, listConversations, upsertConversation } from '../src/conversationStore';

const store = new Map<string,string>();
const local = {
  getItem:(k:string)=>store.get(k) ?? null,
  setItem:(k:string,v:string)=>store.set(k,v),
  removeItem:(k:string)=>store.delete(k)
};

beforeEach(()=>{
  store.clear();
  Object.defineProperty(globalThis, 'localStorage', {configurable:true, value:local});
});

describe('saved conversations', () => {
  it('persists and restores the complete message list', () => {
    const c=createConversation('iraqi');
    upsertConversation({...c,messages:[
      {id:'1',role:'user',text:'سلام'},
      {id:'2',role:'assistant',text:'هلا بيك',provider:'Local AI'}
    ]});
    const restored=getConversation(c.id);
    expect(restored?.messages).toHaveLength(2);
    expect(restored?.messages[1]?.text).toBe('هلا بيك');
    expect(listConversations()).toHaveLength(1);
  });
});
