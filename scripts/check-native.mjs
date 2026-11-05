// Isolated acceptance of the installed DSH loop/persistence, with a local deterministic model.
// Never boots the desktop profile, reads credentials, installs plugins or makes a network request.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { exerciseConversation } from './native-conversation-scenarios.mjs';

const appIndex = process.argv.indexOf('--dsh-app');
const app = appIndex < 0 ? '/Applications/DeepSeek Harness.app' : process.argv[appIndex + 1];
assert.ok(app && isAbsolute(app), '--dsh-app must be an absolute installed application path');
const resources = join(app, 'Contents', 'Resources');
if (!process.versions.electron) {
  const binary = join(app, 'Contents', 'MacOS', 'DeepSeek Harness');
  assert.ok(existsSync(binary), 'Installed DSH application not found; pass --dsh-app');
  const child = spawnSync(binary, ['--expose-internals', fileURLToPath(import.meta.url), '--dsh-app', app], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit', timeout: 30_000,
  });
  if (child.error) throw child.error;
  process.exit(child.status ?? 1);
}
// This is the installed runtime, not the independently retained reference checkout.
const require = createRequire(join(resources, 'app.asar', 'dsh', 'package.json'));
const load = name => import(require.resolve(`@deepseek-ai/${name}`));
const { Context } = await load('cordis');
const { LlmAdapter } = await load('dsh-llm');
const { DshDriver } = await import('../dist/src/core/dsh-driver.js');
const plugin = await import('../dist/src/core/plugin.js');
const root = mkdtempSync(join(tmpdir(), 'codex-pet-native-'));
const ctx = new Context();
const fibers = [];
const mount = async (module, config) => {
  const fiber = ctx.plugin(module.default ?? module, config); fibers.push(fiber); await fiber;
};
const seen = [], events = [];
let mode = 'reply', markEntered = () => {}, program = null;
class FixtureAdapter extends LlmAdapter {
  async *stream(options) {
    seen.push(options);
    assert.ok((options.tools ?? []).every(tool => tool.name.startsWith('pet_matter_')), 'Core must expose only delegated matter tools');
    assert.ok(options.messages.some(message => message.content.some(block => block.type === 'text' && block.text.includes('Fixture identity'))), 'Native context must include Core identity');
    if (program) { yield* program(options); return; }
    if (mode === 'wait') {
      markEntered();
      await new Promise((resolve, reject) => {
        const abort = () => reject(new Error('Fixture stream cancelled'));
        if (options.signal.aborted) abort(); else options.signal.addEventListener('abort', abort, { once: true });
      });
    }
    yield { type: 'block-start', index: 0, blockType: 'text' };
    yield { type: 'text-delta', index: 0, text: 'Native fixture reply' };
    yield { type: 'block-end', index: 0, block: { type: 'text', text: 'Native fixture reply' } };
    yield { type: 'finish', reason: { kind: 'stop' } };
  }
}
const unwrap = result => { if (!result.ok) assert.fail(JSON.stringify(result.error)); return result.value; };
try {
  for (const name of ['dsh-session', 'dsh-session-projection', 'dsh-agent', 'dsh-llm', 'dsh-system-prompt', 'dsh-tools', 'dsh-tool-executor-native']) await mount(await load(name));
  await mount(await load('dsh-session-persistence-jsonl'), { root: join(root, 'sessions'), compression: 'none' });
  await mount(await load('dsh-agent-loop'), { agents: [] });
  ctx.on('session/event', (_session, event) => events.push(event));
  const unregister = ctx.llm.registerAdapter(['pet-local-fixture'], new FixtureAdapter());
  const coreConfig = { dataDir: join(root, 'core'), cwd: root, companionId: 'fish-fixture', scopeId: 'owner-fixture',
    ownerActorId: 'owner-fixture', displayName: 'Fixture identity', character: 'One modular companion.',
    provider: 'pet-local-fixture', model: 'local-fixed-reply' };
  await mount(plugin, coreConfig);
  let host = ctx.petCore;
  assert.ok(host, 'Core must publish the native service without Console/Memory/Desktop/QQ');
  let requestSequence = 0;
  const request = () => host.operator.request(`native-${++requestSequence}`);
  const target = { channel: { kind: 'dsh', sceneId: 'fixture' }, transportAccountRef: 'fixture-connection',
    transportAccountId: 'fixture-account', ownerExternalId: 'fixture-human' };
  const binding = unwrap(await host.services.core.bindChannel(request(), { ...target,
    expectedRevision: null, pairingProofRef: host.operator.issuePairingProof(target) }));
  const presented = [];
  ctx.on('pet/conversation.presented', message => presented.push(message));
  const incoming = unwrap(await host.services.core.receiveMessage(request(), { channel: target.channel,
    binding: { bindingId: binding.bindingId, revision: binding.revision }, externalMessageId: 'fixture-owner-input',
    senderId: target.ownerExternalId, receivedAt: new Date().toISOString(), parts: [{ kind: 'text', text: 'Hello from the paired fixture owner.' }] }));
  await host.drain();
  const activity = unwrap(await host.services.core.getActivity(request(), { activityId: incoming.operation.operationId }));
  assert.equal(activity.receipt.state, 'completed'); assert.equal(presented.length, 1);
  assert.equal(seen.length, 1); assert.equal(presented[0].parts[0].text, 'Native fixture reply');
  assert.equal(unwrap(await host.services.core.listCapabilities(request(), {})).find(x => x.id === 'execution.native').state, 'ready');
  const chain = await exerciseConversation({ ctx, getHost: () => host, setProgram: value => { program = value; }, target, binding, request, events,
    restart: async conversation => { await fibers.pop().dispose(); await mount(plugin, { ...coreConfig, ...(conversation ? { conversation } : {}) }); host = ctx.petCore; } });
  console.log(JSON.stringify(chain));

  // Independently exercise the production adapter's disk-backed cold read.
  const driver = new DshDriver(ctx, { cwd: root, provider: 'pet-local-fixture', model: 'local-fixed-reply' });
  const run = await driver.run({ sessionId: 'fixture-cold-session', messageId: 'fixture-cold-message', text: 'Cold read probe',
    character: 'Fixture identity', maxSteps: 1, maxDurationMs: 2000, signal: new AbortController().signal });
  assert.equal(run.state, 'completed');
  const callsBeforeColdRead = seen.length;
  assert.deepEqual(await driver.inspect('fixture-cold-session', 'fixture-cold-message'), run);
  assert.equal(seen.length, callsBeforeColdRead, 'Reconciliation must not call the model again');

  // A native preparation failure can consume input before any user/message is logged.
  const detachFailure = ctx.on('agent/pre-step', async (payload, next) => {
    if (payload.messages.some(message => message.content.some(block => block.type === 'text' && block.text === 'fixture-pre-step-fail')))
      throw new Error('Deliberate isolated pre-step fault');
    return next();
  });
  const preparationFailure = await driver.run({ sessionId: 'fixture-pre-step-session', messageId: 'fixture-pre-step-message', text: 'fixture-pre-step-fail',
    character: 'Fixture identity', maxSteps: 1, maxDurationMs: 2000, signal: new AbortController().signal });
  assert.equal(preparationFailure.state, 'failed'); assert.equal(seen.length, callsBeforeColdRead);
  detachFailure();

  // Cancellation must be confirmed by the real native log, not just AbortController.
  mode = 'wait';
  const controller = new AbortController();
  const entered = new Promise(resolve => { markEntered = resolve; });
  const cancelled = driver.run({ sessionId: 'fixture-cancel-session', messageId: 'fixture-cancel-message', text: 'Wait for cancellation',
    character: 'Fixture identity', maxSteps: 1, maxDurationMs: 2000, signal: controller.signal });
  await entered; controller.abort();
  assert.equal((await cancelled).state, 'cancelled');
  await driver.close(); unregister();
  assert.ok(events.some(event => event.type === 'turn/end' && event.data.reason.kind === 'completed'));
  assert.ok(events.some(event => event.type === 'turn/end' && event.data.reason.kind === 'aborted'));
  console.log(JSON.stringify({ check: 'installed-native-dsh', status: 'passed', node: process.version,
    nativeTurns: events.filter(event => event.type === 'turn/end').length, localModelCalls: seen.length,
    covered: ['native plugin/service without optional modules', 'paired input to native loop', 'logged identity and result',
      'disk-backed cold reconciliation without rerun', 'pre-step fault consumption', 'native cancellation receipt'],
    externalModel: false, accountsConnected: false, desktopProfileChanged: false }));
} finally {
  for (const fiber of fibers.reverse()) await fiber.dispose();
  rmSync(root, { recursive: true, force: true });
}
