// Installed native services and a disposable Repo; local model fixture, no accounts.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, mkdirSync, realpathSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { say } from './native-conversation-scenarios.mjs';
import { digest } from '../dist/src/core/storage.js';
import { mountInstalledStandard } from './native-standard-preset.mjs';

const app = '/Applications/DeepSeek Harness.app/Contents';
if (!process.versions.electron) {
  const binary = join(app, 'MacOS/DeepSeek Harness');
  assert.ok(existsSync(binary));
  const child = spawnSync(binary, ['--expose-internals', fileURLToPath(import.meta.url)], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit', timeout: 30_000,
  });
  if (child.error) throw child.error;
  process.exit(child.status ?? 1);
}
const require = createRequire(join(app, 'Resources/app.asar/dsh/package.json'));
const load = name => import(require.resolve(`@deepseek-ai/${name}`));
const { Context } = await load('cordis');
const { LlmAdapter } = await load('dsh-llm');
const root = realpathSync(mkdtempSync(join(tmpdir(), 'chatpet-native-workspace-')));
const ctx = new Context();
ctx.baseUrl = pathToFileURL(join(app, 'Resources/app.asar/dsh/index.js')).href;
const mount = async (name, config) => { const module = await load(name); return ctx.plugin(module.default ?? module, config); };
const unwrap = result => { assert.ok(result.ok, JSON.stringify(result.error)); return result.value; };
const text = options => options.messages.flatMap(m => m.content.filter(b => b.type === 'text').map(b => b.text)).join('\n');
const requests = [];
function assertPersonaPlacement(options, character) {
  const system = text({ messages: options.messages.filter(m => m.role === 'system') });
  const dialogue = text({ messages: options.messages.filter(m => m.role !== 'system') });
  for (const marker of [character, 'Fixture owner preference']) {
    assert.equal(system.split(marker).length - 1, 1, 'The bound persona and user appear once in the system prompt');
    assert.ok(!dialogue.includes(marker), 'Ordinary runtime snapshots must not duplicate the persona or user profile');
  }
  return system;
}
let calls = 0, program = async function* () { yield* say('Native reply'); };
class Fixture extends LlmAdapter {
  async resolveModel(provider, model) {
    // Exercise the hosted model's in-history updates when SOUL is edited.
    return { provider, id: model, name: model, systemPromptUpdate: 'in-history' };
  }
  async *stream(options) { calls++; requests.push(options); yield* program(options); }
}
async function* call(name, args) {
  const block = { type: 'tool-call', id: randomUUID(), name, arguments: JSON.stringify(args) };
  yield { type: 'block-start', index: 0, blockType: 'tool-call' };
  yield { type: 'tool-call-delta', index: 0, id: block.id, name, argumentsDelta: block.arguments };
  yield { type: 'block-end', index: 0, block };
  yield { type: 'finish', reason: { kind: 'tool-calls' } };
}
try {
  await mount('cordis-plugin-loader');
  ctx.loader.builtins.group = (await load('cordis-plugin-group')).default;
  for (const name of ['dsh-session', 'dsh-session-projection', 'dsh-agent', 'dsh-llm', 'dsh-system-prompt', 'dsh-tools', 'dsh-tool-executor-native']) await mount(name);
  await mount('dsh-session-persistence-jsonl', { root: join(root, 'sessions'), compression: 'none' });
  await mount('dsh-agent-loop', { agents: [] });
  await mount('dsh-fs-local');
  await mount('dsh-working-directory', { defaultDirectory: root });
  await mount('dsh-subprocess-local');
  await mount('dsh-sandbox-local');
  await mount('dsh-sandbox-policy', { mode: 'workspace-write', workspaceRoot: root });
  await mount('dsh-bash-sandbox', { timeoutMs: 2000 });
  await mount('dsh-shell-env');
  await mount('dsh-user-questions');
  await mount('dsh-token-meter');
  await mount('dsh-commands');
  await mount('dsh-storage');
  await mount('dsh-storage-json', { root: join(root, 'storage') });
  await mount('dsh-storage-domain', { backend: 'json', routes: {} });
  await mount('dsh-workspace');
  await mount('dsh-agent-preset-registry', { default: 'standard' });
  const unregister = await mountInstalledStandard(ctx, require);
  ctx.llm.registerAdapter(['workspace-fixture'], new Fixture());
  const workspace = await ctx.workspaceRegistry.create(root, 'Disposable Repo');
  // Produce a persisted pre-upgrade conversation with DSH itself, before
  // attaching the new Core. Runtime snapshots used to mix these providers.
  const legacy = await open();
  const legacyId = legacy.agent.id;
  const oldSections = [
    ['chatpet.identity', 'LEGACY_SOUL_V1'],
    ['chatpet.user', 'LEGACY_USER_V1'],
    ['chatpet.memory-policy', 'LEGACY_MEMORY_POLICY_V1'],
    ['fixture.other-context', 'RETAIN_OTHER_CONTEXT'],
  ];
  const registrations = oldSections.map(([name, value], order) =>
    legacy.agent.ctx.systemPrompt.context({ name, order, required: true, interpolate: false, text: value }));
  await send(legacy, 'A pre-upgrade conversation.');
  const oldEvent = legacy.agent.session.snapshotEvents().find(event => event.type === 'user/message'
    && event.data.source.kind === 'runtime-context' && event.data.source.sections?.some(section => section.name === 'chatpet.identity'));
  assert.ok(oldEvent, 'The original native log must contain the mixed runtime snapshot');
  for (const dispose of registrations) dispose();
  await legacy.dispose();
  const corePlugin = await import('../dist/src/core/plugin.js');
  await ctx.plugin(corePlugin, { dataDir: join(root, 'core'), cwd: root, companionId: 'fixture-pet', scopeId: 'fixture-owner',
    ownerActorId: 'fixture-owner', displayName: 'Repo identity', character: 'Repo character' });
  const host = ctx.petCore;
  await ctx.plugin(await import('../dist/src/memory/plugin.js'));
  await ctx.plugin(await import('../dist/src/emotion/plugin.js'));
  await ctx.plugin(await import('../dist/src/desktop/plugin.js'));
  let requestId = 0;
  const request = () => host.operator.request(`workspace-${++requestId}`);
  const prefs = unwrap(await host.services.preferences.read(request(), {}));
  const saved = unwrap(await host.services.preferences.save(request(), { expectedRevision: prefs.revision, conversation: prefs.conversation,
    workspace: { id: workspace.id, title: workspace.title, path: workspace.path } }));
  unwrap(await host.services.workspace.initialize(request(), { expectedPreferencesRevision: saved.revision }));
  writeFileSync(join(root, '.chatpet/USER.md'), '# User\n\nFixture owner preference');
  assert.ok(!(await ctx.agentPresets.resolve('standard')).broken);
  assert.ok(!readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8').includes('preset-chatpet'));
  async function open(directory = root, attach = true) {
    const handle = await ctx.agents.create({ sessionId: `fixture-${randomUUID()}`, meta: { cwd: directory, agentPreset: 'standard' },
      agentOptions: { provider: 'workspace-fixture', model: 'fixture', maxTokens: 1024 },
      setup: async scope => { await ctx.agentPresets.mount(scope, 'standard'); } });
    if (attach) await workspace.attachSession(handle.agent.id);
    return handle;
  }
  async function send(handle, value) {
    handle.agent.followup({ id: `input-${randomUUID()}`, role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: value }] });
    await handle.agent.whenIdle(); await ctx.sessions.flush(handle.agent.session);
  }
  const handle = await open();
  const requestStart = requests.length;
  let stage = 0;
  program = async function* (options) {
    assert.ok(text(options).includes('Repo character') && text(options).includes('Fixture owner preference'));
    assert.ok(text(options).includes('这个 Repo 是大肥鱼与用户共同使用的工作区'), 'Native instruction loader must read the generated root AGENTS.md');
    assert.ok(options.tools.some(t => t.name === 'pet_matter_create'));
    assert.ok(options.tools.some(t => t.name === 'read'), 'Official native filesystem tools remain available');
    if (stage++ === 0) { yield* call('pet_matter_create', { requestedOutcome: 'Track native work', nextAction: 'Report the result' }); return; }
    yield* say('Native tracked reply');
  };
  await send(handle, 'Create a matter and reply.');
  assert.ok(handle.agent.session.snapshotEvents().some(event => event.type === 'user/message'
    && event.data.source.kind === 'agent-instructions'), 'DSH persists its actual instruction baseline');
  assert.equal(calls - requestStart, 2, 'No hidden duplicate model turn');
  const initialSystem = assertPersonaPlacement(requests[requestStart], 'Repo character');
  assert.equal(assertPersonaPlacement(requests[requestStart + 1], 'Repo character'), initialSystem,
    'Tool follow-up keeps the same system prefix as the opening request');
  const matters = unwrap(await host.services.core.listCommitments(request(), { limit: 20 }));
  assert.equal(matters.items.length, 1);
  const overview = unwrap(await host.services.workbench.snapshot(request(), {}));
  assert.equal(overview.matters[0].commitmentId, matters.items[0].commitmentId);
  const detail = unwrap(await host.services.workbench.matter(request(), { commitmentId: matters.items[0].commitmentId }));
  assert.equal(detail.progress[0].kind, 'created');
  const forbiddenWorkbench = await host.services.workbench.snapshot(host.connectModule('console').request('forged-workbench'), {});
  assert.equal(forbiddenWorkbench.ok, false, 'Only authenticated owner delegation can read workbench');
  assert.ok(!existsSync(join(root, '.chatpet/STATE.md')), 'Execution must not generate a Repo task summary');
  assert.equal(host.workspace.runtime.store.all('activity').length,0,'Ordinary native chat does not allocate Core activities');
  assert.equal(host.workspace.runtime.store.all('execution').length,0,'Ordinary native chat does not allocate Core executions');
  writeFileSync(join(root, '.chatpet/SOUL.md'), '# Revised identity\n\nRevised character');
  program = async function* (options) { assert.ok(text(options).includes('Revised character')); yield* say('Updated native reply'); };
  await send(handle, 'Use the changed role.');
  assertPersonaPlacement(requests.at(-1), 'Revised character');
  assert.ok(!text(requests.at(-1)).includes('Repo character'), 'Personalization edits replace the old model-visible text');
  const observer = new (await import('../dist/src/core/dsh-driver.js')).DshDriver(ctx, { cwd: root });
  const nativeInput = handle.agent.session.snapshotEvents().find(event => event.type === 'user/message').data.id;
  const beforeRead = handle.agent.session.snapshotEvents().length;
  assert.equal((await observer.inspectObserved(handle.agent.id, nativeInput)).state, 'completed');
  assert.equal(handle.agent.session.snapshotEvents().length, beforeRead, 'Reconciliation never changes the active session');
  let entered;
  const waiting = new Promise(resolve => { entered = resolve; });
  program = async function* (options) {
    entered();
    await new Promise((resolve, reject) => { options.signal.addEventListener('abort', () => reject(new Error('Native fixture cancelled')), { once: true }); });
  };
  const stopped = send(handle, 'Wait for stop.');
  await waiting;
  const runningPrefs = unwrap(await host.services.preferences.read(request(), {}));
  const rebind = await host.services.preferences.save(request(), { conversation: runningPrefs.conversation, expectedRevision: runningPrefs.revision, workspace: runningPrefs.workspace });
  assert.equal(rebind.ok,true,'Ordinary native work has no duplicate Core execution lock');
  const configPath = join(root, '.chatpet/core.json');
  const validConfig = readFileSync(configPath, 'utf8');
  writeFileSync(configPath, '{invalid');
  assert.equal((await host.services.core.getIdentity(request(), {})).ok, false);
  handle.agent.cancel({kind:'user'});
  await stopped;
  writeFileSync(configPath,validConfig);
  assert.equal((await observer.inspectObserved(handle.agent.id,handle.agent.session.snapshotEvents().filter(event=>event.type==='user/message' && event.data.source.kind==='user').at(-1).data.id)).state,'cancelled');
  const nativeSessionId = handle.agent.id;
  await handle.dispose();
  const resumed = await ctx.agents.resume({ resumeSessionId: nativeSessionId,
    setup: async scope => { await ctx.agentPresets.mount(scope, 'standard'); } });
  program = async function* (options) {
    assert.ok(text(options).includes('Revised character'));
    assert.ok(options.tools.some(t => t.name === 'pet_matter_list'));
    yield* say('Resumed ordinary native session with Core');
  };
  await send(resumed, 'Continue after reopening the native session.');
  const resumedSystem = assertPersonaPlacement(requests.at(-1), 'Revised character');
  program = async function* () { yield* say('Continuing with the same persona'); };
  const beforeFollowup = calls;
  await send(resumed, 'And then?');
  assert.equal(calls, beforeFollowup + 1);
  assert.equal(assertPersonaPlacement(requests.at(-1), 'Revised character'), resumedSystem,
    'Warm follow-ups keep a stable system prefix');
  const upgraded = await ctx.agents.resume({ resumeSessionId: legacyId,
    setup: async scope => { await ctx.agentPresets.mount(scope, 'standard'); } });
  await send(upgraded, 'Continue the pre-upgrade conversation.');
  const upgradedRequest = requests.at(-1);
  assertPersonaPlacement(upgradedRequest, 'Revised character');
  const upgradedText = text(upgradedRequest);
  for (const [, marker] of oldSections.slice(0, 3)) assert.ok(!upgradedText.includes(marker),
    'Legacy runtime persona sections must retire on the first resumed request');
  assert.ok(upgradedText.includes('RETAIN_OTHER_CONTEXT'), 'Preserve unrelated entries of a mixed legacy snapshot');
  assert.ok(upgradedText.includes('A pre-upgrade conversation.'), 'The native dialogue remains available');
  assert.deepEqual(upgraded.agent.session.snapshotEvents().find(event => event.seq === oldEvent.seq), oldEvent,
    'Changing the model-visible history must preserve original transcript events');
  await workspace.detachSession(legacyId);
  const beforeDetach = requests.length;
  await send(upgraded, 'Continue after leaving the workspace.');
  for (const options of requests.slice(beforeDetach)) {
    for (const marker of ['Revised character', 'Fixture owner preference', ...oldSections.slice(0, 3).map(([, marker]) => marker)]) {
      assert.ok(!text(options).includes(marker), 'A previously bound agent leaving the workspace must not carry the Pet profile');
    }
    assert.ok(!options.tools.some(tool => tool.name.startsWith('pet_')));
  }
  await upgraded.dispose();
  const plainSession = await open();
  const plainCalls = calls;
  let plainStage = 0;
  const nativeFile = join(root, 'native-result.txt');
  program = async function* (options) {
    assert.ok(text(options).includes('Revised character'));
    assert.ok(!text(options).includes('Track native work'), 'A fresh native session must not automatically recall the optional matter ledger');
    if (plainStage++ === 0) {
      yield* call('write', { file_path: nativeFile, content: 'Actual native tool result\n' });
      return;
    }
    assert.equal(readFileSync(nativeFile, 'utf8'), 'Actual native tool result\n');
    yield* say('Ordinary companion reply without creating a matter');
  };
  await send(plainSession, 'Write native-result.txt and reply without task management.');
  assert.equal(calls, plainCalls + 2, 'One conversation turn: native write then final reply, no duplicate submission');
  const plainResult = plainSession.agent.session.snapshotEvents();
  assert.ok(JSON.stringify(plainResult).includes('Ordinary companion reply without creating a matter'), 'The reply is present in actual native history');
  assert.equal(unwrap(await host.services.core.listCommitments(request(), { limit: 20 })).items.length, 1);
  await plainSession.dispose();
  const otherDirectory = join(root, 'other'); mkdirSync(otherDirectory);
  const ordinary = await open(otherDirectory, false);
  program = async function* (options) { assert.ok(!text(options).includes('Revised character')); assert.ok(!options.tools.some(t => t.name.startsWith('pet_matter_'))); yield* say('Ordinary DSH reply'); };
  await send(ordinary, 'Ordinary chat');
  assert.ok(!text(requests.at(-1)).includes('Fixture owner preference'), 'Other workspaces receive no bound user profile');
  const unattached = await open(root, false);
  const before = calls;
  await send(unattached, 'Outside binding');
  assert.equal(calls, before + 1, 'Unattached ordinary session remains usable without Core');
  const { emotionFor } = await import('../dist/src/emotion/plugin.js');
  const emotion = emotionFor(host), expressions = [];
  const off = emotion.onExpression(event => expressions.push(event));
  const unregisterCatalog=emotion.registerCatalog('native-workspace-fixture',{actions:[{name:'spin',description:'A synthetic observed spin.'}],stickers:[]});
  emotion.recordPlayback({ workspaceId: workspace.id, id: 'visible-spin', name: 'spin', status: 'playing', kind: 'random' });
  const reacting = await open();
  program = async function* (options) {
    assert.ok(text(options).includes('visible-spin'));
    yield* say('谢谢你。\n<pet-expression>{"action":"spin","mood":"得意","reason":"刚才转圈被夸","feedback":{"playbackId":"visible-spin","quote":"这次我喜欢"}}');
  };
  await send(reacting, '这次我喜欢');
  assert.equal(expressions.length, 1);
  assert.equal(expressions[0].action, 'spin');
  assert.equal(reacting.agent.session.snapshotEvents().find(e => e.type === 'assistant/message').data.message.content[0].text, '谢谢你。');
  const fresh = await open();
  program = async function* (options) {
    assert.ok(text(options).includes('刚才转圈被夸') && text(options).includes('这次我喜欢'));
    yield* say('我记得刚刚的转圈。');
  };
  await send(fresh, '刚才呢');
  assert.equal(expressions.length, 1);
  off();unregisterCatalog(); await fresh.dispose(); await reacting.dispose();
  const withdrawn = matters.items[0].sourceIds[0];
  host.setHistoryGuard({ inspect: sourceIds => sourceIds.includes(withdrawn) ? 'ineligible' : 'eligible' });
  const withheld = unwrap(await host.services.workbench.snapshot(request(), {}));
  assert.equal(withheld.matters.length,1);assert.equal(withheld.withheldMatters,0,'Matter records are independent of Memory withdrawal');
  assert.equal((await host.services.workbench.matter(request(), { commitmentId: matters.items[0].commitmentId })).ok,true);
  await unattached.dispose(); await ordinary.dispose(); await resumed.dispose(); await unregister();
  console.log(JSON.stringify({ check: 'native-workspace', status: 'passed', modelCalls: calls, externalModel: false,
    covered: ['ordinary Standard preset without extra mode', 'real workspace membership', 'identity and USER appear once in the stable system prefix across tool steps and follow-ups', 'native matter tool', 'ordinary native file write without matter creation', 'no generated STATE file', 'single model loop', 'manual role refresh replaces prior in-history content', 'native cancellation', 'read-only reconciliation', 'native session resume', 'legacy mixed runtime snapshots migrate on resume with original events and unrelated sections retained', 'detached session removes scoped profile', 'other workspace isolation', 'unattached ordinary chat', 'owner workbench remains readable independently of Memory withdrawal', 'actual playback feedback and recent mood in first fresh request'] }));
} finally { await ctx.fiber.dispose(); rmSync(root, { recursive: true, force: true }); }
