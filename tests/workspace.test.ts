import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, readdirSync, symlinkSync, rmSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createCore, type CoreConfig } from '../src/core/index.js';
import type { Result } from '../src/contracts/common.js';
const unwrap = <T>(result: Result<T>): T => { if (!result.ok) assert.fail(JSON.stringify(result.error)); return result.value; };
const fixture = () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'chatpet-workspace-'))); const repo = join(root, 'repo'); mkdirSync(repo);
  const config: CoreConfig = { dataDir: join(root, 'data'), companionId: 'fixture-companion', scopeId: 'fixture-scope', ownerActorId: 'owner', displayName: 'Example', character: 'A configured character.' };
  return { root, repo, config };
};

test('workspace initialization preserves project files, uses five profile/config files, reloads file authority and survives restart', async () => {
  const f = fixture(); let host = createCore(f.config); let request = 0;
  const context = () => host.operator.request(`workspace-${++request}`);
  try {
    writeFileSync(join(f.repo, 'AGENTS.md'), '# Existing instructions\n'); writeFileSync(join(f.repo, 'README.md'), '# Existing project\n');
    const original = unwrap(await host.services.preferences.read(context(), {}));
    const prefs = unwrap(await host.services.preferences.save(context(), { expectedRevision: original.revision, workspace: { id: 'repo', path: f.repo, title: 'Repo' }, conversation: { ...original.conversation } }));
    assert.equal(unwrap(await host.services.workspace.inspect(context(), {})).state, 'pending');
    const initialized = unwrap(await host.services.workspace.initialize(context(), { expectedPreferencesRevision: prefs.revision }));
    assert.equal(initialized.state, 'ready');
    assert.deepEqual(readdirSync(join(f.repo, '.chatpet')).sort(), ['README.md', 'manifest.json', 'SOUL.md', 'USER.md', 'core.json'].sort());
    const before = readFileSync(join(f.repo, '.chatpet/SOUL.md'), 'utf8');
    const again = unwrap(await host.services.workspace.initialize(context(), { expectedPreferencesRevision: prefs.revision }));
    assert.equal(again.revision, initialized.revision); assert.equal(readFileSync(join(f.repo, '.chatpet/SOUL.md'), 'utf8'), before);
    const identity = unwrap(await host.services.core.getIdentity(context(), {}));
    unwrap(await host.services.core.reviseIdentity(context(), { expectedRevision: identity.revision, displayName: 'UI name', character: 'UI character' }));
    assert.equal(readFileSync(join(f.repo, '.chatpet/SOUL.md'), 'utf8'), '# UI name\n\nUI character');
    writeFileSync(join(f.repo, '.chatpet/SOUL.md'), '# File name\n\nA manually edited character.');
    const changed = unwrap(await host.services.core.getIdentity(context(), {}));
    assert.equal(changed.displayName, 'File name');
    const stale = await host.services.core.reviseIdentity(context(), { expectedRevision: identity.revision, displayName: 'Stale', character: 'Stale' });
    assert.equal(stale.ok, false);
    const user = unwrap(await host.services.workspace.readProfile(context(), {}));
    unwrap(await host.services.workspace.saveProfile(context(), { expectedRevision: user.revision, text: '# User\n\nLanguage: Chinese.' }));
    const p = unwrap(await host.services.preferences.read(context(), {}));
    unwrap(await host.services.preferences.save(context(), { expectedRevision: p.revision, workspace: p.workspace, conversation: { ...p.conversation, maxSteps: 5 } }));
    const config = JSON.parse(readFileSync(join(f.repo, '.chatpet/core.json'), 'utf8')); config.quiet = true; config.conversation.maxSteps = 6;
    writeFileSync(join(f.repo, '.chatpet/core.json'), JSON.stringify(config));
    assert.equal(unwrap(await host.services.core.getPolicy(context(), {})).quiet, true);
    assert.equal(unwrap(await host.services.preferences.read(context(), {})).conversation.maxSteps, 6);
    await host.close(); host = createCore(f.config);
    assert.equal(unwrap(await host.services.core.getIdentity(context(), {})).displayName, 'File name');
    assert.equal(unwrap(await host.services.workspace.readProfile(context(), {})).text, '# User\n\nLanguage: Chinese.');
    assert.equal(readFileSync(join(f.repo, 'AGENTS.md'), 'utf8'), '# Existing instructions\n');
    assert.equal(readFileSync(join(f.repo, 'README.md'), 'utf8'), '# Existing project\n');
    assert.ok(!readFileSync(join(f.repo, '.chatpet/manifest.json'), 'utf8').includes(f.root));
  } finally { await host.close(); rmSync(f.root, { recursive: true, force: true }); }
});

