import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {CoreStore,digest} from '../../dist/src/core/storage.js';
import {createQQInbox,probeQQAdmission,qqAdmission} from '../../dist/src/channels/qq-inbox.js';
import {defaults} from '../../dist/src/channels/messaging-settings.js';
import {GroupSocial,defaultWake} from '../../dist/src/channels/group-social.js';
import {createQqHome} from '../../vendor/dsh-world/lib/adapters/qq-home.js';
import {speakerIdentity} from '../../vendor/dsh-world/lib/ecosystem/shared/identity.js';
const {openQQ}=await import(process.env.QQ_AUDIT_MODULE?pathToFileURL(process.env.QQ_AUDIT_MODULE).href:'../../dist/src/channels/qq.js');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check){for(let i=0;i<200;i++){if(check())return;await pause(2);}assert.fail('disposable QQ operation did not settle');}
const message=(id,text='original input')=>({kind:'private',selfId:'100',userId:'200',messageId:id,text});

function fixture(t) {
  const directory=mkdtempSync(join(tmpdir(),'qq-recovery-code-'));
  let store=new CoreStore(directory), adapter,home,gateway,active=true,permit=true,owner=true,storageId='scope-a',homeId='original-home';
  let failure='',flushMode='',readFail=false,live=true,idleWait,sendUnknown=false;
  const events=[],disk=[],handlers=new Map(),nativeMessages=[],outbound=[],reads=[];
  const session={id:'original-home',header:{cwd:directory},snapshotEvents:()=>events};
  const emit=(type,data)=>{const event={type,data,seq:events.length};events.push(event);for(const listener of handlers.get('session/event')??[])listener(session,event);};
  const agent={id:'original-home',status:'idle',session,inbox:{nextStep:[],nextTurn:[]},whenIdle:async()=>{await idleWait;},inject(){},
    followup(word) {
      nativeMessages.push(structuredClone(word));
      if(failure==='before')throw Error('definite before followup mutation');
      this.inbox.nextTurn.push(word);
      emit('agent/inbox/spliced',{target:'next-turn',start:0,inserted:[word]});
      if(failure==='queued')throw Error('handoff result unknown');
      emit('turn/start',{turn:1});this.status='running';
      this.inbox.nextTurn=[];
      emit('agent/inbox/spliced',{target:'next-turn',start:0,removedCount:1,inserted:[]});
      if(failure==='consumed'){emit('turn/end',{turn:1,reason:{kind:'aborted'}});this.status='idle';throw Error('consumed before first step');}
      emit('step/start',{turn:1,step:1});emit('user/message',word);
      emit('assistant/message',{message:{content:[{type:'text',text:'native answer'}]},stream:[]});
      emit('turn/end',{turn:1,reason:{kind:'completed'}});this.status='idle';
    }};
  const ctx={on(name,handler){const set=handlers.get(name)??new Set();handlers.set(name,set);set.add(handler);return()=>set.delete(handler);},
    sessions:{get:id=>live&&id===session.id?session:undefined,async flush(){if(flushMode==='throw')throw Error('flush failed');if(flushMode==='false')return false;
      disk.splice(0,disk.length,...structuredClone(events));return true;}},agents:{get:id=>live&&id===agent.id?agent:undefined},
    get(name){if(name==='sessionPersistence')return {async open(id,access){reads.push(id);assert.equal(access,'read');if(readFail)throw Error('native log unreadable');
      assert.equal(id,'original-home');return {async read(){return {events:structuredClone(disk)};},async close(){}};}};}};
  const allowed=id=>active&&permit&&id.accountId==='100';
  const isOwner=()=>owner;
  let inbox;
  const start=(quiet=0)=>{
    inbox=createQQInbox({store,storageId,active:()=>active,allowed,owner:isOwner,probe:submission=>probeQQAdmission(ctx,submission,()=>active)});
    home=createQqHome({ctx,home:async()=>({...agent,id:homeId}),inWorld:()=>active&&permit});
    adapter=openQQ({settings:{...defaults.qq,enabled:true,accountId:'100',ownerSpeakerId:'200',allowPrivate:['200'],batchQuietMs:quiet},
      inbox,active:()=>active,allowed,owner:isOwner, qzone:{tick:async()=>{},publish:async()=>{}},
      // This compatibility callback is used only by the pre-repair reproduction.
      take(id){const key=digest([storageId,id.channel,id.accountId,id.conversationType,id.conversationId,id.speakerId,id.platformMessageId]);
        if(store.get('channel-received',key))return false;store.put('channel-received',key,{receivedAt:Date.now()});return true;},
      speak:async()=>Buffer.from(''),decideGroup:()=>({mode:'v1',wake:true}),groupQuote:()=>undefined,groupResponse:(_id,text)=>text,observeGroup(){},
      ask:(...args)=>home.ask(...args),transport(options){gateway=options;return {start:async()=>{},stop:async()=>{},getState:()=> 'online',
        async sendPrivate(id,text){outbound.push({id,text});if(sendUnknown)throw Error('submitted but receipt lost');return {messageId:'receipt-'+outbound.length};},async sendGroup(id,text){outbound.push({id,text});return {messageId:'receipt-'+outbound.length};},
        sendCustomFace:async()=>{},publishQzone:async()=>({}),getForward:async()=>[],sendGroupSticker:async()=>{},recordText:async()=>'',sendVoice:async()=>({})};}});
    return adapter;
  };
  const stop=async()=>{home?.stop();await adapter?.close();adapter=undefined;home=undefined;};
  t.after(async()=>{await stop();store.close();rmSync(directory,{recursive:true,force:true});});
  return {directory,start,stop,send:msg=>gateway.onPrivateMessage(msg),events,disk,nativeMessages,outbound,reads,agent,
    get inbox(){return inbox;},get adapter(){return adapter;},get store(){return store;},
    async reopen(){await stop();store.close();store=new CoreStore(directory);},
    set failure(value){failure=value;},set flushMode(value){flushMode=value;},set readFail(value){readFail=value;},
    set active(value){active=value;},set permit(value){permit=value;},set owner(value){owner=value;},set storageId(value){storageId=value;},set homeId(value){homeId=value;},set live(value){live=value;},
    set idleWait(value){idleWait=value;},set sendUnknown(value){sendUnknown=value;}};
}

