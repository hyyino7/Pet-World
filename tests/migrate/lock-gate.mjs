// Test-only barrier before the real exclusive open. No production test hooks.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
const open = fs.openSync, gate = process.env.MIGRATE_TEST_LOCK_GATE;
if (gate && process.env.MIGRATE_TEST_LOCK_ROLE === '1') {
  const deadline = Date.now() + 10000;
  while (!fs.existsSync(gate + '.first-preflight')) {
    if (Date.now() > deadline) throw Error('Test preflight barrier timeout');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);
  }
}
fs.openSync = function(file, flags, ...rest) {
  if (gate && String(file).endsWith('/migration.lock') && flags === 'wx') {
    if (process.env.MIGRATE_TEST_LOCK_ROLE === '0') fs.writeFileSync(gate + '.first-preflight','ready');
    process.send({beforeLock:true});
    const deadline = Date.now() + 10000;
    while (!fs.existsSync(gate)) {
      if (Date.now() > deadline) throw Error('Test lock barrier timeout');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);
    }
    // After the loser observes EEXIST it can exit; retain the winner's lease
    // until that point even on a fast filesystem.
    try { const fd = open(file,flags,...rest);
      while (!fs.existsSync(gate + '.loser')) {
        if (Date.now() > deadline) throw Error('Test lock contender timeout');
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);
      }
      return fd;
    } catch (error) { if (error.code === 'EEXIST') fs.writeFileSync(gate + '.loser','refused'); throw error; }
  }
  return open(file,flags,...rest);
};
syncBuiltinESMExports();
