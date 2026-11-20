import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,symlinkSync,unlinkSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createUserMessage} from '@deepseek-ai/dsh-llm';
import {fixture,until,value} from './fixture.mjs';
import {assertEmotion,footer,nextReview,prepareMemory} from './policy-evidence.mjs';
import {cordisFixture,eventually} from './entries-lifecycle.test.mjs';

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

test('新增后台来源的工具限制在首步组装模型 schema 前生效',async t=>{
  const f=await fixture(t,{policy:true,life:false,economy:false});
  const baseline=await f.begin();
  assert.ok(baseline.prompt.tools.some(tool=>tool.name==='bash'));
  await f.end(baseline);

  const kind='synthetic-background';
  const registration=f.host.native.sourceTable.register({
    id:kind,order:0,sources:[kind],
    branches:{background:{turnKind:'background',toolSource:'life',
      toolPolicy:{install:agent=>agent.ctx.tools.restrict({allow:['read']}),denial:'Synthetic background tools'},
      emotionUpdate:{footer:false,tool:false},
    }},
    admit:()=>({kind:'accepted',branch:'background',context:{policyKey:kind}}),
  });
  t.after(()=>registration.revoke());
  const message=input(kind);
  baseline.agent.followup(message);
  const active=await f.begin(baseline.agent.id,message);
  const names=active.prompt.tools.map(tool=>tool.name);
  assert.ok(!names.includes('bash'),'首步组装发送给模型的 schema 已屏蔽 bash');
  assert.ok(names.includes('read'));
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

async function reviewFiles(t, now = new Date(2026,10,13,12).toISOString()) {
  let cwd;
  const f = await fixture(t, {policy:true,economy:false,now,configure(services) {
    services.set('workingDirectory',{ensure:async agent=>cwd ?? agent.session.header.cwd});
    services.set('fs',{resolve:async (path,options)=>resolve(options.cwd,path),processPath:path=>path});
  }});
  await f.enable();
  const home = await f.home(), diary = join(f.repo,'.chatpet/diary');
  mkdirSync(diary,{recursive:true});
  return {f,home,diary,setCwd:value=>{cwd=value;},
    begin:day=>f.begin(home.id,createUserMessage({source:{kind:'dsh-world-life',purpose:'review',reviewDay:day},
      content:[{type:'text',text:'Synthetic review'}]})),
    prepare:(turn,path)=>f.prepareTool(turn,'write',{file_path:path,content:'Fixture diary'}),
  };
}

test('回顾文件守卫按 cwd 解析，以原 token 复核软链并在主人接管后释放权限',async t=>{
  const {f,home,diary,setCwd,begin,prepare} = await reviewFiles(t);
  let active = await begin('2026-11-12');
  const self = await prepare(active,'.chatpet/self.md');
  assert.equal(self.check(),undefined);
  await self.finish();
  const denied = await prepare(active,'.chatpet/data/life/life.json');
  assert.match(denied.check(),/仅访问/);
  const owner = input('user');
  home.steer(owner);
  await f.step(active,[owner]);
  assert.equal(denied.check(),undefined,'The ordinary owner turn retains DSH file permissions');
  await denied.finish();
  const allowed = await prepare(active,'.chatpet/data/life/life.json');
  assert.equal(allowed.check(),undefined);
  await allowed.finish();
  await f.end(active);

  active = await begin('2026-11-12');
  setCwd(diary);
  const relative = await prepare(active,'../self.md');
  assert.equal(relative.check(),undefined);
  await relative.finish();
  const item = await prepare(active,'2026-11-13.md');
  assert.equal(item.check(),undefined);
  const diaryFile = join(diary,'2026-11-13.md'), otherFile = join(f.root,'fixture.txt');
  writeFileSync(otherFile,'Synthetic file');
  symlinkSync(otherFile,diaryFile);
  try {assert.match(item.check(),/writing path/,'A path changed after preparation is rechecked before dispatch');}
  finally {unlinkSync(diaryFile);await item.finish();}

  const guest = f.host.native.sourceTable.register({id:'fixture-review-guest',order:0,sources:[],branches:{},
    isGuest:id=>id===home.id,admit:()=>({kind:'unclaimed'})});
  try {
    const refused = await prepare(active,'../self.md');
    assert.match(refused.check(),/范围/);
    await refused.finish();
  } finally {await guest.revoke();}
  await f.end(active,'aborted');
});

test('历史补写在原生分发前出现已有日记时复核拒绝覆盖',async t=>{
  const {f,diary,setCwd,prepare} = await reviewFiles(t,beforeReview);
  const {home,message} = await nextReview(f,t), day = message.source.reviewDay;
  await f.end(await f.begin(home.id,message),'aborted');
  t.mock.timers.tick(24*3_600_000);
  await f.restart();
  const reopened = await f.home();
  const pending = () => reopened.inbox.nextStep.find(row=>row.source?.purpose==='review' && row.source.reviewDay===day);
  await until(pending,'补写原回顾日期');
  const retry = pending();
  assert.ok(retry);
  const active = await f.begin(reopened.id,retry), filename = day+'.md';
  assert.equal(f.host.native.isAutonomous(reopened.id),true);
  // Resolve in the current tool cwd so the Core guard must recheck its prepared path.
  setCwd(diary);
  const item = await prepare(active,filename);
  assert.equal(item.check(),undefined);
  writeFileSync(join(diary,filename),'An existing historical diary');
  assert.match(item.check(),/历史日记已经存在/);
  await item.finish();
  await f.end(active,'aborted');
});

test('3C 主人接管运行中的 Life 后仍使用 Life 相册，暂停后恢复 Core 相册',async t=>{
  const {f,home,active}=await autonomous(t,{});
  for(const takenOver of [false,true]) {
    if(takenOver) {
      const owner=input('user');
      home.steer(owner);
      await f.step(active,[owner]);
    }
    assert.ok(f.schemas(active).includes('list_photos'));
    assert.ok(!f.schemas(active).includes('pet_list_photos'));
    assert.equal((await f.tool(active,'list_photos',{})).total,0);
    await assert.rejects(f.tool(active,'pet_list_photos',{}),takenOver?/工具在当前入口不可用/:/自主生活仅使用当前生活能力/);
  }
  await f.end(active);
  await f.life.control('world',false);
  const paused=await f.begin(home.id);
  assert.ok(f.schemas(paused).includes('pet_list_photos'));
  assert.ok(!f.schemas(paused).includes('list_photos'));
  assert.equal((await f.tool(paused,'pet_list_photos',{})).total,0);
  await f.end(paused);
});

test('3C Life 卸载后 Core 用同一个受限句柄读取相册',async t=>{
  const f=await cordisFixture(t);
  const library=f.core.records.getLibrary(f.id);
  const album=library.photoTools;
  assert.ok(album,'记录库提供受限相册句柄');
  assert.strictEqual(album,f.core.records.getLibrary(f.id).photoTools);
  assert.deepEqual(Object.keys(album).sort(),['forget','keep','list']);
  album.keep({ref:{attachmentId:'fixture-image',mediaType:'image/png',bytes:3,width:1,height:1},
    data:Uint8Array.of(1,2,3)},'Synthetic album');
  await f.enable();
  const home=await eventually(()=>f.life.homeSessionId(),'Life 打开 home');
  await (await f.agent(home)).whenIdle();
  await f.unload('life');
  f.model=async call=>{
    assert.ok(call.schemas.includes('pet_list_photos'));
    assert.ok(!call.schemas.includes('list_photos'));
    assert.deepEqual(JSON.parse(await call.tool('pet_list_photos',{})).photos.map(photo=>photo.description),['Synthetic album']);
    return 'Album is still available';
  };
  await f.input('Open the same album.',home);
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
  const batch=()=>f.host.workspace.runtime.store.get('memory-batch',home.id);
  assert.equal(batch().lastAttempt,0);
  home.status='running';
  t.mock.timers.tick(1000);
  assert.deepEqual(calls,[]);
  assert.equal(batch().lastAttempt,0,'会话忙碌时没有启动压缩');
  home.status='idle';
  t.mock.timers.tick(1000);
  const firstAttempt=batch().lastAttempt;
  assert.equal(firstAttempt,Date.now(),'空闲后立即启动压缩');
  await until(()=>calls.length===1,'完成实际压缩调用');
  await until(()=>batch().turns===0,'压缩处理完待处理轮次');
  assert.deepEqual(calls,[home.id]);
  t.mock.timers.tick(1000);
  assert.deepEqual(calls,[home.id]);
  // 新的回顾通知不能绕过上次压缩后的最小间隔。
  await f.end(await f.begin(home.id));
  f.host.native.requestReviewCompaction(home.id);
  t.mock.timers.tick(1000);
  assert.deepEqual(calls,[home.id]);
  assert.equal(batch().turns,1);
  assert.equal(batch().lastAttempt,firstAttempt,'最小间隔内没有启动压缩');
  t.mock.timers.tick(5*60_000);
  const secondAttempt=batch().lastAttempt;
  assert.equal(secondAttempt,Date.now(),'最小间隔到期后启动压缩');
  await until(()=>calls.length===2,'最小间隔到期后处理待办');
  assert.deepEqual(calls,[home.id,home.id]);
  await until(()=>batch().turns===0,'第二次压缩处理完待处理轮次');

  // 一条普通轮次在间隔届满后仍低于轮数和闲置阈值，旧通知不能再消费。
  await f.end(await f.begin(home.id));
  t.mock.timers.tick(5*60_000);
  assert.equal(batch().lastAttempt,secondAttempt,'旧回顾通知没有再次启动压缩');
  assert.equal(batch().turns,1);
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
    f.host.native.requestReviewCompaction(other.agent.id);
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
    f.host.native.requestReviewCompaction(home.id);
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
