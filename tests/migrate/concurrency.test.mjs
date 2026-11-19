import test from 'node:test';
import { offlineFixture } from './offline-helpers.mjs';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { join, resolve } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createOfflineBackup } from '../../scripts/lib/offline-backup.mjs';
import { variants, fixture, cli, planFor } from './helpers.mjs';

const restoreCommand = (f, backup) => ['--import',resolve('tests/migrate/dsh-probe.mjs'),
  resolve('scripts/companion-backup.mjs'),'restore','--installation',f.installation,'--backup',backup,'--before',join(f.out,'before-restore')];

for (const variant of [...variants,'offline-metadata']) test(`${variant}: concurrent run cannot acquire the held lease`, {timeout:60000}, async t => {
  const f = await (variant === 'offline-metadata' ? offlineFixture(t) : fixture(t,variant)), backup = join(f.out,'backup');
  const base = ['--import',resolve('tests/migrate/dsh-probe.mjs'),resolve('tests/migrate/migration-child.mjs'),f.installation,backup,'hold'];
  const first = spawn(process.execPath,base,{stdio:['ignore','pipe','pipe','ipc']});
  t.after(() => { if (first.exitCode === null && first.signalCode === null) first.kill('SIGKILL'); });
  const held = await Promise.race([once(first,'message'),once(first,'exit').then(result => {throw Error('First process exited before holding lease: ' + result);})]);
  assert.equal(held[0].held,true);
  const lease = readFileSync(join(f.data,'migration.lock'));
  const second = spawn(process.execPath,[...base,'resume'],{stdio:'pipe'});
  let error = ''; second.stderr.on('data', chunk => {error += chunk;});
  assert.equal((await once(second,'close'))[0],1);
  assert.equal(JSON.parse(error).code,'lock-held');
  assert.deepEqual(readFileSync(join(f.data,'migration.lock')),lease);
  if (variant === 'offline-metadata') {
    const restore = spawnSync(process.execPath,restoreCommand(f,backup),{encoding:'utf8'});
    assert.equal(restore.status,1);
    assert.match(restore.stderr,/Migration or restore is running/);
    assert.equal(existsSync(join(f.out,'before-restore')),false);
    assert.deepEqual(readFileSync(join(f.data,'migration.lock')),lease);
  }
  first.send({continue:true});
  assert.equal((await once(first,'exit'))[0],0);
});

for (const variant of [...variants,'offline-metadata','restored-stale-lock']) test(`${variant}: two concurrent runs pass preflight and only one acquires the lease`, {timeout:60000}, async t => {
  const f = await (variants.includes(variant) ? fixture(t,variant) : offlineFixture(t)), gate = join(f.out,'lock-gate');
  if (variant === 'restored-stale-lock') {
    const dead = spawn(process.execPath,['-e','']);
    await once(dead,'exit');
    writeFileSync(join(f.data,'migration.lock'),`${dead.pid}:restored`);
  }
  // Both CLIs finish SQLite preflight before racing for the offline mutex.
  const children = [0,1].map(index => spawn(process.execPath,[
    '--import',resolve('tests/migrate/dsh-probe.mjs'),'--import',resolve('tests/migrate/lock-gate.mjs'),
    resolve('scripts/migrate/companion-migrate.mjs'),'run','--installation',f.installation,'--backup',join(f.out,'backup-' + index)],
    {env:{...process.env,MIGRATE_TEST_LOCK_GATE:gate,MIGRATE_TEST_LOCK_ROLE:String(index)},stdio:['ignore','pipe','pipe','ipc']}));
  const results = children.map(child => {
    let stdout = '', stderr = '';
    child.stdout.on('data',chunk => {stdout += chunk;}); child.stderr.on('data',chunk => {stderr += chunk;});
    t.after(() => {if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');});
    return once(child,'close').then(([status]) => ({status,stdout,stderr}));
  });
  await Promise.all(children.map((child,index) => Promise.race([
    once(child,'message').then(([message]) => assert.equal(message.beforeLock,true)),
    once(child,'exit').then(async () => {throw Error('Fresh run exited before lock acquisition: ' + (await results[index]).stderr);}),
  ])));
  // Both real CLI processes reached BEGIN IMMEDIATE after preflight.
  writeFileSync(gate,'continue');
  const outcomes = await Promise.all(results);
  assert.deepEqual(outcomes.map(result => result.status).sort(),[0,1],JSON.stringify(outcomes));
  assert.equal(JSON.parse(outcomes.find(result => result.status === 1).stderr).code,'lock-held');
  assert.deepEqual(JSON.parse(outcomes.find(result => result.status === 0).stdout).steps,[{id:'0001-storage-manifest',state:'complete'}]);
  assert.equal([0,1].filter(index => existsSync(join(f.out,'backup-' + index))).length,1);
  const journal = readFileSync(join(f.data,'migrations.jsonl'),'utf8');
  assert.equal(journal.includes('"event":"lock-takeover"'),variant === 'restored-stale-lock');
});

test('migration refuses while the restore CLI owns the offline mutex', {timeout:30000}, async t => {
  const f = await offlineFixture(t,false), backup = join(f.out,'old'), gate = join(f.out,'restore-gate');
  createOfflineBackup(planFor(f),backup,{probe() {}});
  const restore = spawn(process.execPath,['--import',resolve('tests/migrate/lock-gate.mjs'),...restoreCommand(f,backup)],
    {env:{...process.env,MIGRATE_TEST_RESTORE_GATE:gate},stdio:['ignore','pipe','pipe','ipc']});
  t.after(() => { if (restore.exitCode === null && restore.signalCode === null) restore.kill('SIGKILL'); });
  let stderr = '';
  restore.stderr.on('data',chunk => { stderr += chunk; });
  const done = once(restore,'close');
  const [ready] = await Promise.race([once(restore,'message'),done.then(() => { throw Error(stderr); })]);
  assert.equal(ready.held,true);
  const output = join(f.out,'migration-backup');
  const rejected = cli(f,['run','--installation',f.installation,'--backup',output]);
  assert.equal(rejected.status,1);
  assert.equal(JSON.parse(rejected.stderr).code,'lock-held');
  assert.equal(existsSync(output),false);
  assert.equal(existsSync(join(f.data,'migration.lock')),false);
  writeFileSync(gate,'continue');
  assert.equal((await done)[0],0,stderr);
});
