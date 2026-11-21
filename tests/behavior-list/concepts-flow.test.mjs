import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture, value} from './fixture.mjs';
import {confirmBodyFact, interactionFacts, recallBodyFactAcrossRestart} from './native-facts.mjs';

test('设置页喂食经原生日志确认后跨会话召回并跨重启保留', {timeout:30_000}, async t => {
  const f = await fixture(t, {console:true, memory:true});
  const memory = f.service('petMemory');
  await memory.prepare('home', f.host.native.nativeScopeFor('home'));
  const before = await f.body.snapshot('world');
  const result = value(await f.settings('lifeAction', {workspaceId:'world', action:'feed'}, 'settings-feed'));
  const [fact] = await f.body.pendingFacts('world');
  assert.equal(fact.type, 'feed');
  assert.equal(fact.actor.channel, 'settings');
  assert.equal(fact.requestId, 'settings-feed');
  assert.deepEqual(result.fact, fact);
  assert.ok((await f.body.snapshot('world')).needs.hunger < before.needs.hunger);

  f.flushAllowed = false;
  const first = await f.begin();
  const [offered] = interactionFacts(first.agent.session.snapshotEvents()).filter(row => row.id === fact.id);
  assert.deepEqual(offered, {id:fact.id, domain:'body', type:'feed', at:fact.occurredAt,
    actor:fact.actor, status:'completed', summary:fact.result.summary});
  await f.end(first);
  assert.ok(!f.flushes.includes('home'));
  assert.deepEqual(await f.body.pendingFacts('world'), [fact]);
  f.flushAllowed = true;
  await confirmBodyFact(f, fact);
  assert.equal(memory.connection.lifecycle, 'ready');
  await recallBodyFactAcrossRestart(f, fact);
});
