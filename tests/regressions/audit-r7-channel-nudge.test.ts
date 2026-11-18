import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {Context} from '@deepseek-ai/cordis';
import type {PetCoreHost} from '../../src/core/index.js';
import {CoreNative} from '../../src/core/native/conversation.js';
import {CoreStore,digest} from '../../src/core/storage.js';
import {apply as applyCoreAgent} from '../../src/core/native/agent.js';
import {createChannelHomes} from '../../src/channels/sessions.js';
import {apply as applyGuest,GUEST_PRESET} from '../../src/channels/guest.js';
import {createQqHome} from '#dsh-world/adapters/qq-home';
import {createUserMessage} from '@deepseek-ai/dsh-llm';

function fixture(guest=false,group=false) {
  const directory=mkdtempSync(join(tmpdir(),'r7-nudge-')),listeners=new Set<Function>(),agents=new Map<string,any>(),workspaces=new Map<string,any>();
  let active=true,permit=true,storageId='bank-a',guestHook:any;
  const native=new CoreNative({} as any);
  native.resolveScope=()=>({workspaceId:'owner',path:directory,storageId,guest});
  const host={native,workspace:{runtime:native.runtime,sessionStatus:()=>({state:'ready'})}} as unknown as PetCoreHost;
  const registry={get:(id:string)=>workspaces.get(id),archivedSessionIds:[] as string[],async create(path:string){const previous=[...workspaces.values()].find(w=>w.path===path);if(previous)return previous;const w={id:'guest-ws',path,sessionIds:[] as string[]};workspaces.set(w.id,w);return w;}};
  const ctx:any={on(name:string,fn:Function){if(name==='agent/pre-step')guestHook=fn;else listeners.add(fn);return()=>listeners.delete(fn);},
    tools:{restrict(){}},systemPrompt:{section(){},getSectionOrder(){return 1;},suppressRuntimeContext(){}},inject(){},
    sessions:{flush:async()=>{}},get(name:string){return {workspaceRegistry:registry,agentPresets:{composedPreset:()=>GUEST_PRESET},sessionController:{
      async create({sessionId,workspaceId,agentPreset}:any){const w=workspaces.get(workspaceId);w.sessionIds.push(sessionId);makeAgent(sessionId,w.path,agentPreset);return {sessionId};},
      async resolveAgent(id:string){return {agent:agents.get(id)};},async rename(){}},petTranscripts:{async registerChannelWorkspace(){}},petCore:host}[name];}};
  const emit=(agent:any,type:string,data:any)=>{const event={type,data};agent.events.push(event);for(const fn of listeners)fn(agent.session,event);};
  function makeAgent(id:string,path=directory,preset='standard') {
    const events:any[]=[];
    const agent:any={id,status:'idle',ctx,events,session:{id,header:{cwd:path,agentPreset:preset},snapshotEvents:()=>events},whenIdle:async()=>{},cancel(){},inject(){},
      followup(message:any){assert.equal(native.acceptsInput(id,message),true,'actual Core input admission');emit(agent,'user/message',message);
        emit(agent,'assistant/message',{message:{content:[{type:'text',text:message.source.kind==='user'?agent.firstReply:'nudge answer'}]},stream:[]});
        emit(agent,'turn/end',{turn:1,reason:{kind:'completed'}});},firstReply:''};agents.set(id,agent);return agent;
  }
  const owner=makeAgent('owner');
  const homes=createChannelHomes(ctx,host,{dataDirectory:join(directory,'.chatpet/data/channels'),ownerHome:async()=>owner,
    active:()=>active,identityAllowed:()=>permit,ownerIdentity:id=>!guest && id.speakerId==='qq:owner'});
  const identity={channel:'qq' as const,accountId:'one',conversationId:group?'group':'private',conversationType:group?'group' as const:'private' as const,
    speakerId:guest?'qq:friend':'qq:owner',platformMessageId:'platform-original'};
  let lastOriginal='';
  const word=()=>{const message=createUserMessage({source:{kind:'user',identity},content:[{type:'text',text:'original'}]});lastOriginal=message.id;return message;};
  const nudge=()=>createUserMessage({source:{kind:'dsh-world-reply-nudge',forMessageId:lastOriginal,identity},content:[{type:'text',text:'retry once'}]});
  applyGuest(ctx as Context);
  return {ctx,host,homes,identity,word,nudge,owner,emit,agents,get guestHook(){return guestHook;},
    async original(){const agent=await homes.open(identity);const words=word();assert.equal(native.acceptsInput(agent.id,words),true);emit(agent,'user/message',words);emit(agent,'turn/end',{turn:1,reason:{kind:'completed'}});return {agent,words};},
    permit(value:boolean){permit=value;},rebind(){storageId='bank-b';},off(){active=false;},close(){homes.stop();rmSync(directory,{recursive:true,force:true});}};
}

