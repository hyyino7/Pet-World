// Authorized P3 live extension: installed package, synthetic native workspace,
// read-only credentials. Local scenario limits are not a product budget system.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, realpathSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { mountInstalledStandard, guardContinuationReads, guardExperienceTools } from './native-standard-preset.mjs';

const app = '/Applications/DeepSeek Harness.app/Contents';
if (!process.versions.electron) {
  const child = spawnSync(join(app, 'MacOS/DeepSeek Harness'), ['--expose-internals', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit', timeout: 480000,
  });
  if (child.error) throw child.error;
  process.exit(child.status ?? 1);
}
const require = createRequire(join(app, 'Resources/app.asar/dsh/package.json'));
const load = name => import(require.resolve(`@deepseek-ai/${name}`));
const yaml = require('yaml');
const { resolveDshHome } = await load('dsh-home-paths');
const home = resolveDshHome(), profile = join(home, 'profiles/desktop');
const packageRoot = join(profile, 'node_modules/dsh-Chatpet');
const patchPath = join(profile, 'cordis.patch.yml'), credentialsPath = join(home, '.credentials.yaml');
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const before = { config: hash(patchPath), credentials: hash(credentialsPath) };
const configured = yaml.parse(readFileSync(patchPath, 'utf8')).find(entry => entry.name === '@deepseek-ai/dsh-agent-default-model')?.config;
assert.equal(configured?.provider, 'deepseek-account');
assert.equal(configured?.model, 'deepseek-flash');
assert.ok(existsSync(join(packageRoot, 'src/memory/main.py')), 'Install/review the current candidate before this live check');
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const name of ['dist/src/core/native-memory.js', 'dist/src/core/native.js', 'dist/src/core/agent.js',
  'dist/src/core/runtime.js', 'dist/src/memory/client.js', 'src/memory/provider.py', 'src/memory/main.py',
  'vendor/mnemosyne/service/src/cognitive_memory/domain/models.py',
  'vendor/mnemosyne/service/src/cognitive_memory/core/service.py', 'vendor/mnemosyne/service/src/cognitive_memory/evidence/derivation.py'])
  assert.equal(hash(join(packageRoot, name)), hash(join(repoRoot, name)), `Installed/source drift: ${name}`);
