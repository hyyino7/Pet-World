// Test-only barrier before the real database-backed interprocess lock.
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
const exec = DatabaseSync.prototype.exec, gate = process.env.MIGRATE_TEST_LOCK_GATE;
if (gate && process.env.MIGRATE_TEST_LOCK_ROLE === '1') waitFor(gate + '.first-preflight');
function waitFor(file) {
  const deadline = Date.now() + 10000, sleep = new Int32Array(new SharedArrayBuffer(4));
  while (!fs.existsSync(file)) {
    if (Date.now() > deadline) throw Error('Test lock barrier timeout');
    Atomics.wait(sleep,0,0,10);
  }
}
DatabaseSync.prototype.exec = function(sql) {
  const restore = process.env.MIGRATE_TEST_RESTORE_GATE;
  if (restore && sql === 'BEGIN IMMEDIATE') {
    const result = exec.call(this,sql);
    process.send({held:true});
    waitFor(restore);
    return result;
  }
  if (!gate || sql !== 'BEGIN IMMEDIATE') return exec.call(this,sql);
  if (process.env.MIGRATE_TEST_LOCK_ROLE === '0') fs.writeFileSync(gate + '.first-preflight','ready');
  process.send({beforeLock:true});
  waitFor(gate);
  try {
    const result = exec.call(this,sql);
    waitFor(gate + '.loser');
    return result;
  } catch (error) {
    if ((error.errcode & 0xff) === 5) fs.writeFileSync(gate + '.loser','refused');
    throw error;
  }
};
