import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createCore, type CoreConfig, type NativeDriver, type NativeRunResult } from '../src/core/index.js';
import { bytesDigest, id } from '../src/core/storage.js';
import type { ChannelRef, RequestContext, Result } from '../src/contracts/common.js';
import type { ExecutionStartRequest } from '../src/contracts/execution.js';

const unwrap = <T>(result: Result<T>): T => { if (!result.ok) assert.fail(JSON.stringify(result.error)); return result.value; };
const error = <T>(result: Result<T>, code: string) => { assert.equal(result.ok, false); if (!result.ok) assert.equal(result.error.code, code); };
const channel: ChannelRef = { kind: 'dsh', sceneId: 'owner' };
const fixture = () => {
  const directory = mkdtempSync(join(tmpdir(), 'codex-pet-test-'));
  const config: CoreConfig = { dataDir: directory, companionId: 'fish', scopeId: 'owner', ownerActorId: 'human', displayName: 'Dafeiyu', character: 'A thoughtful companion.' };
  return { directory, config, clean: () => rmSync(directory, { recursive: true, force: true }) };
};
async function pair(host: ReturnType<typeof createCore>, ref = channel, external = 'human-external', expectedRevision: number | null = null) {
  const target = { channel: ref, transportAccountRef: 'local-connection', transportAccountId: 'local-account', ownerExternalId: external };
  return unwrap(await host.services.core.bindChannel(host.operator.request(id('req')), {
    ...target, pairingProofRef: host.operator.issuePairingProof(target), expectedRevision,
  }));
}
async function incoming(host: ReturnType<typeof createCore>, externalMessageId = 'm1') {
  const binding = await pair(host);
  const input = { channel, binding: { bindingId: binding.bindingId, revision: binding.revision }, externalMessageId,
    senderId: 'human-external', receivedAt: '2026-11-05T01:00:00Z', parts: [{ kind: 'text' as const, text: 'Please remember this conversation has one owner.' }] };
  const result = unwrap(await host.services.core.receiveMessage(host.operator.request(id('req')), input));
  return { input, result, binding };
}
class Driver implements NativeDriver {
  readonly kind = 'test' as const;
  runs = 0;
  result: NativeRunResult = { state: 'completed', hostTurnIds: ['1'], text: 'A result from the test fixture.' };
  async run(): Promise<NativeRunResult> { this.runs++; return this.result; }
  async inspect(): Promise<NativeRunResult> { return this.result; }
  async close() {}
}

test('unissued contexts, serialized owner claims, module privilege escalation and foreign scopes are denied', async () => {
  const f = fixture(), host = createCore(f.config);
  try {
    const context = host.operator.request('owner');
    error(await host.services.core.getIdentity({ ...context }, {}), 'UNAUTHORIZED');
    error(await host.services.core.getIdentity({ ...context, scopeId: 'someone-else' }, {}), 'UNAUTHORIZED');
    const life = host.connectModule('life');
    error(await host.services.core.reviseIdentity(life.request('x'), { expectedRevision: 1, displayName: 'Changed', character: 'Changed' }), 'UNAUTHORIZED');
    error(await host.services.core.getSource(life.request('source'), { sourceId: 'anything', purpose: 'owner_audit' }), 'UNAUTHORIZED');
  } finally { await host.close(); f.clean(); }
});

test('identity persists, stale writes fail, request replays are idempotent and changed payloads conflict', async () => {
  const f = fixture(); let host = createCore(f.config);
  try {
    const context = host.operator.request('rename');
    const input = { expectedRevision: 1, displayName: 'Fish', character: 'Persistent identity.' };
    assert.equal(unwrap(await host.services.core.reviseIdentity(context, input)).revision, 2);
    assert.equal(unwrap(await host.services.core.reviseIdentity(context, input)).revision, 2);
    error(await host.services.core.reviseIdentity(context, { ...input, displayName: 'Other' }), 'CONFLICT');
    error(await host.services.core.reviseIdentity(host.operator.request('stale'), input), 'STALE_REVISION');
    await host.close(); host = createCore(f.config);
    assert.equal(unwrap(await host.services.core.getIdentity(host.operator.request('read'), {})).displayName, 'Fish');
    assert.throws(() => createCore(f.config), /live owner/);
    await host.close();
    assert.throws(() => createCore({ ...f.config, scopeId: 'different' }), /does not match/);
  } finally { await host.close(); f.clean(); }
});

