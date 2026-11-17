// Test-owned native-process boundary. Production keeps the real fail-closed probe.
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
const original = childProcess.spawnSync;
childProcess.spawnSync = (command, args, options) => command === 'pgrep'
  ? {status:process.env.MIGRATE_TEST_DSH_RUNNING === '1' ? 0 : 1,
      stdout:process.env.MIGRATE_TEST_DSH_RUNNING === '1' ? String(process.pid + 100000) : '',stderr:''} : original(command, args, options);
syncBuiltinESMExports();
