import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';

const meal = 'food:improved-meal';
const draft = steps => ({goal:'合成计划',reason:'验证现有入口',steps,nextConsiderAt:null});
const step = (kind, fields = {}, id = kind) => ({id,kind,activity:'合成活动',...fields});

async function submit(f, active, steps) {
  const {revision} = await f.life.readPlan('world');
  return f.tool(active, 'life_plan_update', {expectedRevision:revision,plan:draft(steps)});
}

async function execute(f, {id, durationMinutes, ...input}) {
  const until = durationMinutes === undefined ? {} : {until:new Date(Date.now()+durationMinutes*60_000).toISOString()};
  return f.body.startPlanned('world', {operationId:id,...input,...until});
}

test('计划工具、Life 和 Body 固定计划种类、动作和报错顺序', async t => {
  const f = await fixture(t, {policy:true});
  const imported = await f.ownerAction({kind:'importReading',title:'合成书',content:'合成段落',source:{name:'fixture'}},'import');
  const book = imported.catalog.find(item => item.name === '合成书').id;
  await f.ownerAction({kind:'gift',itemId:book}, 'gift-book');
  await f.ownerAction({kind:'grant',amount:100}, 'fund');
  const bodies = ['sleep','wake','water','feed','play'];
  const steps = [
    step('hold',{durationMinutes:1}), step('room',{room:'living',spot:'sofa',durationMinutes:1}),
    step('move',{room:'living',spot:'sofa'}), ...bodies.map(action => step('body',{action},action)),
    step('garden',{garden:{type:'visit'}}), step('economy',{economy:{type:'buy',itemId:meal,quantity:1}}),
    step('read',{reading:{itemId:book,segment:0}}),
  ];
  const active = await f.begin();
  const variants = f.toolSchema(active,'life_plan_update').parameters.properties.plan.properties.steps.items.oneOf;
  assert.deepEqual(variants.map(row => row.properties.kind.const), ['hold','room','move','body','garden','economy','read']);
  assert.deepEqual(variants.find(row => row.properties.kind.const === 'body').properties.action.enum, bodies);
  assert.deepEqual((await submit(f,active,steps)).plan.steps, steps);
  const invalidBranch = 'invalid arguments: "plan.steps[0]" must match exactly one oneOf branch (matched 0)';
  for (const invalid of [step('unknown'),step('body',{action:'pet'})]) {
    await assert.rejects(submit(f,active,[invalid]), {code:'INVALID_ARGS',message:invalidBranch});
  }
  await assert.rejects(f.tool(active,'life_plan_update',{expectedRevision:'bad',plan:draft([step('unknown')])}), {
    code:'INVALID_ARGS',message:'invalid arguments: "expectedRevision" must be an integer; "plan.steps[0]" must match exactly one oneOf branch (matched 0)',
  });
  const {revision} = await f.life.readPlan('world');
  for (const [input,message] of [
    [{id:0,activity:0,kind:'unknown'},'Invalid step id'],
    [{id:'a',activity:0,kind:'unknown'},'Invalid activity'],
    [step('unknown'),'Unsupported activity kind'],
    [step('room',{room:'',spot:''}),'Invalid room'],
    [step('room',{room:'living',spot:''}),'Invalid spot'],
    [step('body',{action:'pet',until:'bad'}),'Unsupported bodily activity'],
    [step('body',{action:'feed',until:'bad'}),'Executable activities finish on actual receipts; use a following hold or room step for sustained animation'],
  ]) {
    assert.throws(() => f.life.updatePlan('world',revision,draft([input])), {message});
  }
  await f.end(active);

  for (const [input,message] of [
    [{kind:'unknown',operationId:'',activity:0},'未知的计划活动'],
    [{kind:'body',operationId:'',activity:0,action:'pet'},'计划执行编号无效'],
    [{kind:'body',operationId:'a',activity:0,action:'pet'},'计划活动描述须为1到80字'],
    [{kind:'body',operationId:'a',activity:'合成活动',until:'bad',action:'pet'},'计划结束时间无效'],
    [{kind:'body',operationId:'a',activity:'合成活动',freezeOnPause:0,action:'pet'},'计划暂停计时方式无效'],
    [{kind:'body',operationId:'a',activity:'合成活动',until:new Date().toISOString(),action:'pet'},'身体计划须指定已有的身体动作'],
    [{kind:'body',operationId:'a',activity:'合成活动',until:new Date().toISOString(),action:'feed'},'执行活动依据真实回执结束，持续动画请另加原地或房间活动'],
  ]) {
    await assert.rejects(f.body.startPlanned('world',input), {message});
  }
  for (const input of steps) {
    const receipt = await execute(f,input);
    assert.equal(receipt.operationId,input.id);
    assert.equal(receipt.kind,input.kind);
    assert.ok(['running','completed'].includes(receipt.status), JSON.stringify(receipt));
    if (receipt.status === 'running') await f.body.cancelPlanned('world',receipt.operationId);
    t.mock.timers.tick(180_000);
    await f.body.snapshot('world');
  }
});

