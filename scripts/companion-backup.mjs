#!/usr/bin/env node
// Offline backup/restore only. This command never launches DSH or a model.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { assertDshStopped, backupPlan, createOfflineBackup, restoreOfflineBackup, verifyOfflineBackup } from './lib/offline-backup.mjs';

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
assert.ok(receipt.config?.dataDir && receipt.profileDir, 'Installation receipt lacks trusted data/profile bindings');
if (command === 'create' || command === 'restore') assertDshStopped();
const db = new DatabaseSync(join(receipt.config.dataDir, 'core.sqlite'), { readOnly: true });
let workspace, storageId;
try {
  const row = db.prepare("SELECT value FROM records WHERE kind='preferences' AND id='current'").get();
  workspace = row && JSON.parse(row.value).workspace;
  const stored = db.prepare("SELECT value FROM meta WHERE key='workspace.storage-id'").get();
  const local=workspace?.path ? relative(workspace.path,receipt.config.dataDir) : '..';
  const portable=!isAbsolute(local)&&local!=='..'&&!local.startsWith('..'+sep);
  storageId = portable && stored ? JSON.parse(stored.value) : workspace?.id;
  const rowIdentity = db.prepare("SELECT value FROM records WHERE kind='identity' AND id='current'").get();
  assert.equal(JSON.parse(rowIdentity.value).companionId, receipt.config.companionId, 'Receipt companion differs from live Core identity');
} finally { db.close(); }
assert.ok(workspace?.path, 'Bind and initialize the companion Repo before creating a backup');
const bindings = option('--bindings');
const plan = backupPlan({ repo: workspace.path, workspaceId: workspace.id, storageId, profileDir: receipt.profileDir,
  dshHome: dirname(dirname(receipt.profileDir)), config: receipt.config,
  directories: bindings ? JSON.parse(readFileSync(resolve(bindings), 'utf8')) : {} });
let result;
if (command === 'plan') result = plan;
if (command === 'create') result = createOfflineBackup(plan, resolve(option('--output', true)));
if (command === 'verify') result = verifyOfflineBackup(resolve(option('--backup', true)), plan);
if (command === 'restore') result = restoreOfflineBackup(plan, resolve(option('--backup', true)), resolve(option('--before', true)));
console.log(JSON.stringify(result, null, 2));
