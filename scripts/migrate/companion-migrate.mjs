#!/usr/bin/env node
import assert from 'node:assert/strict';
import { migrationStatus, runMigration } from './runner.mjs';

const args = process.argv.slice(2), command = args.shift();
try {
  assert.ok(['plan','status','run'].includes(command), 'Expected plan, status or run');
  const options = {};
  while (args.length) {
    const name = args.shift();
    assert.ok(['--installation','--backup','--resume'].includes(name) && !(name in options), 'Invalid option');
    options[name] = name === '--resume' ? true : args.shift();
    assert.ok(options[name] && !String(options[name]).startsWith('--'), 'Missing value');
  }
  assert.ok(options['--installation'], 'Installation required');
  assert.ok(command === 'run' || !options['--backup'] && !options['--resume'], 'Run option on read command');
  assert.ok(!options['--resume'] || !options['--backup'], 'Resume reuses its original backup');
  const result = command === 'run' ? await runMigration({installation:options['--installation'],
    backup:options['--backup'], resume:options['--resume']}) : migrationStatus(options['--installation']);
  console.log(JSON.stringify(result, null, 2));
} catch {
  // Existing validators may include identity/content in assertion diagnostics.
  console.error('Migration refused. Check installation, stopped writers, metadata and the original backup; use that backup to recover if resume fails.');
  process.exitCode = 1;
}
