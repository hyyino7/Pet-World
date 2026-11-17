import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { restoreOfflineBackup } from '../../scripts/lib/offline-backup.mjs';
import { offlineFixture } from './offline-helpers.mjs';
import { cli, mockDsh, planFor } from './helpers.mjs';

test('metadata migration: pending plan, completed status and retained rollback lease',async t => {
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
