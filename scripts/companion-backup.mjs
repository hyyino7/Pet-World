#!/usr/bin/env node
// Offline backup/restore only. This command never launches DSH or a model.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { assertDshStopped, backupPlan, createOfflineBackup, restoreOfflineBackup, verifyOfflineBackup } from './lib/offline-backup.mjs';
import { inspectRepoBinding } from './lib/repo-storage.mjs';

const args = process.argv.slice(2), command = args.shift();
function option(name, required = false) {
  const index = args.indexOf(name), value = index < 0 ? undefined : args[index + 1];
  if (index >= 0) assert.ok(value && !value.startsWith('--'), `Missing value for ${name}`);
  if (required) assert.ok(value, `Specify ${name}`);
  return value;
}
if (!command || command === '--help') {
  console.log(`Usage: node scripts/companion-backup.mjs <plan|create|verify|restore> --installation <installation.json>
  create:  --output <new-backup-directory>
  verify:  --backup <backup-directory>
  restore: --backup <backup-directory> --before <new-safety-backup-directory>
Optional: --bindings <JSON with sessions/registry/projectionCache/attachments/channels/voice absolute path overrides>
Quit ALL DSH processes before create/restore. Only this companion's workspaces
and logs are replaced. Other workspaces and global profile settings are retained.
Shared attachments are only added when missing. Credentials and executable
packages are excluded; restore requires the same installed code.`);
  process.exit(0);
}
assert.ok(['plan', 'create', 'verify', 'restore'].includes(command), 'Unknown backup command');
const receipt = JSON.parse(readFileSync(resolve(option('--installation', true)), 'utf8'));
assert.ok(receipt.status === 'installed' && receipt.packageInstalled === true,
  'Use a completed installed receipt; reconcile the current installation and Repo binding before backup');
assert.ok(receipt.config?.dataDir && receipt.profileDir, 'Installation receipt lacks trusted data/profile bindings');
if (command === 'create' || command === 'restore') assertDshStopped();
const binding = inspectRepoBinding(receipt.config);
assert.equal(binding.state, 'ready', 'Bind and initialize the companion Repo before backup: ' + binding.reason);
const bindings = option('--bindings');
const plan = backupPlan({ repo: binding.root, workspaceId: binding.target.id, storageId: binding.storageId, profileDir: receipt.profileDir,
  dshHome: dirname(dirname(receipt.profileDir)), config: receipt.config,
  directories: bindings ? JSON.parse(readFileSync(resolve(bindings), 'utf8')) : {} });
let result;
if (command === 'plan') result = plan;
if (command === 'create') result = createOfflineBackup(plan, resolve(option('--output', true)));
if (command === 'verify') result = verifyOfflineBackup(resolve(option('--backup', true)), plan);
if (command === 'restore') result = restoreOfflineBackup(plan, resolve(option('--backup', true)), resolve(option('--before', true)));
console.log(JSON.stringify(result, null, 2));