test('QQ quiet batch survives a stop after receipt and before native admission with the original platform ID',async t=>{
  const f=fixture(t);f.start(1000);f.send(message('platform-one'));f.send(message('platform-one','gateway duplicate must not replace original'));
  assert.equal(f.inbox.pendingInputs().length,1,'the input body must be durable before the quiet timer');
  await f.reopen();f.start();await until(()=>f.outbound.length===1);
  assert.equal(f.nativeMessages.length,1);assert.equal(f.nativeMessages[0].source.identity.platformMessageId,'platform-one');
  assert.match(f.nativeMessages[0].content[0].text,/original input/);assert.doesNotMatch(f.nativeMessages[0].content[0].text,/gateway duplicate/);
  f.send(message('platform-one'));await pause(10);assert.equal(f.nativeMessages.length,1);
  const rows=f.store.all('channel-received');assert.equal(rows.filter(row=>row.kind==='qq-input')[0].state,'admitted');
  assert.ok(rows.every(row=>!('text' in row)&&!('question' in row)&&!('submission' in row)),'confirmed native transcripts replace staging bodies');
});

test('failure before native followup is retried using the same persisted native message ID and frozen batch',async t=>{
  const f=fixture(t);f.failure='before';f.start(5);f.send(message('part-a','first line'));f.send(message('part-b','second line'));
  await until(()=>f.nativeMessages.length===1&&f.inbox.pendingBatches()[0]?.state==='queued');
  const original=f.nativeMessages[0];assert.match(original.content[0].text,/first line\nsecond line/);
  await f.reopen();f.failure='';f.start(5);f.send(message('later','new input'));
  await until(()=>f.outbound.length===2);
  assert.equal(f.nativeMessages[1].id,original.id);assert.equal(f.nativeMessages[1].source.identity.platformMessageId,'part-b');
  assert.equal(f.nativeMessages[1].content[0].text,original.content[0].text);
  assert.notEqual(f.nativeMessages[2].id,original.id);assert.match(f.nativeMessages[2].content[0].text,/new input/);
});

