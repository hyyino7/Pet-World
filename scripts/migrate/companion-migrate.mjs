#!/usr/bin/env node
import { requireMigration, diagnostic } from './errors.mjs';
import { migrationStatus, runMigration } from './runner.mjs';

const args = process.argv.slice(2), command = args.shift();
try {
  requireMigration(['plan','status','run'].includes(command), 'usage');
  const options = {};
  while (args.length) {
    const name = args.shift();
    requireMigration(['--installation','--backup','--resume'].includes(name) && !(name in options), 'usage');
    options[name] = name === '--resume' ? true : args.shift();
    requireMigration(options[name] && !String(options[name]).startsWith('--'), 'usage');
  }
  requireMigration(options['--installation'], 'usage');
  requireMigration(command === 'run' || !options['--backup'] && !options['--resume'], 'usage');
  requireMigration(!options['--resume'] || !options['--backup'], 'usage');
  const result = command === 'run' ? await runMigration({installation:options['--installation'],
    backup:options['--backup'], resume:options['--resume']}) : migrationStatus(options['--installation'], undefined, { plan:command === 'plan' });
  if (command === 'plan') result.steps = result.steps.filter(step => step.state === 'pending');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(diagnostic(error));
  process.exitCode = 1;
}
