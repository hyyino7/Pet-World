import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { variants, fixture, read } from './helpers.mjs';

const child = (f, backup, point, resume = '') => spawn(process.execPath,
  ['--import',resolve('tests/migrate/dsh-probe.mjs'),resolve('tests/migrate/migration-child.mjs'),f.installation,backup,point,resume],{stdio:'pipe'});
for (const variant of variants) for (const point of ['before','after','partial','complete']) {
  test(`${variant}: SIGKILL ${point} resumes original backup, applying each step once`, {timeout:60000}, async t => {
    const f = await fixture(t,variant), backup = join(f.out,'backup');
    const interrupted = child(f,backup,point); let diagnostics = '';
    interrupted.stderr.on('data',bytes => {diagnostics += bytes;});
    const [code,signal] = await once(interrupted,'exit');
    assert.equal(code,null,diagnostics); assert.equal(signal,'SIGKILL',diagnostics);
    const original = readFileSync(join(backup,'manifest.json'));
    assert.equal(existsSync(join(f.data,'migration.lock')),true);
    // A completion marker cannot hide a missing target: target state owns retry.
    const log = join(f.data,'migrations.jsonl');
    if (point === 'before') {
      const rows = readFileSync(log,'utf8').trim().split('\n').map(JSON.parse), header = rows[0];
      writeFileSync(log, rows.map(JSON.stringify).join('\n') + '\n' + JSON.stringify({migrationId:header.id,event:'done',step:'second'}) + '\n');
    }
    const resumed = child(f,backup,point,'resume'); diagnostics = '';
    resumed.stderr.on('data',bytes => {diagnostics += bytes;});
    assert.equal((await once(resumed,'exit'))[0],0,diagnostics);
    for (const id of ['first','second','third']) assert.equal(read(join(f.data,'synthetic-step-' + id + '.json')).applications,1);
    assert.equal(existsSync(join(f.data,'migration.lock')),false);
    assert.deepEqual(readFileSync(join(backup,'manifest.json')),original,'No second backup is created on resume');
    const rows = readFileSync(log,'utf8').trim().split('\n').map(JSON.parse);
    assert.ok(rows.some(row => row.event === 'lock-takeover'));
    if (point === 'partial') assert.ok(rows.some(row => row.event === 'journal-repaired'));
  });
}