test('pairing proof binds the exact account and recipient, cannot be invented or reused', async () => {
  const f = fixture(), host = createCore(f.config);
  try {
    const target = { channel, transportAccountRef: 'local', transportAccountId: 'account', ownerExternalId: 'owner' };
    error(await host.services.core.bindChannel(host.operator.request('bad'), { ...target, pairingProofRef: 'I am owner', expectedRevision: null }), 'NOT_FOUND');
    const proof = host.operator.issuePairingProof(target);
    error(await host.services.core.bindChannel(host.operator.request('wrong'), { ...target, ownerExternalId: 'other', pairingProofRef: proof, expectedRevision: null }), 'UNAUTHORIZED');
    unwrap(await host.services.core.bindChannel(host.operator.request('good'), { ...target, pairingProofRef: proof, expectedRevision: null }));
    error(await host.services.core.bindChannel(host.operator.request('reuse'), { ...target, pairingProofRef: proof, expectedRevision: 1 }), 'UNAUTHORIZED');
  } finally { await host.close(); f.clean(); }
});

test('incoming dedupe survives restart and new receive timestamps; changed content cannot replace evidence', async () => {
  const f = fixture(); let host = createCore(f.config);
  try {
    const first = await incoming(host);
    await host.close(); host = createCore(f.config);
    const duplicate = unwrap(await host.services.core.receiveMessage(host.operator.request('duplicate'), { ...first.input, receivedAt: '2026-11-05T02:00:00Z' }));
    assert.equal(duplicate.duplicate, true); assert.equal(duplicate.messageId, first.result.messageId);
    error(await host.services.core.receiveMessage(host.operator.request('changed'), { ...first.input, parts: [{ kind: 'text', text: 'Different' }] }), 'CONFLICT');
    error(await host.services.core.receiveMessage(host.operator.request('intruder'), { ...first.input, senderId: 'someone-else' }), 'UNAUTHORIZED');
    const history = unwrap(await host.services.core.listConversation(host.operator.request('history'), { limit: 10 }));
    assert.equal(history.items.length, 1); assert.equal(history.items[0].visibility, 'available'); assert.deepEqual(history.items[0].parts, first.input.parts);
    const source = unwrap(await host.services.core.getSource(host.operator.request('audit'), { sourceId: first.result.sourceId, purpose: 'owner_audit' }));
    assert.equal(source.text, first.input.parts[0].text);
  } finally { await host.close(); f.clean(); }
});

test('two commitments remain distinct; completion requires evidence, not a declared status alone', async () => {
  const f = fixture(), host = createCore(f.config);
  try {
    const one = unwrap(await host.services.core.createCommitment(host.operator.request('one'), { requestedOutcome: 'First', sourceIds: [] }));
    const two = unwrap(await host.services.core.createCommitment(host.operator.request('two'), { requestedOutcome: 'Second', sourceIds: [] }));
    assert.notEqual(one.commitmentId, two.commitmentId);
    error(await host.services.core.reviseCommitment(host.operator.request('fake-complete'), { commitmentId: one.commitmentId, expectedRevision: 1, state: 'completed', nextAction: null, waitingReason: null, resultSourceIds: [] }), 'INVALID_ARGUMENT');
    unwrap(await host.services.core.reviseCommitment(host.operator.request('waiting'), { commitmentId: one.commitmentId, expectedRevision: 1, state: 'waiting', nextAction: 'Ask for missing data', waitingReason: 'Awaiting owner', resultSourceIds: [] }));
    assert.equal(unwrap(await host.services.core.listCommitments(host.operator.request('list'), { limit: 10 })).items.length, 2);
  } finally { await host.close(); f.clean(); }
});

