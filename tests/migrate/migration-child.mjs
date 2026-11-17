import { existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { runMigration } from '../../scripts/migrate/runner.mjs';
import { diagnostic } from '../../scripts/migrate/errors.mjs';
import { atomicWrite, appendJournal, json, readJournal } from '../../scripts/migrate/io.mjs';

const [installation, backup, point, resume] = process.argv.slice(2);
const kill = () => process.kill(process.pid, 'SIGKILL');
const fakeSteps = ['first','second','third'].map((id, index) => ({
  id,
  complete(context) {
    const file = join(context.data, 'synthetic-step-' + id + '.json');
    const complete = existsSync(file) && json(file).applications === 1;
    if (complete && point === 'complete' && index === 2 && !resume) {
      const header = readJournal(context.journalFile).rows[0];
      appendJournal(context.journalFile, {migrationId:header.id,event:'done',step:id});
      kill(); // All target states and completion records exist; lease is still held.
    }
    return complete;
  },
  async apply(context) {
    if (index === 1 && point === 'before' && !resume) kill();
    if (index === 1 && point === 'hold' && !resume) {
      process.send({held:true});
      await new Promise(resolve => process.once('message', resolve));
    }
    const file = join(context.data, 'synthetic-step-' + id + '.json');
    const previous = existsSync(file) ? json(file).applications : 0;
    atomicWrite(file, JSON.stringify({applications:previous + 1}) + '\n');
    if (index === 1 && !resume) {
      if (point === 'after') kill();
      if (point === 'partial') { appendFileSync(context.journalFile, '{"event":'); kill(); }
    }
  },
}));
try {
  await runMigration({installation,backup:resume ? undefined : backup,resume:Boolean(resume)}, fakeSteps);
  if (process.connected) process.disconnect();
} catch (error) { console.error(diagnostic(error)); process.exitCode = 1; if (process.connected) process.disconnect(); }
