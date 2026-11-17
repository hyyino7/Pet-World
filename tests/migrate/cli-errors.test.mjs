import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { acquireLock } from '../../scripts/migrate/io.mjs';

for (const [script,args] of [
  ['companion-migrate.mjs',[]],['companion-migrate.mjs',['invalid']],['inventory.mjs',[]],
]) test(`CLI usage: ${script} ${args.join(' ')}`, () => {
  const result = spawnSync(process.execPath,['scripts/migrate/' + script,...args],{encoding:'utf8'});
  assert.equal(result.status,1); assert.equal(result.stdout,'');
  assert.equal(JSON.parse(result.stderr).code,'usage');
});
for (const [text,code] of [[`${process.pid}:synthetic-token`,'lock-held'],['invalid','lock-invalid']])
  test(`Lock refusal: ${code}`, t => {
    const directory = mkdtempSync(join(tmpdir(),'migration-lock-'));
    t.after(() => rmSync(directory,{recursive:true,force:true}));
    const file = join(directory,'migration.lock'); writeFileSync(file,text);
    assert.throws(() => acquireLock(file), error => {
      assert.equal(error.code,code);
      if (code === 'lock-held') {
        assert.match(error.message,/确认/); assert.match(error.message,/手动删除/);
      }
      assert.ok(!error.message.includes(text)); assert.ok(!error.message.includes(file));
      return true;
    });
  });
