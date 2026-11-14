import test from 'node:test';
import assert from 'node:assert/strict';
import {acknowledgePromptFacts} from '../../src/core/interaction-context.js';
import type {CompanionFact,CompanionFactSource} from '../../src/contracts/interaction.js';

const fact:CompanionFact={version:1,id:'body:actual-one',requestId:'request-one',domain:'body',type:'water',occurredAt:'2026-11-13T05:00:00Z',
  actor:{kind:'owner',id:'owner',channel:'room'},result:{status:'completed',summary:'Water completed'}};
function fixture() {
  const acknowledged:string[]=[],order:string[]=[];
  const service:CompanionFactSource={pendingFacts:async()=>[fact],readFacts:async()=>[fact],acknowledgeFacts:async(workspace,ids)=>{
    assert.equal(workspace,'world');order.push('ack');acknowledged.push(...ids);
  }};
  return {acknowledged,order,input:{turn:2,workspaceId:'world',sources:[{service,facts:[fact]}],validate:()=>{},
    events:()=>[{type:'system/message',data:{turn:2,message:{content:[{type:'text',text:JSON.stringify([fact])}]}}}],
    flush:async()=>{order.push('flush');return true;}}};
}
test('owner prompt facts are acknowledged only after their original native log is durable',async()=>{
  const f=fixture();await acknowledgePromptFacts(f.input);assert.deepEqual(f.order,['flush','ack']);assert.deepEqual(f.acknowledged,[fact.id]);
});
test('a failed or absent native persistence participant retains owner prompt facts',async()=>{
  const f=fixture();await assert.rejects(acknowledgePromptFacts({...f.input,flush:async()=>false}),/persistence/);
  await assert.rejects(acknowledgePromptFacts({...f.input,flush:async()=>{throw Error('offline disk');}}),/offline disk/);
  assert.deepEqual(f.acknowledged,[]);
});
test('an unchanged effective system prompt can be acknowledged by a later completed turn',async()=>{
  const f=fixture();await acknowledgePromptFacts({...f.input,turn:3});assert.deepEqual(f.acknowledged,[fact.id]);
});
test('a prepared context absent from the native effective surface cannot acknowledge a fact',async()=>{
  const f=fixture();await acknowledgePromptFacts({...f.input,events:()=>[]});assert.deepEqual(f.order,[]);assert.deepEqual(f.acknowledged,[]);
});
test('scope and domain replacement during flush reject acknowledgement',async()=>{
  const f=fixture();let current=true;
  await assert.rejects(acknowledgePromptFacts({...f.input,validate:()=>{assert.equal(current,true,'scope changed');},flush:async()=>{current=false;return true;}}),/scope changed/);
  assert.deepEqual(f.acknowledged,[]);
});