test('fresh input executes once, stores native evidence, presents one reply and remains distinguishable from native acceptance', async () => {
  const f = fixture(), driver = new Driver(), host = createCore(f.config, driver);
  try {
    const first = await incoming(host);
    const shown: string[] = [];
    host.observeFreshReplies(message => shown.push(message.messageId));
    await Promise.all([host.drain(), host.drain()]);
    assert.equal(driver.runs, 1); assert.equal(shown.length, 1);
    const activity = unwrap(await host.services.core.getActivity(host.operator.request('activity'), { activityId: first.result.operation.operationId }));
    assert.equal(activity.receipt.state, 'completed'); assert.equal(activity.receipt.evidenceSourceIds.length, 1);
    const result = unwrap(await host.services.core.getSource(host.operator.request('result'), { sourceId: activity.receipt.evidenceSourceIds[0], purpose: 'owner_audit' }));
    assert.equal(result.origin, 'model_interpretation'); assert.deepEqual(result.rootSourceIds, [first.result.sourceId]);
    const capabilities = unwrap(await host.services.core.listCapabilities(host.operator.request('caps'), {}));
    assert.equal(capabilities.find(x => x.id === 'execution.native')?.state, 'unavailable');
    await host.drain(); assert.equal(driver.runs, 1);
  } finally { await host.close(); f.clean(); }
});

test('replayed execution.start after completion never submits the same input again', async () => {
  const f = fixture(), driver = new Driver(), host = createCore(f.config, driver);
  try {
    const first = await incoming(host);
    const binding = unwrap(await host.services.execution.bind(host.operator.request('bind'), { purpose: 'owner' }));
    const context = host.operator.request('start');
    const input: ExecutionStartRequest = { admission: { activityId: first.result.operation.operationId, revision: 1 }, bindingId: binding.bindingId,
      input: first.input.parts[0].text, allowance: { maxSteps: 1, maxToolCalls: 0, maxDurationMs: 1000, allowedToolIds: [] },
      context: { projectionId: 'projection', sourceIds: [], sections: [], tokenLimit: 100, truncated: false, memoryView: null }, memoryUse: null };
    unwrap(await host.services.execution.start(context, input)); await host.idle();
    assert.equal(unwrap(await host.services.execution.start(context, input)).receipt.state, 'completed');
    await host.idle(); assert.equal(driver.runs, 1);
  } finally { await host.close(); f.clean(); }
});

test('unknown native result blocks further work until owned-log reconciliation and never auto-replays', async () => {
  const f = fixture(), driver = new Driver(); driver.result = { state: 'unknown', text: '', hostTurnIds: [], reason: 'Interrupted handoff' };
  let host = createCore(f.config, driver);
  try {
    const first = await incoming(host); await host.drain(); assert.equal(driver.runs, 1);
    await host.close(); host = createCore(f.config, driver); await host.drain(); assert.equal(driver.runs, 1);
    assert.equal(unwrap(await host.services.core.getActivity(host.operator.request('activity'), { activityId: first.result.operation.operationId })).receipt.state, 'unknown');
    const db = new DatabaseSync(join(f.directory, 'core.sqlite'));
    const row = db.prepare("SELECT value FROM records WHERE kind='execution'").get()!; db.close();
    const executionId = JSON.parse(row.value as string).executionId as string;
    driver.result = { state: 'completed', text: 'Reconciled old result', hostTurnIds: ['1'] };
    let presented = false; host.observeFreshReplies(() => { presented = true; });
    assert.equal(unwrap(await host.services.execution.reconcile(host.operator.request('reconcile'), { executionId })).receipt.state, 'completed');
    assert.equal(presented, false); assert.equal(driver.runs, 1);
  } finally { await host.close(); f.clean(); }
});