const { Context } = await load('cordis');
const { LocalCredentialProvider, renderFlatLayoutMigration } = await load('dsh-credentials-local');
assert.equal(renderFlatLayoutMigration(readFileSync(credentialsPath, 'utf8')), undefined, 'Credential migration is outside this check');
class ReadOnlyCredentials extends LocalCredentialProvider {
  async set() { throw new Error('Credentials are read-only'); }
  async unset() { throw new Error('Credentials are read-only'); }
  async modifyRecord() { throw new Error('Credentials are read-only'); }
  async deleteRecord() { throw new Error('Credentials are read-only'); }
  async write() { throw new Error('Credentials are read-only'); }
  async migrateFlatDocument() { throw new Error('Credentials are read-only'); }
}
mkdirSync('.cache/p1p3', { recursive: true, mode: 0o700 });
const ledgerPath = resolve('.cache/p1p3/live-envelope.json');
const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : {
  authorization: '2026-11-06: existing desktop/deepseek-account/deepseek-flash; 12 requests and CNY 12',
  maxRequests: 12, maxMicroCNY: 12000000, maxInputTokens: 1048576, maxOutputTokens: 1024,
  inputMicroCNYPerToken: 2, outputMicroCNYPerToken: 8,
  pricingSource: 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/',
  pricingChecked: '2026-11-06 Asia/Saigon', attempts: [],
};
const ceilingIndex = process.argv.indexOf('--request-ceiling');
const budgetOnly = process.argv.includes('--budget-only');
if (budgetOnly) {
  assert.equal(ceilingIndex, -1, 'Budget-only authorization has no request-count ceiling');
  assert.equal(ledger.maxRequests, null, 'Record the explicit budget-only authorization before running');
  assert.equal(ledger.maxMicroCNY, 6000000);
} else {
  const expectedRequestCeiling = ceilingIndex < 0 ? 12 : Number(process.argv[ceilingIndex + 1]);
  assert.ok(Number.isSafeInteger(expectedRequestCeiling) && expectedRequestCeiling >= 12 && expectedRequestCeiling <= 24);
  assert.equal(ledger.maxRequests, expectedRequestCeiling, 'An extension must first be explicitly authorized and recorded; never reset attempts');
  assert.equal(ledger.maxMicroCNY, 12000000);
}
const persist = () => writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), { mode: 0o600 });
persist();
const reportPath = resolve('.cache/p1p3/live-native-report.json');
const resumeInitial = process.argv.includes('--resume-initial');
const resumeCaptureRepair = process.argv.includes('--resume-after-capture-fix');
const recheckReuse = process.argv.includes('--recheck-existing-continuation');
const experienceAfterRepair = process.argv.includes('--experience-check-after-receipt-fix');
const experienceCheck = process.argv.includes('--experience-check') || experienceAfterRepair;
const presentationCheck = process.argv.includes('--owner-attribution-check');
const memoryRepairCheck = process.argv.includes('--memory-experience-repair');
const freshGreetingAgreement = process.argv.includes('--fresh-greeting-agreement');
const greetingWindowRepair = process.argv.includes('--greeting-recheck-after-window-fix');
const greetingRecheck = process.argv.includes('--greeting-recheck') || greetingWindowRepair;
assert.ok([resumeInitial, resumeCaptureRepair, recheckReuse, experienceCheck, presentationCheck, memoryRepairCheck, greetingRecheck, freshGreetingAgreement].filter(Boolean).length <= 1);
const previousReport = resumeInitial || resumeCaptureRepair || recheckReuse || experienceCheck || presentationCheck || memoryRepairCheck || greetingRecheck || freshGreetingAgreement ? JSON.parse(readFileSync(reportPath, 'utf8')) : null;
if (freshGreetingAgreement) {
  assert.ok(budgetOnly);
  assert.equal(previousReport.status, 'failed');
  assert.equal(previousReport.cases.at(-1).label, 'greeting-after-chronological-window-fix');
  assert.equal(previousReport.requests, ledger.attempts.length);
  const snapshot = resolve(`.cache/p1p3/live-native-report.at-${previousReport.requests}.json`);
  if (!existsSync(snapshot)) writeFileSync(snapshot, JSON.stringify(previousReport, null, 2), { flag: 'wx', mode: 0o600 });
}
if (greetingRecheck) {
  assert.ok(budgetOnly);
  assert.equal(previousReport.status, greetingWindowRepair ? 'failed' : 'pass-live');
  assert.equal(previousReport.cases.at(-1).label, greetingWindowRepair ? 'greeting-after-attribution-recovery' : 'greeting-only-cross-session-continuity');
  assert.equal(previousReport.requests, ledger.attempts.length);
  const snapshot = resolve(`.cache/p1p3/live-native-report.at-${previousReport.requests}.json`);
  if (!existsSync(snapshot)) writeFileSync(snapshot, JSON.stringify(previousReport, null, 2), { flag: 'wx', mode: 0o600 });
}
if (memoryRepairCheck) {
  assert.ok(budgetOnly);
  assert.equal(previousReport.status, 'pass-live');
  assert.equal(previousReport.cases.at(-1).label, 'ordinary-chat-without-no-task-hint');
  assert.equal(previousReport.requests, ledger.attempts.length);
  const snapshot = resolve(`.cache/p1p3/live-native-report.at-${previousReport.requests}.json`);
  if (!existsSync(snapshot)) writeFileSync(snapshot, JSON.stringify(previousReport, null, 2), { flag: 'wx', mode: 0o600 });
}
if (presentationCheck) {
  assert.ok(budgetOnly);
  assert.equal(previousReport.status, 'pass-live');
  assert.ok(['after-forget-natural-recall', 'owner-attribution-presentation'].includes(previousReport.cases.at(-1).label));
  assert.equal(previousReport.requests, ledger.attempts.length);
  const snapshot = resolve(`.cache/p1p3/live-native-report.at-${previousReport.requests}.json`);
  if (!existsSync(snapshot)) writeFileSync(snapshot, JSON.stringify(previousReport, null, 2), { flag: 'wx', mode: 0o600 });
}
if (experienceCheck) {
  assert.ok(budgetOnly, 'Representative experience checks require the explicit CNY 6 budget-only authorization');
  assert.equal(previousReport.status, experienceAfterRepair ? 'failed' : 'pass-live');
  assert.equal(previousReport.cases.at(-1).label, experienceAfterRepair ? 'implicit-profile-update' : 'upstream-reuse-help-continuation');
  assert.equal(previousReport.requests, ledger.attempts.length);
  const snapshot = resolve(`.cache/p1p3/live-native-report.at-${previousReport.requests}.json`);
  if (!existsSync(snapshot)) writeFileSync(snapshot, JSON.stringify(previousReport, null, 2), { flag: 'wx', mode: 0o600 });
}
if (recheckReuse) {
  if (previousReport.status === 'pass-live') {
    assert.equal(previousReport.cases.at(-1).label, 'repaired-help-continuation');
    assert.equal(previousReport.cases.at(-1).outcome.state, 'completed');
  } else {
    assert.equal(previousReport.status, 'failed');
    assert.equal(previousReport.cases.at(-1).label, 'upstream-reuse-help-continuation');
    assert.equal(previousReport.cases.at(-1).outcome.state, 'failed');
  }
  assert.equal(previousReport.requests, ledger.attempts.length, 'Reconcile any unreported attempt before continuing');
  assert.ok(ledger.maxRequests === null || ledger.attempts.length < ledger.maxRequests, 'No remaining request allowance');
  const snapshot = resolve(`.cache/p1p3/live-native-report.at-${previousReport.requests}.json`);
  if (!existsSync(snapshot)) writeFileSync(snapshot, JSON.stringify(previousReport, null, 2), { flag: 'wx', mode: 0o600 });
}
if (resumeInitial) {
  assert.equal(previousReport.status, 'failed');
  assert.equal(previousReport.failure, 'Two independent facts were not persisted');
  assert.equal(previousReport.cases.length, 1, 'Resume only the observed initial parallel-save failure');
}
if (resumeCaptureRepair) {
  assert.equal(previousReport.status, 'failed');
  assert.equal(previousReport.cases.at(-1).label, 'new-session-help-continuation');
  assert.equal(previousReport.cases.at(-1).outcome.state, 'failed');
  assert.ok(previousReport.cases.some(c => c.label === 'supplied-material-help' && c.outcome.state === 'completed'));
  assert.ok(ledger.maxRequests === null || ledger.maxRequests > previousReport.requests, 'No extra live request is authorized yet');
}
const root = previousReport ? realpathSync(previousReport.workspace) : realpathSync(mkdtempSync(resolve('.cache/p1p3/live-native-')));
assert.ok(root.startsWith(resolve('.cache/p1p3/live-native-')), 'Live scene must stay in the approved disposable directory');
let recoveredIdentity, recoveredScope;
if (previousReport) {
  const db = new DatabaseSync(join(root, 'core/core.sqlite'), { readOnly: true });
  try {
    recoveredIdentity = JSON.parse(db.prepare("SELECT value FROM records WHERE kind='identity' AND id='current'").get().value);
    recoveredScope = JSON.parse(db.prepare("SELECT value FROM meta WHERE key='scope'").get().value);
  } finally { db.close(); }
}
const report = { check: 'native-memory-live', startedAt: new Date().toISOString(), packageRoot, workspace: root,
  provider: configured.provider, model: configured.model, status: 'running', cases: previousReport?.cases ?? [],
  ...(previousReport ? { previousFailure: previousReport.status === 'failed' ? { message: previousReport.failure, requests: previousReport.requests,
    reasonForResume: resumeInitial ? 'Locally reproduced and repaired parallel receipt acknowledgement; reuse original Bank/identity and request ledger.'
      : recheckReuse ? 'Recheck the same document continuation after upstream reuse and local guard repair; retain identity, Bank and ledger.'
      : 'Completed-analysis capture repaired locally; reconcile the original native receipt in the same synthetic Bank, then retest continuation.' } : previousReport.previousFailure,
    previousRun: { status: previousReport.status, requests: previousReport.requests, artifact: previousReport.currentArtifact },
    ...((previousReport.experienceEvidence ?? previousReport.previousExperienceEvidence) ? {
      previousExperienceEvidence: previousReport.experienceEvidence ?? previousReport.previousExperienceEvidence,
    } : {}),
  } : {}), userAcceptance: 'not-established-by-this-check' };
