import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { backupPlan, assertDshStopped } from '../lib/offline-backup.mjs';
import { inspectRepoBinding, assertStopped } from '../lib/repo-storage.mjs';
import { inspectTree, json, regular } from './io.mjs';

export const storage = json(new URL('../../arch/storage.json', import.meta.url));
export function loadInstallation(file) {
  file = resolve(file); regular(file);
  const receipt = json(file);
  assert.ok(receipt.status === 'installed' && receipt.packageInstalled === true, 'Completed installed receipt required');
  assert.ok(receipt.config?.dataDir && receipt.profileDir, 'Trusted data/profile bindings required');
  const binding = inspectRepoBinding(receipt.config);
  assert.equal(binding.state, 'ready', 'Ready binding required');
  const plan = backupPlan({repo:binding.root, workspaceId:binding.target.id, storageId:binding.storageId,
    profileDir:receipt.profileDir, dshHome:dirname(dirname(receipt.profileDir)), config:receipt.config});
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
  assert.ok(isDeepStrictEqual(json(context.manifestFile), expectedManifest(context)), 'Storage manifest differs; reconcile before migration');
  return true;
}
export function assertOffline(context) {
  assertDshStopped(context.plan);
  assertStopped(context.plan.coreDirectory, 'core');
  assertStopped(join(context.data, 'economy'), 'economy');
  if (context.plan.memoryDirectory) assertStopped(context.plan.memoryDirectory, 'memory');
  const binding = inspectRepoBinding(context.receipt.config);
  assert.equal(binding.state, 'ready');
  assert.equal(binding.storageId, context.plan.storageId, 'Storage binding changed');
  assert.equal(binding.root, context.plan.repo, 'Repo binding changed');
}
