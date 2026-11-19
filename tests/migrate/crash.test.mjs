import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { hash } from '../../scripts/migrate/io.mjs';
import { runMigration } from '../../scripts/migrate/runner.mjs';
import { variants, fixture, mockDsh, read } from './helpers.mjs';
import { offlineFixture } from './offline-helpers.mjs';

const child = async (f, backup, point, mode = '') => {
  const processChild = spawn(process.execPath,
    ['--import',resolve('tests/migrate/dsh-probe.mjs'),resolve('tests/migrate/migration-child.mjs'),f.installation,backup,point,mode],{stdio:'pipe'});
  let stdout = '', stderr = '';
  processChild.stdout.on('data', bytes => {stdout += bytes;});
  processChild.stderr.on('data', bytes => {stderr += bytes;});
  const [code, signal] = await once(processChild,'close');
  return {code, signal, stdout, stderr};
};
const rows = log => readFileSync(log,'utf8').trimEnd().split('\n').map(JSON.parse);
const header = log => rows(log).findLast(row => row.event === 'migration');

for (const variant of variants) for (const point of ['before','after','partial','complete']) {
  test(`${variant}: SIGKILL ${point} resumes original backup, applying the target once`, {timeout:60000}, async t => {
    const f = await fixture(t,variant), backup = join(f.out,'backup'), log = join(f.data,'migrations.jsonl');
    const interrupted = await child(f,backup,point);
    assert.equal(interrupted.signal,'SIGKILL',interrupted.stderr);
    const original = readFileSync(join(backup,'manifest.json'));
    assert.equal(existsSync(join(f.data,'migration.lock')),true);
    const resumed = await child(f,backup,point,'resume');
    assert.equal(resumed.code,0,resumed.stderr);
    assert.equal(read(join(f.data,'synthetic-step.json')).applications,1);
    assert.equal(existsSync(join(f.data,'migration.lock')),false);
    assert.deepEqual(readFileSync(join(backup,'manifest.json')),original,'No second backup is created on resume');
    assert.ok(rows(log).some(row => row.event === 'lock-takeover'));
    if (point === 'partial') assert.ok(rows(log).some(row => row.event === 'journal-repaired'));
  });
}

for (const point of ['backup','after','manifest','complete']) {
  test(`second migration: SIGKILL at ${point} preserves the correct boundary`, {timeout:60000}, async t => {
    mockDsh(t);
    const f = await offlineFixture(t, false), oldBackup = join(f.out,'old'), backup = join(f.out,'new');
    const log = join(f.data,'migrations.jsonl'), manifest = join(f.data,'storage-manifest.json'), target = join(f.data,'synthetic-step.json');
    await runMigration({installation:f.installation, backup:oldBackup});
    const [old, ...events] = rows(log);
    const legacy = {event:old.event,id:old.id,backup:old.backup,manifestHash:old.backupHash};
    writeFileSync(log, [legacy,...events].map(JSON.stringify).join('\n') + '\n');
    const oldLog = readFileSync(log,'utf8'), oldManifest = readFileSync(manifest,'utf8');

    const interrupted = await child(f,backup,point);
    assert.equal(interrupted.signal,'SIGKILL',interrupted.stderr);
    const backupManifest = readFileSync(join(backup,'manifest.json'));
    assert.equal(existsSync(join(f.data,'migration.lock')),true);
    assert.equal(existsSync(target),point !== 'backup');
    if (point === 'backup') {
      assert.equal(readFileSync(log,'utf8'),oldLog);
      assert.equal(readFileSync(manifest,'utf8'),oldManifest);
      const retry = await child(f,join(f.out,'retry'),'');
      assert.equal(retry.code,0,retry.stderr);
      assert.equal(header(log).backup,join(f.out,'retry'));
    } else {
      assert.equal(header(log).backupHash,hash(backupManifest));
      assert.equal(header(log).binding.storageId,f.storageId);
      assert.equal(header(log).binding.repoHash,hash(f.repo));
      assert.deepEqual(header(log).steps[1].from,JSON.parse(oldManifest).modules);
      assert.equal(header(log).steps[1].to.core,2);
      assert.equal(read(manifest).modules.core,point === 'after' ? 1 : 2);
      if (point === 'complete') {
        rmSync(target);
        const status = await child(f,backup,'','status');
        assert.equal(status.code,0,status.stderr);
        assert.equal(JSON.parse(status.stdout).steps[1].state,'inconsistent');
        const refused = await child(f,join(f.out,'refused'),'');
        assert.equal(JSON.parse(refused.stderr).code,'migration-inconsistent');
        assert.equal(existsSync(join(f.out,'refused')),false);
        return;
      }
      assert.equal(rows(log).at(-1).event,'start');
      const mismatch = await child(f,backup,'','mismatch');
      assert.equal(JSON.parse(mismatch.stderr).code,'journal-step-mismatch');
      const resumed = await child(f,backup,'','resume');
      assert.equal(resumed.code,0,resumed.stderr);
      assert.equal(rows(log).at(-1).event,'skip');
    }
    assert.equal(read(manifest).modules.core,2);
    assert.equal(read(target).applications,1);
    assert.ok(readFileSync(log,'utf8').startsWith(oldLog));
    assert.equal(rows(log).filter(row => row.event === 'migration').length,2);
    assert.ok(rows(log).some(row => row.event === 'lock-takeover'));
    assert.deepEqual(readFileSync(join(backup,'manifest.json')),backupManifest);
    assert.equal(existsSync(join(f.data,'migration.lock')),false);
  });
}
