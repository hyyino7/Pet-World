// Keep the same open stdin/stdout lifetime as the DSH desktop host.
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const binary = process.env.DSH_CHATBOT_ELECTRON_PATH ||
  join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'electron/Electron.app/Contents/MacOS/Electron');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(binary, [fileURLToPath(new URL('./fixtures/desktop-window-check.cjs', import.meta.url))], { stdio: ['pipe', 'pipe', 'inherit'], env });
let output = '';
child.stdout.on('data', chunk => { output += chunk; process.stdout.write(chunk); });
const timeout = setTimeout(() => child.kill(), 35_000);
try {
  const status = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  assert.equal(status, 0);
  assert.match(output, /"status":"passed"/);
} finally { clearTimeout(timeout); child.stdin.destroy(); }
