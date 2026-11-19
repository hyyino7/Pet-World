import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import test from 'node:test';
import {Context} from '@deepseek-ai/cordis';
import {createAssistantMessage} from '@deepseek-ai/dsh-llm';
import {renderContextSections} from '@deepseek-ai/dsh-system-prompt';
import {createLifeStore} from '#dsh-world/life/lifeStore';
import {cordisFixture, eventually, submitPlan} from '../behavior-list/entries-lifecycle.test.mjs';

const zones = {body: 'body', life: 'plan', economy: 'economy'};
const services = {body: 'petBehavior', life: 'petLife', economy: 'petEconomy'};
const orders = [
  ['body', 'life', 'economy'], ['body', 'economy', 'life'],
  ['life', 'body', 'economy'], ['life', 'economy', 'body'],
  ['economy', 'body', 'life'], ['economy', 'life', 'body'],
];

const readArea = {
  body: (body, id) => body.snapshot(id),
  life: (life, id) => life.readPlan(id),
  economy: (economy, id) => economy.snapshot(id),
};

test('3C 事实准备期间 Economy 重挂会作废两段，下一轮仍能读到并确认', async t => {
  const f = await cordisFixture(t);
  const agent = await f.agent();
  await f.body.act(f.id, 'water', 'prepare-body');
  await f.ownerAction({kind:'grant',amount:10}, 'prepare-economy');
  const old = f.economy, pending = old.pendingFacts.bind(old);
  const native = f.core.native, observe = native.observeFacts.bind(native);
  const observations = [];
  t.mock.method(native,'observeFacts',(id, facts, ...args) => {
    if (id === agent.id) observations.push(facts.map(fact=>fact.requestId));
    return observe(id, facts, ...args);
  });
  const entered = Promise.withResolvers(), release = Promise.withResolvers();
  t.mock.method(old, 'pendingFacts', async id => {
    const facts = await pending(id);
    entered.resolve();
    await release.promise;
    return facts;
  });
  const assembling = f.ctx.systemPrompt.assemble({agent,scope:agent});
  let fresh;
  try {
    await entered.promise;
    await f.unload('economy');
    await f.load('economy');
    await f.ownerAction({kind:'grant',amount:1}, 'prepare-new-economy');
    fresh = (await f.economy.pendingFacts(f.id)).find(fact=>fact.requestId==='prepare-new-economy');
  } finally { release.resolve(); }
  assert.ok(fresh);
  const sections = renderContextSections(await assembling);
  assert.ok(observations.every(ids=>!ids.includes('prepare-economy') || ids.includes(fresh.requestId)),
    'Native evidence must never observe the retired Economy preparation');
  const interactions = sections.find(row=>row.name==='chatpet.interactions');
  // Other prompt providers may ask DSH to reassemble. That pass must use the new lease.
  if (sections.some(row=>row.name==='chatpet.environment')) assert.ok(interactions?.text.includes(fresh.id));
  else assert.equal(interactions,undefined);
  assert.equal((await f.body.pendingFacts(f.id)).length, 1);
  assert.equal((await f.economy.pendingFacts(f.id)).length, 2);
  const next = await f.input('Inspect them again.');
  const facts = JSON.parse(next.sections.find(row=>row.name==='chatpet.interactions').text).facts;
  assert.deepEqual(facts.map(fact=>fact.domain), ['body','economy','economy']);
  await eventually(async()=>!(await f.body.pendingFacts(f.id)).length && !(await f.economy.pendingFacts(f.id)).length,'新轮次确认两区事实');
});

test('3C 原生日志落盘期间 Plan 重挂会保留事实，下一轮可确认', async t => {
  const f = await cordisFixture(t);
  const agent = await f.agent();
  await f.body.act(f.id, 'water', 'flush-body');
  const [fact] = await f.body.pendingFacts(f.id);
  const entered = Promise.withResolvers(), release = Promise.withResolvers();
  const sessions = f.ctx.sessions, flush = sessions.flush.bind(sessions);
  const probe = t.mock.method(sessions, 'flush', async session => {
    if (session === agent.session) { entered.resolve(); await release.promise; }
    return flush(session);
  });
  const input = f.input('Inspect this result.');
  try {
    await entered.promise;
    await f.unload('life');
    await f.load('life');
  } finally { release.resolve(); }
  await input;
  probe.mock.restore();
  assert.deepEqual(await f.body.pendingFacts(f.id), [fact]);
  const next = await f.input('Inspect it again.');
  assert.ok(next.sections.find(row=>row.name==='chatpet.interactions')?.text.includes(fact.id));
  await eventually(async()=>!(await f.body.pendingFacts(f.id)).length,'新轮次确认身体事实');
});

