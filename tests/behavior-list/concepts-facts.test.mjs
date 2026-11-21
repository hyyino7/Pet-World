import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {fixture, until} from './fixture.mjs';
import {interactionFacts} from './native-facts.mjs';

test('钱包五类事实及库存餐食事实随原请求只写一次', async t => {
  const f = await fixture(t, {life:false});
  const meal = 'food:improved-meal';
  const actions = [
    ['money-grant',{kind:'grant',amount:100}],
    ['purchase',{kind:'buy',itemId:meal,quantity:2}],
    ['item-gift',{kind:'gift',itemId:'harvest:radish'}],
    ['sale',{kind:'sell',itemId:'harvest:radish'}],
    ['reading-import',{kind:'importReading',title:'合成读物',content:'合成正文',source:{name:'fixture.txt'}}],
  ];
  for (const [type, action] of actions) {
    await f.ownerAction(action, type);
    const [fact] = (await f.economy.pendingFacts('world')).filter(row => row.requestId === type);
    assert.equal(fact.type, type);
    assert.equal(fact.domain, 'economy');
    assert.equal(fact.result.status, 'completed');
    if (type === 'sale') await f.restart();
    const before = await f.economy.snapshot('world');
    assert.deepEqual(await f.ownerAction(action, type), before);
    assert.deepEqual(await f.economy.snapshot('world'), before);
    assert.deepEqual(await f.economy.readFacts('world', [fact.id]), [fact]);
    assert.deepEqual((await f.economy.pendingFacts('world')).filter(row => row.requestId === type), [fact]);
  }
  assert.deepEqual((await f.economy.pendingFacts('world')).map(fact => fact.type), actions.map(([type]) => type));
  const feed = {kind:'feed',itemId:meal};
  const {execution} = await f.ownerAction(feed, 'inventory-feed');
  assert.equal(execution.status, 'completed');
  const [mealFact] = await f.body.pendingFacts('world');
  assert.equal(mealFact.type, 'feed');
  assert.equal(mealFact.operationId, execution.operationId);
  assert.equal(mealFact.result.status, 'completed');
  assert.deepEqual((await f.ownerAction(feed, 'inventory-feed')).execution, execution);
  assert.deepEqual(await f.body.pendingFacts('world'), [mealFact]);
  await f.body.setAutonomy('world', true);
  t.mock.timers.tick(13_000);
  await f.body.snapshot('world');
  await f.body.act('world', 'sleep', 'go-to-sleep');
  t.mock.timers.tick(120_000);
  assert.equal((await f.body.snapshot('world')).home.her.asleep, true);
  const asleep = await f.ownerAction(feed, 'sleeping-feed');
  assert.equal(asleep.execution.status, 'failed');
  const declined = (await f.body.pendingFacts('world')).find(fact => fact.requestId === 'sleeping-feed');
  assert.equal(declined.type, 'feed');
  assert.equal(declined.result.status, 'unchanged');
  assert.deepEqual((await f.ownerAction(feed, 'sleeping-feed')).execution, asleep.execution);
  assert.deepEqual((await f.body.pendingFacts('world')).filter(fact => fact.requestId === 'sleeping-feed'), [declined]);
  assert.deepEqual(await f.body.readFacts('world', [mealFact.id,declined.id]), [mealFact,declined]);
});

