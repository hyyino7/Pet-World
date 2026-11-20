import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { restoreOfflineBackup } from '../../scripts/lib/offline-backup.mjs';
import { storage } from '../../scripts/migrate/context.mjs';
import { offlineFixture } from './offline-helpers.mjs';
import { cli, mockDsh, planFor, refusedCli } from './helpers.mjs';
import { selectBootstrapCli } from './migration-child.mjs';

test('metadata migration: pending plan, completed status and retained rollback lease',async t => {
  selectBootstrapCli(t);
  mockDsh(t); const f = await offlineFixture(t), backup = join(f.out,'backup');
  const execute = args => {const result = cli(f,args); assert.equal(result.status,0,result.stderr); return JSON.parse(result.stdout);};
  for (const command of ['plan','status']) assert.deepEqual(execute([command,'--installation',f.installation]).steps,[{id:'0001-storage-manifest',state:'pending'}]);
  execute(['run','--installation',f.installation,'--backup',backup]);
  assert.deepEqual(execute(['plan','--installation',f.installation]).steps,[]);
  assert.deepEqual(execute(['status','--installation',f.installation]).steps,[{id:'0001-storage-manifest',state:'complete'}]);
  const lease = readFileSync(join(backup,'data/companion/payload/data/migration.lock'));
  restoreOfflineBackup(planFor(f),backup,join(f.out,'before-restore'));
  assert.deepEqual(readFileSync(join(f.data,'migration.lock')),lease);
  assert.equal(existsSync(join(f.data,'storage-manifest.json')),false);
  assert.equal(existsSync(join(f.data,'migrations.jsonl')),false);
});

test('0002 copies the home identity and preserves the Life file byte for byte', async t => {
  mockDsh(t);
  const f = await offlineFixture(t, false), backup = join(f.out, 'home-backup');
  const life = join(f.data, 'life/life.json');
  const original = '{"version":1,"homeSessionId":"fixture-session","greeting":{"kind":"arrival","at":"2026-01-01T00:00:00.000Z"}}\n';
  writeFileSync(life, original);
  const execute = (command, ...args) => {
    const result = cli(f, [command, '--installation', f.installation, ...args]);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  const step = '0002-home-identity';
  assert.deepEqual(execute('plan').steps.at(-1), {id:step,state:'pending'});
  assert.deepEqual(execute('run', '--backup', backup).steps.at(-1), {id:step,state:'complete'});
  assert.deepEqual(JSON.parse(readFileSync(join(f.data, 'storage-manifest.json'), 'utf8')), {
    schemaVersion:1, companionId:f.config.companionId, modules:storage.dataVersions,
  });
  assert.equal(readFileSync(life, 'utf8'), original);
  const db = new DatabaseSync(join(f.config.dataDir, 'core.sqlite'), {readOnly:true});
  try {
    const rows = db.prepare("SELECT id, value FROM records WHERE kind='companion-home'").all();
    assert.deepEqual(rows.map(({id,value}) => [id, JSON.parse(value)]), [[f.storageId, {sessionId:'fixture-session'}]]);
  } finally { db.close(); }
  writeFileSync(life, original.replace('fixture-session', 'stale-mirror'));
  assert.deepEqual(execute('status').steps.at(-1), {id:step,state:'complete'});
  assert.deepEqual(execute('run', '--resume').steps.at(-1), {id:step,state:'complete'});
});

test('0002 refuses to overwrite a conflicting Core record', async t => {
  mockDsh(t);
  const f = await offlineFixture(t, false), life = join(f.data, 'life/life.json');
  const original = '{"version":1,"homeSessionId":"fixture-session"}\n';
  writeFileSync(life, original);
  const file = join(f.config.dataDir, 'core.sqlite'), db = new DatabaseSync(file);
  const preserved = JSON.stringify({sessionId:'conflicting-synthetic-session'});
  try { db.prepare('INSERT INTO records(kind,id,value) VALUES(?,?,?)').run('companion-home', f.storageId, preserved); }
  finally { db.close(); }
  refusedCli(f, ['run','--installation',f.installation,'--backup',join(f.out,'backup')], 'home-identity-conflict');
  assert.equal(readFileSync(life, 'utf8'), original);
  const reopened = new DatabaseSync(file, {readOnly:true});
  try { assert.equal(reopened.prepare('SELECT value FROM records WHERE kind=? AND id=?').get('companion-home', f.storageId).value, preserved); }
  finally { reopened.close(); }
});