test('restart marks running work unknown without claiming cancellation or success', async () => {
  const f = fixture(); let host = createCore(f.config);
  try {
    const first = await incoming(host);
    await host.close();
    const db = new DatabaseSync(join(f.directory, 'core.sqlite'));
    const row = db.prepare("SELECT value FROM records WHERE kind='activity'").get()!;
    const activity = JSON.parse(row.value as string); activity.receipt.state = 'running';
    db.prepare("UPDATE records SET value=? WHERE kind='activity'").run(JSON.stringify(activity)); db.close();
    host = createCore(f.config);
    assert.equal(unwrap(await host.services.core.getActivity(host.operator.request('a'), { activityId: first.result.operation.operationId })).receipt.state, 'unknown');
  } finally { await host.close(); f.clean(); }
});

test('pending inputs from a previous process require eligibility instead of automatic execution', async () => {
  const f = fixture(), driver = new Driver(); let host = createCore(f.config, driver);
  try {
    const first = await incoming(host); await host.close(); host = createCore(f.config, driver);
    await host.drain(); assert.equal(driver.runs, 0);
    const activity = unwrap(await host.services.core.getActivity(host.operator.request('inspect'), { activityId: first.result.operation.operationId }));
    assert.equal(activity.receipt.state, 'waiting'); assert.match(activity.receipt.waitingReason!, /Prior-boot/);
  } finally { await host.close(); f.clean(); }
});

test('restart preserves the uncertainty and exact target of a reserved delivery attempt', async () => {
  const f = fixture(); let host = createCore(f.config);
  try {
    const first = await incoming(host);
    unwrap(await host.services.core.requestContact(host.operator.request('contact'), { contactId: 'restart-contact', parts: [{ kind: 'text', text: 'Reply' }],
      sourceIds: [first.result.sourceId], purpose: 'reply', replyToMessageId: first.result.messageId, memoryView: null }));
    const reserved = unwrap(await host.services.core.prepareDeliveryAttempt(host.operator.request('reserve'), { contactId: 'restart-contact', expectedRevision: 1 }));
    await host.close(); host = createCore(f.config);
    const current = unwrap(await host.services.core.getContact(host.operator.request('inspect'), { contactId: 'restart-contact' }));
    assert.equal(current.outcome.state, 'unknown'); assert.deepEqual(current.target, reserved.attempt.target);
    const confirmed = unwrap(await host.services.core.reportDelivery(host.operator.request('confirm'), { expectedRevision: current.revision,
      receipt: { contactId: 'restart-contact', attemptId: reserved.attempt.attemptId, target: reserved.attempt.target,
        outcome: { state: 'gateway_confirmed', attemptId: reserved.attempt.attemptId, externalMessageId: 'actual-gateway-id' } } }));
    assert.equal(confirmed.outcome.state, 'gateway_confirmed');
  } finally { await host.close(); f.clean(); }
});

test('queued cancellation prevents execution; assets wait for a real interpreting provider', async () => {
  const f = fixture(), driver = new Driver(), host = createCore(f.config, driver);
  try {
    const first = await incoming(host);
    const cancelled = unwrap(await host.services.core.cancelActivity(host.operator.request('cancel'), { activityId: first.result.operation.operationId, expectedRevision: 1, reason: 'Owner cancelled' }));
    assert.equal(cancelled.state, 'cancelled'); await host.drain(); assert.equal(driver.runs, 0);
    const asset = unwrap(await host.services.core.receiveMessage(host.operator.request('asset'), { ...first.input, externalMessageId: 'asset',
      parts: [{ kind: 'asset', altText: 'Unverified description', asset: { artifactId: 'unresolved', mediaType: 'audio/ogg', contentDigest: 'sha256:unresolved' } }] }));
    assert.equal(asset.operation.state, 'waiting'); await host.drain(); assert.equal(driver.runs, 0);
  } finally { await host.close(); f.clean(); }
});