test('新旧事实经 Core、World、原生提示词和 Life 引用读出', async t => {
  const f = await fixture(t);
  const {fact:body} = await f.body.act('world', 'water', 'new-body');
  await f.ownerAction({kind:'grant',amount:40}, 'new-economy');
  const [economy] = await f.economy.pendingFacts('world');
  const legacy = {...economy,id:'economy:synthetic-legacy',requestId:'synthetic-legacy',
    operationId:'synthetic-legacy',type:'retired-wallet-notice',result:{status:'completed',summary:'合成旧版钱包通知'}};
  await f.restart(() => {
    const db = new DatabaseSync(join(f.repo,'.chatpet/data/economy/economy.sqlite'));
    try {
      db.prepare('INSERT INTO interaction_facts(id,request_id,value) VALUES(?,?,?)')
        .run(legacy.id,legacy.requestId,JSON.stringify(legacy));
    } finally {
      db.close();
    }
  });
  const facts = [body,economy,legacy], ids = facts.map(fact => fact.id);
  const world = f.body.worldFacts;
  assert.deepEqual(await world.readFacts('world', ids), facts);
  await assert.rejects(world.readFacts('world', ['unknown:synthetic']), {
    detail:{code:'INVALID_ARGUMENT',message:'未知互动事实所属区',effect:'none',retry:'never'},
  });
  const active = await f.begin();
  const native = f.host.native;
  const evidence = native.observeFacts('home', facts);
  assert.equal(new Set(evidence).size, facts.length);
  assert.deepEqual(native.observeFacts('home', facts), evidence);
  for (const invalid of [{...legacy,domain:'unknown'}, {...legacy,result:{status:'completed'}}]) {
    assert.throws(() => native.observeFacts('home', [invalid]), {message:'Invalid admitted interaction fact'});
  }
  const {type: _type, ...withoutType} = legacy;
  assert.deepEqual(native.observeFacts('home', [withoutType]), [evidence.at(-1)]);
  const projection = ({id,domain,type,occurredAt,actor,result,operationId}) =>
    ({id,domain,type,at:occurredAt,actor,status:result.status,summary:result.summary,...(operationId ? {operationId} : {})});
  assert.deepEqual(interactionFacts(active.agent.session.snapshotEvents()), facts.map(projection));
  f.flushAllowed = false;
  await f.end(active);
  assert.deepEqual((await world.pendingFacts('world')).map(fact => fact.id).sort(), [...ids].sort());
  f.flushAllowed = true;
  await f.end(await f.begin());
  const log = JSON.parse(readFileSync(f.logFile('home'),'utf8'));
  assert.deepEqual(interactionFacts(log).slice(-facts.length), facts.map(projection));
  await until(async () => !(await world.pendingFacts('world')).length);
  assert.deepEqual(await world.readFacts('world', ids), facts);

  // 另一个原生消费者已确认事实时，Life 仍要恢复停机前已经准备好的引用。
  const lifeStatePath = join(f.repo,'.chatpet/data/life/life.json');
  await f.restart(() => {
    const state = existsSync(lifeStatePath) ? JSON.parse(readFileSync(lifeStatePath,'utf8')) : {version:1};
    state.factBatch = {at:new Date().toISOString(),messageId:'legacy-delivery',
      refs:facts.map(({domain,id}) => ({domain,id}))};
    writeFileSync(lifeStatePath,JSON.stringify(state));
  });
  await f.enable();
  await until(() => f.sent.some(row => row.id === 'legacy-delivery'), 'Life 重读已确认事实', 1000);
  const delivery = f.sent.find(row => row.id === 'legacy-delivery');
  assert.deepEqual(delivery.source.facts, facts);
  const sessionId = f.home()?.sessionId ?? 'home';
  await f.end(await f.begin(sessionId, delivery));
  await until(() => {
    const {lastFactAdmission,factAcknowledgement} = JSON.parse(readFileSync(lifeStatePath,'utf8'));
    return lastFactAdmission?.messageId === delivery.id && lastFactAdmission.sessionId === sessionId
      && !factAcknowledgement;
  }, 'Life 完成原事实送达确认', 1000);
  const lifeLog = JSON.parse(readFileSync(f.logFile(sessionId),'utf8'));
  const admitted = lifeLog.find(event => event.type === 'user/message' && event.data.id === delivery.id);
  assert.deepEqual(admitted?.data.source, delivery.source);
});

test('Python 只把匹配领域、前缀及来源的记录识别为事实', () => {
  const python = fileURLToPath(new URL('../../.venv/bin/python', import.meta.url));
  const script = fileURLToPath(new URL('./concepts-facts-python.py', import.meta.url));
  execFileSync(python, ['-B',script], {stdio:'pipe',timeout:10_000});
});
