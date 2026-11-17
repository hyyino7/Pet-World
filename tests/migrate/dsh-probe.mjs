// Test-owned native-process boundary. Production keeps the real fail-closed probe.
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
const original = childProcess.spawnSync;
childProcess.spawnSync = (command, args, options) => command === 'pgrep'
  ? {status:1,stdout:'',stderr:''} : original(command, args, options);
syncBuiltinESMExports();