test('unknown native flush retains the original submission and reconciles the original log without rerunning or resending',async t=>{
  const f=fixture(t);f.flushMode='false';f.start();f.send(message('flush-unknown'));
  await until(()=>f.nativeMessages.length===1&&f.adapter.status().failed===1);
  assert.equal(f.outbound.length,0);assert.equal(f.inbox.pendingBatches()[0].state,'unknown');
  const original=f.nativeMessages[0];await f.stop();f.flushMode='';f.live=false;
  // Original admission becomes durable, even if its original native home is archived.
  f.disk.push(...structuredClone(f.events));f.homeId='replacement-home';f.start();
  await until(()=>f.inbox.pendingBatches().length===0);
  assert.equal(f.nativeMessages.length,1);assert.equal(f.outbound.length,0);assert.ok(f.reads.every(id=>id==='original-home'));
  assert.equal(f.store.all('channel-received').find(row=>row.kind==='qq-batch').messageId,original.id);
});

test('native log read failure and pending native inbox never authorize a duplicate followup',async t=>{
  const f=fixture(t);f.failure='queued';f.readFail=true;f.start();f.send(message('pending'));
  await until(()=>f.nativeMessages.length===1&&f.adapter.status().failed===1);
  const original=f.nativeMessages[0].id;await f.stop();f.failure='';f.start();await pause(12);
  assert.equal(f.nativeMessages.length,1);assert.equal(f.inbox.pendingBatches()[0].state,'unknown');
  await f.stop();f.readFail=false;f.start();f.send(message('pending'));await pause(12);
  assert.equal(f.nativeMessages.length,1);assert.equal(f.inbox.pendingBatches()[0].submission.message.id,original);
});

test('consumed input without a logged user message remains unknown rather than being executed again',async t=>{
  const f=fixture(t);f.failure='consumed';f.start();f.send(message('consumed'));
  await until(()=>f.adapter.status().failed===1);await f.stop();f.failure='';f.start();await pause(12);
  assert.equal(f.nativeMessages.length,1);assert.equal(f.inbox.pendingBatches()[0].state,'unknown');
});

test('old scope, revoked allowlist, owner-to-guest changes and changed native home cannot redirect queued inputs',async t=>{
  const f=fixture(t);f.failure='before';f.start();f.send(message('bound'));
  await until(()=>f.nativeMessages.length===1&&f.inbox.pendingBatches()[0]?.state==='queued');await f.stop();
  f.failure='';f.storageId='scope-b';f.start();await pause(8);assert.equal(f.nativeMessages.length,1);await f.stop();
  f.storageId='scope-a';f.permit=false;f.start();await pause(8);assert.equal(f.nativeMessages.length,1);await f.stop();
  f.permit=true;f.owner=false;f.start();await pause(8);assert.equal(f.nativeMessages.length,1);await f.stop();
  f.owner=true;f.homeId='new-home';f.start();await until(()=>f.adapter.status().failed===1);assert.equal(f.nativeMessages.length,1);
});

test('receive checkpoint recovers even when shutdown occurs before wake classification or batch.add',async t=>{
  const f=fixture(t);f.start(1000);
  const id=speakerIdentity({channel:'qq',accountId:'100',conversationId:'200',conversationType:'private',speakerId:'qq:200',platformMessageId:'pre-batch'});
  f.inbox.receive({identity:id,text:'saved before batch.add',at:new Date().toISOString(),record:false,directed:false,replyToSelf:false});
  await f.reopen();f.start();await until(()=>f.outbound.length===1);assert.equal(f.nativeMessages[0].source.identity.platformMessageId,'pre-batch');
});

test('a flushed batch stopped while waiting for the native home is recovered without losing its input',async t=>{
  const f=fixture(t);f.idleWait=new Promise(()=>{});f.start();f.send(message('waiting-home'));
  await until(()=>f.inbox.pendingBatches().length===1);await f.reopen();
  assert.equal(f.nativeMessages.length,0);f.idleWait=undefined;f.start();await until(()=>f.outbound.length===1);
  assert.equal(f.nativeMessages[0].source.identity.platformMessageId,'waiting-home');
});