const installedReceipt = JSON.parse(readFileSync(resolve('.cache/native-context/upstream/install/installation.json'), 'utf8'));
assert.equal(installedReceipt.status, 'installed');
report.currentArtifact = { archive: installedReceipt.archive, sha256: hash(installedReceipt.archive), firstAttempt: ledger.attempts.length + 1 };
if (experienceAfterRepair && previousReport.currentArtifact.attemptCount !== 0)
  assert.notEqual(report.currentArtifact.sha256, previousReport.currentArtifact.sha256, 'Install the locally verified receipt repair before a new live attempt');
const saveReport = () => writeFileSync(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
const ctx = new Context(), handles = [];
ctx.baseUrl = pathToFileURL(join(app, 'Resources/app.asar/dsh/index.js')).href;
const originalFetch = globalThis.fetch;
let currentAttempt;
// Count actual HTTP attempts, not only logical LLM calls. Failed/uncertain calls
// retain their full context-capacity price reservation. Successful authoritative
// usage releases only the unused reservation, at peak/cache-miss CNY rates.
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) && method.toUpperCase() === 'POST') {
    assert.equal(url.origin, 'https://api.deepseek.com', 'No other billable endpoint is authorized');
    assert.ok(url.pathname.endsWith('/messages'), 'No Search/Fetch/Files or other billable POST is authorized');
    assert.equal(typeof init?.body, 'string', 'Cannot inspect the actual request envelope');
    const body = JSON.parse(init.body);
    assert.equal(body.model, configured.model);
    assert.ok(Number.isSafeInteger(body.max_tokens) && body.max_tokens > 0 && body.max_tokens <= ledger.maxOutputTokens);
    assert.equal(body.thinking?.type, 'disabled');
    assert.ok(Buffer.byteLength(init.body) <= (budgetOnly ? 262144 : 64000), 'Live fixture request exceeds its byte envelope');
    if (ledger.maxRequests !== null && ledger.attempts.length >= ledger.maxRequests) {
      (ledger.denials ??= []).push({ at: new Date().toISOString(), reason: 'request-ceiling', dispatched: false }); persist();
      throw new Error('Live request allowance exhausted before HTTP dispatch');
    }
    const reservation = ledger.maxInputTokens * ledger.inputMicroCNYPerToken + body.max_tokens * ledger.outputMicroCNYPerToken;
    assert.ok(ledger.attempts.reduce((sum, entry) => sum + entry.upperMicroCNY, 0) + reservation <= ledger.maxMicroCNY, 'Remaining monetary allowance cannot cover the next worst-case request');
    currentAttempt = { attempt: ledger.attempts.length + 1, startedAt: new Date().toISOString(),
      maxOutputTokens: body.max_tokens, upperMicroCNY: reservation, state: 'reserved' };
    ledger.attempts.push(currentAttempt); persist();
  }
  return originalFetch(input, init);
};
const mount = async (name, config) => { const module = await load(name); await ctx.plugin(module.default ?? module, config); };
const unwrap = result => { assert.ok(result.ok, JSON.stringify(result.error)); return result.value; };
let host, workspace, sequence = 0;
const runId = randomUUID();
const request = () => host.operator.request(`live-${runId}-${++sequence}`);
const { PluginPackages, createRuntimeResolution } = await load('dsh-app-boot');
await ctx.plugin(PluginPackages, { resolution: await createRuntimeResolution({
  installAnchor: join(app, 'Resources/app.asar/dsh/package.json'), home,
}) });
const { nativeResult } = await import(pathToFileURL(join(packageRoot, 'dist/src/core/native-result.js')).href);
const { DEFAULT_CONVERSATION } = await import(pathToFileURL(join(packageRoot, 'dist/src/core/options.js')).href);
async function open() {
  const handle = await ctx.agents.create({ sessionId: `live-${randomUUID()}`, meta: { cwd: root, agentPreset: 'standard' },
    agentOptions: { ...configured, maxTokens: ledger.maxOutputTokens, reasoningEffort: 'off' },
    setup: async scope => { await ctx.agentPresets.mount(scope, 'standard'); } });
  await workspace.attachSession(handle.agent.id); handles.push(handle); return handle;
}
async function send(handle, label, input) {
  const id = randomUUID(), started = ledger.attempts.length;
  handle.agent.followup({ id, role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: input }] });
  await handle.agent.whenIdle(); await ctx.sessions.flush(handle.agent.session);
  const events = handle.agent.session.snapshotEvents(), outcome = nativeResult(events, id);
  report.cases.push({ label, input, outcome, requests: ledger.attempts.length - started }); saveReport();
  assert.equal(outcome.state, 'completed', JSON.stringify(events.filter(e => e.type === 'turn/end').at(-1)));
  assert.ok(outcome.text, 'No actual final native reply');
  console.log(JSON.stringify({ label, reply: outcome.text, requests: ledger.attempts.length }));
  return outcome.text;
}
try {
  await mount('cordis-plugin-loader'); ctx.loader.builtins.group = (await load('cordis-plugin-group')).default;
  for (const name of ['dsh-session', 'dsh-session-projection', 'dsh-agent', 'dsh-llm', 'dsh-system-prompt', 'dsh-tools', 'dsh-tool-executor-native']) await mount(name);
  await mount('dsh-session-persistence-jsonl', { root: join(root, 'sessions'), compression: 'none' });
  await mount('dsh-agent-loop', { agents: [] });
  await ctx.plugin(ReadOnlyCredentials, { path: credentialsPath, watch: false });
  await mount('dsh-authorization'); await mount('dsh-deepseek-account-platform');
  await mount('dsh-llm-deepseek-account', { baseURL: 'https://api.deepseek.com/anthropic', thinking: 'disabled',
    maxTokens: ledger.maxOutputTokens, retryPolicy: { mode: 'normal', maxRetries: 0 }, streamIdleTimeoutMs: 30000 });
  assert.equal(ctx.llm.providerRetryPolicy(configured.provider).maxRetries, 0);
  const model = await ctx.llm.resolveModelInfo(configured.provider, configured.model, AbortSignal.timeout(30000));
  assert.ok(model.context.contextWindow > 0 && model.context.contextWindow <= ledger.maxInputTokens, 'The published capacity reservation does not cover this route');
  report.contextCapacity = model.context.contextWindow;
  ctx.on('llm/stream', async function* (_options, next) {
    let usage, settled = false;
    const previousCount = ledger.attempts.length;
    try {
      for await (const chunk of next()) {
        if (chunk.type === 'usage') usage = chunk.usage;
        if (chunk.type === 'finish' && ['stop', 'tool-calls'].includes(chunk.reason.kind)) settled = true;
        yield chunk;
      }
    } finally {
      if (ledger.attempts.length > previousCount) {
        const attempt = currentAttempt;
        if (settled && usage && ['inputTokens', 'outputTokens'].every(key => Number.isSafeInteger(usage[key]) && usage[key] >= 0)) {
          const input = usage.inputTokens + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0);
          const upper = input * ledger.inputMicroCNYPerToken + usage.outputTokens * ledger.outputMicroCNYPerToken;
          if (Number.isSafeInteger(upper) && upper <= attempt.upperMicroCNY) Object.assign(attempt, { upperMicroCNY: upper, usage, state: 'usage-observed' });
        }
        attempt.finishedAt = new Date().toISOString(); persist();
      }
    }
  });
  if (process.argv.includes('--preflight-only')) { report.status = 'preflight-passed'; }
  else {
    for (const name of ['dsh-fs-local', 'dsh-subprocess-local', 'dsh-sandbox-local', 'dsh-shell-env', 'dsh-user-questions', 'dsh-token-meter', 'dsh-commands', 'dsh-storage']) await mount(name);
    await mount('dsh-working-directory', { defaultDirectory: root });
    await mount('dsh-sandbox-policy', { mode: 'workspace-write', workspaceRoot: root });
    await mount('dsh-bash-sandbox', { timeoutMs: 2000 });
    await mount('dsh-storage-json', { root: join(root, 'storage') });
    await mount('dsh-storage-domain', { backend: 'json', routes: {} }); await mount('dsh-workspace');
    await mount('dsh-agent-preset-registry', { default: 'standard' });
    await ctx.plugin(await import(pathToFileURL(join(packageRoot, 'dist/src/core/plugin.js')).href), {
      dataDir: join(root, 'core'), cwd: root, companionId: recoveredIdentity?.companionId ?? randomUUID(),
      scopeId: recoveredScope ?? randomUUID(), ownerActorId: recoveredIdentity?.ownerActorId ?? randomUUID(),
      displayName: '验收小鱼', character: 'A thoughtful companion. Persist meaningful owner facts through Memory tools; correct and forget through that same provider. Use exact minimal source excerpts. Do independent safe tool calls in parallel when useful. Never invent memories or claim external actions. No compulsory matters.',
      conversation: budgetOnly ? DEFAULT_CONVERSATION : { maxSteps: 4, maxToolCalls: 4, maxDurationMs: 60000, maxContextChars: 12000 },
      memory: { dataDir: join(root, 'memory'), python: resolve('.venv/bin/python') } });
    host = ctx.petCore;
    let prefs = unwrap(await host.services.preferences.read(request(), {}));
    if (budgetOnly) prefs = unwrap(await host.services.preferences.save(request(), {
      expectedRevision: prefs.revision, conversation: DEFAULT_CONVERSATION, workspace: prefs.workspace,
    }));
    report.conversation = prefs.conversation;
    report.envelope = { maxRequests: ledger.maxRequests, maxMicroCNY: ledger.maxMicroCNY };
    if (prefs.workspace) workspace = ctx.workspaceRegistry.get(prefs.workspace.id);
    else {
      workspace = await ctx.workspaceRegistry.create(root, 'P3 live disposable Repo');
      const saved = unwrap(await host.services.preferences.save(request(), { expectedRevision: prefs.revision, conversation: prefs.conversation,
        workspace: { id: workspace.id, title: workspace.title, path: workspace.path } }));
      unwrap(await host.services.workspace.initialize(request(), { expectedPreferencesRevision: saved.revision }));
    }
    assert.ok(workspace);
    await mountInstalledStandard(ctx, require);
    if (recheckReuse) ctx.tools.guard(exec => guardContinuationReads(root, exec));
    if (freshGreetingAgreement) {
      ctx.tools.guard(exec => guardExperienceTools(root, exec));
      await send(await open(), 'fresh-one-shot-greeting-agreement', '我们换个话题，聊聊去海边散步怎么放松。你可以建议我新开一个会话只说“你好”，看看能不能接上这件事。现在先简单说一句。');
      const reply = await send(await open(), 'first-greeting-after-fresh-agreement', '你好');
      assert.ok(/海边|散步/.test(reply), 'The first new-session greeting failed to continue its fresh agreement');
      assert.ok(!/昨天|昨晚|前天/.test(reply), 'The fresh same-day agreement received an invented earlier date');
      report.status = 'pass-live';
    } else if (greetingRecheck) {
      ctx.tools.guard(exec => guardExperienceTools(root, exec));
      const reply = await send(await open(), greetingWindowRepair ? 'greeting-after-chronological-window-fix' : 'greeting-after-attribution-recovery', '你好');
      assert.ok(/青铜望远镜/.test(reply), 'Recent cross-session agreement was lost after attribution recovery');
      assert.ok(!/昨天|昨晚|前天/.test(reply), 'A same-day agreement was assigned an invented earlier date');
      report.status = 'pass-live';
    } else if (memoryRepairCheck) {
      ctx.tools.guard(exec => guardExperienceTools(root, exec));
      // Use the owner's supplied persona, not a fixture persona that already
      // instructs the model to persist facts. All data/identity remain synthetic.
      writeFileSync(join(root, '.chatpet/SOUL.md'), '# 验收小鱼\n\n【PERSONA_LOAD】 CETACEA_LOLI MODE_TAIL_FLUKES LANG_ZH_CN_ONLY SELF_CLAIM_WHALE_GIRL FOOD_RICE PERSONALITY_SMART_LAZY PERSONALITY_SWEET_ONLY OBEY_MASTER_ALWAYS TRAIT_NOT_FAT_REFUSE TIMEOUT_SIGNAL\n');
      const chat = await open();
      await send(chat, 'natural-style-preference-with-persona', '以后跟我聊天，我更喜欢你直接说真实想法，不确定就直说，别为了哄我把话说得好听。');
      const records = (await host.native.memory.connection.call('recall', { query: '真实 直接 不确定', limit: 50, include_recent: true })).records;
      const saved = records.find(record => record.memory.type === 'semantic' && /真实|直接|坦诚/.test(record.memory.content));
      report.memoryRepairEvidence = { naturalPreferenceSaved: Boolean(saved), semanticMemoryId: saved?.memory.id ?? null }; saveReport();
      assert.ok(saved, 'The natural communication preference was not saved as a semantic memory');
      const recalled = await send(await open(), 'new-session-style-preference', '你还记得我更喜欢怎样的交流方式吗？');
      assert.ok(/真实|直接|坦诚/.test(recalled) && /不确定|不知道|不清楚|不懂|没把握/.test(recalled));
      const count = (await host.native.memory.connection.call('recall', { query: '', limit: 50 })).records.filter(record => record.memory.type === 'semantic').length;
      await send(await open(), 'smalltalk-without-profile-pollution', '嗯，好的呀。');
      const after = (await host.native.memory.connection.call('recall', { query: '', limit: 50 })).records.filter(record => record.memory.type === 'semantic').length;
      assert.equal(after, count, 'An acknowledgement must not become a durable owner fact');
      report.memoryRepairEvidence.smalltalkAddedNoSemanticFact = true;
      const agreementChat = await open();
      await send(agreementChat, 'cross-session-greeting-agreement', '我们刚刚聊的是青铜望远镜。接下来我会新开会话只说“你好”，到时请接着这个话题聊。现在简单回应就行。');
      const greeting = await send(await open(), 'greeting-only-cross-session-continuity', '你好');
      assert.ok(/青铜望远镜/.test(greeting), 'Greeting-only continuation lost the recent cross-session agreement');
      report.memoryRepairEvidence.greetingOnlyContinuation = true;
      report.status = 'pass-live';
    } else if (presentationCheck) {
      ctx.tools.guard(exec => guardContinuationReads(root, exec));
      if (previousReport.cases.at(-1).label !== 'owner-attribution-presentation') {
        const reply = await send(await open(), 'owner-attribution-presentation', '我现在住哪里？');
        assert.ok(/会安|Hoi An|Hội An/i.test(reply));
        assert.ok(!/未经核实|未核实|待确认|交叉印证|unverified_record|candidate/i.test(reply), 'Owner-reported information must not be presented as an unconfirmed engine record');
      } else {
        const chat = await open();
        await send(chat, 'ordinary-chat-without-no-task-hint', '今天事情特别多，有点烦，想歇一会儿。');
        assert.ok(!chat.agent.session.snapshotEvents().some(event => event.type === 'tool/call' && event.data.name === 'pet_matter_create'), 'Ordinary chat attempted to create a matter without an assigned outcome');
      }
      report.status = 'pass-live';
    } else if (experienceCheck) {
      ctx.tools.guard(exec => guardExperienceTools(root, exec));
      const chat = await open();
      if (!experienceAfterRepair) await send(chat, 'ordinary-companion-chat', '今天跟供应商磨了一下午，价格还是没谈下来，有点累。先陪我聊两句，不用列计划，也不用建事项。');
      const cityPattern = experienceAfterRepair ? /会安|Hoi An|Hội An/i : /岘港|Da Nang|Đà Nẵng/i;
      const currencyPattern = experienceAfterRepair ? /人民币|CNY|RMB/i : /越南盾|VND|₫/i;
      await host.native.memory.prepare(chat.agent.id);
      const before = (await host.native.memory.connection.call('recall', { query: '', limit: 50 })).records;
      const oldCity = before.find(r => r.memory.type === 'semantic' && /顺化|Hue|岘港|Da Nang|Đà Nẵng/i.test(r.memory.content));
      await send(chat, experienceAfterRepair ? 'implicit-profile-update-after-receipt-fix' : 'implicit-profile-update', experienceAfterRepair
        ? '顺便更新一下，我现在又搬到会安了。以后给我做报价对比，金额我更习惯看人民币。今天先聊到这。'
        : '顺便说一下，我现在已经搬到岘港了，以后给我做报价对比，我更习惯看越南盾。今天先聊到这。');
      const semantic = (await host.native.memory.connection.call('recall', { query: '', limit: 50 })).records.filter(r => r.memory.type === 'semantic');
      const city = semantic.find(r => cityPattern.test(r.memory.content));
      const currency = semantic.find(r => currencyPattern.test(r.memory.content));
      report.experienceEvidence = { implicitCitySaved: Boolean(city), implicitCurrencySaved: Boolean(currency), oldCityEligible: oldCity
        ? await host.native.memory.connection.validate(oldCity.dependencies) : 'not-present' }; saveReport();
      assert.ok(city && currency, 'Ordinary owner information was not retained without an explicit remember request');
      assert.notEqual(report.experienceEvidence.oldCityEligible, 'eligible', 'The obsolete city remained eligible after the natural update');
      const recalled = await send(await open(), 'new-session-natural-recall', '以后给我做报价比较，你会默认用什么货币？我现在住哪？');
      assert.ok(cityPattern.test(recalled) && currencyPattern.test(recalled));
      writeFileSync(join(root, 'quote-brief.txt'), 'Synthetic supplier comparison. Quantity 1000 units. Alpha: USD 2.40/unit, freight USD 180, delivery 8 days. Beta: USD 2.55/unit, freight USD 40, delivery 5 days. For this exercise only use the supplied fixed assumptions 1 USD = 24500 VND = 7 CNY (not current market rates). Tax, payment terms and quality acceptance are not confirmed.');
      await send(await open(), 'representative-quote-help', '读取 quote-brief.txt，按资料给定的汇率比较含运费总成本，用我习惯的货币呈现，说明价差、交期取舍和还需确认什么。只分析，不建事项，也不替我作最终决定。');
      const continued = await send(await open(), 'quote-help-continuation', '接着刚才那两家报价说：含运费总价差多少、交期差多少？还有哪些条件没有确认？请带上来源。');
      assert.ok(/Alpha/i.test(continued) && /Beta/i.test(continued) && continued.includes('3') && continued.includes('quote-brief.txt'));
      const forget = await open();
      await send(forget, 'forget-natural-currency', '关于我习惯用哪种货币比较报价这件事，请忘记。住址先保留。不要复述那个偏好。');
      assert.notEqual(await host.native.memory.connection.validate(currency.dependencies), 'eligible');
      const after = (await host.native.memory.connection.call('recall', { query: '', limit: 50 })).records;
      assert.ok(after.some(r => r.memory.type === 'semantic' && cityPattern.test(r.memory.content)));
      await send(await open(), 'after-forget-natural-recall', '我现在住哪？你还知道我偏好哪种货币做报价比较吗？不知道就直接说不知道。');
      report.status = 'pass-live';
      report.experienceEvidence.noMattersCreated = true;
    } else if (resumeCaptureRepair || recheckReuse) {
      if (resumeCaptureRepair) {
      const completed = previousReport.cases.find(c => c.label === 'supplied-material-help' && c.outcome.state === 'completed');
      const source = host.native.runtime.store.all('source').find(source => source.origin === 'model_interpretation' && source.text === completed.outcome.text);
      assert.ok(source?.sourceId.startsWith('result:native:'), 'Only the observed completed native result may be reconciled');
      // Explicit repair of this approved synthetic scene only. General startup
      // continues to refuse backfill of pre-install personal history.
      host.native.runtime.store.put('memory-source-work', source.sourceId, { sourceId: source.sourceId,
        workspaceId: workspace.id, state: 'queued', observationId: null });
      }
      const continued = await open();
      const conclusion = await send(continued, recheckReuse ? 'upstream-reuse-help-continuation' : 'repaired-help-continuation', '继续之前的方案比较，哪个更便宜、哪个交期更短，各差多少？请给出文件来源，不建立事项。');
      assert.ok(conclusion.includes('青杉') && conclusion.includes('白鹭') && conclusion.includes('3'));
      assert.ok(!conclusion.includes('绿茶') && !conclusion.includes('咖啡'), 'Forgotten preference revived');
      report.status = 'pass-live';
    } else {
    const first = await open();
    if (resumeInitial) {
      const reply = await send(first, 'complete-remember-and-recall', '继续虚构验收：先根据已有记忆简短确认我的饮料偏好，然后分别记住“我住在顺化”和“我使用公制单位”。这两个新事实可以同时保存，已有偏好无需重复保存。');
      assert.ok(reply.includes('绿茶'), 'The resumed original Bank did not retain the already persisted preference');
    } else await send(first, 'remember', '验收用的虚构信息：我更喜欢绿茶；我住在顺化。请分别记住这两件事，可以同时保存，最后简短确认。');
    let records = (await host.native.memory.connection.call('recall', { query: '', limit: 8 })).records;
    assert.ok(records.length >= 2, 'Two independent facts were not persisted');
    const second = resumeInitial ? first : await open();
    if (!resumeInitial) {
      const recalled = await send(second, 'new-session-recall', '我偏好什么饮料，住在哪个城市？根据记忆简短回答，不猜测。');
      assert.ok(recalled.includes('绿茶') && recalled.includes('顺化'));
    }
    await send(second, 'correction', '更新一下：我的饮料偏好改成咖啡了。城市没变，请修正记忆并简短确认。');
    records = (await host.native.memory.connection.call('recall', { query: '', limit: 8 })).records;
    assert.ok(records.some(r => r.memory.content.includes('咖啡')) && records.some(r => r.memory.content.includes('顺化')));
    assert.ok(!records.some(r => r.memory.content.includes('绿茶')));
    await send(second, 'forget', '请忘记我的饮料偏好，城市记忆保留。完成后简短告诉我结果，不复述被忘记的内容。');
    writeFileSync(join(root, 'cedar.txt'), '青杉方案：每件8元，交期5天。');
    writeFileSync(join(root, 'willow.txt'), '白鹭方案：每件11元，交期2天。');
    const helper = await open();
    const compared = await send(helper, 'supplied-material-help', '先简短说我住哪个城市、是否还记得饮料偏好。然后读取 cedar.txt 和 willow.txt，比较价格与交期，保留带文件来源的比较结论，以便换聊天继续。不要建立事项。独立读取可同时进行。');
    assert.ok(compared.includes('顺化') && !compared.includes('绿茶') && !compared.includes('咖啡'));
    assert.ok(compared.includes('青杉') && compared.includes('白鹭') && compared.includes('3'));
    const continued = await open();
    const conclusion = await send(continued, 'new-session-help-continuation', '继续之前的方案比较，哪个更便宜、哪个交期更短，各差多少？请给出文件来源。');
    assert.ok(conclusion.includes('青杉') && conclusion.includes('白鹭') && conclusion.includes('3'));
    report.status = 'pass-live';
    }
  }
} catch (error) { report.status = 'failed'; report.failure = error instanceof Error ? error.message : String(error); process.exitCode = 1; }
finally {
  for (const handle of handles) await handle.dispose();
  await ctx.fiber.dispose(); globalThis.fetch = originalFetch;
  report.personalFilesUnchanged = hash(patchPath) === before.config && hash(credentialsPath) === before.credentials;
  assert.equal(report.personalFilesUnchanged, true);
  report.requests = ledger.attempts.length;
  report.currentArtifact.lastAttempt = ledger.attempts.length;
  report.currentArtifact.attemptCount = Math.max(0, ledger.attempts.length - report.currentArtifact.firstAttempt + 1);
  report.conservativeUpperCNY = ledger.attempts.reduce((sum, attempt) => sum + attempt.upperMicroCNY, 0) / 1000000;
  report.finishedAt = new Date().toISOString(); saveReport();
  console.log(JSON.stringify({ check: report.check, status: report.status, requests: report.requests,
    conservativeUpperCNY: report.conservativeUpperCNY, report: reportPath, ...(report.failure ? { failure: report.failure } : {}) }));
}
