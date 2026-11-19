import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import test from 'node:test';
import {Context} from '@deepseek-ai/cordis';
import {createLifeStore} from '#dsh-world/life/lifeStore';
import {cordisFixture, eventually} from '../behavior-list/entries-lifecycle.test.mjs';

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
