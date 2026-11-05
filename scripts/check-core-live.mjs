// Real-model acceptance through installed DSH services. Credentials are native/read-only.
// Fixture data and observed replies may be saved; tokens, headers and credential values never are.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const arg = (name, fallback) => { const index = process.argv.indexOf(name); return index < 0 ? fallback : process.argv[index + 1]; };
const app = arg('--dsh-app', '/Applications/DeepSeek Harness.app');
if (!process.versions.electron) {
  const child = spawnSync(join(app, 'Contents/MacOS/DeepSeek Harness'), ['--expose-internals', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit', timeout: 300_000 });
  if (child.error) throw child.error; process.exit(child.status ?? 1);
}
const require = createRequire(join(app, 'Contents/Resources/app.asar/dsh/package.json'));
const load = name => import(require.resolve(`@deepseek-ai/${name}`));
const { resolveDshHome } = await load('dsh-home-paths');
const yaml = require('yaml');
const home = arg('--dsh-home', resolveDshHome());
const profile = arg('--profile', 'desktop');
const configPath = join(home, 'profiles', profile, 'cordis.patch.yml'), credentialPath = join(home, '.credentials.yaml');
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const before = { config: hash(configPath), credentials: hash(credentialPath) };
const entries = yaml.parse(readFileSync(configPath, 'utf8'));
const configured = entries.find(entry => entry.name === '@deepseek-ai/dsh-agent-default-model')?.config;
assert.ok(configured?.provider && configured?.model, 'The selected profile must declare its model route');
const { Context } = await load('cordis');
const { LocalCredentialProvider, renderFlatLayoutMigration } = await load('dsh-credentials-local');
assert.equal(renderFlatLayoutMigration(readFileSync(credentialPath, 'utf8')), undefined, 'Credential migration is outside this check');
class ReadOnlyCredentials extends LocalCredentialProvider {
  async set() { throw new Error('Live check credentials are read-only'); }
  async unset() { throw new Error('Live check credentials are read-only'); }
  async modifyRecord() { throw new Error('Live check credentials are read-only'); }
  async deleteRecord() { throw new Error('Live check credentials are read-only'); }
  async write() { throw new Error('Live check credentials are read-only'); }
  async migrateFlatDocument() { throw new Error('Live check credentials are read-only'); }
}
const root = mkdtempSync(join(tmpdir(), 'pet-core-live-')), ctx = new Context(), fibers = [];
const mount = async (module, config) => { const fiber = ctx.plugin(module.default ?? module, config); fibers.push(fiber); await fiber; };
const plugin = await import('../dist/src/core/plugin.js');
const report = { check: 'core-real-model', startedAt: new Date().toISOString(), provider: configured.provider, model: configured.model,
  status: 'running', cases: [], modelRequests: 0, toolCalls: [], credentialValuesRecorded: false };
const unwrap = result => { if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`); return result.value; };
try {
  for (const name of ['dsh-session', 'dsh-session-projection', 'dsh-agent', 'dsh-llm', 'dsh-system-prompt', 'dsh-tools', 'dsh-tool-executor-native']) await mount(await load(name));
  await mount(await load('dsh-session-persistence-jsonl'), { root: join(root, 'sessions'), compression: 'none' });
  await mount(await load('dsh-agent-loop'), { agents: [] });
  await mount(ReadOnlyCredentials, { path: credentialPath, watch: false });
  await mount(await load('dsh-authorization'));
  await mount(await load('dsh-deepseek-account-platform'));
  await mount(await load('dsh-llm-deepseek-account'));
  await mount(await load('dsh-agent-default-model'), configured);
  assert.ok(ctx.llm.listProviders().some(provider => provider.id === configured.provider), 'Configured route is unavailable in this acceptance composition; no fallback is allowed');
  ctx.on('llm/stream', async function* (_options, next) { report.modelRequests++; yield* next(); });
  ctx.on('session/event', (_session, event) => {
    if (event.type === 'tool/result') report.toolCalls.push({ callId: event.data.toolCallId, isError: event.data.isError ?? false });
  });
  const config = { dataDir: join(root, 'core'), cwd: root, companionId: randomUUID(), scopeId: randomUUID(), ownerActorId: randomUUID(),
    displayName: 'Test companion', character: 'A thoughtful assistant. Be accurate, follow the owner’s instructions, and acknowledge missing information.',
    provider: configured.provider, model: configured.model, maxOutputTokens: 4096,
    conversation: { maxSteps: 16, maxToolCalls: 32, maxDurationMs: 120_000 } };
  await mount(plugin, config); let host = ctx.petCore;
  const request = () => host.operator.request(randomUUID());
  const target = { channel: { kind: 'dsh', sceneId: randomUUID() }, transportAccountRef: 'local-live-check', transportAccountId: randomUUID(), ownerExternalId: randomUUID() };
  const binding = unwrap(await host.services.core.bindChannel(request(), { ...target, expectedRevision: null, pairingProofRef: host.operator.issuePairingProof(target) }));
  const send = async text => {
    const result = unwrap(await host.chat(request(), { channel: target.channel, binding: { bindingId: binding.bindingId, revision: binding.revision },
      senderId: target.ownerExternalId, externalMessageId: randomUUID(), receivedAt: new Date().toISOString(), parts: [{ kind: 'text', text }] }));
    report.cases.push({ input: text, result });
    assert.equal(result.activity.receipt.state, 'completed', JSON.stringify(result.activity.receipt));
    console.log(JSON.stringify({ phase: report.cases.length, reply: result.reply, matters: result.commitments.map(m => ({ id: m.commitmentId, state: m.state })), progress: result.progress.length }));
    return result;
  };
  const project = `样本-${randomUUID().slice(0, 8)}`, priceA = 11 + Math.floor(Math.random() * 8), priceB = priceA + 5, quantity = 5 + Math.floor(Math.random() * 5);
  await send(`先给你留一份虚构测试材料，稍后我要继续问：${project}有两种方案，青杉每件${priceA}元，交期6天；白鹭每件${priceB}元，交期2天。目前还没定数量。现在只确认收到即可。`);
  assert.equal(unwrap(await host.services.core.listCommitments(request(), { limit: 100 })).items.length, 0, 'An acknowledgment must not create a matter');
  const waiting = await send(`刚才那份材料，替我把方案比较这件事记下来，之后继续跟进。先分析单价和交期的差别，把已经做的分析写进进度。数量和最晚到货时间我下一条再补充，现在先别宣布做完。`);
  assert.equal(waiting.commitments.length, 1, 'Natural task delegation should establish one matter');
  assert.ok(['open', 'in_progress', 'waiting'].includes(waiting.commitments[0].state));
  assert.ok(waiting.progress.some(p => p.kind === 'progress'), 'Actual analysis progress must be recorded');
  const commitmentId = waiting.commitments[0].commitmentId;
  await fibers.pop().dispose(); await mount(plugin, config); host = ctx.petCore;
  const done = await send(`补充刚才那件事：要${quantity}件，必须3天内到货。请接着原来的事项比较总价与交期，给出建议，写好结果并向我回复。`);
  assert.equal(done.commitments.length, 1); assert.equal(done.commitments[0].commitmentId, commitmentId); assert.equal(done.commitments[0].state, 'completed');
  assert.ok(done.progress.some(p => p.kind === 'result')); assert.ok(done.reply?.visibility === 'available');
  const text = done.reply.parts.filter(p => p.kind === 'text').map(p => p.text).join('\n');
  assert.ok(text.includes(String(priceB * quantity)), 'Final reply must include the feasible option’s computed total');
  assert.ok(text.includes('白鹭'), 'Final reply must identify the feasible supplied option');
  assert.equal(done.contact.target.recipientExternalId, target.ownerExternalId);
  const beforeCasual = unwrap(await host.services.core.listCommitments(request(), { limit: 100 })).items.length;
  await send('顺便说，任务、完成、取消这三个词听起来挺正式的。这只是闲聊，不是在让你取消或新建事项。');
  assert.equal(unwrap(await host.services.core.listCommitments(request(), { limit: 100 })).items.length, beforeCasual);
  report.status = 'passed'; report.expected = { project, quantity, priceA, priceB, feasibleTotal: priceB * quantity, restarted: true };
} catch (error) {
  report.status = 'failed'; report.failure = error instanceof Error ? error.message : 'Unknown acceptance failure';
  process.exitCode = 1;
} finally {
  for (const fiber of fibers.reverse()) await fiber.dispose();
  report.personalFilesUnchanged = hash(configPath) === before.config && hash(credentialPath) === before.credentials;
  report.finishedAt = new Date().toISOString();
  const path = resolve(arg('--report', '.cache/core-live/latest.json')); mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(report, null, 2), { mode: 0o600 });
  rmSync(root, { recursive: true, force: true });
  assert.equal(report.personalFilesUnchanged, true, 'Personal configuration and credentials must remain unchanged');
  console.log(JSON.stringify({ check: report.check, status: report.status, model: report.model, cases: report.cases.length,
    modelRequests: report.modelRequests, personalFilesUnchanged: report.personalFilesUnchanged, report: path,
    ...(report.failure ? { failure: report.failure } : {}) }));
}
