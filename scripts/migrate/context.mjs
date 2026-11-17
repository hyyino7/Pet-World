import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { backupPlan, assertDshStopped } from '../lib/offline-backup.mjs';
import { inspectRepoBinding, assertStopped } from '../lib/repo-storage.mjs';
import { inspectTree, json, regular } from './io.mjs';
import { checked, requireMigration } from './errors.mjs';

export const storage = json(new URL('../../arch/storage.json', import.meta.url));
export function loadInstallation(file) {
  const receipt = readInstallation(file);
  inspectTree(receipt.config.dataDir);
  const binding = checked('binding-changed', () => inspectRepoBinding(receipt.config));
  requireMigration(binding.state === 'ready', 'binding-changed');
  const plan = checked('binding-changed', () => backupPlan({repo:binding.root, workspaceId:binding.target.id, storageId:binding.storageId,
    profileDir:receipt.profileDir, dshHome:dirname(dirname(receipt.profileDir)), config:receipt.config}));
  for (const root of plan.roots) inspectTree(root.path);
  const data = join(plan.repo, '.chatpet', 'data');
  return {receipt, plan, data, manifestFile:join(data, 'storage-manifest.json'),
    journalFile:join(data, 'migrations.jsonl'), lockFile:join(data, 'migration.lock')};
}
export function expectedManifest(context) {
  const owners = [...new Set(storage.entries.map(row => row.owner))].sort();
  assert.deepEqual(Object.keys(storage.dataVersions).sort(), owners, 'Version owners differ from storage registry');
  return {schemaVersion:1, companionId:context.plan.companionId, modules:storage.dataVersions};
}
export function manifestComplete(context) {
  if (!regular(context.manifestFile)) return false;
  requireMigration(isDeepStrictEqual(checked('manifest-mismatch', () => json(context.manifestFile)), expectedManifest(context)), 'manifest-mismatch');
  return true;
}
export function assertOffline(context) {
  checked('dsh-running', () => assertDshStopped(context.plan));
  checked('writer-running', () => assertStopped(context.plan.coreDirectory, 'core'));
  checked('writer-running', () => assertStopped(join(context.data, 'economy'), 'economy'));
  if (context.plan.memoryDirectory) checked('writer-running', () => assertStopped(context.plan.memoryDirectory, 'memory'));
  checked('binding-changed', () => {
    const binding = inspectRepoBinding(context.receipt.config);
    assert.equal(binding.state, 'ready');
    assert.equal(binding.storageId, context.plan.storageId, 'Storage binding changed');
    assert.equal(binding.root, context.plan.repo, 'Repo binding changed');
  });
}

export function readInstallation(file) {
  return checked('receipt-invalid', () => {
    regular(file); const receipt = json(file);
    requireMigration(receipt?.status === 'installed' && receipt.packageInstalled === true &&
      typeof receipt.config?.dataDir === 'string' && receipt.config.dataDir.length > 0 &&
      typeof receipt.profileDir === 'string' && receipt.profileDir.length > 0, 'receipt-invalid');
    return receipt;
  });
}
