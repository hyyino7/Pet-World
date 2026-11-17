import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileHashes } from '../../scripts/lib/repo-storage.mjs';
import { variants, fixture, cli, refusedCli } from './helpers.mjs';
import { offlineFixture } from './offline-helpers.mjs';

function refusesFreshRun(f, code) {
  const backup = join(f.out,'fresh-backup'), before = fileHashes(f.managed);
  const output = refusedCli(f,['run','--installation',f.installation,'--backup',backup],code);
  if (code === 'journal-exists') {
    assert.match(output.message,/已有迁移日志/);
    assert.match(output.message,/--resume/);
    assert.match(output.message,/status/);
    assert.doesNotMatch(output.message,/恢复|回退/);
  }
  assert.equal(existsSync(backup),false);
  assert.deepEqual(fileHashes(f.managed),before);
}

for (const variant of [...variants,'offline-metadata']) test(`${variant}: completed CLI run refuses a fresh backup with journal-exists`, {timeout:60000}, async t => {
  const f = await (variant === 'offline-metadata' ? offlineFixture(t) : fixture(t,variant));
  const result = cli(f,['run','--installation',f.installation,'--backup',join(f.out,'backup')]);
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).steps,[{id:'0001-storage-manifest',state:'complete'}]);
  refusesFreshRun(f,'journal-exists');
});

test('journal refusal distinguishes valid unfinished logs from damaged logs',async t => {
  const f = await offlineFixture(t), file = join(f.data,'migrations.jsonl');
  const result = cli(f,['run','--installation',f.installation,'--backup',join(f.out,'backup')]);
  assert.equal(result.status,0,result.stderr);
  const headerText = readFileSync(file,'utf8').split('\n')[0], header = JSON.parse(headerText);
  const cases = [
    ['valid unfinished log',headerText + '\n','journal-exists'],
    ['invalid header','{}\n','journal-invalid'],
    ['null header','null\n','journal-invalid'],
    ['false header','false\n','journal-invalid'],
    ['zero header','0\n','journal-invalid'],
    ['empty string header','""\n','journal-invalid'],
    ['invalid JSON','{bad}\n','journal-invalid'],
    ['truncated header',headerText,'journal-invalid'],
    ['truncated row',headerText + '\n{"event":','journal-invalid'],
    ['mixed migration',headerText + '\n' + JSON.stringify({migrationId:header.id + '-other',event:'done',step:'0001-storage-manifest'}) + '\n','journal-invalid'],
  ];
  for (const [name,text,code] of cases) await t.test(name,() => {
    writeFileSync(file,text);
    refusesFreshRun(f,code);
  });
});
