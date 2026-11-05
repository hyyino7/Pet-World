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
let calls = 0, program = async function* () { yield* say('Native reply'); };
class Fixture extends LlmAdapter {
  async *stream(options) { calls++; yield* program(options); }
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
  const corePlugin = await import('../dist/src/core/plugin.js');
  await ctx.plugin(corePlugin, { dataDir: join(root, 'core'), cwd: root, companionId: 'fixture-pet', scopeId: 'fixture-owner',
    ownerActorId: 'fixture-owner', displayName: 'Repo identity', character: 'Repo character' });
  const host = ctx.petCore;
  let requestId = 0;
  const request = () => host.operator.request(`workspace-${++requestId}`);
  const workspace = await ctx.workspaceRegistry.create(root, 'Disposable Repo');
  const prefs = unwrap(await host.services.preferences.read(request(), {}));
  const saved = unwrap(await host.services.preferences.save(request(), { expectedRevision: prefs.revision, conversation: prefs.conversation,
    workspace: { id: workspace.id, title: workspace.title, path: workspace.path } }));
  unwrap(await host.services.workspace.initialize(request(), { expectedPreferencesRevision: saved.revision }));
  writeFileSync(join(root, '.chatpet/USER.md'), '# User\n\nFixture owner preference');
  const unregister = await ctx.agentPresets.register({ id: 'standard', plugins: [
    { name: pathToFileURL(require.resolve('@deepseek-ai/dsh-tool-fs')).href },
  ] });
  assert.ok(!(await ctx.agentPresets.resolve('standard')).broken);
  assert.ok(!readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8').includes('preset-chatpet'));
  ctx.llm.registerAdapter(['workspace-fixture'], new Fixture());
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
  let stage = 0;
  program = async function* (options) {
    assert.ok(text(options).includes('Repo character') && text(options).includes('Fixture owner preference'));
    assert.ok(options.tools.some(t => t.name === 'pet_matter_create'));
    assert.ok(options.tools.some(t => t.name === 'read'), 'Official native filesystem tools remain available');
    if (stage++ === 0) { yield* call('pet_matter_create', { requestedOutcome: 'Track native work', nextAction: 'Report the result' }); return; }
    yield* say('Native tracked reply');
  };
  await send(handle, 'Create a matter and reply.');
  assert.equal(calls, 2, 'No hidden duplicate model turn');
  const matters = unwrap(await host.services.core.listCommitments(request(), { limit: 20 }));
  assert.equal(matters.items.length, 1);
  const overview = unwrap(await host.services.workbench.snapshot(request(), {}));
  assert.equal(overview.matters[0].commitmentId, matters.items[0].commitmentId);
  const detail = unwrap(await host.services.workbench.matter(request(), { commitmentId: matters.items[0].commitmentId }));
  assert.equal(detail.progress[0].kind, 'created');
  const forbiddenWorkbench = await host.services.workbench.snapshot(host.connectModule('console').request('forged-workbench'), {});
  assert.equal(forbiddenWorkbench.ok, false, 'Only authenticated owner delegation can read workbench');
  assert.ok(!existsSync(join(root, '.chatpet/STATE.md')), 'Execution must not generate a Repo task summary');
  const activity = unwrap(await host.services.core.getActivity(request(), { activityId: `native-work:${digest({ sessionId: handle.agent.id, turn: 1 })}` }));
  assert.equal(activity.receipt.state, 'completed');
  writeFileSync(join(root, '.chatpet/SOUL.md'), '# Revised identity\n\nRevised character');
  program = async function* (options) { assert.ok(text(options).includes('Revised character')); yield* say('Updated native reply'); };
  await send(handle, 'Use the changed role.');
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
  const rebind = await host.services.preferences.save(request(), { conversation: runningPrefs.conversation, expectedRevision: runningPrefs.revision, workspace: null });
  assert.equal(rebind.ok, false, 'An active native turn cannot be detached from its admission by rebinding');
  assert.equal(rebind.error.code, 'LIMIT_REACHED');
  handle.agent.cancel({ kind: 'user' });
  await stopped;
  const stoppedActivity = unwrap(await host.services.core.getActivity(request(), { activityId: `native-work:${digest({ sessionId: handle.agent.id, turn: 3 })}` }));
  assert.equal(stoppedActivity.receipt.state, 'cancelled');
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
  const plainSession = await open();
  program = async function* (options) {
    assert.ok(text(options).includes('Revised character'));
    assert.ok(!text(options).includes('Track native work'), 'A fresh native session must not automatically recall the optional matter ledger');
    yield* say('Ordinary companion reply without creating a matter');
  };
  await send(plainSession, 'Ordinary conversation without task management.');
  assert.equal(unwrap(await host.services.core.listCommitments(request(), { limit: 20 })).items.length, 1);
  await plainSession.dispose();
  const otherDirectory = join(root, 'other'); mkdirSync(otherDirectory);
  const ordinary = await open(otherDirectory, false);
  program = async function* (options) { assert.ok(!text(options).includes('Revised character')); assert.ok(!options.tools.some(t => t.name.startsWith('pet_matter_'))); yield* say('Ordinary DSH reply'); };
  await send(ordinary, 'Ordinary chat');
  const unattached = await open(root, false);
  const before = calls;
  await send(unattached, 'Outside binding');
  assert.equal(calls, before + 1, 'Unattached ordinary session remains usable without Core');
  const withdrawn = matters.items[0].sourceIds[0];
  host.setHistoryGuard({ inspect: sourceIds => sourceIds.includes(withdrawn) ? 'ineligible' : 'eligible' });
  const withheld = unwrap(await host.services.workbench.snapshot(request(), {}));
  assert.equal(withheld.matters.length, 0); assert.equal(withheld.withheldMatters, 1);
  assert.equal((await host.services.workbench.matter(request(), { commitmentId: matters.items[0].commitmentId })).ok, false);
  await unattached.dispose(); await ordinary.dispose(); await resumed.dispose(); await unregister();
  console.log(JSON.stringify({ check: 'native-workspace', status: 'passed', modelCalls: calls, externalModel: false,
    covered: ['ordinary Standard preset without extra mode', 'real workspace membership', 'Repo identity and USER loading', 'native matter tool', 'no generated STATE file', 'single model loop', 'manual role refresh', 'native cancellation', 'read-only reconciliation', 'native session resume', 'other workspace isolation', 'unattached ordinary chat', 'owner workbench projection and source withdrawal'] }));
} finally { await ctx.fiber.dispose(); rmSync(root, { recursive: true, force: true }); }
