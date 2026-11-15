import {INTERACTION_CONTEXT,presentFacts} from '../../src/core/interaction-presentation.js';
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
    events:()=>[{type:'user/message',data:{source:{kind:'runtime-context',form:'snapshot',sections:[{name:INTERACTION_CONTEXT,text:presentFacts([fact])}]},content:[{type:'text',text:presentFacts([fact])}]}}],
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
test('an unchanged effective native context can be acknowledged by a later completed turn',async()=>{
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

test('incidental IDs, forged metadata and mismatched fact meanings cannot acknowledge an interaction',async()=>{
  for(const events of [
    [{type:'system/message',data:{message:{content:[{type:'text',text:fact.id}]}}}],
    [{type:'user/message',data:{source:{kind:'runtime-context',form:'snapshot',sections:[{name:INTERACTION_CONTEXT,text:presentFacts([fact])}]},content:[{type:'text',text:'Not the admitted facts'}]}}],
    [{type:'user/message',data:{source:{kind:'runtime-context',form:'snapshot',sections:[{name:INTERACTION_CONTEXT,text:presentFacts([{...fact,result:{status:'failed',summary:'Different outcome'}}])}]},content:[{type:'text',text:presentFacts([{...fact,result:{status:'failed',summary:'Different outcome'}}])}]}}],
  ]) {const f=fixture();await acknowledgePromptFacts({...f.input,events:()=>events});assert.deepEqual(f.acknowledged,[]);}
});

test('native JSON key ordering does not lose an otherwise exact interaction acknowledgement',async()=>{
  const f=fixture(),events=f.input.events();
  const data=events[0].data,parsed=JSON.parse(data.source.sections[0].text);
  parsed.facts[0]=Object.fromEntries(Object.entries(parsed.facts[0]).reverse());
  const text=JSON.stringify(parsed);data.source.sections[0].text=text;data.content[0].text=text;
  await acknowledgePromptFacts({...f.input,events:()=>events});assert.deepEqual(f.acknowledged,[fact.id]);
});
