import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Session,SessionId} from '@deepseek-ai/dsh-session';
import {createUserMessage} from '@deepseek-ai/dsh-llm';
import type {Context} from '@deepseek-ai/cordis';
import type {Agent} from '@deepseek-ai/dsh-agent';
import {homeView,emptyHomeState} from '#feiyu-home';
import type {SourceInput} from '../../src/contracts/tables.js';
import type {PetCoreHost} from '../../src/core/index.js';
import {createLifeSourceAdapter} from '../../src/life/tool-policy.js';
import {prepareLifeHistory,applyLifeHistory,historicalStateOverview} from '../../src/core/native/history-maintenance.js';
import {SourceAdapterTable} from '../../src/core/tables/sources.js';
import {CoreNative} from '../../src/core/native/conversation.js';
import type {CoreRuntime} from '../../src/core/runtime.js';
import {createChannelSourceAdapter} from '../../src/channels/sessions.js';
import {roomHistoryTools} from '../../src/room/plugin.js';
import {lifePlanReadToolDeclaration} from '../../src/life/plan-tools.js';

const {sourceTable:table,toolTable}=new CoreNative({} as CoreRuntime);
for(const declaration of [...roomHistoryTools,lifePlanReadToolDeclaration])toolTable.register(declaration);
table.register(createLifeSourceAdapter({} as Context,{} as PetCoreHost,()=>false));
const offline=()=>{throw Error('Saved history must not consult live admission');};
table.register(createChannelSourceAdapter({guest:offline,ownerActorId:offline,admit:offline}));
const classify:Parameters<typeof prepareLifeHistory>[2]=message=>table.classify(message);

function fixture() {
  const session=Session.create(SessionId('history-fixture'));
  const full=homeView(emptyHomeState(1000),1000);
  let turn=0,maintenanceCalls=0;
  const appendTurn=(options:{owner?:boolean;takeover?:boolean;review?:boolean;failed?:boolean;full?:boolean;error?:boolean;receipt?:boolean;tool?:string;
    additionalSource?:SourceInput['message']['source']}={})=>{
    turn++;
    session.append('turn/start',{turn});
    session.append('user/message',createUserMessage({source:options.owner?{kind:'user'}:
      {kind:'dsh-world-life',...(options.review?{purpose:'review',reviewDay:'2026-11-14'}:{})} as any,content:[{type:'text',text:'Original input '+turn}]}),{surfaceOp:'append'});
    if(options.takeover)session.append('user/message',createUserMessage({source:{kind:'user'},content:[{type:'text',text:'Owner takeover'}]}),{surfaceOp:'append'});
    if(options.additionalSource)session.append('user/message',createUserMessage({source:options.additionalSource,
      content:[{type:'text',text:'Additional synthetic input'}]}),{surfaceOp:'append'});
    const id=('call-'+turn) as any;
    session.append('tool/call',{turn,step:1,callId:id,name:options.tool??'room_state',arguments:JSON.stringify(options.full?{view:'full'}:options.receipt?{factIds:['original']}:{})});
    const event=session.append('tool/result',{turn,step:1,message:{id:('result-'+turn) as any,role:'tool',source:{kind:'tool',callId:id},toolCallId:id,
      content:[{type:'text',text:JSON.stringify(full)}],...(options.error?{isError:true}:{})},meta:{original:'presentation retained'}},{surfaceOp:'append'});
    session.append('turn/end',{turn,reason:options.failed?{kind:'aborted',cause:{kind:'user'}}:{kind:'completed'}} as any);
    return event;
  };
  const warnings:string[]=[];
  const agent={status:'idle',session,inbox:{nextTurn:[],nextStep:[]},ctx:{logger:()=>({warn:(message:string)=>warnings.push(message)})},runMaintenance:async(job:any)=>{
    maintenanceCalls++;return job(new AbortController().signal);
  }} as unknown as Agent;
  const meter={estimateMessage:()=>123};
  const openRequest=()=>{session.append('turn/start',{turn:++turn});session.append('step/start',{turn,step:1});};
  return {session,full,appendTurn,agent,meter,openRequest,warnings,counts:()=>({maintenanceCalls})};
}

