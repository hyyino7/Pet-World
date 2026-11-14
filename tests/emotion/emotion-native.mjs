import assert from 'node:assert/strict';
import { emotionFor } from '../../dist/src/emotion/plugin.js';

/** Real DSH tools and Mnemosyne, using the calling fixture's disposable workspace and scripted model. */
export async function checkActionPreference({ host, workspace, open, send, call, say, setProgram }) {
  const emotion = emotionFor(host);
  const unregisterCatalog=emotion.registerCatalog('native-action-preference-fixture',{actions:[{name:'spin',description:'A synthetic observed spin.'}],stickers:[]});
  const ledger = emotion.ledger(workspace.id);
  const playbackId = 'fixture-observed-spin';
  const fact = '用户希望大肥鱼开心时多表演转圈。';
  const revision = '用户希望大肥鱼偶尔转圈。';
  const session = await open();
  emotion.recordPlayback({ workspaceId: workspace.id, id: playbackId, name: 'spin', status: 'playing', kind: 'random' });
  function checkExpressionContext(options) {
    const catalog = JSON.stringify({ available: emotion.catalog });
    const guides = options.messages.filter(message =>
      message.content.some(block => block.type === 'text' && block.text.includes(catalog)));
    assert.deepEqual(guides.map(message => message.role), ['system'],
      'The asset catalog appears only in the stable per-agent system prompt');
    const snapshots=options.messages.filter(message=>message.role==='system');
    assert.ok(snapshots.some(message => message.content.some(block =>
      block.type === 'text' && block.text.includes(playbackId))),
      'The current playback evidence remains available in the native context');
  }
  setProgram(async function* (options) {
    checkExpressionContext(options);
    const intent = { mood: '开心', reason: '转圈受到夸奖', feedback: { playbackId, quote: '这次很可爱' } };
    yield* say('谢谢。\n<pet-expression>' + JSON.stringify(intent));
  });
  await send(session, '这次很可爱');
  const perform = async (handle, text, tool, args) => {
    let step = 0;
    setProgram(async function* (options) {
      checkExpressionContext(options);
      if (step++ === 0) { yield* call(tool, args); return; }
      yield* say('好的。');
    });
    await send(handle, text);
    assert.equal(step, 2);
  };
  const find = async content => {
    const response = await host.native.memory.connection.call('recall', { query: '转圈', limit: 50 });
    return response.records.filter(r => r.memory.type === 'semantic' && r.memory.content === content);
  };

  await perform(session, '以后高兴时多来这个。', 'pet_memory_remember', {
    content: fact, evidence_quotes: ['以后高兴时多来这个'], playback_id: playbackId,
  });
  const records = await find(fact);
  assert.equal(records.length, 1);
  const saved = records[0];
  assert.equal(saved.dependencies.sources.length, 2, 'The owner statement and observed action are independently sourced');
  const recentAction = () => ledger.read().actions.find(a => a.id === playbackId);
  assert.deepEqual(recentAction().feedback[0].memories, [saved.memory.id]);
  await perform(await open(), '改成偶尔就好', 'pet_memory_correct', {
    memory_id: saved.memory.id, expected_version: saved.memory.version, content: revision, evidence_quotes: ['改成偶尔就好'],
  });
  assert.equal(recentAction().feedback.length, 0);
  assert.ok(!ledger.read().moods.some(m => m.reason === '转圈受到夸奖'));
  const [updated] = await find(revision);
  assert.ok(updated);
  await perform(await open(), '忘掉那个动作偏好', 'pet_memory_forget', {
    memory_id: updated.memory.id, expected_version: updated.memory.version,
  });
  assert.deepEqual(await find(fact), []);
  assert.deepEqual(await find(revision), []);
  unregisterCatalog();
  console.log(JSON.stringify({ check: 'native-action-preference', status: 'passed', externalModels: 0 }));
}
