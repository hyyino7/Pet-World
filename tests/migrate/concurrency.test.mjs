import test from 'node:test';
import { offlineFixture } from './offline-helpers.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join, resolve } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { variants, fixture } from './helpers.mjs';

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
  first.send({continue:true});
  assert.equal((await once(first,'exit'))[0],0);
});

for (const variant of [...variants,'offline-metadata']) test(`${variant}: two fresh runs pass preflight and only one acquires the lease`, {timeout:60000}, async t => {
  const f = await (variant === 'offline-metadata' ? offlineFixture(t) : fixture(t,variant)), gate = join(f.out,'lock-gate');
  // Both CLIs start together. Stage preflight reads (review item 4's shared
  // SQLite reader can contend), then release both real exclusive opens together.
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
  // Both real CLI processes reached open(wx), after all lock-external checks.
  writeFileSync(gate,'continue');
  const outcomes = await Promise.all(results);
  assert.deepEqual(outcomes.map(result => result.status).sort(),[0,1]);
  assert.equal(JSON.parse(outcomes.find(result => result.status === 1).stderr).code,'lock-held');
  assert.deepEqual(JSON.parse(outcomes.find(result => result.status === 0).stdout).steps,[{id:'0001-storage-manifest',state:'complete'}]);
  assert.equal([0,1].filter(index => existsSync(join(f.out,'backup-' + index))).length,1);
});