test('backup reconciliation checks bytes, not just a catalogue entry', async () => {
  const f = fixture(), host = createCore(f.config);
  try {
    const backup = unwrap(await host.services.maintenance.createBackup(host.operator.request('create'), { destinationRef: 'core.local' }));
    const db = new DatabaseSync(join(f.directory, 'core.sqlite'));
    db.prepare('UPDATE bytes SET data=? WHERE id=?').run(Buffer.from('corrupted fixture'), backup.resources[0].artifactId); db.close();
    error(await host.services.maintenance.reconcileBackup(host.operator.request('reconcile'), { backupId: backup.backupId, expectedRevision: backup.revision }), 'INCOMPATIBLE');
  } finally { await host.close(); f.clean(); }
});

test('delivery attempt stays on its original recipient after rebind; uncertain attempt cannot be retried', async () => {
  const f = fixture(), host = createCore(f.config);
  try {
    const first = await incoming(host);
    const intent = { contactId: 'contact', parts: [{ kind: 'text' as const, text: 'Reply' }], sourceIds: [first.result.sourceId],
      purpose: 'reply' as const, replyToMessageId: first.result.messageId, memoryView: null };
    const contact = unwrap(await host.services.core.requestContact(host.operator.request('contact'), intent));
    const attempt = unwrap(await host.services.core.prepareDeliveryAttempt(host.operator.request('attempt'), { contactId: 'contact', expectedRevision: contact.revision }));
    await pair(host, channel, 'new-owner-target', first.binding.revision);
    const unknown = unwrap(await host.services.core.reportDelivery(host.operator.request('unknown'), { expectedRevision: attempt.contactRevision,
      receipt: { contactId: 'contact', attemptId: attempt.attempt.attemptId, target: attempt.attempt.target,
        outcome: { state: 'unknown', attemptId: attempt.attempt.attemptId, reason: 'Gateway timed out' } } }));
    error(await host.services.core.prepareDeliveryAttempt(host.operator.request('retry'), { contactId: 'contact', expectedRevision: unknown.revision }), 'CONFLICT');
    const confirmed = unwrap(await host.services.core.reportDelivery(host.operator.request('late-confirmation'), { expectedRevision: unknown.revision,
      receipt: { contactId: 'contact', attemptId: attempt.attempt.attemptId, target: attempt.attempt.target,
        outcome: { state: 'gateway_confirmed', attemptId: attempt.attempt.attemptId, externalMessageId: 'gateway-id' } } }));
    assert.equal(confirmed.target?.recipientExternalId, 'human-external');
    assert.equal(confirmed.outcome.state, 'gateway_confirmed');
  } finally { await host.close(); f.clean(); }
});

test('prior-boot pending material cannot be delivered through the fresh-input exception', async () => {
  const f = fixture(); let host = createCore(f.config);
  try {
    const first = await incoming(host);
    unwrap(await host.services.core.requestContact(host.operator.request('contact'), { contactId: 'c', parts: [{ kind: 'text', text: 'Pending' }],
      sourceIds: [first.result.sourceId], purpose: 'reply', replyToMessageId: first.result.messageId, memoryView: null }));
    await host.close(); host = createCore(f.config);
    error(await host.services.core.prepareDeliveryAttempt(host.operator.request('attempt'), { contactId: 'c', expectedRevision: 1 }), 'INELIGIBLE');
  } finally { await host.close(); f.clean(); }
});

