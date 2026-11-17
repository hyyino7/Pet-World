import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { variants, fixture } from './helpers.mjs';

for (const variant of variants) test(`${variant}: concurrent run cannot acquire the held lease`, {timeout:60000}, async t => {
  const f = await fixture(t,variant), backup = join(f.out,'backup');
  const base = ['--import',resolve('tests/migrate/dsh-probe.mjs'),resolve('tests/migrate/migration-child.mjs'),f.installation,backup,'hold'];
  const first = spawn(process.execPath,base,{stdio:['ignore','pipe','pipe','ipc']});
  t.after(() => { if (first.exitCode === null && first.signalCode === null) first.kill('SIGKILL'); });
  const held = await Promise.race([once(first,'message'),once(first,'exit').then(result => {throw Error('First process exited before holding lease: ' + result);})]);
  assert.equal(held[0].held,true);
  const lease = readFileSync(join(f.data,'migration.lock'));
  const second = spawn(process.execPath,[...base,'resume'],{stdio:'pipe'});
  assert.equal((await once(second,'exit'))[0],1);
  assert.deepEqual(readFileSync(join(f.data,'migration.lock')),lease);
  first.send({continue:true});
  assert.equal((await once(first,'exit'))[0],0);
});
