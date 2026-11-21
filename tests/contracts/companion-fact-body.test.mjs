import test from 'node:test';
import assert from 'node:assert/strict';
import {HOME_ACTIONS} from '#feiyu-home';
import {FACT_DOMAINS} from '../../dist/src/contracts/interaction.js';
import {fixture} from '../behavior-list/fixture.mjs';

test('Body 事实覆盖上游房间动作并保留无标签动作的原始摘要', async t => {
  assert.deepEqual(Object.keys(FACT_DOMAINS.body).sort(), [...HOME_ACTIONS].sort());

  const f = await fixture(t, {life:false});
  const receipts = [];
  for (const action of ['sick','heal']) {
    const {fact} = await f.body.roomAction('world', {action}, '主人');
    assert.equal(fact.type, action);
    assert.equal(fact.result.summary, `主人${action}已完成。`);
    receipts.push(fact);
  }
  assert.deepEqual(await f.body.worldFacts.readFacts('world', receipts.map(fact => fact.id)), receipts);
});