test('artifact chunks require digest and offset; holders prevent GC and content survives restart', async () => {
  const f = fixture(); let host = createCore(f.config);
  try {
    const bytes = Buffer.from('immutable audio or document bytes');
    const upload = unwrap(await host.services.resources.beginUpload(host.operator.request('upload'), { producer: 'core', mediaType: 'application/octet-stream',
      kind: 'asset', byteLength: bytes.length, retentionPolicyRef: 'manual' }));
    error(await host.services.resources.writeChunk(host.operator.request('bad'), { uploadId: upload.uploadId, offset: 1, dataBase64: bytes.toString('base64'), chunkDigest: bytesDigest(bytes) }), 'CONFLICT');
    unwrap(await host.services.resources.writeChunk(host.operator.request('chunk'), { uploadId: upload.uploadId, offset: 0, dataBase64: bytes.toString('base64'), chunkDigest: bytesDigest(bytes) }));
    const info = unwrap(await host.services.resources.commitUpload(host.operator.request('commit'), { uploadId: upload.uploadId, expectedContentDigest: bytesDigest(bytes), memoryView: null,
      holder: { module: 'core', recordId: 'record' } }));
    await host.close(); host = createCore(f.config);
    const read = unwrap(await host.services.resources.readArtifact(host.operator.request('read'), { artifact: info.ref, offset: 0, maxBytes: 1024,
      access: { kind: 'ordinary', purpose: 'inspection', memoryUse: null } }));
    assert.equal(Buffer.from(read.dataBase64, 'base64').toString(), bytes.toString());
    const released = unwrap(await host.services.resources.releaseArtifact(host.operator.request('release'), { artifact: info.ref, expectedRevision: 1, holder: { module: 'core', recordId: 'record' } }));
    assert.equal(released.state, 'released');
    unwrap(await host.services.resources.collectGarbage(host.operator.request('gc'), { policyRef: 'manual', before: new Date().toISOString() }));
    assert.equal(unwrap(await host.services.resources.inspectArtifact(host.operator.request('inspect'), { artifact: info.ref })).state, 'purged');
  } finally { await host.close(); f.clean(); }
});

test('backup is explicitly partial, ordinary reads cannot expose it, restore fails closed and domain stays unchanged', async () => {
  const f = fixture(), host = createCore(f.config);
  try {
    const backup = unwrap(await host.services.maintenance.createBackup(host.operator.request('backup'), { destinationRef: 'core.local' }));
    assert.equal(backup.completeness, 'partial'); assert.equal(backup.coverage.length, 8);
    error(await host.services.resources.readArtifact(host.operator.request('read'), { artifact: backup.resources[0], offset: 0, maxBytes: 1024,
      access: { kind: 'ordinary', purpose: 'inspection', memoryUse: null } }), 'UNAUTHORIZED');
    const restore = unwrap(await host.services.maintenance.prepareRestore(host.operator.request('prepare'), { backupId: backup.backupId }));
    assert.equal(restore.compatible, false);
    error(await host.services.maintenance.applyRestore(host.operator.request('apply'), { restoreId: restore.restoreId, expectedRevision: restore.revision, authorizationRef: 'owner-said-so' }), 'UNAVAILABLE');
    assert.equal(unwrap(await host.services.core.getIdentity(host.operator.request('identity'), {})).revision, 1);
    error(await host.services.maintenance.exportCompanion(host.operator.request('export-history'), { includeHistory: true }), 'UNAVAILABLE');
  } finally { await host.close(); f.clean(); }
});

test('quiescence closes new writes and explicit owner resume reopens admission', async () => {
  const f = fixture(), host = createCore(f.config);
  try {
    const receipt = unwrap(await host.services.core.quiesce(host.operator.request('quiet'), { reason: 'shutdown', deadline: new Date(Date.now() + 1000).toISOString() }));
    error(await host.services.core.createCommitment(host.operator.request('new'), { requestedOutcome: 'No new writes', sourceIds: [] }), 'DISABLED');
    unwrap(await host.services.core.resumeFromQuiescence(host.operator.request('resume'), { quiescenceId: receipt.quiescenceId, expectedStateRevision: null }));
    unwrap(await host.services.core.createCommitment(host.operator.request('after'), { requestedOutcome: 'Writes reopened', sourceIds: [] }));
  } finally { await host.close(); f.clean(); }
});