test('Channels admits a receipt repeatedly by message ID and consumes it only once', async t => {
  const f = fixture();
  t.after(() => f.close());
  const {native} = f.host;
  const agent = await f.homes.open(f.identity);
  const message = f.word();
  const admit = (words: typeof message) => native.sourceTable.admit({sessionId: agent.id, message: words});
  const history = native.sourceTable.classify(message);
  assert.equal(history?.historyProjection?.protectsTurn, true);
  const first = admit(message);
  assert.equal(first.kind, 'accepted');
  const another = f.word();
  assert.equal(admit(another).kind, 'rejected');
  assert.equal(admit(message).kind, 'accepted');
  await f.homes.open(f.identity);
  assert.equal(admit(message).kind, 'accepted');
  assert.equal(admit(another).kind, 'accepted');
  f.homes.stop();
  if (first.kind === 'accepted') assert.equal(first.lease.isCurrent(), false);
  assert.equal(admit(message).kind, 'unclaimed');
});

test('Channels rejection and failure stop same-source admission, while an unclaimed source can continue', async t => {
  const f = fixture();
  t.after(() => f.close());
  const table = f.host.native.sourceTable;
  let laterCalls = 0;
  table.register({id: 'later-channel-fixture', order: 20, sources: ['user', 'dsh-world-reply-nudge'],
    branches: {}, admit: () => { laterCalls++; return {kind: 'rejected', reason: 'later adapter'}; }});
  const message = f.word(), input = {sessionId: f.owner.id, message};
  assert.equal(table.admit(input).kind, 'rejected');
  assert.equal(laterCalls, 0);

  const agent = await f.homes.open(f.identity);
  const failure = Error('Synthetic route failure');
  t.mock.method(f.host.workspace, 'sessionStatus', () => { throw failure; });
  assert.deepEqual(table.admit({sessionId: agent.id, message}), {kind: 'failed', error: failure});
  assert.equal(laterCalls, 0);
  const native = createUserMessage({source: {kind: 'user'}, content: [{type: 'text', text: 'Native owner'}]});
  assert.equal(table.admit({sessionId: agent.id, message: native}).kind, 'accepted');

  f.homes.stop();
  assert.deepEqual(table.admit(input), {kind: 'rejected', reason: 'later adapter'});
  assert.equal(laterCalls, 1);
});

test('Channels rechecks the same QQ nudge against its live original, binding and grant', async t => {
  const f = fixture(true);
  t.after(() => f.close());
  const {agent, words} = await f.original(), message = f.nudge();
  const admit = () => f.host.native.sourceTable.admit({sessionId: agent.id, message}).kind;
  assert.equal(admit(), 'rejected');
  assert.equal(f.host.native.sourceTable.classify(message)?.historyProjection?.protectsTurn, true);
  const release = f.homes.replyNudge(agent.id, words, message);
  assert.equal(admit(), 'accepted');
  f.permit(false);
  assert.equal(admit(), 'rejected');
  f.permit(true);
  assert.equal(admit(), 'accepted');
  f.rebind();
  assert.equal(admit(), 'rejected');
  release();
});

