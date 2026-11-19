import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import test from 'node:test';
import {Context} from '@deepseek-ai/cordis';
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