test('malformed inputs and pre-admission cancellation produce stable errors without effects', async () => {
  const f = fixture(), host = createCore(f.config);
  try {
    error(await host.services.core.setPolicy(host.operator.request('bad'), {} as never), 'INVALID_ARGUMENT');
    error(await host.services.core.createCommitment(host.operator.request('cancel'), { requestedOutcome: 'Cancelled', sourceIds: [] }, { signal: AbortSignal.abort() }), 'CANCELLED');
    assert.equal(unwrap(await host.services.core.listCommitments(host.operator.request('list'), { limit: 20 })).items.length, 0);
    const forged: RequestContext = JSON.parse(JSON.stringify(host.operator.request('forged')));
    error(await host.services.maintenance.createBackup(forged, { destinationRef: 'core.local' }), 'UNAUTHORIZED');
  } finally { await host.close(); f.clean(); }
});

test('quiet mode and zero autonomous budgets leave explicit owner conversation usable', async () => {
  const f = fixture(), driver = new Driver(), host = createCore(f.config, driver);
  try {
    const current = unwrap(await host.services.core.getPolicy(host.operator.request('policy'), {}));
    unwrap(await host.services.core.setPolicy(host.operator.request('set'), { ...current, expectedRevision: current.revision, quiet: true,
      autonomousLimits: { maxConcurrentRuns: 0, maxStepsPerRun: 0, maxToolCallsPerRun: 0, maxDurationMsPerRun: 0,
        maxDailyRuns: 0, maxDailyTokens: 0, maxDailyContacts: 0 } }));
    const first = await incoming(host); await host.drain(); assert.equal(driver.runs, 1);
    assert.equal(unwrap(await host.services.core.getActivity(host.operator.request('result'), { activityId: first.result.operation.operationId })).receipt.state, 'completed');
  } finally { await host.close(); f.clean(); }
});

test('active cancellation stays requested until the execution driver confirms its outcome', async () => {
  const f = fixture(); let entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const driver: NativeDriver = { kind: 'test',
    run: async input => { entered(); return new Promise(resolve => input.signal.addEventListener('abort', () =>
      resolve({ state: 'cancelled', text: '', hostTurnIds: ['1'], reason: 'Fixture confirmed abort' }), { once: true })); },
    inspect: async () => ({ state: 'unknown', text: '', hostTurnIds: [] }), close: async () => {},
  };
  const host = createCore(f.config, driver);
  try {
    const first = await incoming(host), drain = host.drain(); await started;
    const active = unwrap(await host.services.core.getActivity(host.operator.request('active'), { activityId: first.result.operation.operationId }));
    assert.equal(active.receipt.state, 'running');
    const requested = unwrap(await host.services.core.cancelActivity(host.operator.request('cancel'), { activityId: active.activityId, expectedRevision: active.receipt.revision, reason: 'Stop now' }));
    assert.equal(requested.state, 'cancel_requested'); await drain;
    assert.equal(unwrap(await host.services.core.getActivity(host.operator.request('settled'), { activityId: active.activityId })).receipt.state, 'cancelled');
  } finally { await host.close(); f.clean(); }
});

test('new input arriving during a run is drained in order through the shared queue', async () => {
  const f = fixture(); let entered!: () => void, release!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const calls: string[] = [];
  const driver: NativeDriver = { kind: 'test',
    run: async input => { calls.push(input.text); if (calls.length === 1) { entered(); await gate; }
      return { state: 'completed', text: 'Result', hostTurnIds: ['1'] }; },
    inspect: async () => ({ state: 'unknown', text: '', hostTurnIds: [] }), close: async () => {},
  };
  const host = createCore(f.config, driver);
  try {
    const first = await incoming(host), drain = host.drain(); await started;
    unwrap(await host.services.core.receiveMessage(host.operator.request('second'), { ...first.input, externalMessageId: 'second', parts: [{ kind: 'text', text: 'Second input' }] }));
    const joined = host.drain(); release(); await Promise.all([drain, joined]);
    assert.deepEqual(calls, [first.input.parts[0].text, 'Second input']);
  } finally { release(); await host.close(); f.clean(); }
});
