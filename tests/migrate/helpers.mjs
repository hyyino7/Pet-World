import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync, readFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { generateSynthetic, value } from '../../scripts/fixtures/synthetic-companion.mjs';
import { createCore } from '../../dist/src/core/index.js';
import { backupPlan } from '../../scripts/lib/offline-backup.mjs';

export const variants = ['current','legacy'];
export function mockDsh(t, running = false) {
  const original = childProcess.spawnSync;
  const mocked = t.mock.method(childProcess, 'spawnSync', (command, args, options) => command === 'pgrep'
    ? {status:running ? 0 : 1, stdout:running ? String(process.pid + 100000) : '', stderr:''}
    : original(command, args, options));
  syncBuiltinESMExports();
  t.after(() => { mocked.mock.restore(); syncBuiltinESMExports(); });
}
export async function fixture(t, variant) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'migrate-synthetic-')));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  return generateSynthetic(join(root, 'installed'), variant);
}
export function planFor(f) {
  return backupPlan({repo:f.repo,workspaceId:f.target.id,storageId:f.storageId,profileDir:f.profile,dshHome:f.home,config:f.config});
}
export const read = file => JSON.parse(readFileSync(file, 'utf8'));
export async function coreReady(f) {
  const host = createCore(f.config);
  try {
    const state = value(await host.services.workspace.inspect(host.operator.request('inspect'), {}));
    assert.equal(state.state, 'ready');
    assert.equal(host.workspace.storageId(), f.storageId);
    assert.equal(value(await host.services.core.getIdentity(host.operator.request('identity'), {})).companionId, f.config.companionId);
    assert.equal((await host.records.readSelf(f.target.id)).text, 'SYNTHETIC_SELF_817');
  } finally { await host.close(); }
}
export async function recall(f) {
  const host = createCore(f.config);
  try {
    const result = await host.native.memory.findForOwner(f.target.id, 'SYNTHETIC_JASMINE_817');
    assert.ok(result.items.some(row => row.id === f.memoryId));
    assert.ok(!(await host.native.memory.findForOwner(f.target.id, 'SYNTHETIC_WITHDRAWN_817')).items.some(row => row.id === f.withdrawnId));
  } finally { await host.close(); }
}
export function memoryLogical(f) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'migrate-memory-')));
  const source = join(f.data, 'memory/data/memory.db'), copy = join(root, 'memory.db');
  try {
    for (const suffix of ['', '-wal', '-shm']) {
      try { cpSync(source + suffix, copy + suffix); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const db = new DatabaseSync(copy);
    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      return db.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all().map(({name}) => [name,
        db.prepare('SELECT * FROM "' + name.replaceAll('"', '""') + '"').all().map(row => JSON.stringify(row)).sort()]);
    } finally { db.close(); }
  } finally { rmSync(root, {recursive:true, force:true}); }
}