for(const guest of [false,true])test(`R7-02: ${guest?'guest':'owner'} admits only the registered nudge for the actual original delivery`,async()=>{
  const f=fixture(guest);try {
    const {agent,words}=await f.original(),message=f.nudge();assert.equal(f.host.native.acceptsInput(agent.id,message),false);
    const release=f.homes.replyNudge(agent.id,words,message);assert.equal(f.host.native.acceptsInput(agent.id,message),true);
    assert.equal(f.host.native.acceptsInput(agent.id,{...message,content:[{type:'text',text:'forged'}]}),false);
    assert.equal(f.host.native.acceptsInput('other-session',message),false);assert.equal(f.host.native.acceptsInput(agent.id,f.nudge()),false);
    if(guest){assert.equal((await f.guestHook({agent,messages:[message],step:1},()=>({kind:'enter'}))).kind,'enter');
      assert.equal((await f.guestHook({agent,messages:[f.nudge()],step:1},()=>({kind:'enter'}))).kind,'reject');}
    release();assert.equal(f.host.native.acceptsInput(agent.id,message),false);
  }finally{f.close();}
});

for(const change of ['allowlist','binding','stopped','intervening-input','owner-input'] as const)test('R7-02: nudge capability rejects '+change,async()=>{
  const f=fixture(true);try {const {agent,words}=await f.original(),message=f.nudge();const release=f.homes.replyNudge(agent.id,words,message);
    if(change==='allowlist')f.permit(false);if(change==='binding')f.rebind();if(change==='stopped')f.homes.stop();
    if(change==='owner-input')f.emit(agent,'user/message',createUserMessage({source:{kind:'user'},content:[{type:'text',text:'new owner instruction'}]}));
    if(change==='intervening-input'){await f.homes.open(f.identity);const next=f.word();assert.equal(f.host.native.acceptsInput(agent.id,next),true);f.emit(agent,'user/message',next);}
    assert.equal(f.host.native.acceptsInput(agent.id,message),false);release();
  }finally{f.close();}
});

test('R7-02: an unlogged or changed original cannot mint a nudge capability',async()=>{
  const f=fixture();try {const {agent,words}=await f.original();assert.throws(()=>f.homes.replyNudge(agent.id,f.word(),f.nudge()));
    assert.throws(()=>f.homes.replyNudge(agent.id,{...words,content:[]},f.nudge()));
  }finally{f.close();}
});

for(const scenario of ['private','v1','v2','silent'] as const)test('R7-02: upstream QQ '+scenario+' preserves its one-nudge/silence semantics',async()=>{
  const f=fixture(scenario!=='private',scenario!=='private');let granted=0,released=0;
  const home=createQqHome({ctx:f.ctx,home:async id=>{const agent=await f.homes.open(id);if(scenario==='silent')(agent as any).firstReply='[SILENT]';return agent;},inWorld:session=>f.homes.owns(session.id),
    replyNudge(agent,words,nudge){granted++;const release=f.homes.replyNudge(agent.id,words,nudge);return()=>{released++;release();};}});
  try {const answer=await home.ask('original',f.identity,undefined,scenario==='v2'?'v2':'v1');const expected=scenario==='private'||scenario==='v1';
    assert.equal(answer.nudged,expected);assert.equal(granted,expected?1:0);assert.equal(released,granted);if(expected)assert.equal(answer.text,'nudge answer');
  }finally{home.stop();f.close();}
});

test('R7-02: stopping QQ during capability setup prevents followup and revokes the grant',async()=>{
  const f=fixture();let released=0,agent:any,nudge:any;
  const home=createQqHome({ctx:f.ctx,home:id=>f.homes.open(id),inWorld:session=>f.homes.owns(session.id),replyNudge(a,w,n){agent=a;nudge=n;const release=f.homes.replyNudge(a.id,w,n);home.stop();return()=>{released++;release();};}});
  try {await assert.rejects(home.ask('original',f.identity),/stopped/);assert.equal(released,1);assert.equal(f.host.native.acceptsInput(agent.id,nudge),false);
    assert.equal(agent.events.filter((e:any)=>e.type==='user/message').length,1);
  }finally{home.stop();f.close();}
});

