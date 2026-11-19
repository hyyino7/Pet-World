import fs, { existsSync, appendFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { migrationStatus, runMigration, steps } from '../../scripts/migrate/runner.mjs';
import { diagnostic } from '../../scripts/migrate/errors.mjs';
import { atomicWrite, json } from '../../scripts/migrate/io.mjs';

const [installation, backup, point, mode] = process.argv.slice(2);
const kill = () => process.kill(process.pid, 'SIGKILL');
const bootstrap = steps[0];
const step = {
  id:'synthetic-step',
  from:bootstrap.to,
  to:{...bootstrap.to, core:2},
  complete(context) {
    const file = join(context.data, 'synthetic-step.json');
    return existsSync(file) && json(file).applications === 1;
  },
  async apply(context) {
    if (point === 'before' && !mode) kill();
    if (point === 'hold' && !mode) {
      process.send({held:true});
      await new Promise(resolve => process.once('message', resolve));
    }
    const file = join(context.data, 'synthetic-step.json');
    const previous = existsSync(file) ? json(file).applications : 0;
    atomicWrite(file, JSON.stringify({applications:previous + 1}) + '\n');
    if (!mode && point === 'after') kill();
    if (!mode && point === 'partial') { appendFileSync(context.journalFile, '{"event":'); kill(); }
  },
};
const selected = [...steps, step];

// Observe the actual atomic renames, without test hooks in production.
// All killed children are stopped after these syscalls, with the lease held.
const rename = fs.renameSync;
fs.renameSync = (from, to) => {
  rename(from, to);
  if (mode) return;
  if (point === 'backup' && to === backup) kill();
  if (point === 'manifest' && String(to).endsWith('/storage-manifest.json') && json(to).modules.core === 2) kill();
  if (['header','complete'].includes(point) && String(to).endsWith('/migrations.jsonl')) {
    const row = fs.readFileSync(to,'utf8').trimEnd().split('\n').map(JSON.parse).at(-1);
    if (point === 'header' && row.event === 'migration') kill();
    if (point === 'complete' && row.event === 'done' && row.step === step.id) kill();
  }
};
syncBuiltinESMExports();

try {
  if (mode === 'status') console.log(JSON.stringify(migrationStatus(installation, selected)));
  else if (mode === 'mismatch') await runMigration({installation,resume:true}, steps);
  else await runMigration({installation,backup:mode ? undefined : backup,resume:mode === 'resume'}, selected);
} catch (error) {
  console.error(diagnostic(error));
  process.exitCode = 1;
} finally { if (process.connected) process.disconnect(); }
