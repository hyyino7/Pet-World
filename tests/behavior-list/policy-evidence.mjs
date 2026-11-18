import assert from 'node:assert/strict';
import {ownerPlan,until} from './fixture.mjs';

export const footer = reason => 'Synthetic reply\n<pet-expression>'+JSON.stringify({mood:'安静',reason,feelings:['calm']});
export async function assertEmotion(f,reason) {
  const snapshot=await f.service('petEmotion').read('world');
  assert.equal(snapshot.state?.reason,reason);
}
export async function prepareMemory(f,id='home') {
  // 预热会直接报告进程和回环失败，避免原生聊天的降级路径掩盖失败。
  await f.service('petMemory').prepare(id,f.host.native.scopeFor(id));
}
export function assertObservation(f,sessionId,messageId,origin,actorId,attribution={channel:'dsh',sessionId}) {
  const store=f.host.workspace.runtime.store;
  const locator=messageId===null?`dsh:${sessionId}:turn:`:`dsh:${sessionId}:${messageId}`;
  const source=store.all('source').filter(row=>messageId===null?row.locator?.startsWith(locator):row.locator===locator).at(-1);
  assert.ok(source,'有对应的原生来源 '+locator);
  assert.equal(source.origin,origin);
  assert.equal(source.actorId,actorId);
  const work=store.get('memory-source-work',source.sourceId);
  assert.equal(work?.state,'acknowledged');
  assert.ok(work.observationId);
  assert.deepEqual(work.attribution,attribution);
  return source;
}
export async function nextReview(f,t,compactAfterReview=false) {
  const homeId=(await f.home()).id;
  await ownerPlan(f,[],homeId);
  const preferences=(await f.life.snapshot('world')).preferences;
  await f.life.settings('world',preferences,{...preferences,review:'23:00',compactAfterReview});
  t.mock.timers.tick(61_000);
  await f.restart();
  const home=await f.home();
  const queue=()=>home.inbox.nextStep.find(row=>row.source?.purpose==='review');
  await until(queue,'回顾到达原生 home');
  return {home,message:queue()};
}
