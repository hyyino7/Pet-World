import { checkActionPreference } from '../tests/emotion-native.mjs';
import { mountFixtureServices } from './lib/native-fixture-mount.mjs';
// P3: installed native DSH Agent + the same P2 service/client, disposable scope.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, mkdirSync, realpathSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { say } from './native-conversation-scenarios.mjs';
import { nativeResult } from '../dist/src/core/dsh-driver.js';
import { mountInstalledStandard } from './native-standard-preset.mjs';

const app = '/Applications/DeepSeek Harness.app/Contents';
if (!process.versions.electron) {
  const child = spawnSync(join(app, 'MacOS/DeepSeek Harness'), ['--expose-internals', fileURLToPath(import.meta.url)], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit', timeout: 60000,
  });
  if (child.error) throw child.error;
  process.exit(child.status ?? 1);
}
const require = createRequire(join(app, 'Resources/app.asar/dsh/package.json'));
const load = name => import(require.resolve(`@deepseek-ai/${name}`));
const { Context } = await load('cordis');
const { LlmAdapter } = await load('dsh-llm');
mkdirSync('.cache', { recursive: true });
const root = realpathSync(mkdtempSync(resolve('.cache/native-memory-')));
const faultFile = join(root, 'withdrawal-fault');
process.env.CHATPET_MEMORY_FAULT_FILE = faultFile;
let ctx, host, workspace, calls = 0, sequence = 0, success = false;
let program = async function* () { yield* say('Fixture reply'); };
const handles = [];
class Fixture extends LlmAdapter { async *stream(options) { calls++; yield* program(options); } }
const text = options => options.messages.flatMap(m => m.content.filter(b => b.type === 'text').map(b => b.text)).join('\n');
const unwrap = result => { assert.ok(result.ok, JSON.stringify(result.error)); return result.value; };
const request = () => host.operator.request(`memory-${++sequence}`);
async function* call(name, args) {
  const block = { type: 'tool-call', id: randomUUID(), name, arguments: JSON.stringify(args) };
  yield { type: 'block-start', index: 0, blockType: 'tool-call' };
  yield { type: 'tool-call-delta', index: 0, id: block.id, name, argumentsDelta: block.arguments };
  yield { type: 'block-end', index: 0, block };
  yield { type: 'finish', reason: { kind: 'tool-calls' } };
}
async function* callMany(name, argumentsList) {
  for (let index = 0; index < argumentsList.length; index++) {
    const block = { type: 'tool-call', id: randomUUID(), name: Array.isArray(name) ? name[index] : name, arguments: JSON.stringify(argumentsList[index]) };
    yield { type: 'block-start', index, blockType: 'tool-call' };
    yield { type: 'tool-call-delta', index, id: block.id, name: block.name, argumentsDelta: block.arguments };
    yield { type: 'block-end', index, block };
  }
  yield { type: 'finish', reason: { kind: 'tool-calls' } };
}
async function boot(enableMemory = true) {
  ctx = new Context();
  ctx.baseUrl = pathToFileURL(join(app, 'Resources/app.asar/dsh/index.js')).href;
  await mountFixtureServices(ctx, load, root);
  await ctx.plugin(await import('../dist/src/core/plugin.js'), { dataDir: join(root, 'core'), cwd: root,
    companionId: 'fixture-pet', scopeId: 'fixture-owner', ownerActorId: 'fixture-owner', displayName: 'Continuing fish', character: 'Fixture companion identity',
    ...(enableMemory ? { memory: { dataDir: join(root, 'memory'), python: resolve('.venv/bin/python'), serviceEntry: resolve('tests/memory-service-fixture.py') } } : {}) });
  host = ctx.petCore;
  await ctx.plugin(await import('../dist/src/memory/plugin.js'));
  await ctx.plugin(await import('../dist/src/emotion/plugin.js'));
  await ctx.plugin(await import('../dist/src/desktop/plugin.js'));
  const requestMemory = host.native.memory?.connection.call.bind(host.native.memory.connection);
  if (requestMemory) host.native.memory.connection.call = async (operation, args) => {
    try {
      const result = await requestMemory(operation, args);
      if (operation === 'observe' && args.content?.startsWith('Background')) {
        writeFileSync(join(root, 'conclusion-capture.json'), JSON.stringify({ args, result }, null, 2));
      }
      return result;
    } catch (error) {
      writeFileSync(join(root, 'memory-port-failure.json'), JSON.stringify({ operation, args, message: error.message, data: error.data }, null, 2));
      throw error;
    }
  };

  const prefs = unwrap(await host.services.preferences.read(request(), {}));
  if (!prefs.workspace) {
    workspace = await ctx.workspaceRegistry.create(root, 'P3 disposable Repo');
    const saved = unwrap(await host.services.preferences.save(request(), { expectedRevision: prefs.revision, conversation: prefs.conversation,
      workspace: { id: workspace.id, title: workspace.title, path: workspace.path } }));
    unwrap(await host.services.workspace.initialize(request(), { expectedPreferencesRevision: saved.revision }));
  } else workspace = ctx.workspaceRegistry.get(prefs.workspace.id);
  assert.ok(workspace);
  await mountInstalledStandard(ctx, require);
  ctx.llm.registerAdapter(['memory-fixture'], new Fixture());
}
async function open(target = workspace) {
  const handle = await ctx.agents.create({ sessionId: `p3-${randomUUID()}`, meta: { cwd: target.path, agentPreset: 'standard' },
    agentOptions: { provider: 'memory-fixture', model: 'fixture', maxTokens: 1024 }, setup: async scope => { await ctx.agentPresets.mount(scope, 'standard'); } });
  await target.attachSession(handle.agent.id); handles.push(handle); return handle;
}
async function send(handle, value, expected = 'completed') {
  const inputId = `input-${randomUUID()}`;
  handle.agent.followup({ id: inputId, role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: value }] });
  await handle.agent.whenIdle(); await ctx.sessions.flush(handle.agent.session);
  const events = handle.agent.session.snapshotEvents();
  const outcome = nativeResult(events, inputId);
  assert.equal(outcome.state, expected, JSON.stringify({ outcome, errors: events.filter(e => e.type.includes('error') || e.type === 'turn/end' && e.data.reason.kind === 'error') }));
  if (expected === 'completed') assert.ok(outcome.text, 'A completed fixture must include an actual final native reply');
  return events;
}
async function shutdown() { for (const handle of handles.splice(0)) await handle.dispose(); if (ctx) await ctx.fiber.dispose(); }
async function remember(handle, fact) {
  const facts = Array.isArray(fact) ? fact : [fact];
  let step = 0;
  program = async function* (options) {
    assert.ok(text(options).includes('Fixture companion identity'));
    if (step++ === 0) { yield* callMany('pet_memory_remember', facts.map(value => ({ content: value, evidence_quotes: [value] }))); return; }
    yield* say('Preference recorded with its source.');
  };
  const before = calls;
  const events = await send(handle, facts.join(' '));
  assert.equal(calls, before + 2);
  assert.ok(JSON.stringify(events).includes('Preference recorded with its source.'));
}
try {
  await boot(false);
  const legacy = await open();
  program = async function* () { yield* say('Legacy native reply.'); };
  await send(legacy, 'LEGACY_PRIVATE_FRAGMENT');
  const legacySource = host.native.runtime.store.all('source').find(source => source.text === 'LEGACY_PRIVATE_FRAGMENT');
  const legacySessionId = legacy.agent.id;
  await shutdown();
  await boot();
  const first = await open();
  const originalSessionId = first.agent.id;
  await remember(first, ['Owner prefers tea.', 'Owner lives in Hue.']);
  const mixedSource = host.native.runtime.store.all('source').find(source => source.text === 'Owner prefers tea. Owner lives in Hue.');
  assert.ok(mixedSource, 'Both facts originate in one actual native owner message');
  const recalled = await host.native.memory.connection.call('recall', { query: '', limit: 8 });
  const memoryCapability = unwrap(await host.services.core.listCapabilities(request(), {})).find(capability => capability.id === 'memory.lifecycle');
  assert.equal(memoryCapability.state, 'degraded', 'Scoped provider activity must not be reported as an absent module or a complete Memory engine');
  assert.equal(recalled.records.filter(record => record.memory.type === 'semantic').length, 2);
  const tea = recalled.records.find(r => r.memory.content === 'Owner prefers tea.');
  assert.ok(tea);
  const legacyResumed = await ctx.agents.resume({ resumeSessionId: legacySessionId,
    setup: async scope => { await ctx.agentPresets.mount(scope, 'standard'); } });
  handles.push(legacyResumed);
  program = async function* (options) {
    assert.ok(text(options).includes('LEGACY_PRIVATE_FRAGMENT'), 'Enabling Memory must leave an existing plain conversation unchanged');
    yield* say('Legacy plain conversation continues unchanged.');
  };
  await send(legacyResumed, 'Continue with the newly enabled Memory.');
  assert.equal(await host.native.memory.connection.validate({ sources: [{ id: legacySource.sourceId, revision: '1' }], memories: [] }), 'unknown');
  const newSession = await open();
  program = async function* (options) {
    assert.ok(text(options).includes('Owner prefers tea.') && text(options).includes('Owner lives in Hue.'));
    yield* say('Source-backed continuity across sessions.');
  };
  await send(newSession, 'What do you remember about me?');
  assert.ok(!existsSync(join(root, '.chatpet/STATE.md')));
  assert.equal(unwrap(await host.services.core.listCommitments(request(), { limit: 20 })).items.length, 0);
  await shutdown(); await boot();
  const restarted = await open();
  const beforeRestart = calls;
  await send(restarted, 'What do you remember after restart?');
  assert.equal(calls, beforeRestart + 1);
  console.log(JSON.stringify({ check: 'P3-01', status: 'pass-fixture', calls, externalModels: 0 }));
  // Correct via the real native tool; release old provider extraction afterward.
  let correctionStep = 0;
  program = async function* (options) {
    if (correctionStep === 0) { correctionStep++; yield* call('pet_memory_recall', { query: 'tea' }); return; }
    if (correctionStep++ === 1) {
      yield* callMany(['pet_memory_correct', 'pet_memory_remember'], [
        { memory_id: tea.memory.id, expected_version: tea.memory.version, content: 'Owner prefers coffee.', evidence_quotes: ['My preference has changed: I now prefer coffee.'] },
        { content: 'Owner compares quotes in VND.', evidence_quotes: ['I compare quotes in VND.'] },
      ]); return;
    }
    assert.ok(!text(options).includes('Owner prefers tea.'), 'Rebuilt native surface excludes superseded raw context');
    assert.ok(text(options).includes('Owner prefers coffee.'));
    if (correctionStep === 3) {
      assert.ok(text(options).includes('"state":"not_started"'), 'Clean context must retain the actual denied outcome instead of implying both operations committed');
      yield* call('pet_memory_remember', { content: 'Owner compares quotes in VND.', evidence_quotes: ['I compare quotes in VND.'] }); return;
    }
    yield* say('The correction is recorded.');
  };
  await send(restarted, 'My preference has changed: I now prefer coffee. I compare quotes in VND.');
  assert.equal(correctionStep, 4, 'Clean reconstruction must preserve the failed receipt and not replay the completed correction');
  assert.ok((await host.native.memory.connection.call('recall', { query: 'VND', limit: 8 })).records.some(record => record.memory.content === 'Owner compares quotes in VND.'));
  const actions = host.native.runtime.store.require('native-memory-action', restarted.agent.id).operations;
  assert.equal(actions.filter(action => action.operation === 'correct' && action.state === 'committed').length, 1);
  assert.equal(actions.filter(action => action.tool === 'pet_memory_remember' && action.state === 'not_started').length, 1);
  assert.equal(actions.filter(action => action.operation === 'propose' && action.state === 'committed').length, 1);
  await assert.rejects(host.native.memory.connection.call('propose', { operation_id: 'released-old-extraction',
    content: 'Owner prefers tea.', sources: tea.dependencies.sources }), { status: 409 });
  const correctedSession = await open();
  program = async function* (options) {
    assert.ok(text(options).includes('Owner prefers coffee.') && text(options).includes('Owner lives in Hue.'));
    assert.ok(!text(options).includes('Owner prefers tea.'));
    yield* say('Current preference with independent fact retained.');
  };
  await send(correctedSession, 'What is my current preference, and where do I live?');
  console.log(JSON.stringify({ check: 'P3-02', status: 'pass-fixture', externalModels: 0 }));
  // Reuse the P2 fault mechanism at the actual native consumer boundary.
  const current = await host.native.memory.connection.call('recall', { query: '', limit: 8 });
  const coffee = current.records.find(r => r.memory.content === 'Owner prefers coffee.');
  writeFileSync(faultFile, 'tombstone');
  let forgetStep = 0;
  program = async function* (options) {
    if (forgetStep++ === 0) {
      yield* call('pet_memory_forget', { memory_id: coffee.memory.id, expected_version: coffee.memory.version }); return;
    }
    assert.ok(!text(options).includes('Owner prefers coffee.') && !text(options).includes('Owner prefers tea.'));
    assert.ok(text(options).includes('Owner lives in Hue.'));
    yield* say('Withdrawal is pending; the affected fact is withheld.');
  };
  const beforeForget = calls;
  const forgetEvents = await send(correctedSession, 'Forget my beverage preference.');
  assert.equal(calls, beforeForget + 2, 'Pending withdrawal permits only clean reconstructed context');
  assert.equal(forgetStep, 2, 'Clean reconstruction must not replay withdrawal');
  assert.ok(JSON.stringify(forgetEvents).includes('pending'), 'Actual native result reports pending withdrawal');
  await shutdown(); await boot();
  const duringPending = await open();
  program = async function* (options) {
    assert.ok(!text(options).includes('Owner prefers coffee.') && !text(options).includes('Owner prefers tea.'));
    assert.ok(text(options).includes('Owner lives in Hue.'));
    yield* say('The independent fact remains usable.');
  };
  await send(duringPending, 'Tell me an unrelated fact.');
  rmSync(faultFile);
  const completed = await host.native.memory.connection.call('recover', {});
  assert.ok(completed.length && completed.every(op => op.withdrawal_state === 'settled'));
  const afterForget = await open();
  await send(afterForget, 'What is still remembered?');
  const resumed = await ctx.agents.resume({ resumeSessionId: originalSessionId,
    setup: async scope => { await ctx.agentPresets.mount(scope, 'standard'); } });
  handles.push(resumed);
  await send(resumed, 'Continue this older native conversation after forgetting.');
  assert.ok(resumed.agent.session.snapshotEvents().some(event => event.type === 'user/message' && event.data.source.kind === 'chatpet-clean-context'),
    'The actual resumed native session records clean history replacement');
  await assert.rejects(host.native.memory.connection.call('propose', { operation_id: 'reimport-after-restart', content: 'Owner prefers coffee.',
    sources: coffee.dependencies.sources }), { status: 409 });
  await assert.rejects(host.native.memory.connection.call('propose', { operation_id: 'reimport-mixed-original', content: 'Owner prefers tea.',
    sources: [{ id: mixedSource.sourceId, revision: '1' }], evidence_quotes: ['Owner prefers tea.'] }), { status: 409 });
  console.log(JSON.stringify({ check: 'P3-03', status: 'pass-fixture', externalModels: 0 }));
  // Real native tools read supplied files; a later native session uses attributed summary.
  writeFileSync(join(root, 'Cedar.txt'), 'Cedar: 8 USD per unit, delivery in 5 days.');
  writeFileSync(join(root, 'Willow.txt'), 'Willow: 11 USD per unit, delivery in 2 days.');
  const helper = await open(); let helpStep = 0;
  // Enough unrelated facts to fill the old default recall, and a conclusion
  // beyond the provider's rule-summary prefix. No extra model/extractor call.
  for (let index = 0; index < 10; index++) {
    const sourceId = `unrelated-${index}`, content = `Unrelated owner fact number ${index}.`;
    await host.native.memory.connection.call('observe', { source_id: sourceId, revision: '1', content, actor_id: 'owner' });
    await host.native.memory.connection.call('propose', { operation_id: sourceId, content, sources: [{ id: sourceId, revision: '1' }], evidence_quotes: [content] });
  }
  const conclusion = 'Background for the supplied material. '.repeat(24)
    + 'Cedar.txt costs 3 USD less than Willow.txt; Willow.txt arrives 3 days sooner.';
  program = async function* (options) {
    if (helpStep === 0) { helpStep++; yield* call('read', { file_path: join(root, 'Cedar.txt') }); return; }
    if (helpStep === 1) { helpStep++; yield* call('read', { file_path: join(root, 'Willow.txt') }); return; }
    assert.ok(text(options).includes('8 USD per unit') && text(options).includes('11 USD per unit'));
    // Deliberately do not ask the scripted model to persist its own conclusion:
    // actual completed native analysis must join the same provider's context path.
    yield* say(conclusion);
  };
  const helpEvents = await send(helper, 'Compare the supplied Cedar.txt and Willow.txt documents and retain the conclusion.');
  assert.ok(JSON.stringify(helpEvents).includes(conclusion));
  const helpContinuation = await open();
  let seenQuery, detailMemoryId, continuationStep = 0;
  const originalMemoryCall = host.native.memory.connection.call.bind(host.native.memory.connection);
  host.native.memory.connection.call = async (operation, args) => {
    if (operation === 'context' && args.include_recent) seenQuery = args.query;
    const result = await originalMemoryCall(operation, args);
    if (operation === 'context') detailMemoryId = result.records.find(record=>record.conversation?.some(part=>part.text===conclusion))?.memory.id ?? detailMemoryId;
    return result;
  };
  program = async function* (options) {
    if (continuationStep++ === 0) {
      assert.ok(!text(options).includes(conclusion), 'The first request should carry a small recall block');
      assert.ok(text(options).includes('pet_memory_read') && detailMemoryId, 'A clipped block must expose its full-detail route');
      yield* call('pet_memory_read',{memory_id:detailMemoryId}); return;
    }
    assert.ok(text(options).includes(conclusion), 'On-demand reading must preserve the complete eligible prior reply, including its tail');
    assert.ok(seenQuery.includes('Carry on from there'), 'Ordinary native recall must use the actual owner input');
    yield* say(conclusion);
  };
  await send(helpContinuation, 'Carry on from there.');
  host.native.memory.connection.call = originalMemoryCall;
  assert.equal(unwrap(await host.services.core.listCommitments(request(), { limit: 20 })).items.length, 0);
  const greetingSource = await open();
  const agreement = 'We agreed to test cross-session continuity: open a new chat and say hello, then continue our discussion about the bronze telescope.';
  program = async function* () { yield* say(agreement); };
  await send(greetingSource, 'I want to try the bronze telescope discussion again in a fresh session.');
  assert.equal(host.native.runtime.store.get('memory-session', greetingSource.agent.id).archived, false);
  await ctx.workspaceRegistry.archiveSession(greetingSource.agent.id);
  await ctx.workspaceRegistry.archiveSession(greetingSource.agent.id);
  program = async function* (options) {
    assert.ok(text(options).includes(agreement), 'A greeting-only new session must receive the latest eligible cross-session agreement');
    assert.ok(text(options).includes('I want to try the bronze telescope discussion again'), 'Recent owner dialogue must be available alongside the assistant reply');
    yield* say('Hello; we were testing cross-session continuity about the bronze telescope.');
  };
  await send(await open(), 'Hello.');
  assert.equal(host.native.runtime.store.get('memory-session', greetingSource.agent.id).archived, true,
    'The explicit native archive was processed from persisted events before first inference');
  console.log(JSON.stringify({ check: 'P3-04', status: 'pass-fixture', externalModels: 0 }));
  // Withdraw the source after the model is entered, before it can yield text.
  const city = current.records.find(r => r.memory.content === 'Owner lives in Hue.');
  const racing = await open();
  program = async function* () {
    await host.native.memory.connection.call('withdraw', { memory_id: city.memory.id, expected_version: city.memory.version });
    yield* say('STALE_OUTPUT_MUST_NEVER_BE_PRESENTED');
  };
  const racedEvents = await send(racing, 'Recall my location.', 'failed');
  assert.ok(!JSON.stringify(racedEvents).includes('STALE_OUTPUT_MUST_NEVER_BE_PRESENTED'));
  const outage = await open();
  const child = host.native.memory.connection.host.child;
  const exited = new Promise(resolve => child.once('exit', resolve)); child.kill('SIGTERM'); await exited;
  const beforeOutage = calls;
  await send(outage, 'Continue while Memory is unavailable.', 'failed');
  assert.equal(calls, beforeOutage, 'Provider loss cannot fall back to stale native context');
  await host.native.memory.connection.close();
  const recovered = await open();
  program = async function* (options) {
    assert.ok(!text(options).includes('Owner lives in Hue.'));
    yield* say('Recovered with clean eligible context.');
  };
  await send(recovered, 'Continue safely after provider recovery.');
  // Crash-window analogue: provider accepts a real native source, caller loses
  // the acknowledgement before Core can persist it. Restart must reconcile the
  // same source, without replaying a conversation/model turn.
  const unacknowledged = await open();
  const connection = host.native.memory.connection;
  const originalCall = connection.call.bind(connection);
  let acceptedSource, acceptedObservation;
  connection.call = async (operation, args) => {
    const result = await originalCall(operation, args);
    if (operation === 'observe' && args.content === 'Owner uses metric units.' && !acceptedSource) {
      acceptedSource = args.source_id; acceptedObservation = result.observationId;
      throw new Error('Injected lost acknowledgement after provider acceptance');
    }
    return result;
  };
  const beforeLostAck = calls;
  await send(unacknowledged, 'Owner uses metric units.', 'failed');
  assert.equal(calls, beforeLostAck, 'Unacknowledged admission cannot reach the model');
  assert.ok(acceptedSource && acceptedObservation);
  assert.equal(host.native.runtime.store.require('memory-source-work', acceptedSource).state, 'queued');
  connection.call = originalCall;
  await shutdown(); await boot();
  const reconciled = await open();
  program = async function* () { yield* say('Reconciled accepted sources without replay.'); };
  await send(reconciled, 'Use a new native turn after restart.');
  const acknowledged = host.native.runtime.store.require('memory-source-work', acceptedSource);
  assert.equal(acknowledged.state, 'acknowledged');
  assert.equal(acknowledged.observationId, acceptedObservation);
  assert.equal(calls, beforeLostAck + 1);
  console.log(JSON.stringify({ check: 'P3-05', status: 'pass-fixture', calls, externalModels: 0 }));
  await checkActionPreference({ host, workspace, open, send, call, say, setProgram: fn => { program = fn; } });
  const otherDirectory = join(root, 'other-disposable-workspace');
  mkdirSync(otherDirectory);
  const other = await ctx.workspaceRegistry.create(otherDirectory, 'Other workspace');
  program = async function* (options) {
    assert.ok(!options.tools.some(tool => tool.name.startsWith('pet_memory_')));
    assert.ok(!text(options).includes(agreement));
    yield* say('Ordinary workspace chat.');
  };
  await send(await open(other), 'This ordinary question must stay outside Pet Memory.');
  assert.equal(host.native.runtime.store.all('source').some(s => s.text === 'This ordinary question must stay outside Pet Memory.'), false);
  const prefs = unwrap(await host.services.preferences.read(request(), {}));
  const saved = unwrap(await host.services.preferences.save(request(), { expectedRevision: prefs.revision, conversation: prefs.conversation,
    workspace: { id: other.id, title: other.title, path: other.path } }));
  unwrap(await host.services.workspace.initialize(request(), { expectedPreferencesRevision: saved.revision }));
  program = async function* (options) {
    assert.ok(options.tools.some(tool => tool.name === 'pet_memory_remember'));
    assert.ok(!text(options).includes(agreement));
    yield* say('The second bound workspace has a separate Bank.');
  };
  await send(await open(other), 'Continue in the newly bound workspace.');
  assert.ok(existsSync(join(other.path, '.chatpet/data/memory/data/memory.db')));
  console.log(JSON.stringify({ check: 'bound-workspace-archive-and-isolation', status: 'passed', externalModels: 0 }));
  success = true;
} finally {
  await shutdown();
  if (success) rmSync(root, { recursive: true, force: true });
  else console.error(`Preserved disposable failure evidence: ${root}`);
}
