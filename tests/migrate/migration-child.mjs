import fs, { existsSync, appendFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diagnostic } from '../../scripts/migrate/errors.mjs';

const selector = new URL('?bootstrap-cli', import.meta.url);
const selecting = new URL(import.meta.url).search === selector.search;
const cli = fileURLToPath(new URL('../../scripts/migrate/companion-migrate.mjs', import.meta.url));
const runner = !selecting || process.argv[1] === cli ? await import('../../scripts/migrate/runner.mjs') : undefined;

export const bootstrapSteps = runner?.steps.slice(0,1);
export function selectBootstrapCli(t) {
  const previous = process.env.NODE_OPTIONS;
  process.env.NODE_OPTIONS = [previous, `--import=${selector.href}`].filter(Boolean).join(' ');
  t.after(() => {
    if (previous === undefined) delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS = previous;
  });
}
if (selecting && runner) runner.steps.splice(1);

if (!selecting && process.argv[1] === fileURLToPath(import.meta.url)) {
  const {migrationStatus, runMigration, steps} = runner;
  const {atomicWrite, json} = await import('../../scripts/migrate/io.mjs');
  const [installation, backup, point, mode, suite] = process.argv.slice(2);
  const kill = () => process.kill(process.pid, 'SIGKILL');
  const [bootstrap] = bootstrapSteps;
  const fixtureStep = {
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
  const home = steps[1];
  const step = suite === 'home' ? {...home, apply(context) {
    home.apply(context);
    if (!mode && point === 'after') kill();
  }} : fixtureStep;
  const selected = [bootstrap, step];

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
    else if (mode === 'mismatch') await runMigration({installation,resume:true}, bootstrapSteps);
    else await runMigration({installation,backup:mode ? undefined : backup,resume:mode === 'resume'}, selected);
  } catch (error) {
    console.error(diagnostic(error));
    process.exitCode = 1;
  } finally { if (process.connected) process.disconnect(); }
}
