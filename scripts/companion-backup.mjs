#!/usr/bin/env node
// Offline backup/restore only. This command never launches DSH or a model.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { closeSync, lstatSync, mkdirSync, openSync, readFileSync, utimesSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { assertDshStopped, backupPlan, createOfflineBackup, restoreOfflineBackup, verifyOfflineBackup } from './lib/offline-backup.mjs';
import { DatabaseSync } from 'node:sqlite';
import { inspectRepoBinding } from './lib/repo-storage.mjs';

function lockError(code) {
  return Object.assign(new Error(code === 'lock-held' ? 'Migration or restore is running' : 'Invalid migration lock'), { code });
}

// A restore replaces .chatpet itself. Keep the interprocess mutex outside its
// replacement roots. SQLite releases this lock even if the process is killed.
export function acquireMigrationMutex(repo) {
  const uid = process.getuid();
  const directory = join('/tmp', 'her-world-offline-' + uid);
  try { mkdirSync(directory, { mode: 0o700 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const stat = lstatSync(directory);
  if (!stat.isDirectory() || stat.uid !== uid || (stat.mode & 0o077)) throw lockError('lock-invalid');
  const file = join(directory, createHash('sha256').update(repo).digest('hex') + '.sqlite');
  const state = lstatSync(file, { throwIfNoEntry: false });
  if (state && (!state.isFile() || state.nlink !== 1 || state.uid !== uid)) throw lockError('lock-invalid');
  if (!state) {
    try { closeSync(openSync(file, 'wx', 0o600)); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  // Retain the same inode for contenders and refresh it for system temp cleanup.
  const now = new Date();
  utimesSync(file, now, now);
  const db = new DatabaseSync(file, { timeout: 0 });
  try { db.exec('BEGIN IMMEDIATE'); }
  catch (error) {
    db.close();
    if ((error.errcode & 0xff) === 5) throw lockError('lock-held');
    throw error;
  }
  return () => db.close();
}

// Keep the on-disk PID/token compatible with backups made by the old migrator.
export function staleMigrationLock(file) {
  const stat = lstatSync(file, { throwIfNoEntry: false });
  if (!stat) return false;
  if (!stat.isFile() || stat.nlink !== 1) throw lockError('lock-invalid');
  const saved = readFileSync(file, 'utf8'), pid = Number(saved.split(':')[0]);
  if (!Number.isInteger(pid) || pid > 0x7fffffff || !/^[1-9][0-9]*:[^:\s]+$/.test(saved)) throw lockError('lock-invalid');
  try { process.kill(pid, 0); }
  catch (error) {
    if (error.code === 'ESRCH') return true;
    if (error.code !== 'EPERM') throw error;
  }
  throw lockError('lock-held');
}

function main() {
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
  const buildPlan = () => backupPlan({ repo: binding.root, workspaceId: binding.target.id, storageId: binding.storageId, profileDir: receipt.profileDir,
    dshHome: dirname(dirname(receipt.profileDir)), config: receipt.config,
    directories: bindings ? JSON.parse(readFileSync(resolve(bindings), 'utf8')) : {} });
  let result;
  if (command === 'plan') result = buildPlan();
  if (command === 'create') result = createOfflineBackup(buildPlan(), resolve(option('--output', true)));
  if (command === 'verify') result = verifyOfflineBackup(resolve(option('--backup', true)), buildPlan());
  if (command === 'restore') {
    const release = acquireMigrationMutex(binding.root);
    try {
      staleMigrationLock(join(binding.root, '.chatpet/data/migration.lock'));
      result = restoreOfflineBackup(buildPlan(), resolve(option('--backup', true)), resolve(option('--before', true)));
    } finally { release(); }
  }
  console.log(JSON.stringify(result, null, 2));
}
if (import.meta.main) main();
