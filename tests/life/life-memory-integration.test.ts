import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {CoreRuntime} from '../../src/core/runtime.js';
import {CoreNative, type NativeScope} from '../../src/core/native/conversation.js';
import {NativeMemory} from '../../src/core/native/memory.js';
import type {CompanionFact} from '../../src/contracts/interaction.js';
import type {EvidenceSource} from '../../src/contracts/common.js';
import type {UserMessage} from '@deepseek-ai/dsh-session';
import {CompanionRoom} from '../../src/behavior/room.js';
import {emptyHomeState} from '#feiyu-home';
import {createGarden} from '#feiyu-garden';
import {digest} from '../../src/core/storage.js';

interface Observation {source_id:string;revision:string;content:string;actor_id:string;source_kind:string;roots:{id:string;revision:string}[];attribution?:Record<string,unknown>}
interface Work {sourceId:string;workspaceId:string;state:string;observationId:string|null;sourceKind?:string;attribution?:Record<string,unknown>}

function fixture(t:TestContext) {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'life-memory-code-'))),workspace=join(root,'workspace');mkdirSync(workspace);
  const runtime=new CoreRuntime({dataDir:join(root,'core'),companionId:'fish',scopeId:'owner',ownerActorId:'owner-one',displayName:'Xiaoxi',character:'Disposable fixture'});
  let scope:NativeScope={workspaceId:'fixture-workspace',path:workspace,storageId:'fixture-bank',guest:false};
  runtime.files={status:()=>({state:'ready',target:{id:scope.workspaceId,path:scope.path}}),storageId:()=>scope.storageId} as unknown as NonNullable<CoreRuntime['files']>;
  const memory=new NativeMemory(runtime,{dataDir:join(workspace,'.chatpet/data/memory'),python:resolve('.venv/bin/python')});
  const native=new CoreNative(runtime);native.memory=memory;native.resolveScope=()=>({...scope});native.lifeAdmission=()=>true;
  const observations:Observation[]=[],validations:unknown[]=[],starts:unknown[]=[];
  memory.connection.start=async(...args)=>{starts.push(args);};
  memory.connection.call=async<T>(operation:string,args:Record<string,unknown>,bank?:string):Promise<T>=>{
    assert.equal(bank,scope.storageId,'Native capture must bind its provider call to the selected Bank');
    assert.equal(operation,'observe');observations.push(structuredClone(args) as unknown as Observation);
    return {observationId:'fixture-observation:'+args.source_id,decision:'eligible'} as T;
  };
  memory.connection.validate=async(dependencies,bank)=>{assert.equal(bank,scope.storageId);validations.push(structuredClone(dependencies));return 'eligible';};
  const at=Date.parse('2026-11-13T05:00:00Z'),home=emptyHomeState(at);
  Object.assign(home,{needs:{hunger:.5,thirst:.8,energy:.8,bladder:.1,pain:0},asleep:false,sleepPending:false,route:null,dwell:null,command:null,freeTarget:null,reactionUntil:0,eventLog:[],lastInteractionAt:0});
  const body=join(root,'body');mkdirSync(body);writeFileSync(join(body,'home.json'),JSON.stringify(home));writeFileSync(join(body,'garden.json'),JSON.stringify(createGarden(at)));
  const room=new CompanionRoom(body,()=>undefined);
  const water=(id:string)=>room.act({action:'water'},'主人',at,{requestId:id,actor:{kind:'owner',id:'owner-one',channel:'room',sessionId:'origin-room'}}).fact!;
  t.after(async()=>{await memory.close();runtime.close();rmSync(root,{recursive:true,force:true});});
  return {root,runtime,native,memory,observations,validations,starts,room,water,get scope(){return scope;},set scope(value:NativeScope){scope=value;}};
}

const ownerMessage=(id:string,text='What just happened?'):UserMessage=>({role:'user',id:id as UserMessage['id'],source:{kind:'user'},content:[{type:'text',text}]});
const lifeMessage=(id:string,facts:CompanionFact[]):UserMessage=>({role:'user',id,source:{kind:'dsh-world-life',facts},content:[{type:'text',text:JSON.stringify(facts)}]} as unknown as UserMessage);
const replyId=(session:string,turn:number)=>'result:native:'+digest([session,turn]);
const completed=(text:string)=>({state:'completed' as const,text,hostTurnIds:[]});

/** Run the actual Python MemoryPort against only this fixture's observations.
 * No service socket/background runner is started. Every network connect is
 * forbidden, so an accidental LLM/embed request cannot escape the code test. */