test('菜园九种与经济三种计划操作通过工具并按执行回执完成', async t => {
  const f = await fixture(t, {policy:true,seedGarden(garden) {
    Object.assign(garden.plots[1], {tilled:true,cropId:'radish',progress:1,moisture:.8,plantedAt:Date.now()-43_200_000});
  }});
  await f.ownerAction({kind:'grant',amount:100}, 'fund');
  await f.ownerAction({kind:'gift',itemId:'harvest:radish'}, 'gift-harvest');
  const garden = [
    {type:'visit'},{type:'buySeed',cropId:'radish'},{type:'buyCompost'},{type:'till',plotId:0},
    {type:'plant',plotId:0,cropId:'radish'},{type:'water',plotId:0},{type:'fertilize',plotId:0},
    {type:'harvest',plotId:1},{type:'sell',cropId:'radish'},
  ];
  const economy = [{type:'buy',itemId:meal},{type:'sell',itemId:'harvest:radish'},{type:'consume',itemId:meal}]
    .map(operation => ({...operation,quantity:1}));
  const steps = [...garden.map(garden => step('garden',{garden},'garden-'+garden.type)),
    ...economy.map(economy => step('economy',{economy},'economy-'+economy.type))];
  const active = await f.begin();
  assert.deepEqual((await submit(f,active,steps)).plan.steps,steps);
  const {revision} = await f.life.readPlan('world');
  for (const type of ['careNow','auto']) {
    const input = step('garden',{garden:{type}});
    await assert.rejects(submit(f,active,[input]), {code:'INVALID_ARGS',message:'invalid arguments: "plan.steps[0]" must match exactly one oneOf branch (matched 0)'});
    assert.throws(() => f.life.updatePlan('world',revision,draft([input])), {message:'Unsupported garden operation'});
    await assert.rejects(execute(f,input), {message:'菜园计划须指定一项明确操作'});
  }
  const invalid = step('economy',{economy:{type:'consume',itemId:meal,quantity:2}});
  const consumeError = {message:'A food activity consumes one item per durable body effect'};
  await assert.rejects(submit(f,active,[invalid]),consumeError);
  assert.throws(() => f.life.updatePlan('world',revision,draft([invalid])),consumeError);
  await assert.rejects(execute(f,invalid), {message:'经济计划须给出有效目录物品、明确操作及整数数量；每次食用一份'});
  for (const [operation,message] of [
    [{type:'invalid',itemId:'',quantity:0},'Unsupported economy activity'],
    [{type:'consume',itemId:'',quantity:0},'Invalid catalog item'],
    [{type:'consume',itemId:meal,quantity:0},'Quantity must be a positive integer'],
  ]) {
    assert.throws(() => f.life.updatePlan('world',revision,draft([step('economy',{economy:operation})])),{message});
  }
  await f.end(active);
  for (const input of steps) {
    let receipt = await execute(f,input);
    for (let i=0; i<5 && receipt.status === 'running'; i++) {
      t.mock.timers.tick(60_000);
      receipt = await f.body.inspectPlanned('world',receipt.operationId);
    }
    assert.equal(receipt.status,'completed',JSON.stringify(receipt));
    assert.equal(receipt.phase,'completed');
  }
});
