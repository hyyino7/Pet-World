import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {createLifeRuntime} from '../vendor/dsh-world/lib/life/runtime.js';
import {createLifeStore} from '../vendor/dsh-world/lib/life/lifeStore.js';

const fact=id=>({version:1,id,requestId:id,domain:'body',type:'water',occurredAt:'2026-11-13T01:00:00.000Z',
  actor:{kind:'owner',id:'owner',channel:'room'},result:{status:'completed',summary:'Water was actually consumed.',before:{thirst:0.6},after:{thirst:0.2}}});

async function fixture(t,initial=[fact('a')]) {
  const directory=mkdtempSync(join(tmpdir(),'life-fact-runtime-'));
  t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const store=createLifeStore(directory,'UTC');
  store.update(state=>Object.assign(state,{homeSessionId:'home',planRevision:1,currentPlan:{id:'retained'}}));
  const facts=new Map(initial.map(item=>[item.id,item])),archive=new Map(facts),acknowledged=[],sent=[],errors=[];
  let now=Date.parse('2026-11-13T01:00:00Z'),serial=0,runtime,ackFails=false,flushFails=false,writeFails=false,confirmationFails=false,beforeRead,replacement,probeFails=false;
  const handles=new Map(),handlers=new Map(),events=[],replacementEvents=[];
  const session={id:'home',header:{agentPreset:'standard',cwd:directory},get seq(){return events.length;},
    eventAt:seq=>events[seq],snapshotEvents:()=>events};
  const agent={id:'home',session,status:'idle',inbox:{nextStep:[],nextTurn:[],remove(id){this.nextStep=this.nextStep.filter(m=>m.id!==id);this.nextTurn=this.nextTurn.filter(m=>m.id!==id);}},
    ctx:{tools:{register:()=>()=>{},guard:()=>()=>{}}},steer(message){sent.push(message);this.inbox.nextStep.push(message);}};
  const ctx={logger:{error:error=>errors.push(String(error))},on(name,handler){const set=handlers.get(name)??new Set();handlers.set(name,set);set.add(handler);return()=>set.delete(handler);},
    get:name=>name==='agents'?{get:id=>id==='replacement'?replacement:agent}:undefined,agents:{list:()=>replacement?[agent,replacement]:[agent],get:id=>id==='replacement'?replacement:agent},
    sessions:{async flush(){if(flushFails)throw Error('scripted flush failure');return true;}}};
  const emit=async(type,data)=>{const target=replacement?.session??session,log=replacement?replacementEvents:events;const event={type,data,seq:log.length,time:now};log.push(event);for(const handler of handlers.get('session/event')??[])await handler(target,event);};
  const timers={set(fn,ms){const id=++serial;handles.set(id,{at:now+ms,fn});return id;},clear:id=>handles.delete(id)};
  const rawWrite=store.write;
  store.write=state=>{if(writeFails && state.delivering)throw Error('scripted admission write failure');if(confirmationFails && state.factAcknowledgement)throw Error('scripted confirmation write failure');rawWrite(state);};
  const start=async()=>{
    runtime=createLifeRuntime({ctx,store,config:{agentPreset:'standard',worldId:'world'},
      options:{worldDir:directory,roomDir:directory,diaryDir:join(directory,'diary'),selfFile:join(directory,'self.md'),timeZone:'UTC',schedule:()=>({wake:'',review:''})},
      clock:()=>new Date(now),timers,hasCurrentPlan:()=>true,requirePlanningDecision:true,inWorkspace:id=>id==='home'||id==='replacement',
      notifier:{outlets:[]},host:{workspace:async()=>({id:'workspace',sessionIds:['home','replacement']}),resolveAgent:async id=>{if(replacement){assert.equal(id,'replacement','Old archived agent must not be resolved to read its original log');return replacement;}return agent;},isArchived:id=>Boolean(replacement&&id==='home'),rename:async()=>{},origin:()=>'',createSession:async()=>{throw Error('should reuse native home');}},
      facts:{pending:async()=>[...facts.values()].map(item=>({domain:item.domain,id:item.id})),
        read:async refs=>{await beforeRead?.(refs);const items=refs.map(ref=>{const item=archive.get(ref.id);assert.ok(item,'original domain fact is required even after acknowledgement');return item;});return{text:JSON.stringify(items),facts:items};},
        confirmAdmission:async(sessionId,messageId)=>{if(probeFails)throw Error('scripted original native log unreadable');await ctx.sessions.flush();return(sessionId==='home'?events:replacementEvents).some(event=>event.type==='user/message'&&event.data.id===messageId);},
        acknowledge:async refs=>{if(ackFails)throw Error('scripted acknowledgement failure');for(const ref of refs){facts.delete(ref.id);acknowledged.push(ref.id);}}}});
    await runtime.start();return runtime;
  };
  const advance=async ms=>{
    const until=now+ms;let iterations=0;
    for(;;){const due=[...handles].filter(([,item])=>item.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;
      assert.ok(++iterations<100,'no zero-delay delivery loop');now=due[1].at;handles.delete(due[0]);due[1].fn();
      await Promise.resolve();await runtime.settled();await Promise.resolve();}
    now=until;
  };
  const admit=async()=>{
    const target=replacement??agent,message=target.inbox.nextStep.shift();assert.ok(message);assert.equal(runtime.acceptsFactMessage(target.id,message),true);
    target.status='running';await emit('turn/start',{turn:1});await emit('user/message',message);return message;
  };
  await start();t.after(()=>runtime.stop());
  return {store,facts,sent,acknowledged,errors,agent,emit,advance,admit,start,get runtime(){return runtime;},
    replaceHome(){replacement={...agent,id:'replacement',status:'idle',inbox:{...agent.inbox,nextStep:[],nextTurn:[]},session:{...session,id:'replacement',get seq(){return replacementEvents.length;},eventAt:seq=>replacementEvents[seq],snapshotEvents:()=>replacementEvents}};store.update(state=>{state.homeSessionId='replacement';});},
    addFact(item){archive.set(item.id,item);facts.set(item.id,item);},set beforeRead(fn){beforeRead=fn;},
    set probeFails(value){probeFails=value;},set ackFails(value){ackFails=value;},set flushFails(value){flushFails=value;},set writeFails(value){writeFails=value;},set confirmationFails(value){confirmationFails=value;}};
}

test('facts coalesce, preserve the actual actor, and do not demand a new plan decision',async t=>{
  const f=await fixture(t,[fact('a'),fact('b')]);
  f.runtime.notifyFacts();f.runtime.notifyFacts();await f.advance(399);assert.equal(f.sent.length,0);
  await f.advance(1);assert.equal(f.sent.length,1);const message=f.sent[0];
  assert.deepEqual(message.source.facts.map(item=>item.actor.kind),['owner','owner']);
  assert.equal(f.store.read().delivering.planRevision,undefined);
  assert.equal(f.runtime.acceptsFactMessage('home',{...message,source:{...message.source,facts:[fact('forged')]}}),false);
  await f.admit();await f.advance(400);
  assert.deepEqual(f.acknowledged,['a','b']);assert.equal(f.store.read().planRevision,1);
  assert.equal(f.store.read().planningWake,undefined);assert.equal(f.sent.length,1);
});

test('a crash before a native step reuses the original message ID and ignores newer intent revisions',async t=>{
  const f=await fixture(t);await f.advance(400);const original=f.sent[0].id;
  f.runtime.stop();f.agent.inbox.nextStep=[];
  f.store.update(state=>{state.planRevision=9;});await f.start();
  await f.advance(59_999);assert.equal(f.sent.length,1);await f.advance(1);
  assert.equal(f.sent.length,2);assert.equal(f.sent[1].id,original);assert.equal(f.store.read().planRevision,9);
  await f.admit();await f.advance(400);assert.deepEqual(f.acknowledged,['a']);
});

test('domain acknowledgement failure and restart never replay an admitted interaction',async t=>{
  const f=await fixture(t);f.ackFails=true;await f.advance(400);await f.admit();await f.advance(400);
  assert.ok(f.store.read().factAcknowledgement);assert.equal(f.sent.length,1);
  f.runtime.stop();f.agent.status='idle';f.ackFails=false;await f.start();await f.advance(400);
  assert.deepEqual(f.acknowledged,['a']);assert.equal(f.sent.length,1);assert.equal(f.store.read().factAcknowledgement,undefined);
});

test('a failed native flush retains the queued message instead of steering another copy',async t=>{
  const f=await fixture(t);f.flushFails=true;await f.advance(400);
  assert.equal(f.sent.length,1);await f.advance(60_000);assert.equal(f.sent.length,1);
  f.flushFails=false;await f.admit();await f.advance(400);assert.deepEqual(f.acknowledged,['a']);
});

test('admission storage failure starts no native work and retries the same retained batch',async t=>{
  const f=await fixture(t);f.writeFails=true;await f.advance(400);assert.equal(f.sent.length,0);assert.equal(f.facts.size,1);
  f.writeFails=false;await f.advance(60_000);assert.equal(f.sent.length,1);
  await f.admit();await f.advance(400);assert.deepEqual(f.acknowledged,['a']);
});

test('a bounded transport batch leaves undispatched facts in their original domain',async t=>{
  const f=await fixture(t,Array.from({length:19},(_,i)=>fact(String(i))));await f.advance(400);
  assert.equal(f.sent[0].source.facts.length,16);assert.equal(f.facts.size,19);
  await f.admit();await f.advance(800);assert.equal(f.sent.length,2);assert.equal(f.sent[1].source.facts.length,3);
  await f.admit();await f.advance(400);assert.equal(f.facts.size,0);assert.equal(f.acknowledged.length,19);
});

test('a failed confirmation write reconciles the original native log after restart',async t=>{
  const f=await fixture(t);await f.advance(400);f.confirmationFails=true;await f.admit();
  assert.equal(f.facts.size,1);assert.ok(f.store.read().delivering);assert.equal(f.store.read().factAcknowledgement,undefined);
  f.runtime.stop();f.confirmationFails=false;f.agent.status='idle';await f.start();await f.advance(400);
  assert.equal(f.sent.length,1);assert.deepEqual(f.acknowledged,['a']);assert.equal(f.store.read().delivering,undefined);
});

test('domain pending facts survive until the admitted native input is durably flushed',async t=>{
  const f=await fixture(t);await f.advance(400);await f.admit();f.flushFails=true;await f.advance(400);
  assert.equal(f.facts.size,1);assert.ok(f.store.read().factAcknowledgement);assert.deepEqual(f.acknowledged,[]);
  f.flushFails=false;await f.advance(60_000);assert.deepEqual(f.acknowledged,['a']);assert.equal(f.sent.length,1);
});

test('an owner acknowledgement between batch discovery and steering cannot block this or later facts',async t=>{
  const f=await fixture(t);
  f.beforeRead=refs=>{
    assert.equal(f.store.read().factBatch.messageId.length>0,true,'batch references were committed before the owner acknowledgement');
    for(const ref of refs)f.facts.delete(ref.id);
    f.beforeRead=undefined;
  };
  await f.advance(400);assert.equal(f.sent.length,1);assert.equal(f.sent[0].source.facts[0].id,'a');
  await f.admit();await f.advance(400);assert.equal(f.store.read().factBatch,undefined);
  f.addFact(fact('later'));f.runtime.notifyFacts();await f.advance(400);
  assert.equal(f.sent.length,2);assert.equal(f.sent[1].source.facts[0].id,'later');
  await f.admit();await f.advance(400);assert.equal(f.store.read().factAcknowledgement,undefined);assert.equal(f.facts.size,0);
});

test('an archived old home is reconciled by its durable original input after a confirmation-write crash',async t=>{
  const f=await fixture(t);await f.advance(400);f.confirmationFails=true;await f.admit();assert.ok(f.store.read().delivering);
  f.runtime.stop();f.confirmationFails=false;f.replaceHome();await f.start();await f.advance(400);
  assert.equal(f.sent.length,1,'A proven old native input is not steered into the replacement home');
  assert.deepEqual(f.acknowledged,['a']);assert.equal(f.store.read().delivering,undefined);
});

test('an unreadable archived log waits; a readable absent input alone permits original-ID redelivery',async t=>{
  const f=await fixture(t);await f.advance(400);const messageId=f.sent[0].id;
  f.runtime.stop();f.replaceHome();f.probeFails=true;await f.start();await f.advance(60_000);
  assert.equal(f.sent.length,1);assert.ok(f.store.read().delivering);assert.equal(f.facts.size,1);
  f.probeFails=false;await f.advance(5*60_000);assert.equal(f.sent.length,1,'Readable absence starts the native retry backoff');
  await f.advance(15*60_000);assert.equal(f.sent.length,2);assert.equal(f.sent[1].id,messageId);
  await f.admit();await f.advance(400);assert.deepEqual(f.acknowledged,['a']);
});
