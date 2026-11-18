import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {createUserMessage} from '@deepseek-ai/dsh-llm';
import {fixture,until,value} from './fixture.mjs';
import {assertEmotion,footer,nextReview,prepareMemory} from './policy-evidence.mjs';

const beforeReview=new Date(2026,10,15,22,59).toISOString();
const input=kind=>createUserMessage({source:{kind},content:[{type:'text',text:'Synthetic input'}]});
async function autonomous(t,limits) {
  const f=await fixture(t,{policy:true,emotion:true,economy:false,limits});
  await f.enable();
  const home=await f.home();
  const message=input('dsh-world-life');
  home.steer(message);
  return {f,home,message,active:await f.begin(home.id,message)};
}

test('Life 自主轮次在下一步超过步数上限且 footer 在完成时生效',async t=>{
  const {f,active,message}=await autonomous(t,{maxSteps:1});
  await assert.rejects(f.step(active,[message]),/model-step limit/);
  await f.end(active,'aborted');
  const next=await f.begin(active.agent.id,input('dsh-world-life'));
  await f.end(next,'completed',footer('Life'));
  await assertEmotion(f,'Life');
});

test('Life 自主工具调用达到次数上限',async t=>{
  const {f,active}=await autonomous(t,{maxToolCalls:1});
  assert.ok(f.schemas(active).includes('life_plan_read'));
  assert.equal(await f.tool(active,'life_plan_read',{view:'full'}).then(row=>row.plan),null);
  await assert.rejects(f.tool(active,'life_plan_read',{view:'full'}),/自主轮次已结束或超过限额/);
  await f.end(active);
});

test('Life 自主时限到点取消原生轮次',async t=>{
  const {f,active}=await autonomous(t,{maxDurationMs:1000});
  assert.deepEqual(f.cancellations,[]);
  await until(()=>f.cancellations.length===1,'自主时限到点取消 Life',750);
  assert.deepEqual(f.cancellations,[{id:active.agent.id,reason:{kind:'user'}}]);
  await f.end(active,'aborted');
  assert.equal(f.host.native.isAutonomous(active.agent.id),false);
});

test('主人原生 steering 在 Life 后续步解除工具和自主限额',async t=>{
  const {f,home,active}=await autonomous(t,{maxSteps:1,maxToolCalls:0});
  assert.ok(!f.schemas(active).includes('bash'));
  await assert.rejects(f.tool(active,'life_plan_read',{view:'full'}),/超过限额/);
  const owner=input('user');
  home.steer(owner);
  assert.equal(f.host.native.isAutonomous(home.id),true,'入队先解除工具继承限制');
  await f.step(active,[home.inbox.nextStep.find(row=>row.id===owner.id)]);
  assert.equal(f.host.native.isAutonomous(home.id),false,'接管发生在同一轮的第二步');
  assert.ok(f.schemas(active).includes('bash'));
  assert.equal(await f.tool(active,'bash',{}),'bash');
  await f.step(active);
  assert.equal(await f.tool(active,'bash',{}),'bash');
  await f.end(active);
});

async function review(t,options={}){
  const calls=[];
  const f=await fixture(t,{policy:true,emotion:true,intervals:true,now:beforeReview,economy:false,configure(services){
    services.set('compaction',{async compactNow(agent){calls.push(agent.id);return null;}});
  },...options});
  await f.enable();
  const old=f.host.workspace.companionConfiguration();
  value(await f.host.services.workspace.saveCompanion(f.host.operator.request('batch-policy-settings'),{
    workspaceId:'world',expectedSettings:old,settings:{...old,memorySummaryTurns:200,memorySummaryIdleMinutes:60,memorySummaryMinimumMinutes:5},
  }));
  const {home,message}=await nextReview(f,t,options.compactAfterReview);
  const day=message.source.reviewDay;
  if(options.memory)await prepareMemory(f,home.id);
  const active=await f.begin(home.id,message);
  await f.tool(active,'write',{file_path:join(f.repo,'.chatpet/diary',day+'.md'),content:'Synthetic review diary'});
  await f.end(active,'completed',footer('Review'));
  return {f,calls,home};
}