test('native maintenance projects only older successful default Life states, preserves originals and replays idempotently',async()=>{
  const f=fixture(),first=f.appendTurn({additionalSource:{kind:'runtime-context',form:'snapshot',sections:[{name:'fixture',text:'Runtime context'}]}});
  f.appendTurn();
  const originals=structuredClone(f.session.snapshotEvents());
  const prepared=await prepareLifeHistory(f.agent,()=>true,classify,toolTable);
  assert.deepEqual(f.session.snapshotEvents(),originals,'Idle maintenance only prepares; it never writes outside a turn');
  f.openRequest();
  const result=applyLifeHistory(f.agent,prepared,f.meter);
  assert.equal(result.replaced,1);assert.ok(result.charsAfter<result.charsBefore);
  assert.deepEqual(f.session.snapshotEvents().slice(0,originals.length),originals);
  const replacement=f.session.surface.nodes.map(seq=>f.session.eventAt(seq)).find(event=>event?.sourceEventSeqs?.includes(first.seq));
  assert.equal(replacement?.type,'tool/result');
  if(replacement?.type!=='tool/result')throw Error('Missing native replacement');
  assert.deepEqual(replacement.data.meta,first.data.meta);
  assert.equal(replacement.data.message.toolCallId,first.data.message.toolCallId);
  const projected=JSON.parse((replacement.data.message.content[0] as any).text);
  assert.equal(projected.view,'overview');assert.deepEqual(projected.body,f.full.body);
  assert.equal(f.session.snapshotEvents().filter(event=>String(event.type)==='compaction/prune').length,1);
  assert.deepEqual(f.counts(),{maintenanceCalls:1});
  const restored=Session.create(SessionId('restored'),f.session.snapshotEvents());
  assert.deepEqual(restored.surface.nodes,f.session.surface.nodes,'Native restart reproduces the exact projected surface');
  assert.equal(applyLifeHistory(f.agent,prepared,f.meter).replaced,0);
});

test('context payload CLI analyzes a synthetic log containing completed Life turns',t=>{
  const f=fixture();f.appendTurn();f.appendTurn();
  const directory=mkdtempSync(join(tmpdir(),'context-payload-'));
  t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const log=join(directory,'events.jsonl');
  writeFileSync(log,f.session.snapshotEvents().map(event=>JSON.stringify(event)).join('\n'));
  const script=fileURLToPath(new URL('../../../scripts/checks/check-context-payload.mjs',import.meta.url));
  const report=JSON.parse(execFileSync(process.execPath,[script,log],{encoding:'utf8'}));
  assert.equal(report.produced.room_state.count,2);
  assert.equal(report.maintenance.results,1);
  assert.ok(report.maintenance.resultCharsAfter<report.maintenance.resultCharsBefore);
});

test('a failed source classification protects its whole turn and later Life turns still project',async()=>{
  const sources=new SourceAdapterTable();
  sources.register(createLifeSourceAdapter({} as Context,{} as PetCoreHost,()=>false));
  sources.register({id:'synthetic-tv',order:0,sources:['chatpet-room-tv'],branches:{},
    classify(){throw Error('Synthetic classification failure');},admit:()=>({kind:'unclaimed'})});
  const f=fixture();
  const protectedResult=f.appendTurn({additionalSource:{kind:'chatpet-room-tv',rpcId:'synthetic'}});
  const eligibleResult=f.appendTurn();f.appendTurn();
  const original=structuredClone(protectedResult);

  const prepared=await prepareLifeHistory(f.agent,()=>true,message=>sources.classify(message),toolTable);
  assert.deepEqual(prepared.map(change=>change.event.seq),[eligibleResult.seq]);
  assert.equal(f.warnings.length,1);
  assert.match(f.warnings[0],/synthetic-tv/);

  f.openRequest();
  assert.equal(applyLifeHistory(f.agent,prepared,f.meter).replaced,1);
  assert.ok(f.session.surface.nodes.includes(protectedResult.seq));
  assert.deepEqual(f.session.eventAt(protectedResult.seq),original);
  assert.ok(!f.session.surface.nodes.includes(eligibleResult.seq));
});

test('owner input, takeover, review, failure, explicit full, receipts, other tools and newest turn are protected',async()=>{
  const f=fixture();
  for(const options of [{owner:true},{takeover:true},{review:true},{failed:true},{full:true},{error:true},{receipt:true},{tool:'life_read_segment'},{}])f.appendTurn(options);
  const before=structuredClone(f.session.snapshotEvents());
  assert.equal((await prepareLifeHistory(f.agent,()=>true,classify,toolTable)).length,0);
  assert.deepEqual(f.session.snapshotEvents(),before);
});