test('workspace refuses unknown existing content, foreign identity, symlinks and malformed authority without overwriting', async () => {
  const f = fixture(); const host = createCore(f.config); let request = 0; const context = () => host.operator.request(`deny-${++request}`);
  try {
    const prefs = unwrap(await host.services.preferences.read(context(), {}));
    const saved = unwrap(await host.services.preferences.save(context(), { expectedRevision: prefs.revision, workspace: { id: 'repo', path: f.repo, title: 'Repo' }, conversation: { ...prefs.conversation } }));
    const dir = join(f.repo, '.chatpet'); mkdirSync(dir); writeFileSync(join(dir, 'custom.txt'), 'Preserve me');
    assert.equal((await host.services.workspace.initialize(context(), { expectedPreferencesRevision: saved.revision })).ok, false);
    assert.equal(readFileSync(join(dir, 'custom.txt'), 'utf8'), 'Preserve me');
    rmSync(dir, { recursive: true });
    unwrap(await host.services.workspace.initialize(context(), { expectedPreferencesRevision: saved.revision }));
    const soul = readFileSync(join(dir, 'SOUL.md'), 'utf8');
    const target = { channel: { kind: 'dsh' as const, sceneId: 'stop-fixture' }, transportAccountRef: 'fixture', transportAccountId: 'fixture', ownerExternalId: 'owner' };
    const binding = unwrap(await host.services.core.bindChannel(context(), { ...target, expectedRevision: null,
      pairingProofRef: host.operator.issuePairingProof(target) }));
    const pending = unwrap(await host.services.core.receiveMessage(context(), { channel: target.channel,
      binding: { bindingId: binding.bindingId, revision: binding.revision }, externalMessageId: 'stop-fixture-input',
      senderId: 'owner', receivedAt: new Date().toISOString(), parts: [{ kind: 'text', text: 'Pending work' }] }));
    writeFileSync(join(dir, 'core.json'), '{broken');
    assert.equal((await host.services.core.getIdentity(context(), {})).ok, false);
    assert.equal(unwrap(await host.services.workspace.inspect(context(), {})).state, 'unavailable');
    assert.equal(readFileSync(join(dir, 'SOUL.md'), 'utf8'), soul);
    const stopped = unwrap(await host.services.core.cancelActivity(context(), { activityId: pending.operation.operationId,
      expectedRevision: pending.operation.revision, reason: 'Stop even when repository configuration is malformed' }));
    assert.equal(stopped.state, 'cancelled', 'Broken Repo files must never block the stop control');
    const badActor = host.connectModule('console');
    const unauthorized = await host.services.core.reviseIdentity(badActor.request('bad'), { expectedRevision: 1, displayName: 'No', character: 'No' });
    assert.equal(unauthorized.ok, false); if (!unauthorized.ok) assert.equal(unauthorized.error.code, 'UNAUTHORIZED');
    rmSync(join(dir, 'SOUL.md')); symlinkSync(join(f.repo, 'outside.md'), join(dir, 'SOUL.md')); writeFileSync(join(f.repo, 'outside.md'), 'Outside');
    assert.equal(unwrap(await host.services.workspace.inspect(context(), {})).state, 'unavailable');
    assert.equal(readFileSync(join(f.repo, 'outside.md'), 'utf8'), 'Outside');
  } finally { await host.close(); rmSync(f.root, { recursive: true, force: true }); }
});

test('legacy STATE declarations migrate without reading, rewriting or recreating the retired summary', async () => {
  const f = fixture(); const host = createCore(f.config); let sequence = 0;
  const context = () => host.operator.request(`retire-state-${++sequence}`);
  try {
    const original = unwrap(await host.services.preferences.read(context(), {}));
    const prefs = unwrap(await host.services.preferences.save(context(), { expectedRevision: original.revision,
      workspace: { id: 'repo', title: 'Repo', path: f.repo }, conversation: original.conversation }));
    unwrap(await host.services.workspace.initialize(context(), { expectedPreferencesRevision: prefs.revision }));
    const dir = join(f.repo, '.chatpet');
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
    const legacy = { ...manifest, schemaVersion: 1, files: [...manifest.files, 'STATE.md'] };
    const retired = '# Old summary\n\nOwner-edited text that must be preserved.\n';
    writeFileSync(join(dir, 'STATE.md'), retired);
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(legacy));
    const migrated = unwrap(await host.services.workspace.initialize(context(), { expectedPreferencesRevision: prefs.revision }));
    assert.equal(migrated.state, 'ready'); assert.ok(!migrated.files.includes('STATE.md'));
    assert.equal(JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).schemaVersion, 2);
    const identity = unwrap(await host.services.core.getIdentity(context(), {}));
    unwrap(await host.services.core.reviseIdentity(context(), { expectedRevision: identity.revision, displayName: identity.displayName, character: 'Updated role' }));
    assert.equal(readFileSync(join(dir, 'STATE.md'), 'utf8'), retired);
    rmSync(join(dir, 'STATE.md'));
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(legacy));
    assert.equal(unwrap(await host.services.workspace.initialize(context(), { expectedPreferencesRevision: prefs.revision })).state, 'ready');
    assert.ok(!readdirSync(dir).includes('STATE.md'), 'A missing retired file must not be recreated');
  } finally { await host.close(); rmSync(f.root, { recursive: true, force: true }); }
});