function ownedHooks(ctx, fiber) {
  return Object.values(ctx.events._hooks).flat().filter(hook => {
    for (let owner = hook.ctx.fiber; owner !== ctx.fiber; owner = owner.parent.fiber) {
      if (owner === fiber) return true;
    }
    return false;
  });
}

function livingTimers(t) {
  const set = globalThis.setTimeout, clear = globalThis.clearTimeout;
  const pending = {body: new Set(), tick: new Set(), upstream: new Set(), alarm: new Set()};
  const created = {body: 0, tick: 0, upstream: 0};
  t.mock.method(globalThis, 'setTimeout', (callback, ms, ...args) => {
    const stack = Error().stack;
    const area = stack.includes('CompanionBehavior.arm') ? 'body'
      : stack.includes('CompanionLife.scheduleTick') ? 'tick'
      : stack.includes('/life/alarmTimer.js') ? 'upstream' : undefined;
    if (!area) return set(callback, ms, ...args);
    const handle = set((...values) => {
      pending[area].delete(handle);
      pending.alarm.delete(handle);
      callback(...values);
    }, ms, ...args);
    pending[area].add(handle);
    created[area]++;
    if (area === 'upstream' && /\barm \([^\n]+\/alarmTimer\.js:/u.test(stack)) pending.alarm.add(handle);
    return handle;
  });
  t.mock.method(globalThis, 'clearTimeout', handle => {
    for (const handles of Object.values(pending)) handles.delete(handle);
    clear(handle);
  });
  return {pending, created};
}

for (const order of orders) {
  for (const first of Object.keys(zones)) {
    test(`R6 ${order.join(' → ')}，先卸载 ${first} 再重挂`, async t => {
      const {LivingWorld} = await import('../../dist/src/living/index.js');
      const f = await cordisFixture(t, {order});
      const world = LivingWorld.find(f.ctx, f.core);
      assert.ok(world);
      const slots = Object.fromEntries(order.map(key => [key, world.lookup(zones[key])]));
      for (const key of order) assert.equal(slots[key].value, f.ctx.get(services[key]));

      const fiber = f.fiber(first);
      assert.ok(ownedHooks(f.ctx, fiber).length > 0);
      await f.unload(first);
      assert.equal(f.ctx.get(services[first]), undefined);
      assert.equal(world.lookup(zones[first]), undefined);
      assert.equal(slots[first].lease.isCurrent(), false);
      assert.equal(ownedHooks(f.ctx, fiber).length, 0);
      for (const key of order.filter(key => key !== first)) {
        const value = f.ctx.get(services[key]);
        assert.equal(value, slots[key].value);
        assert.equal(world.lookup(zones[key]).lease, slots[key].lease);
        await readArea[key](value, f.id);
      }

      await f.load(first);
      const next = world.lookup(zones[first]);
      assert.equal(LivingWorld.find(f.ctx, f.core), world);
      assert.equal(next.value, f.ctx.get(services[first]));
      assert.notEqual(next.value, slots[first].value);
      assert.notEqual(next.lease.generation, slots[first].lease.generation);
      await fiber.dispose();
      assert.equal(world.lookup(zones[first]).lease, next.lease);
      for (const key of [...order].reverse()) await f.unload(key);
      assert.equal(LivingWorld.find(f.ctx, f.core), undefined);
      for (const zone of Object.values(zones)) assert.equal(world.lookup(zone), undefined);
      assert.equal(existsSync(join(f.repo, '.chatpet/data/economy/economy.lock')), false);
    });
  }
}

test('R6 只隔离目标服务自己的标签，同标签能重新找到原区', async t => {
  const {LivingWorld} = await import('../../dist/src/living/index.js');
  const f = await cordisFixture(t);
  const original = LivingWorld.find(f.ctx, f.core);
  const old = original.lookup('plan');
  assert.throws(() => original.register('plan', old.value, f.fiber('life')), /Duplicate registration/);
  await f.unload('life');
  const label = Symbol('isolated Life');
  const isolated = f.ctx.isolate('petLife', label);
  await f.load('life', isolated);
  const world = LivingWorld.find(isolated, f.core);
  const plan = isolated.get('petLife');
  assert.notEqual(world, original);
  assert.ok(plan);
  assert.equal(original.lookup('plan'), undefined);
  assert.equal(world.lookup('plan').value, plan);
  assert.equal(world.lookup('body').lease, original.lookup('body').lease);
  assert.equal(world.lookup('economy').lease, original.lookup('economy').lease);
  assert.equal(LivingWorld.find(f.ctx.isolate('petLife', label), f.core), world);
  assert.equal(LivingWorld.find(new Context(), f.core), undefined);
  const otherScope = f.ctx.isolate('petCore');
  const other = {...f.core};
  const host = await otherScope.plugin({apply: ctx => ctx.provide('petCore', other)});
  try { assert.equal(LivingWorld.find(otherScope, other), undefined); }
  finally { await host.dispose(); }

  await f.unload('life');
  await f.load('life');
  assert.equal(LivingWorld.find(isolated, f.core), undefined);
  assert.equal(original.lookup('plan').value, f.life);
  assert.notEqual(original.lookup('plan').lease.generation, old.lease.generation);
});

test('R6 旧 Plan 观察恢复后不得写盘或在新代之前发布', async t => {
  const f = await cordisFixture(t);
  await f.body.snapshot(f.id);
  await f.body.setAutonomy(f.id, true);
  const changes = [];
  const stop = f.ctx.on('pet/behavior.changed', change => changes.push(change));
  const release = [Promise.withResolvers(), Promise.withResolvers()];
  let reads = 0;
  const emotion = await f.ctx.plugin({apply(ctx) {
    ctx.provide('petEmotion', {roomSnapshot() {}, async read() {
      const index = reads++;
      await release[index]?.promise;
    }});
  }});
  try {
    const home = join(f.directory, 'home.json');
    const saved = readFileSync(home, 'utf8');
    t.mock.timers.tick(60_000);
    f.ctx.emit('pet/life.changed');
    await eventually(() => reads === 1, '旧 Plan 的观察已到达情绪读取');
    await f.unload('life');
    await f.load('life');
    const newClock = t.mock.method(f.life, 'bodyClockState');
    release[0].resolve();
    await eventually(() => reads === 2, '新 Plan 的观察已到达情绪读取');
    assert.equal(newClock.mock.callCount(), 1, '只有新观察可读取新 Plan 的时钟');
    assert.equal(readFileSync(home, 'utf8'), saved, '旧 Plan 的观察写了身体检查点');
    assert.deepEqual(changes, [], '旧 Plan 的观察发布了身体变化');
  } finally {
    for (const gate of release) gate.resolve();
    await f.body.snapshot(f.id);
    stop();
    await emotion.dispose();
  }
});

test('R6 卸载停掉实际身体计时、计划 tick、上游闹钟和各自订阅', async t => {
  const {pending, created} = livingTimers(t);
  const f = await cordisFixture(t);
  const fibers = {body: f.fiber('body'), life: f.fiber('life'), economy: f.fiber('economy')};
  await f.enable('23:30');
  await f.body.act(f.id, 'water', 'r6-timed-care');
  await eventually(() => pending.body.size && pending.alarm.size, '物理和上游闹钟已调度');
  assert.ok(ownedHooks(f.ctx, fibers.life).length > 0);
  assert.ok(ownedHooks(f.ctx, fibers.body).length > 0);
  await f.unload('body');
  assert.equal(pending.body.size, 0);
  assert.equal(ownedHooks(f.ctx, fibers.body).length, 0);
  assert.ok(ownedHooks(f.ctx, fibers.life).length > 0);
  assert.ok(ownedHooks(f.ctx, fibers.economy).length > 0);
  f.ctx.emit('pet/life.changed');
  assert.ok(pending.tick.size > 0);
  await f.unload('life');
  assert.equal(pending.tick.size, 0);
  assert.equal(pending.upstream.size, 0);
  assert.equal(ownedHooks(f.ctx, fibers.life).length, 0);
  assert.ok(ownedHooks(f.ctx, fibers.economy).length > 0);
  await f.unload('economy');
  assert.equal(ownedHooks(f.ctx, fibers.economy).length, 0);

  const before = {...created};
  f.ctx.emit('pet/core.changed');
  f.ctx.emit('pet/emotion.changed', f.id);
  f.ctx.emit('pet/life.changed');
  f.ctx.emit('pet/behavior.changed', {workspaceId: f.id, reason: 'transition'});
  f.ctx.emit('pet/economy.fact', f.id);
  t.mock.timers.tick(3_600_000);
  await delay(10);
  assert.deepEqual(created, before);
  assert.ok(Object.values(pending).every(handles => handles.size === 0));
});

test('R6 Economy 卸载取消路径解析，并等守卫收尾后关库释锁', async t => {
  const release = Promise.withResolvers();
  let resolving, inFlight = 0, dispatched = 0, disposed = false;
  const f = await cordisFixture(t, {io: {async resolve(path, {signal}) {
    resolving = signal;
    inFlight++;
    try { await release.promise; signal.throwIfAborted(); return path; }
    finally { inFlight--; }
  }}});
  const lock = join(f.repo, '.chatpet/data/economy/economy.lock');
  const committed = await f.ownerAction({kind: 'grant', amount: 13}, 'r6-retained-grant');
  assert.ok(existsSync(lock));
  const exec = {name: 'write', token: Symbol('r6-file'), arguments: {file_path: join(f.repo, 'safe.md')},
    signal: new AbortController().signal};
  const operation = f.ctx.waterfall('tools/pre-execute', exec, async () => {dispatched++; return {kind: 'allow'};});
  const outcome = Promise.allSettled([operation]);
  let unloading;
  try {
    await eventually(() => resolving, 'Economy 原生解析已进入');
    unloading = f.unload('economy').then(() => {disposed = true;});
    await eventually(() => resolving.aborted || disposed, '解析取消或入口已退场');
    assert.equal(resolving.aborted, true);
    assert.equal(exec.signal.aborted, false);
    assert.equal(disposed, false);
    assert.equal(inFlight, 1);
    assert.ok(existsSync(lock));
  } finally {
    release.resolve();
    await outcome;
    await unloading;
  }
  assert.equal(dispatched, 0);
  assert.equal(inFlight, 0);
  assert.equal(existsSync(lock), false);
  await f.load('economy');
  assert.equal((await f.economy.snapshot(f.id)).balance, committed.balance);
});

test('R6 Economy 卸载等待跨区设置请求，旧请求不能写配置', async t => {
  const f = await cordisFixture(t);
  await f.body.snapshot(f.id);
  const before = await f.economy.snapshot(f.id);
  const release = Promise.withResolvers();
  let reads = 0, disposed = false;
  const emotion = await f.ctx.plugin({apply(ctx) {
    ctx.provide('petEmotion', {roomSnapshot() {}, async read() {
      if (++reads === 1) await release.promise;
    }});
  }});
  const lock = join(f.repo, '.chatpet/data/economy/economy.lock');
  const signal = new AbortController().signal;
  const operation = f.economy.settings(f.id, before.configurationVersion, {articlePrice: 23}, 'r6-stale-settings', signal);
  const outcome = Promise.allSettled([operation]);
  let unloading;
  try {
    await eventually(() => reads === 1, '设置的 Body 检查点已进入情绪读取');
    unloading = f.unload('economy').then(() => {disposed = true;});
    await eventually(() => !f.economy, 'Economy 门面已撤下');
    await delay(10);
    assert.equal(disposed, false);
    assert.ok(existsSync(lock));
  } finally {
    release.resolve();
    await outcome;
    await unloading;
    await f.body.snapshot(f.id);
    await emotion.dispose();
  }
  await assert.rejects(operation, /Economy is stopped/);
  assert.equal(existsSync(lock), false);
  await f.load('economy');
  assert.equal((await f.economy.snapshot(f.id)).configurationVersion, before.configurationVersion);
});

test('R6 Economy 挂载中途失败会撤登记并关库，之后可同名重挂', async t => {
  const {LivingWorld} = await import('../../dist/src/living/index.js');
  const f = await cordisFixture(t, {order: ['body', 'life']});
  const world = LivingWorld.find(f.ctx, f.core);
  const body = f.body, life = f.life;
  const removeConflictingInitializer = f.core.workspace.registerInitializer('economy', () => {});
  const lock = join(f.repo, '.chatpet/data/economy/economy.lock');
  try {
    await assert.rejects(f.load('economy'), /Workspace initializer already registered/);
    assert.equal(f.economy, undefined);
    assert.equal(world.lookup('economy'), undefined);
    assert.equal(existsSync(lock), false);
    assert.equal(f.body, body);
    assert.equal(f.life, life);
  } finally { removeConflictingInitializer(); }
  await f.load('economy');
  assert.equal(world.lookup('economy').value, f.economy);
  assert.ok(existsSync(lock));
});

test('R6 Life 卸载等待原生持久日志的无信号读取关闭 reader', async t => {
  const original = 'prior-home', release = Promise.withResolvers();
  let readers = 0, inFlight = 0, disposed = false;
  const f = await cordisFixture(t, {io: {
    open(id) { if (id === original) readers++; },
    close(id) { if (id === original) readers--; },
    async read(id, read) {
      if (id !== original) return read();
      inFlight++;
      try { await release.promise; return read(); }
      finally { inFlight--; }
    },
  }});
  await f.bound.attachSession(original);
  await f.body.act(f.id, 'water', 'r6-original-receipt');
  const fact = (await f.body.pendingFacts(f.id)).at(-1);
  const source = {kind: 'dsh-world-life', facts: [fact]}, messageId = 'r6-fact-message';
  const sourceDigest = createHash('sha256').update(JSON.stringify(source)).digest('hex');
  const log = JSON.stringify({header: {id: original}, events: [{type: 'user/message', data: {id: messageId, source}}]});
  writeFileSync(f.logFile(original), log);
  const store = createLifeStore(f.directory, Intl.DateTimeFormat().resolvedOptions().timeZone);
  const at = new Date().toISOString();
  store.write({...store.read(), delivering: {sessionId: original, messageId, sentAt: at, scheduledAt: at,
    source: 'facts', what: '互动事实', job: {facts: {at, messageId, sourceDigest, refs: [{domain: fact.domain, id: fact.id}]}}}});
  let unloading;
  const enabling = Promise.allSettled([f.enable()]);
  try {
    await eventually(() => inFlight === 1, 'Life 已打开原生持久日志');
    unloading = f.unload('life').then(() => {disposed = true;});
    await eventually(() => !f.life, 'Life 门面已撤下');
    await delay(10);
    assert.equal(disposed, false);
    assert.equal(readers, 1);
  } finally {
    release.resolve();
    await enabling;
    await unloading;
  }
  assert.equal(readers, 0);
  assert.equal(inFlight, 0);
  assert.equal(readFileSync(f.logFile(original), 'utf8'), log);
  assert.ok((await f.body.pendingFacts(f.id)).some(row => row.id === fact.id));
});

async function runningHold(t) {
  const f = await cordisFixture(t);
  f.model = async call => {
    if (call.messages.some(message => message.source.kind === 'dsh-world-life'))
      await submitPlan(call, [{id: 'rest', kind: 'hold', activity: 'Resting', durationMinutes: 10}]);
    return 'Synthetic reply';
  };
  await f.enable();
  const plan = await eventually(async () => {
    const {plan} = await f.life.readPlan(f.id);
    return plan?.execution?.status === 'running' && plan;
  }, '定时活动已取得 Body 运行回执');
  return {f, plan};
}

function holdPauseInspection(t, {body, life}) {
  const gate = Promise.withResolvers();
  const inspect = body.inspectPlanned.bind(body);
  let waiting = false;
  t.mock.method(body, 'inspectPlanned', async (workspaceId, operationId) => {
    const receipt = await inspect(workspaceId, operationId);
    if (life.bodyClockState(workspaceId)?.enabled === false) {
      waiting = true;
      await gate.promise;
    }
    return receipt;
  });
  return {waiting: () => waiting, release: gate.resolve};
}

test('3B 显式暂停等待 Body 时卸载 Life，重挂后保留暂停并按原编号恢复', async t => {
  const {f, plan} = await runningHold(t);
  const life = f.life, {operationId} = plan;
  const inspection = holdPauseInspection(t, f);
  const pausing = Promise.allSettled([life.control(f.id, false)]);
  let unloading;
  try {
    await eventually(inspection.waiting, '显式暂停正在等待原 Body 回执');
    unloading = f.unload('life');
    await eventually(() => !f.life, 'Life 门面已撤下');
    await assert.rejects(life.control(f.id, false), /生活组件已停止/);
  } finally {
    inspection.release();
    await pausing;
    await unloading;
  }

  await f.load('life');
  const saved = await f.life.readPlan(f.id);
  const paused = await f.body.inspectPlanned(f.id, operationId);
  assert.deepEqual({
    enabled: saved.enabled, plan: saved.plan.status, resumeOnEnable: saved.plan.resumeOnEnable,
    operationId: saved.plan.operationId, receipt: paused.status,
  }, {enabled: false, plan: 'paused', resumeOnEnable: true, operationId, receipt: 'paused'});
  const [result] = await pausing;
  assert.deepEqual(result, {status: 'fulfilled', value: {enabled: false, running: false}});

  const pauseMs = 60 * 60_000;
  t.mock.timers.tick(pauseMs);
  assert.deepEqual(await f.life.control(f.id, true), {enabled: true, running: true});
  const resumed = (await f.life.readPlan(f.id)).plan;
  const receipt = await f.body.inspectPlanned(f.id, operationId);
  assert.deepEqual({status: resumed.status, operationId: resumed.operationId, resumeOnEnable: resumed.resumeOnEnable},
    {status: 'active', operationId, resumeOnEnable: false});
  assert.equal(receipt.operationId, operationId);
  assert.equal(receipt.status, 'running');
  assert.equal(Date.parse(receipt.until), Date.parse(plan.execution.until) + pauseMs);
});

function appendUsage(session) {
  const turn = (session.snapshotEvents().findLast(event => event.type === 'turn/start')?.data.turn ?? 0) + 1;
  const step = 1, reason = {kind: 'completed'};
  session.append('turn/start', {turn});
  session.append('step/start', {turn, step});
  const event = session.append('assistant/message', {
    turn, step, stream: [], usage: {inputTokens: 1000, outputTokens: 125},
    message: createAssistantMessage({source: {provider: 'fixture', model: 'scripted'}, content: [{type: 'text', text: 'Synthetic usage'}]}),
  }, {surfaceOp: 'append'});
  session.append('step/end', {turn, step, reason});
  session.append('turn/end', {turn, reason});
  return event;
}

test('3B 暂停等 Body 与运行时收尾期间照常落盘 home 花费，重挂淘汰旧写入', async t => {
  const {f} = await runningHold(t);
  const life = f.life, fiber = f.fiber('life'), runtime = life.runtime;
  const homeId = life.homeSessionId();
  assert.ok(homeId);
  const home = await f.agent(homeId);
  await home.whenIdle();
  const store = createLifeStore(f.directory, life.timeZone);
  const spend = () => store.read().spend?.yuan ?? 0;
  const sessionHooks = () => f.ctx.events._hooks['session/event'].filter(hook => hook.ctx.fiber === fiber);
  const liveHooks = sessionHooks();

  const inspection = holdPauseInspection(t, f), finish = Promise.withResolvers();
  const settled = runtime.settled.bind(runtime);
  let retiredHooks;
  t.mock.method(runtime, 'settled', async () => {
    const remaining = new Set(sessionHooks());
    retiredHooks = liveHooks.filter(hook => !remaining.has(hook));
    await Promise.all([settled(), finish.promise]);
  });
  const pausing = Promise.allSettled([life.control(f.id, false)]);
  let unloading;
  try {
    await eventually(inspection.waiting, '显式暂停正在等待 Body，home 仍能提交在途记账');
    const before = spend();
    appendUsage(home.session);
    const duringPause = spend();

    inspection.release();
    await eventually(() => retiredHooks, '上游运行时进入 settled');
    assert.ok(retiredHooks.length > 0);
    unloading = fiber.dispose();
    await eventually(() => !f.ctx.get('petLife', false), '旧 Life 门面已撤下');
    // 模拟原生事件分发已取出该监听器，运行时撤订后才交付回调。
    const recordLateUsage = () => {
      const event = appendUsage(home.session);
      for (const {callback} of retiredHooks) callback(home.session, event);
    };
    recordLateUsage();
    const duringSettlement = spend();

    await f.load('life');
    assert.notEqual(f.life, life);
    recordLateUsage();
    const afterRemount = spend();
    await f.unload('life');
    recordLateUsage();
    assert.deepEqual({pausing: duringPause > before, settling: duringSettlement > duringPause,
      afterRemount, afterReplacementClosed: spend()},
    {pausing: true, settling: true, afterRemount: duringSettlement, afterReplacementClosed: duringSettlement});
  } finally {
    inspection.release();
    finish.resolve();
    await pausing;
    await unloading;
  }
  const [result] = await pausing;
  assert.deepEqual(result, {status: 'fulfilled', value: {enabled: false, running: false}});
});
