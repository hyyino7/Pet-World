import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCore, type CoreConfig } from '../src/core/index.js';
import { settingsHandler } from '../src/console/settings.js';
import type { Result } from '../src/contracts/common.js';
const unwrap = <T>(value: Result<T>): T => { if (!value.ok) assert.fail(value.error.code); return value.value; };
const fixture = () => {
  const directory = mkdtempSync(join(tmpdir(), 'chatpet-settings-'));
  const config: CoreConfig = { dataDir: directory, companionId: 'settings-fish', scopeId: 'settings-scope', ownerActorId: 'owner', displayName: 'Initial', character: 'Initial character' };
  return { directory, config };
};

test('Core preferences enforce owner/revision/limits, persist and change subsequent execution options', async () => {
  const f = fixture(); let host = createCore(f.config);
  try {
    const read = () => host.services.preferences.read(host.operator.request('read'), {});
    const initial = unwrap(await read());
    assert.equal(initial.revision, 1);
    const nonOwner = await host.services.preferences.save(host.connectModule('console').request('forbidden'), {
      expectedRevision: 1, workspace: null, conversation: { ...initial.conversation, maxSteps: 3 },
    });
    assert.equal(nonOwner.ok, false);
    const input = { expectedRevision: 1, workspace: { id: 'workspace-a', title: 'Chatpet', path: f.directory }, conversation: { ...initial.conversation, maxSteps: 3 } };
    const context = host.operator.request('save');
    const first = unwrap(await host.services.preferences.save(context, input));
    assert.deepEqual(unwrap(await host.services.preferences.save(context, input)), first, 'same request is idempotent');
    const stale = await host.services.preferences.save(host.operator.request('stale'), input);
    assert.equal(stale.ok, false); if (!stale.ok) assert.equal(stale.error.code, 'STALE_REVISION');
    const invalid = await host.services.preferences.save(host.operator.request('invalid'), { ...input, expectedRevision: 2, conversation: { ...input.conversation, maxSteps: 999 } });
    assert.equal(invalid.ok, false);
    assert.deepEqual(unwrap(await read()), first, 'invalid writes do not partially mutate preferences');
    const quietContext = host.operator.request('quiet');
    const quiet = unwrap(await host.services.preferences.setQuiet(quietContext, { expectedRevision: 1, quiet: true }));
    assert.deepEqual(unwrap(await host.services.preferences.setQuiet(quietContext, { expectedRevision: 1, quiet: true })), quiet);
    assert.equal(quiet.quiet, true); assert.equal(quiet.autonomyPaused, true);
    await host.close();
    let appliedSteps = 0;
    host = createCore({ ...f.config, conversation: { maxSteps: 20 } }, {
      kind: 'test', run: async input => { appliedSteps = input.maxSteps; return { state: 'completed', text: 'Actual fixture result', hostTurnIds: ['fixture-turn'] }; },
      inspect: async () => ({ state: 'unknown', text: '', hostTurnIds: [] }), close: async () => {},
    });
    assert.equal(unwrap(await read()).conversation.maxSteps, 3, 'saved settings survive config seed and restart');
    assert.equal(unwrap(await host.services.core.getPolicy(host.operator.request('policy'), {})).quiet, true);
    const target = { channel: { kind: 'dsh' as const, sceneId: 'settings-scene' }, transportAccountRef: 'fixture', transportAccountId: 'fixture', ownerExternalId: 'fixture-owner' };
    const binding = unwrap(await host.services.core.bindChannel(host.operator.request('pair'), { ...target, expectedRevision: null, pairingProofRef: host.operator.issuePairingProof(target) }));
    unwrap(await host.chat(host.operator.request('chat'), { channel: target.channel, binding: { bindingId: binding.bindingId, revision: binding.revision }, externalMessageId: 'after-settings', senderId: target.ownerExternalId,
      receivedAt: new Date().toISOString(), parts: [{ kind: 'text', text: 'Hello' }] }));
    assert.equal(appliedSteps, 3, 'the next execution uses persisted settings');
  } finally { await host.close(); rmSync(f.directory, { recursive: true, force: true }); }
});

test('native settings RPC rejects forged authority and unknown workspaces; independent saves refuse stale edits', async () => {
  const f = fixture(), host = createCore(f.config);
  const target = { id: 'native-workspace', path: f.directory, title: 'Native workspace', status: async () => 'ok' as const };
  const handler = settingsHandler(() => host, () => ({ list: () => [target], get: id => id === target.id ? target : undefined }));
  const signal = new AbortController().signal;
  const peer = { principal: { kind: 'owner' }, signal };
  const call = (endpoint: string, input: unknown, requestId = endpoint) => handler(endpoint, { requestId, input }, signal, peer);
  try {
    const denied = await handler('snapshot', { requestId: 'read', input: {} }, signal, { ...peer, principal: { kind: 'viewer' } });
    assert.equal(denied.ok, false);
    const snapshot = await call('snapshot', {}); assert.equal(snapshot.ok, true);
    if (!snapshot.ok) return;
    const data = snapshot.value as { identity: { revision: number }; preferences: { revision: number; conversation: Record<string, number> }; workspaces: unknown[] };
    assert.equal(data.workspaces.length, 1);
    assert.ok(!('companionId' in data.identity));
    const forged = await call('identity', { expectedRevision: 1, displayName: 'Changed', character: 'Changed', ownerActorId: 'fake' });
    assert.equal(forged.ok, false);
    const unknown = await call('preferences', { expectedRevision: 1, workspaceId: '/arbitrary/path', conversation: data.preferences.conversation });
    assert.equal(unknown.ok, false); if (!unknown.ok) assert.equal(unknown.error.code, 'NOT_FOUND');
    const saved = await call('identity', { expectedRevision: 1, displayName: '中文角色', character: 'Custom character' }, 'identity-save');
    assert.equal(saved.ok, true);
    if (saved.ok) { assert.ok(!('ownerActorId' in (saved.value as object))); assert.ok(!('companionId' in (saved.value as object))); }
    const conflict = await call('identity', { expectedRevision: 1, displayName: 'Other', character: 'Other' }, 'identity-stale');
    assert.equal(conflict.ok, false); if (!conflict.ok) assert.equal(conflict.error.code, 'STALE_REVISION');
    const bound = await call('preferences', { expectedRevision: 1, workspaceId: target.id, conversation: data.preferences.conversation }, 'workspace-save');
    assert.equal(bound.ok, true);
    const prefs = unwrap(await host.services.preferences.read(host.operator.request('prefs'), {}));
    assert.deepEqual(prefs.workspace, { id: target.id, path: target.path, title: target.title });
    assert.equal(unwrap(await host.services.core.getIdentity(host.operator.request('identity'), {})).displayName, '中文角色');
    const stopped = new AbortController(); stopped.abort();
    const cancelled = await handler('quiet', { requestId: 'cancelled', input: { expectedRevision: 1, quiet: true } }, stopped.signal, peer);
    assert.equal(cancelled.ok, false);
  } finally { await host.close(); rmSync(f.directory, { recursive: true, force: true }); }
});
