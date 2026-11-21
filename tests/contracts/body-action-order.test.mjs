import test from 'node:test';
import assert from 'node:assert/strict';
import {BODY_ACTIONS} from '../../dist/src/contracts/behavior.js';

test('照料、角色和计划身体动作的序号分别从 1 连续且无重复', () => {
  const entries = Object.values(BODY_ACTIONS);
  for (const [group, count, orders] of [
    ['care', 6, entries.flatMap(entry => entry.care ? [entry.care.order] : [])],
    ['role', 10, entries.flatMap(entry => entry.role === undefined ? [] : [entry.role])],
    ['plan', 5, entries.flatMap(entry => entry.plan === undefined ? [] : [entry.plan])],
  ]) {
    assert.deepEqual(orders.sort((a, b) => a - b), Array.from({length:count}, (_, index) => index + 1), group);
  }
});