test('guest input recovers as a guest, while a closed component preserves it until re-enabled',async t=>{
  const f=fixture(t);f.owner=false;f.start(1000);f.send(message('guest-input'));await f.reopen();
  f.active=false;f.start();await pause(8);assert.equal(f.nativeMessages.length,0);await f.stop();
  f.active=true;f.start();await until(()=>f.outbound.length===1);
  assert.equal(f.store.all('channel-received').find(row=>row.kind==='qq-input').owner,false);
  assert.equal(f.nativeMessages[0].source.kind,'user');assert.equal(f.nativeMessages[0].source.identity.speakerId,'qq:200');
});

test('an uncertain external send never replays the native input or sends the reply twice after restart',async t=>{
  const f=fixture(t);f.sendUnknown=true;f.start();f.send(message('sent-unknown'));
  await until(()=>f.outbound.length===1&&f.adapter.status().failed===1);await f.reopen();f.sendUnknown=false;f.start();
  f.send(message('sent-unknown'));await pause(12);
  assert.equal(f.nativeMessages.length,1);assert.equal(f.outbound.length,1);assert.equal(f.inbox.pendingBatches().length,0);
});

test('native splice accounting distinguishes pending, requeued, discarded, consumed, conflicting and admitted IDs',()=>{
  const word={id:'same-id',role:'user',source:{kind:'user',identity:{channel:'qq'}},content:[{type:'text',text:'actual'}]};
  const add={type:'agent/inbox/spliced',data:{target:'next-turn',start:0,inserted:[word]}};
  const remove={type:'agent/inbox/spliced',data:{target:'next-turn',start:0,removedCount:1,inserted:[]}};
  assert.equal(qqAdmission([],word),'absent');
  for(const events of [[add],[add,remove],[add,remove,{...add,data:{...add.data,target:'next-step'}}],[add,{...remove,data:{...remove.data,outcome:'canceled'}}]])
    assert.equal(qqAdmission(events,word),'unknown');
  assert.equal(qqAdmission([add,remove,{type:'user/message',data:word}],word),'admitted');
  assert.equal(qqAdmission([{type:'user/message',data:{...word,source:{kind:'system'}}}],word),'unknown');
});

test('stopping during native group material collection prevents a late checkpoint or followup',async()=>{
  let release,started,submitted=0,checkpoints=0;
  const material=new Promise(resolve=>{release=resolve;}), collecting=new Promise(resolve=>{started=resolve;});
  const agent={id:'home',session:{id:'home'},whenIdle:async()=>{},followup(){submitted++;}};
  const home=createQqHome({ctx:{},home:async()=>agent,groupMaterial:async()=>{started();return material;}});
  const id=speakerIdentity({channel:'qq',accountId:'100',conversationType:'group',conversationId:'300',speakerId:'qq:200',platformMessageId:'stop-material'});
  const result=home.ask('actual input',id,[],'v1',{checkpoint(){checkpoints++;}});
  await collecting;home.stop();release('collected material');await assert.rejects(result,/stopped/);
  assert.equal(checkpoints,0);assert.equal(submitted,0);
});

test('V2 recorded wake survives a receipt-to-batch interruption without consuming a second wake quota',t=>{
  const directory=mkdtempSync(join(tmpdir(),'qq-wake-code-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const file=join(directory,'social.json'),social=new GroupSocial(file),id=speakerIdentity({channel:'qq',accountId:'100',conversationType:'group',conversationId:'300',speakerId:'qq:200',platformMessageId:'woken'});
  const config={...defaultWake,anyMessage:true};social.observe(id,'hello',[],false,config);
  assert.equal(social.wake(id,true,config),true);assert.equal(new GroupSocial(file).wake(id,true,config,true),true);
  assert.equal(new GroupSocial(file).wake(id,true,config),false);assert.equal(JSON.parse(readFileSync(file,'utf8')).wakes.length,1);
});