test('回顾 footer 生效且符合条件的回顾提前压缩恰好一次',async t=>{
  const {f,calls,home}=await review(t,{memory:true,compactAfterReview:true});
  await assertEmotion(f,'Review');
  home.status='running';
  t.mock.timers.tick(1000);
  assert.deepEqual(calls,[]);
  home.status='idle';
  t.mock.timers.tick(1000);
  await until(()=>calls.length===1,'完成实际压缩调用');
  const batch=()=>f.host.workspace.runtime.store.get('memory-batch',home.id);
  await until(()=>batch().turns===0,'压缩处理完待处理轮次');
  assert.deepEqual(calls,[home.id]);
  t.mock.timers.tick(1000);
  assert.deepEqual(calls,[home.id]);
  // 新的回顾通知不能绕过上次压缩后的最小间隔。
  await f.end(await f.begin(home.id));
  await f.emit('pet/life.review',home.id);
  t.mock.timers.tick(1000);
  assert.deepEqual(calls,[home.id]);
  assert.equal(batch().turns,1);
  t.mock.timers.tick(5*60_000);
  await until(()=>calls.length===2,'最小间隔到期后处理待办');
  assert.deepEqual(calls,[home.id,home.id]);
});

test('回顾压缩设置关闭、Memory 关闭、非 home 或无待处理轮次时不压缩',async t=>{
  await t.test('回顾压缩设置关闭',async sub=>{
    const {f,calls,home}=await review(sub,{memory:true,compactAfterReview:false});
    sub.mock.timers.tick(1000);
    assert.deepEqual(calls,[]);
    const batch=id=>f.host.workspace.runtime.store.get('memory-batch',id);
    assert.ok(batch(home.id).turns>0);
    assert.equal(batch(home.id).lastAttempt,0);
    const other=await f.begin('owner-b');
    await f.end(other);
    await f.emit('pet/life.review',other.agent.id);
    sub.mock.timers.tick(1000);
    assert.equal(batch(other.agent.id).lastAttempt,0,'非 home 不提前压缩');
    assert.deepEqual(calls,[]);
  });
  await t.test('Memory 关闭',async sub=>{
    const {f,calls,home}=await review(sub,{memory:false,compactAfterReview:true});
    sub.mock.timers.tick(1000);
    assert.equal(f.host.workspace.runtime.store.get('memory-batch',home.id),undefined);
    assert.deepEqual(calls,[]);
  });
  await t.test('无待处理轮次',async sub=>{
    const calls=[];
    const f=await fixture(sub,{policy:true,life:true,memory:true,economy:false,intervals:true,configure(services){
      services.set('compaction',{async compactNow(agent){calls.push(agent.id);return null;}});
    }});
    await f.enable();
    const home=await f.home();
    await prepareMemory(f,home.id);
    await f.end(await f.begin(home.id),'aborted');
    await f.emit('pet/life.review',home.id);
    sub.mock.timers.tick(1000);
    assert.equal(f.host.workspace.runtime.store.get('memory-batch',home.id),undefined);
    assert.deepEqual(calls,[]);
  });
});

test('Life 自主输入只准 home，途中绑定变化使下一步被拒',async t=>{
  const {f,home,message,active}=await autonomous(t);
  assert.equal(f.host.native.acceptsInput('owner-b',message),false);
  f.workspace.path=f.root;
  try {
    const decision=await f.middleware('agent/pre-step',[{
      agent:home,turn:active.turn,step:2,messages:[message],signal:new AbortController().signal,
    }],async()=>({kind:'enter',messages:[]}));
    assert.equal(decision.kind,'reject');
  } finally {
    f.workspace.path=f.repo;
    await f.end(active,'aborted');
  }
});