for(const authorized of [true,false])test(`R7-02: actual Core pre-step ${authorized?'keeps admitted guest retry conversational':'rejects a forged retry'}`,async()=>{
  const handlers=new Map<string,Function[]>(),agent:any={id:'guest',session:{id:'guest',header:{agentPreset:GUEST_PRESET},snapshotEvents:()=>[]}};
  const native=new CoreNative({} as any),status={state:'ready',target:{id:'workspace',path:'/disposable'}};let begins=0;
  const [policyRow] = native.sourceTable.policyRows();
  native.sourceTable.register({id:'guest-fixture',order:10,sources:['dsh-world-reply-nudge'],isGuest:()=>true,
    branches:{guest:{turnKind:'foreground',toolSource:'guest',toolPolicy:null,memoryObservation:null,
      emotionUpdate:{footer:true,tool:false},policyRow}},
    admit:()=>authorized?{kind:'accepted',branch:'guest',context:{policyKey:'guest'}}
      :{kind:'rejected',reason:'missing grant'}});
  native.observeInputs=()=>[];
  native.begin=async()=>{begins++;throw Error('Guest retry must not start autonomous owner work');};
  const host={native,workspace:{status:()=>status,storageId:()=>'bank'}} as unknown as PetCoreHost;
  const ctx={on(name:string,fn:Function){handlers.set(name,[...(handlers.get(name)??[]),fn]);return()=>{};},effect(){},get(){return undefined;},
    tools:{definitions:()=>[],register:()=>()=>{},guard:()=>()=>{}},agents:new Map([[agent.id,agent]]),
    logger:()=>({debug(){},warn(){}})} as unknown as Context;
  const stop=applyCoreAgent(ctx,host,{sessionStatus:()=>status} as any);
  try {const message=createUserMessage({source:{kind:'dsh-world-reply-nudge'},content:[{type:'text',text:'retry'}]});
    const result=await handlers.get('agent/pre-step')!.at(-1)!({agent,turn:1,step:1,messages:[message],signal:new AbortController().signal},async()=>({kind:'enter',messages:[]}));
    assert.equal(result.kind,authorized?'enter':'reject');assert.equal(begins,0);
  }finally{await stop();}
});

for(const guest of [false,true])test(`R7-02: ${guest?'guest':'owner'} nudge retains system authority and the original channel ancestry in the same Bank`,async()=>{
  const f=fixture(guest),dir=mkdtempSync(join(tmpdir(),'r7-nudge-sources-')),store=new CoreStore(dir);
  try {
    Object.assign(f.host.native.runtime,{store,config:{ownerActorId:'owner',companionId:'xiaoxi'}});
    f.host.native.memory={prepare:async()=>{}} as any;
    const agent=await f.homes.open(f.identity),words=f.word();
    const [original]=f.host.native.observeInputs(agent.id,1,[words]);
    f.emit(agent,'user/message',words);f.emit(agent,'turn/end',{turn:1,reason:{kind:'completed'}});
    const message=f.nudge(),release=f.homes.replyNudge(agent.id,words,message);
    const [envelope]=f.host.native.observeInputs(agent.id,2,[message]);
    const source=store.get<any>('source',envelope),work=store.get<any>('memory-source-work',envelope);
    assert.deepEqual(source.rootSourceIds,[original]);assert.notEqual(source.origin,'owner_statement');assert.equal(work.sourceKind,'system');assert.equal(source.actorId,'system:qq-reply');
    assert.equal(work.attribution.speakerId,f.identity.speakerId);assert.equal(work.attribution.channel,'qq');assert.equal(work.workspaceId,'bank-a');
    await f.host.native.finishTurn(agent.id,2,{state:'completed',text:'A reply grounded in the original QQ input'} as any);
    const reply=store.get<any>('source','result:native:'+digest([agent.id,2]));assert.deepEqual(reply.rootSourceIds,[envelope]);
    assert.deepEqual(source.rootSourceIds,[original]);release();
  }finally{store.close();rmSync(dir,{recursive:true,force:true});f.close();}
});
