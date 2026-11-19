import assert from 'node:assert/strict';
import {join} from 'node:path';
import {existsSync} from 'node:fs';
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