test('read-only policies protect native owner and channel takeovers and QQ nudges in earlier Life turns',async t=>{
  const f=fixture();
  const identity={channel:'qq',accountId:'fixture',conversationId:'private',conversationType:'private',speakerId:'qq:owner'};
  const channelSource={kind:'user' as const,identity};
  const protectedResults=[
    f.appendTurn({takeover:true}),
    f.appendTurn({additionalSource:channelSource}),
    f.appendTurn({additionalSource:{kind:'dsh-world-reply-nudge'}}),
  ];
  const eligible=f.appendTurn();
  f.appendTurn();
  const directory=mkdtempSync(join(tmpdir(),'context-payload-mixed-'));
  t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const log=join(directory,'events.jsonl');
  writeFileSync(log,f.session.snapshotEvents().map(event=>JSON.stringify(event)).join('\n'));
  const script=fileURLToPath(new URL('../../../scripts/checks/check-context-payload.mjs',import.meta.url));
  const report=JSON.parse(execFileSync(process.execPath,[script,log],{encoding:'utf8'}));
  assert.equal(report.maintenance.results,1);

  const prepared=await prepareLifeHistory(f.agent,()=>true,classify,toolTable);
  assert.deepEqual(prepared.map(change=>change.event.seq),[eligible.seq]);
  f.openRequest();
  assert.equal(applyLifeHistory(f.agent,prepared,f.meter).replaced,1);
  for(const result of protectedResults)assert.ok(f.session.surface.nodes.includes(result.seq));
});

test('saved QQ inputs protect their Life turns after the channel adapter is revoked',async()=>{
  const sources=new CoreNative({} as CoreRuntime).sourceTable;
  sources.register(createLifeSourceAdapter({} as Context,{} as PetCoreHost,()=>false));
  const registration=sources.register(createChannelSourceAdapter({guest:offline,ownerActorId:offline,admit:offline}));
  const classifySaved:typeof classify=message=>sources.classify(message);
  const f=fixture();
  const identity={channel:'qq',accountId:'fixture',conversationId:'private',conversationType:'private',speakerId:'qq:owner'};
  const channelSource={kind:'user' as const,identity};
  f.appendTurn({additionalSource:channelSource});
  f.appendTurn({additionalSource:{kind:'dsh-world-reply-nudge'}});
  f.appendTurn();

  assert.equal((await prepareLifeHistory(f.agent,()=>true,classifySaved,toolTable)).length,0);
  await registration.revoke();
  assert.equal((await prepareLifeHistory(f.agent,()=>true,classifySaved,toolTable)).length,0);
});

test('queued interaction, active turn and changed workspace never enter maintenance',async()=>{
  for(const condition of ['queued','running','changed']) {
    const f=fixture();f.appendTurn();f.appendTurn();
    if(condition==='queued')(f.agent.inbox.nextTurn as any[]).push({});
    if(condition==='running')Object.assign(f.agent,{status:'running'});
    assert.equal((await prepareLifeHistory(f.agent,()=>condition!=='changed',classify,toolTable)).length,0);
    assert.equal(f.counts().maintenanceCalls,0);
  }
});

test('a native compaction that supersedes a prepared result makes the stale projection a no-op',async()=>{
  const f=fixture();f.appendTurn();f.appendTurn();const prepared=await prepareLifeHistory(f.agent,()=>true,classify,toolTable);
  const source=prepared[0].event;f.openRequest();
  f.session.append('tool/result',source.data,{surfaceOp:{op:'replace',startSeq:source.seq,endSeq:source.seq},sourceEventSeqs:[source.seq]});
  const before=structuredClone(f.session.snapshotEvents());
  assert.equal(applyLifeHistory(f.agent,prepared,f.meter).replaced,0);
  assert.deepEqual(f.session.snapshotEvents(),before);
});

test('structured history maintenance leaves reading, malformed and partial payloads untouched and preserves open plan state',()=>{
  assert.equal(historicalStateOverview(toolTable,'room_state',{}, {body:{}}),undefined);
  assert.equal(historicalStateOverview(toolTable,'room_state',{}, {ok:false}),undefined);
  assert.equal(historicalStateOverview(toolTable,'life_read_segment',{}, {text:'Original reading'}),undefined);
  const plan={revision:9,id:'accepted',goal:'Read and eat',cursor:1,steps:[{id:'read',kind:'read'}],
    execution:{status:'waiting',operationId:'reading-offer'},pauseReason:'owner',replanReason:'receipt pending'};
  const view=historicalStateOverview(toolTable,'life_plan_read',{}, {revision:9,plan}) as any;
  assert.deepEqual(view.plan,plan);
});
