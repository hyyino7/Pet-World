import assert from 'node:assert/strict';
import test from 'node:test';
import type { Session } from '@deepseek-ai/dsh-session';
import { WorldRecall } from '../../src/core/native/recall.js';

test('World reloads once per turn and explicitly retires prior recall on empty replacement', () => {
  const recall = new WorldRecall();
  const old = {type:'user/message', data:{id:'old',source:{kind:'chatpet-recall'}}};
  const replacements: unknown[] = [];
  const session = {surface:{nodes:[3]}, eventAt:()=>old, append:(...args: unknown[])=>replacements.push(args)} as unknown as Session;
  assert.equal(recall.refresh(session,'bound',true),true);
  const message = recall.prepare(session, 'First eligible conversation');
  assert.ok(message);
  recall.request(session,1,1,true);
  assert.equal(replacements.length,1);
  assert.equal(recall.refresh(session,'bound',true),true);
  recall.request(session,2,1,true);
  assert.equal(recall.refresh(session,'bound',false),false);
  assert.equal(recall.refresh(session,'bound',true),true);
  recall.prepare(session,'');
  recall.request(session,3,1,true);
  assert.equal(replacements.length,2);
  recall.compacted(session);
  assert.equal(recall.refresh(session,'bound',true),true);
  recall.request(session,4,1,false);
  assert.equal(recall.refresh(session,'other',true),true);
});
