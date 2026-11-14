// Exercise the desktop's actual native controller bridge, with a deterministic local model.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { mountInstalledStandard } from './native-standard-preset.mjs';
import { mountFixtureServices } from './lib/native-fixture-mount.mjs';
import { call, say } from './native-conversation-scenarios.mjs';
import { desktopFor } from '../dist/src/desktop/index.js';
import { emotionFor } from '../dist/src/emotion/plugin.js';

const app = '/Applications/DeepSeek Harness.app/Contents';
if (!process.versions.electron) {
  const child = spawnSync(join(app, 'MacOS/DeepSeek Harness'), ['--expose-internals', fileURLToPath(import.meta.url)],
    { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit', timeout: 45_000 });
  if (child.error) throw child.error;
  process.exit(child.status ?? 1);
}
const root = realpathSync(mkdtempSync(join(tmpdir(), 'chatpet-native-desktop-')));
const require = createRequire(join(app, 'Resources/app.asar/dsh/package.json'));
const load = name => import(require.resolve('@deepseek-ai/' + name));
const { Context } = await load('cordis');
const { LlmAdapter } = await load('dsh-llm');
const ctx = new Context();
ctx.baseUrl = pathToFileURL(join(app, 'Resources/app.asar/dsh/index.js')).href;
const unwrap = result => { assert.ok(result.ok, JSON.stringify(result.error)); return result.value; };
let calls = 0, batchMode = false, summaryCalls = 0, imageMode = false;
const batchInputChars = [];
async function until(get, label) {
  const deadline = Date.now() + 5500;
  do { const value = get(); if (value) return value; await delay(16); } while (Date.now() < deadline);
  throw Error('Timed out waiting for ' + label);
}
const longReply = '原生流式答复。'.repeat(100);
const preference = '用户希望蓝鱼开心时多转圈。';
const requestText = '以后开心时多这样，我喜欢这个动作。';
const playbackId = 'observed-desktop-spin';
let memoryId;
class Fixture extends LlmAdapter {
  async *stream(options) {
    if (imageMode) {assert.ok(options.messages.some(m=>m.content.some(b=>b.type==='image')),'The original native request retains the admitted image');calls++;yield* say('原生图片已收到。');return;}
    if (options.purpose === 'compaction') { summaryCalls++; yield* say('批量摘要：用户正在进行五轮整理验证，约定下一轮继续核对，尚未宣称任务完成。'); return; }
    if (batchMode) {
      const text = options.messages.flatMap(m=>m.content.filter(b=>b.type==='text').map(b=>b.text)).join('\n');
      for (let n=0;n<5;n++) assert.ok(text.split('batch-sentinel-'+n).length<=2,'Current-session dialogue must not be injected twice');
      assert.ok(text.split('批量摘要：').length<=2,'A native summary must not be injected a second time by Memory');
      batchInputChars.push(text.length); calls++; yield* say('批量对话答复。'.repeat(120)); return;
    }
    const input = options.messages.flatMap(message => message.content.filter(b => b.type === 'text').map(b => b.text)).join('\n');
    if (++calls === 1) {
      yield { type: 'block-start', index: 0, blockType: 'text' };
      yield { type: 'text-delta', index: 0, text: '可见的第一段' };
      await delay(10000, undefined, { signal: options.signal });
    }
    if (calls === 2) {
      yield* say(longReply + '\n<pet-expression>{"action":"spin","mood":"轻快","reason":"一起聊天很开心"}');
    } else if (calls === 3) {
      assert.ok(input.includes(playbackId), 'The owner can refer to the action that the renderer acknowledged');
      yield* call('pet_memory_remember', { content: preference, playback_id: playbackId, evidence_quotes: [requestText] });
    } else if (calls === 4) {
      yield* say('我记住了。\n<pet-expression>' + JSON.stringify({
        mood: '得意', reason: '转圈受到了夸奖', feedback: { playbackId, quote: requestText },
      }));
    } else if (calls === 5) {
      assert.ok(input.includes(memoryId) && input.includes(preference), 'First native inference received the durable preference');
      assert.ok(input.includes('"mood":"得意"') && input.includes(playbackId), 'First inference received the recent mood and actual action');
      yield* say('你喜欢我开心时转圈。');
    } else {
      throw Error('Unexpected native inference');
    }
  }
}
try {
  const mount = await mountFixtureServices(ctx, load, root);
  await mountInstalledStandard(ctx, require);
  await mount('dsh-typert-registry');
  await mount('dsh-api-remote-access');
  await mount('dsh-api-gateway');
  await mount('dsh-session-query');
  await mount('dsh-attachment-local', { dshHome: root });
  // The native upload resolver is required at construction. The image case below
  // uses attachment admission directly rather than browser upload receipts.
  await ctx.plugin({ apply(scope) { scope.provide('fileUploads', { registerAgentResolver: () => () => {} }); } });
  await mount('dsh-agent-default-model', { provider: 'desktop-fixture', model: 'local' });
  await mount('dsh-api-session-controller', { nativeOpen: false });
  assert.ok(ctx.sessionController);
  ctx.llm.registerAdapter(['desktop-fixture'], new Fixture());
  await ctx.plugin(await import('../dist/src/core/plugin.js'), { dataDir: join(root, '.chatpet/data/core'), cwd: root,
    companionId: 'fish', scopeId: 'fixture', ownerActorId: 'owner', displayName: '蓝鱼', character: '测试',
    memory: { dataDir: join(root, '.chatpet/data/memory'), python: resolve('.venv/bin/python') } });
  const host = ctx.petCore;
  const memoryComponent = await ctx.plugin(await import('../dist/src/memory/plugin.js'));
  const emotionComponent = await ctx.plugin(await import('../dist/src/emotion/plugin.js'));
  const desktopComponent = await ctx.plugin(await import('../dist/src/desktop/plugin.js'));
  const workspace = await ctx.workspaceRegistry.create(root, 'Disposable desktop');
  const request = id => host.operator.request('desktop-check-' + id);
  const prefs = unwrap(await host.services.preferences.read(request('read'), {}));
  const saved = unwrap(await host.services.preferences.save(request('save'), {
    expectedRevision: prefs.revision, conversation: prefs.conversation,
    workspace: { id: workspace.id, path: workspace.path, title: workspace.title },
  }));
  unwrap(await host.services.workspace.initialize(request('init'), { expectedPreferencesRevision: saved.revision }));
  const chat = desktopFor(host).chat;
  const emotion = emotionFor(host);
  // This fixture substitutes only the renderer's playing/ended receipts; all conversation and Memory services are real.
  let recorded = 0;
  const unsubscribe = emotion.onExpression(event => {
    if (event.action !== 'spin') return;
    recorded++;
    for (const status of ['playing', 'ended']) emotion.recordPlayback({
      workspaceId: event.workspaceId, id: playbackId, name: event.action, status, kind: 'expression',
    });
  });
  const opened = await chat.run('open', {});
  const address = { workspaceId: workspace.id, sessionId: opened.sessionId };
  assert.ok(workspace.sessionIds.includes(address.sessionId));
  await chat.run('send', { ...address, text: '可以用中文聊天吗？', requestId: 'stream' });
  await until(() => chat.snapshot().live.includes('可见的第一段'), 'first visible native chunk');
  const midway = await chat.run('open', {});
  assert.equal(midway.sessionId, address.sessionId);
  assert.equal(midway.live, '可见的第一段');
  await chat.run('stop', { ...address, turn: midway.turn });
  await until(() => !chat.snapshot().generating, 'native cancel completion');
  await chat.run('send', { ...address, text: '接着聊', requestId: 'next' });
  await until(() => !chat.snapshot().generating && chat.snapshot().messages.some(m => m.text === longReply), 'full reply after cancel');
  const finished = await chat.run('open', {});
  assert.equal(finished.messages.filter(m => m.text === longReply).length, 1);
  assert.equal(finished.messages.filter(m => m.role === 'user').length, 2);
  assert.equal(recorded, 1, 'Reopen did not replay the reply expression');
  assert.ok(finished.messages.every(message => !message.text.includes('<pet-expression>')));
  await assert.rejects(chat.run('stop', { ...address, turn: midway.turn }));
  await chat.run('send', { ...address, text: requestText, requestId: 'preference' });
  await until(() => !chat.snapshot().generating && chat.snapshot().messages.some(m => m.text === '我记住了。'), 'confirmed memory write');
  const row = (await host.native.memory.connection.call('recall', { query: '转圈', limit: 12 })).records
    .find(item => item.memory.type === 'semantic' && item.memory.content === preference);
  assert.ok(row && row.dependencies.sources.length >= 2, 'Long-term preference links owner feedback and actual action');
  memoryId = row.memory.id;
  const next = await chat.run('new', address);
  assert.notEqual(next.sessionId, address.sessionId);
  assert.ok(ctx.workspaceRegistry.archivedSessionIds.includes(address.sessionId));
  await chat.run('send', { workspaceId: workspace.id, sessionId: next.sessionId, text: '嗨，我们接着聊。', requestId: 'fresh' });
  await until(() => !chat.snapshot().generating && chat.snapshot().messages.some(m => m.text === '你喜欢我开心时转圈。'), 'first reply with both kinds of memory');
  assert.equal(host.native.runtime.store.get('memory-session', address.sessionId).archived, true);
  unsubscribe();
  assert.equal(calls, 5);
  await desktopComponent.dispose();
  assert.equal(ctx.get('petDesktop'), undefined);
  assert.equal(ctx.petCore, host);
  assert.ok(ctx.get('petEmotion'));
  await ctx.plugin(await import('../dist/src/desktop/plugin.js'));
  const restored = desktopFor(host).chat;
  assert.equal((await restored.run('open', {})).sessionId, next.sessionId);
  await emotionComponent.dispose();
  assert.equal(ctx.get('petEmotion'), undefined);
  assert.ok(ctx.get('petDesktop'));
  await ctx.plugin(await import('../dist/src/emotion/plugin.js'));
  assert.equal(emotionFor(host).current(workspace.id).mood, '得意');
  console.log(JSON.stringify({check:'native-component-lifecycle',status:'passed',covered:['Desktop unload/reload','native session retained','Emotion unload/reload','persistent companion emotion']}));
  await memoryComponent.dispose();
  assert.equal(ctx.get('petMemory'), undefined);
  assert.ok(host.native.memoryFor(next.sessionId), 'Existing chats retain Memory after component unload');
  const plain = await restored.run('new',{workspaceId:workspace.id,sessionId:next.sessionId});
  assert.equal(host.native.memoryFor(plain.sessionId), undefined, 'New chats do not enroll while Memory is disabled');
  batchMode = true;
  await restored.run('send',{workspaceId:workspace.id,sessionId:plain.sessionId,text:'Memory-off conversation.',requestId:'plain'});
  await until(()=>!restored.snapshot().generating,'plain native conversation');
  assert.equal(host.workspace.runtime.store.get('memory-session',plain.sessionId),undefined);
  await ctx.plugin(await import('../dist/src/memory/plugin.js'));
  assert.equal(host.native.memoryFor(plain.sessionId),undefined,'Re-enable does not change an existing plain chat');
  console.log(JSON.stringify({check:'native-memory-enrollment',status:'passed',covered:['old chat unaffected','new chat plain','plain native reply','mode retained after re-enable']}));
  if (process.env.CHATPET_CHECK_BATCH === '1') {
    batchMode = true;
    const previous = host.workspace.companionSettings();
    unwrap(await host.services.workspace.saveCompanion(request('batch-settings'), {workspaceId:workspace.id,
      expectedSettings:previous,settings:{...previous,memorySummaryTurns:5,memorySummaryMinimumMinutes:0}}));
    const batch = await restored.run('new', {workspaceId:workspace.id,sessionId:plain.sessionId});
    const scoped = {workspaceId:workspace.id,sessionId:batch.sessionId};
    for (let n=0;n<5;n++) {
      await restored.run('send',{...scoped,text:`batch-sentinel-${n} 第${n+1}轮：`+'测试信息。'.repeat(180),requestId:'batch-'+n});
      await until(()=>!restored.snapshot().generating,'batch turn completion');
    }
    try { await until(()=>{ const row=host.workspace.runtime.store.get('memory-batch',batch.sessionId); if(row?.error) throw Error(row.error); return row?.turns===0; },'native batch summary'); }
    catch(error) { console.error(JSON.stringify({batch:host.workspace.runtime.store.get('memory-batch',batch.sessionId),allBatch:host.workspace.runtime.store.all('memory-batch'),agent:ctx.agents.get(batch.sessionId)?.status,summaryCalls})); throw error; }
    assert.ok(summaryCalls>0);
    const full = ctx.agents.get(batch.sessionId).session.snapshotEvents();
    assert.equal(full.filter(e=>e.type==='user/message' && e.data.source.kind==='user').length,5);
    assert.ok(full.some(e=>e.type==='compaction/summary'));
    const summaries = await host.native.memory.connection.call('recall',{query:'批量摘要',include_recent:true,limit:50});
    assert.ok(summaries.records.some(r=>r.memory.metadata.pet_summary));
    const before = Math.max(...batchInputChars);
    await restored.run('send',{...scoped,text:'继续核对。',requestId:'after-summary'});
    await until(()=>!restored.snapshot().generating,'reply after summary');
    const after = batchInputChars.at(-1);
    assert.ok(after < before,'Compaction must materially reduce the next native request');
    console.log(JSON.stringify({check:'native-batch-summary',status:'passed',summaryCalls,originalUserTurns:5,requestCharsBefore:before,requestCharsAfter:after,externalModels:0}));
  }
  imageMode=true;
  const imageChat=await restored.run('new',{workspaceId:workspace.id,sessionId:restored.snapshot().sessionId});
  await restored.run('send',{workspaceId:workspace.id,sessionId:imageChat.sessionId,text:'看这张图片。',requestId:'native-image',image:{mediaType:'image/png',data:readFileSync(new URL('../src/desktop/assets/cute.png',import.meta.url)).toString('base64')}});
  try {await until(()=>!restored.snapshot().generating&&restored.snapshot().messages.some(m=>m.text==='原生图片已收到。'),'native image request');}
  catch(error){console.error(JSON.stringify({calls,imageEvents:ctx.agents.get(imageChat.sessionId)?.session.snapshotEvents().slice(-4).map(e=>({type:e.type,reason:e.data.reason}))}));throw error;}
  console.log(JSON.stringify({check:'native-image-chat',status:'passed',externalModels:0}));
  console.log(JSON.stringify({ check: 'native-desktop-controller', localModelCalls: calls, externalModels: 0,
    status: 'passed', covered: ['create', 'resolveAgent', 'live text', 'reopen active', 'cancel', 'full history', 'reply expression',
      'observed action and feedback', 'durable preference', 'archive and new', 'mood and durable preference on first request'] }));
} finally {
  await ctx.fiber.dispose();
  rmSync(root, { recursive: true, force: true });
}
