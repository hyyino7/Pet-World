import assert from 'node:assert/strict';
import test from 'node:test';
import {createLifeSourceAdapter} from '../../dist/src/life/tool-policy.js';
import {fixture} from '../behavior-list/fixture.mjs';

// Captured from lifeToolAllowed before the tool declaration migration.
const ordinary = [
  'cancel_alarm', 'check_alarm', 'forget_photo', 'keep_photo', 'life_activity_control',
  'life_plan_keep', 'life_plan_read', 'life_plan_update', 'life_read_confirm', 'life_read_segment',
  'list_photos', 'pet_economy_state', 'pet_emotion_update', 'pet_memory_read', 'pet_memory_recall',
  'pet_memory_remember', 'plan_next', 'reach_out', 'read_review_dialogue', 'room_garden', 'room_state',
];
const review = [...ordinary, 'read', 'write'].sort();

test('module registrations derive exactly the original ordinary Life and review allowlists', async t => {
  const {host} = await fixture(t, {policy:true, memory:true, room:true, emotion:true});
  const {toolTable} = host.native;
  const {branches} = createLifeSourceAdapter({}, host, () => false);
  const allNames = new Set(['bash', 'edit', ...ordinary, ...review,
    ...['owner', 'life', 'review', 'guest', 'tv'].flatMap(source => toolTable.list(source).map(tool => tool.name))]);
  for (const [source, expected] of [['life', ordinary], ['review', review]]) {
    assert.deepEqual(toolTable.list(source).map(tool => tool.name).sort(), expected);
    assert.deepEqual([...allNames].filter(name => branches[source].toolPolicy.allows({name})).sort(), expected);
  }
});