function inspectProvider(root:string,observations:Observation[],sourceIds:string[],withdraw?:string) {
  const script=String.raw`
import json, socket, sys
from pathlib import Path
def deny_network(*args, **kwargs):
    raise AssertionError('Network/model access is forbidden in this code fixture')
socket.socket.connect = deny_network
socket.create_connection = deny_network
checkout, directory = sys.argv[1:]
sys.path[:0] = [str(Path(checkout)/'vendor/mnemosyne/service/src'), str(Path(checkout)/'src/memory')]
from cognitive_memory.bootstrap import build_context
from provider import MemoryPort
data = json.load(sys.stdin)
ctx = build_context(data_dir=directory, token='isolated-fixture')
try:
    port = MemoryPort(ctx.service, companion_id='fish', scope_id='owner', workspace_id='fixture-bank')
    acknowledgements = [port.observe(port.scope, **row) for row in data['observations']]
    decisions = {key:port.source_decision(key, '1') for key in data['sourceIds']}
    sources = {key:port.source(key) for key in data['sourceIds']}
    summary = None
    if all(value == 'eligible' for value in decisions.values()):
        summary = port.summary(port.scope, session_id='life-home', summary_seq=42, content='The owner gave Xiaoxi water.', sources=[{'id':key,'revision':'1'} for key in data['sourceIds']])
    after = None
    if data.get('withdraw'):
        port.derivations.record_tombstone(root_source_id=data['withdraw'], reason='Disposable withdrawal fixture')
        after = {key:port.source_decision(key, '1') for key in data['sourceIds']}
    print(json.dumps({'decisions':decisions,'sources':sources,'acknowledgements':acknowledgements,'summary':summary,'afterWithdrawal':after}))
finally:
    ctx.runtime.stop()
    ctx.db.close()
`;
  return JSON.parse(execFileSync(resolve('.venv/bin/python'),['-c',script,process.cwd(),join(root,'provider')],{
    input:JSON.stringify({observations,sourceIds,withdraw}),encoding:'utf8',timeout:30_000,
    env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',DSH_MEMORY_EMOTION:'0',DSH_MEMORY_EMOTION_WRITE:'0'},maxBuffer:8*1024*1024,
  })) as {decisions:Record<string,string>;sources:Record<string,any>;acknowledgements:{sourceId:string;observationId:string;state:string}[];summary:{id:string}|null;afterWithdrawal:Record<string,string>|null};
}

test('actual Body facts and a Life reply keep a complete eligible Core-to-Memory source graph',async t=>{
  const f=fixture(t),fact=f.water('owner-water');
  const ids=f.native.observeInputs('life-home',1,[lifeMessage('fact-batch',[fact])]);
  await f.native.finishTurn('life-home',1,completed('You just gave me water. I will keep reading.'));
  const result=replyId('life-home',1),source=f.runtime.store.require<EvidenceSource>('source',result);
  assert.deepEqual(source.rootSourceIds,ids);
  const original=f.observations.find(row=>row.source_id.startsWith('native-fact:'))!;
  assert.equal(original.source_kind,'system');assert.equal(original.actor_id,'owner-one');
  assert.equal(original.attribution?.sessionId,'origin-room');assert.equal(original.attribution?.observedInSessionId,'life-home');
  const provider=inspectProvider(f.root,f.observations,[...ids,result]);
  assert.equal(provider.decisions[result],'eligible','Every native Life reply ancestor must actually reach the existing Bank');
  assert.ok(Object.values(provider.decisions).every(value=>value==='eligible'));
  assert.ok(provider.summary?.id,'The same observed sources must support native batch summary admission');
  for(const id of f.runtime.store.require<string[]>('native-session-sources','life-home')) {
    const work=f.runtime.store.require<Work>('memory-source-work',id);
    assert.equal(work.workspaceId,f.scope.storageId,'Memory batch must see every retained Life ancestor as enrolled');
    assert.equal(work.state,'acknowledged');
  }
  const aggregate=f.observations.find(row=>row.source_id.startsWith('native-input:'))!;
  assert.equal(aggregate.source_kind,'system');assert.equal(aggregate.actor_id,'system:companion-world');
  assert.deepEqual(aggregate.roots,[{id:original.source_id,revision:'1'}]);
});

test('two owner conversations share one original fact without replaying its Memory observation',async t=>{
  const f=fixture(t),fact=f.water('cross-chat');
  const [factId]=f.native.observeFacts('owner-A',[fact]);
  f.native.observeInputs('owner-A',1,[ownerMessage('question-A')]);await f.native.finishTurn('owner-A',1,completed('You gave me water.'));
  f.room.acknowledgeFacts([fact.id]);
  f.native.observeFacts('owner-B',f.room.readFacts([fact.id]));
  f.native.observeInputs('owner-B',1,[ownerMessage('question-B')]);await f.native.finishTurn('owner-B',1,completed('The same water interaction is still completed.'));
  await f.native.useSources('owner-B',[factId]);
  assert.equal(f.observations.filter(row=>row.source_id===factId).length,1);
  assert.ok(f.validations.length>0,'Already observed material must be revalidated instead of reconsolidated');
  for(const session of ['owner-A','owner-B'])assert.ok(f.runtime.store.require<EvidenceSource>('source',replyId(session,1)).rootSourceIds.includes(factId));
  const sources=f.observations.map(row=>row.source_id),provider=inspectProvider(f.root,f.observations,sources);
  assert.ok(Object.values(provider.decisions).every(value=>value==='eligible'));
});

