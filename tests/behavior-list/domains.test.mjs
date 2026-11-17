import test from 'node:test';
import assert from 'node:assert/strict';
import fs,{readFileSync,renameSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {syncBuiltinESMExports} from 'node:module';
import {fixture,until} from './fixture.mjs';
const meal='food:improved-meal',HOUR=3_600_000;

test('效果落盘后的钱包路径故障保留预留并在重启后只结算一次',async t=>{
  const f=await fixture(t,{life:false});await f.body.setAutonomy('world',true);
  await f.ownerAction({kind:'gift',itemId:meal,quantity:1},'gift');
  const before=(await f.body.snapshot('world')).needs.hunger;
  const homeFile=join(f.repo,'.chatpet/data/life/home.json'),database=join(f.repo,'.chatpet/data/economy/economy.sqlite');
  const originalRename=fs.renameSync;let moved=false;
  // 文件系统提交边界：只有食物效果写入实际 home.json 后才移走数据库。
  fs.renameSync=(from,to)=>{
    const result=originalRename(from,to);
    if(to===homeFile&&!moved){
      const home=JSON.parse(readFileSync(homeFile,'utf8'));
      if(Object.values(home.plannedExecutions??{}).some(row=>row.effectAppliedAt)){
        moved=true;originalRename(database,database+'.held');
      }
    }
    return result;
  };syncBuiltinESMExports();
  const restore=()=>{fs.renameSync=originalRename;syncBuiltinESMExports();if(moved&&existsSync(database+'.held'))originalRename(database+'.held',database);};
  t.after(restore);
  try {
    await f.body.startPlanned('world',{operationId:'consume-once',kind:'economy',activity:'Eat',economy:{type:'consume',itemId:meal,quantity:1}});
    assert.equal(moved,true,'故障必须发生在身体效果落盘之后');
    const saved=JSON.parse(readFileSync(homeFile,'utf8'));
    assert.ok(saved.needs.hunger<before);assert.ok(saved.plannedExecutions['consume-once'].effectAppliedAt);
    assert.equal(saved.plannedExecutions['consume-once'].settlementCompletedAt,undefined);
    await assert.rejects(f.economy.snapshot('world'),/missing|changed|current bound workspace/);
  }finally{restore();}
  const pending=await f.economy.snapshot('world');
  assert.equal(pending.pendingUses.length,1);assert.equal(pending.pendingUses[0].status,'reserved');
  assert.equal(pending.inventory.find(row=>row.itemId===meal).quantity,1);
  assert.equal(pending.ledger.filter(row=>row.kind==='use-consume').length,0);
  const effect=JSON.parse(readFileSync(homeFile,'utf8')).needs.hunger;
  await f.restart();await f.body.setAutonomy('world',true);
  await f.body.startPlanned('world',{operationId:'consume-once',kind:'economy',activity:'Eat',economy:{type:'consume',itemId:meal,quantity:1}});
  const recovered=await f.economy.snapshot('world');
  assert.equal((await f.body.inspectPlanned('world','consume-once')).status,'completed');
  assert.equal((await f.body.snapshot('world')).needs.hunger,effect);
  assert.equal(recovered.inventory.find(row=>row.itemId===meal).quantity,0);
  assert.equal(recovered.pendingUses.length,0);assert.equal(recovered.ledger.filter(row=>row.kind==='use-consume').length,1);
});

test('睡眠中库存投喂不耗物品并保留睡眠终态',async t=>{
  const f=await fixture(t,{life:false});await f.body.setAutonomy('world',true);
  await f.ownerAction({kind:'gift',itemId:meal,quantity:1},'gift');
  await f.body.act('world','sleep','sleep');t.mock.timers.tick(120_000);await f.body.snapshot('world');
  assert.equal(f.body.restState('world').sleeping,true);
  const before=(await f.body.snapshot('world')).needs;
  const response=await f.ownerAction({kind:'feed',itemId:meal},'sleeping-feed');
  assert.equal(response.execution.status,'failed');assert.match(response.execution.reason,/先叫醒/);
  assert.deepEqual((await f.body.snapshot('world')).needs,before);assert.equal(f.body.restState('world').sleeping,true);
  await f.restart();const repeated=await f.ownerAction({kind:'feed',itemId:meal},'sleeping-feed');
  assert.deepEqual(repeated.execution,response.execution);assert.equal(f.body.restState('world').sleeping,true);
  assert.equal(repeated.inventory.find(row=>row.itemId===meal).quantity,1);assert.equal(repeated.pendingUses.length,0);
  assert.equal(repeated.ledger.filter(row=>row.kind==='use-consume').length,0);
});

test('停机后的身体消耗只使用一次配置额度',async t=>{
  const f=await fixture(t,{life:false,economy:false});await f.body.setAutonomy('world',true);
  const before=(await f.body.snapshot('world')).needs;
  // 卸载组件保留运行时钟的意图，72 小时后恢复只扣默认 4 小时额度。
  await f.body.close();t.mock.timers.tick(72*HOUR);await f.restart();
  await f.body.setAutonomy('world',true,true);const after=(await f.body.snapshot('world')).needs;
  assert.ok(Math.abs(after.thirst-Math.min(.7,before.thirst+.085*4))<1e-9);
  assert.ok(after.hunger<=Math.max(.7,before.hunger));assert.ok(after.energy>=.35);
  await f.restart();await f.body.setAutonomy('world',true,true);
  assert.deepEqual((await f.body.snapshot('world')).needs,after);
});

test('阅读必须取得真实文字并以原片段回执跨重启确认',async t=>{
  const f=await fixture(t);await f.enable();
  const text='A real synthetic book passage. '.repeat(80);
  const imported=await f.ownerAction({kind:'importReading',title:'Synthetic book',content:text,source:{name:'fixture.txt'}},'import-book');
  const itemId=imported.catalog.find(row=>row.name==='Synthetic book').id;
  await f.ownerAction({kind:'gift',itemId,quantity:1},'gift-book');
  const plan=await f.life.readPlan('world');
  await f.life.updatePlan('world',plan.revision,{goal:'Read',reason:'Actual text',steps:[{id:'read',kind:'read',activity:'Read',reading:{itemId,segment:0}}],nextConsiderAt:null});
  await until(async()=>!!(await f.life.readPlan('world')).plan?.operationId);
  let current=await f.life.readPlan('world');const operation=current.plan.operationId;
  assert.equal((await f.economy.snapshot('world')).bookmarks.length,0);
  const offer=await f.life.readPlannedSegment('world',current.revision,operation);
  assert.equal(offer.text,text.slice(0,1200));assert.equal((await f.economy.snapshot('world')).bookmarks.length,0);
  await f.restart();await until(()=>f.life.running());current=await f.life.readPlan('world');
  const reopened=await f.life.readPlannedSegment('world',current.revision,operation);assert.deepEqual(reopened,offer);
  await assert.rejects(f.life.confirmPlannedReading('world',current.revision,operation,'wrong-token'),/match/);
  await f.life.confirmPlannedReading('world',current.revision,operation,offer.receiptToken);
  const bookmarks=(await f.economy.snapshot('world')).bookmarks;
  assert.equal(bookmarks.length,1);assert.equal(bookmarks[0].offset,offer.endOffset);assert.equal(bookmarks[0].version,offer.version);
});

test('钱包缺库时公开服务拒绝创建空白替代',async t=>{
  const f=await fixture(t,{life:false});await f.ownerAction({kind:'grant',amount:30},'grant');
  f.economy.close();const file=join(f.repo,'.chatpet/data/economy/economy.sqlite');renameSync(file,file+'.held');
  await f.restart();await assert.rejects(f.economy.snapshot('world'),/missing|recover|restore|current bound workspace/i);
  assert.equal(existsSync(file),false,'不能用空白钱包代替丢失的权威库');
});
