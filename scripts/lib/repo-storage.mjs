// Offline relocation only: retain each module's authority and exact stored bytes.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

export function assertStopped(directory, kind) {
  const file = join(directory, kind === 'core' ? 'core.lock' : 'runtime/service.json');
  if (!existsSync(file)) return;
  const value = readFileSync(file, 'utf8');
  const pid = kind === 'core' ? Number(value.split(':')[0]) : JSON.parse(value).pid;
  assert.ok(Number.isSafeInteger(pid) && pid > 0, `Invalid ${kind} owner record`);
  try { process.kill(pid, 0); }
  catch (error) { if (error.code === 'ESRCH') return; throw error; }
  throw new Error(`${kind} still has a live writer; quit DSH before relocating data`);
}

export function fileHashes(directory) {
  const hashes = {};
  function visit(path) {
    const stat = lstatSync(path);
    assert.ok(!stat.isSymbolicLink(), `Symlink is not supported during relocation: ${path}`);
    if (stat.isDirectory()) for (const name of readdirSync(path).sort()) visit(join(path, name));
    else {
      assert.ok(stat.isFile(), `Non-regular data file: ${path}`);
      hashes[relative(directory, path)] = createHash('sha256').update(readFileSync(path)).digest('hex');
    }
  }
  if (existsSync(directory)) visit(directory);
  return hashes;
}

export function prepareRepoStorage(workspace, config) {
  const root = realpathSync(workspace), managed = join(root, '.chatpet');
  assert.ok(lstatSync(managed).isDirectory() && !lstatSync(managed).isSymbolicLink(), 'Initialize the companion Repo first');
  const manifest = JSON.parse(readFileSync(join(managed, 'manifest.json'), 'utf8'));
  assert.equal(manifest.companionId, config.companionId, 'Storage Repo belongs to another companion');
  const data = join(managed, 'data');
  if (existsSync(data)) assert.ok(lstatSync(data).isDirectory() && !lstatSync(data).isSymbolicLink());
  const entries = [{ kind: 'core', source: resolve(config.dataDir), target: join(data, 'core') }];
  if (config.memory) entries.push({ kind: 'memory', source: resolve(config.memory.dataDir), target: join(data, 'memory') });
  for (const entry of entries) {
    const { source, target } = entry;
    assert.ok(existsSync(source), `Missing existing ${entry.kind} data; refuse to silently create a new identity/Bank`);
    assert.equal(realpathSync(source), source, 'Resolve source symlinks before migration');
    assert.ok(source === target || (!target.startsWith(source + sep) && !source.startsWith(target + sep)), 'Overlapping data directories');
    if (source !== target) assert.ok(!existsSync(target), `Destination already exists; inspect it instead of merging: ${target}`);
  }
  return { root, data, entries };
}

export function relocateRepoStorage(plan) {
  // All writers and destinations are checked before any copy. Old data remains
  // intact for rollback; no automatic merge, deletion, replay or Bank reset.
  const snapshots = new Map();
  for (const entry of plan.entries) {
    assertStopped(entry.source, entry.kind);
    if (entry.source !== entry.target) assert.ok(!existsSync(entry.target), 'Destination appeared during migration');
    snapshots.set(entry.source, fileHashes(entry.source));
  }
  const ignore = join(plan.root, '.chatpet', '.gitignore');
  if (existsSync(ignore)) assert.ok(lstatSync(ignore).isFile() && !lstatSync(ignore).isSymbolicLink());
  const oldIgnore = existsSync(ignore) ? readFileSync(ignore, 'utf8') : '';
  if (!oldIgnore.split(/\r?\n/).includes('/data/'))
    writeFileSync(ignore, oldIgnore + (oldIgnore && !oldIgnore.endsWith('\n') ? '\n' : '') + '/data/\n', { mode: 0o600 });
  mkdirSync(plan.data, { recursive: true, mode: 0o700 });
  const copied = [];
  for (const entry of plan.entries) {
    if (entry.source === entry.target) continue;
    const before = snapshots.get(entry.source), stage = join(dirname(entry.target), `.relocate-${entry.kind}-${randomUUID()}`);
    try {
      cpSync(entry.source, stage, { recursive: true, dereference: false, errorOnExist: true, force: false });
      assert.deepEqual(fileHashes(stage), before, 'Copied bytes do not match source');
      assert.deepEqual(fileHashes(entry.source), before, 'Source changed during migration');
      assertStopped(entry.source, entry.kind);
      assert.ok(!existsSync(entry.target), 'Destination appeared during migration');
      renameSync(stage, entry.target);
      copied.push({ ...entry, files: Object.keys(before).length, hashes: before });
    } finally { if (existsSync(stage)) rmSync(stage, { recursive: true }); }
  }
  return copied;
}