test('a post-provider acknowledgement failure survives Core reopen and retries the same original source',async t=>{
  const f=fixture(t),fact=f.water('retry');const [sourceId]=f.native.observeFacts('owner',[fact]);
  const call=f.memory.connection.call.bind(f.memory.connection);let fail=true;
  f.memory.connection.call=async<T>(operation:string,args:Record<string,unknown>,bank?:string):Promise<T>=>{
    const result=await call<T>(operation,args,bank);if(fail){fail=false;throw Error('Injected lost provider acknowledgement');}return result;
  };
  await assert.rejects(f.memory.prepare('owner',f.scope),/lost provider acknowledgement/);
  assert.equal(f.runtime.store.require<Work>('memory-source-work',sourceId).state,'queued');assert.equal(f.runtime.store.get('memory-ack',sourceId),undefined);
  f.runtime.close();
  const reopened=new CoreRuntime(f.runtime.config);reopened.files=f.runtime.files;
  const resumed=new NativeMemory(reopened,f.memory.connection.config);
  resumed.connection.start=f.memory.connection.start;
  resumed.connection.call=f.memory.connection.call;
  resumed.connection.validate=f.memory.connection.validate;
  try {
    await resumed.prepare('another-owner-chat',f.scope);
    assert.equal(reopened.identity().companionId,'fish');
    assert.equal(reopened.store.require<Work>('memory-source-work',sourceId).state,'acknowledged');
  } finally {await resumed.close();reopened.close();}
  const provider=inspectProvider(f.root,f.observations,[sourceId]);
  assert.equal(provider.acknowledgements.length,2);assert.equal(provider.acknowledgements[1].state,'duplicate');
  assert.equal(provider.acknowledgements[0].observationId,provider.acknowledgements[1].observationId);
});

test('Memory off retains native originals without silently enrolling old life inputs on re-enable',async t=>{
  const f=fixture(t);f.native.memoryEnabledForNewSessions=false;
  const old=f.native.observeInputs('retained',1,[lifeMessage('off-batch',[f.water('off')])]);
  await f.native.finishTurn('retained',1,completed('Original off-period reply'));
  for(const id of [...old,replyId('retained',1)])assert.equal(f.runtime.store.get('memory-source-work',id),undefined);
  assert.equal(f.observations.length,0);assert.equal(f.starts.length,0);
  f.native.memoryEnabledForNewSessions=true;
  f.native.observeInputs('retained',2,[ownerMessage('new-turn')]);await f.native.finishTurn('retained',2,completed('This is a newly observed turn.'));
  const observed=new Set(f.observations.map(row=>row.source_id));
  for(const id of [...old,replyId('retained',1)])assert.equal(observed.has(id),false);
  assert.ok(f.runtime.store.require<EvidenceSource>('source',replyId('retained',1)),'Native original survives outside the Bank');
});

test('guest or changed-bank scope cannot attach owner facts or commit a late Bank acknowledgement',async t=>{
  const f=fixture(t),fact=f.water('private'),before=f.scope;
  f.scope={...before,guest:true};assert.throws(()=>f.native.observeFacts('guest',[fact]),/owner conversation/);
  f.scope=before;const [sourceId]=f.native.observeFacts('owner',[fact]);
  const call=f.memory.connection.call.bind(f.memory.connection);
  f.memory.connection.call=async<T>(operation:string,args:Record<string,unknown>,bank?:string):Promise<T>=>{
    const result=await call<T>(operation,args,bank);f.scope={...before,storageId:'other-bank'};return result;
  };
  await assert.rejects(f.memory.prepare('owner',before),/Bank changed/);
  assert.equal(f.runtime.store.get('memory-ack',sourceId),undefined);
  assert.equal(f.runtime.store.require<Work>('memory-source-work',sourceId).workspaceId,before.storageId);
  assert.equal(f.runtime.store.require<Work>('memory-source-work',sourceId).state,'queued');
});

test('withdrawing an original interaction invalidates the derived Life reply in the actual Memory provider',async t=>{
  const f=fixture(t),[sourceId]=f.native.observeFacts('owner',[f.water('withdraw')]);
  f.native.observeInputs('owner',1,[ownerMessage('question')]);await f.native.finishTurn('owner',1,completed('You gave me water.'));
  const result=replyId('owner',1),provider=inspectProvider(f.root,f.observations,f.observations.map(row=>row.source_id),sourceId);
  assert.equal(provider.decisions[result],'eligible');assert.equal(provider.afterWithdrawal?.[result],'ineligible');
  assert.equal(provider.afterWithdrawal?.[sourceId],'ineligible');
});
