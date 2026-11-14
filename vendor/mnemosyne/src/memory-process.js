/**
 * Spawn / supervise the Python mnemosyne subprocess.
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isServiceRoot(root) {
  return Boolean(root)
    && (fs.existsSync(path.join(root, 'src', 'mnemosyne', 'main.py'))
      || fs.existsSync(path.join(root, 'src', 'cognitive_memory', 'main.py')));
}

/** Walk candidates so DSH profile installs work without env/config. */
function resolveServiceRoot(explicit) {
  const tried = [];
  const push = (p) => {
    if (!p) return;
    const abs = path.resolve(p);
    if (!tried.includes(abs)) tried.push(abs);
  };

  if (explicit) push(explicit);
  if (process.env.DSH_MNEMOSYNE_ROOT) {
    // Legacy env var from dsh-cognitive-memory; kept for one migration cycle.
    push(process.env.DSH_MNEMOSYNE_ROOT);
  }

  // package root = …/dsh-mnemosyne (Host Adapter next to service/)
  push(path.join(__dirname, '..', 'service'));
  push(path.join(__dirname, '..', '..', 'service'));

  // walk up a few levels (node_modules nesting / profile copies)
  let cur = path.resolve(__dirname);
  for (let i = 0; i < 8; i += 1) {
    push(path.join(cur, 'service'));
    push(path.join(cur, 'services', 'mnemosyne'));
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }

  // monorepo fallback (desktop pet checkout)
  push(path.join(__dirname, '..', '..', '..', 'services', 'mnemosyne'));

  for (const root of tried) {
    if (isServiceRoot(root)) return root;
  }

  const hint = [
    'mnemosyne Python service not found.',
    'Tried:',
    ...tried.map((p) => `  - ${p}`),
    'Fix: keep repo `service/` next to the plugin, or set',
    '  DSH_MNEMOSYNE_ROOT / config.service_root',
    'then: pip install -e "<that-path>" (optional; PYTHONPATH also works).',
  ].join('\n');
  throw new Error(hint);
}

function defaultServiceRoot() {
  return resolveServiceRoot(undefined);
}

export { resolveServiceRoot, isServiceRoot };

function defaultDataDir() {
  const envDir = process.env.MNEMOSYNE_MEMORY_BANK
    || process.env.MNEMOSYNE_DATA_DIR
    || process.env.DSH_MEMORY_DATA_DIR
    || process.env.DSH_MNEMOSYNE_DATA_DIR;
  if (envDir) return envDir;
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'share');
  return path.join(local, 'Mnemosyne Memory Bank');
}

function pythonBin() {
  return process.env.DSH_MEMORY_PYTHON
    || process.env.PYTHON
    || (process.platform === 'win32' ? 'python' : 'python3');
}

export class MemoryProcessHost {
  /**
   * @param {{ serviceRoot?: string, dataDir?: string, python?: string, token?: string }} [opts]
   */
  constructor(opts = {}) {
    // Defer resolve until start() so missing service fails with a full path list.
    this._serviceRootOpt = opts.serviceRoot || '';
    this.serviceRoot = this._serviceRootOpt
      ? path.resolve(this._serviceRootOpt)
      : '';
    this.dataDir = opts.dataDir || defaultDataDir();
    this.python = opts.python || pythonBin();
    this.token = opts.token || process.env.DSH_MEMORY_TOKEN || '';
    this.serviceEntry = opts.serviceEntry || '';
    this.serviceEnv = opts.serviceEnv || {};
    this.child = null;
    this.baseUrl = '';
    this.ready = false;
  }

  serviceJsonPath() {
    return path.join(this.dataDir, 'runtime', 'service.json');
  }

  tokenPath() {
    return path.join(this.dataDir, 'runtime', 'token');
  }

  async start({ timeoutMs = 20000 } = {}) {
    if (this.child) {
      if (this.ready && !this.child.killed) return this.info();
      throw new Error('mnemosyne owned child is unresolved; stop/reconcile before start');
    }

    this.serviceRoot = resolveServiceRoot(this._serviceRootOpt || undefined);

    if (!this.token) {
      this.token = Buffer.from(cryptoGetRandom()).toString('base64url');
    }
    fs.mkdirSync(path.join(this.dataDir, 'runtime'), { recursive: true });
    if (fs.existsSync(this.serviceJsonPath())) {
      const previous = JSON.parse(fs.readFileSync(this.serviceJsonPath(), 'utf8'));
      if (Number.isSafeInteger(previous.pid) && previous.pid > 0) {
        try { process.kill(previous.pid, 0); throw new Error('mnemosyne data directory still has a live/unresolved owner'); }
        catch (error) { if (error.code !== 'ESRCH') throw error; }
      }
    }
    // A previous DSH process may leave service.json pointing at a dead port.
    try { fs.rmSync(this.serviceJsonPath(), { force: true }); } catch { /* ignore */ }

    const env = {
      ...process.env,
      ...this.serviceEnv,
      DSH_MEMORY_TOKEN: this.token,
      DSH_MEMORY_DATA_DIR: this.dataDir,
      DSH_MEMORY_HOST: '127.0.0.1',
      DSH_MEMORY_PORT: '0',
      PYTHONPATH: [
        path.join(this.serviceRoot, 'src'),
        process.env.PYTHONPATH || '',
      ].filter(Boolean).join(path.delimiter),
    };

    const mainPy = this.serviceEntry || [
      path.join(this.serviceRoot, 'src', 'mnemosyne', 'main.py'),
      path.join(this.serviceRoot, 'src', 'cognitive_memory', 'main.py'),
    ].find((p) => fs.existsSync(p));
    if (!mainPy) throw new Error('mnemosyne Python entrypoint not found');
    // URL-safe random tokens can begin with '-'. Bind the value to its option
    // so argparse never treats a valid credential as another CLI flag.
    this.child = spawn(this.python, [mainPy, '--host', '127.0.0.1', '--port', '0', '--data-dir', this.dataDir, `--token=${this.token}`], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this.child.stderr.on('data', (buf) => {
      const line = String(buf);
      if (process.env.DSH_MEMORY_DEBUG) process.stderr.write(`[mnemosyne] ${line}`);
    });
    this.child.stdout.on('data', (buf) => {
      const text = String(buf);
      const m = text.match(/DSH_MEMORY_BOUND\s+(\S+)/);
      if (m) {
        this.baseUrl = `http://${m[1]}`;
        this.ready = true;
      }
    });
    const child = this.child;
    let spawnError;
    child.on('error', error => { spawnError = error; });
    child.on('exit', () => {
      this.ready = false;
      if (this.child === child) this.child = null;
    });

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (spawnError || child.exitCode !== null || child.signalCode !== null) break;
      if (this.ready && this.baseUrl) break;
      // also poll service.json
      try {
        const sj = this.serviceJsonPath();
        if (fs.existsSync(sj)) {
          const meta = JSON.parse(fs.readFileSync(sj, 'utf8'));
          if (meta.port) {
            this.baseUrl = `http://${meta.host || '127.0.0.1'}:${meta.port}`;
            this.ready = true;
            break;
          }
        }
      } catch { /* ignore */ }
      await sleep(100);
    }
    if (!this.ready) {
      if (spawnError && !child.pid) this.child = null; // spawn failed: no owned OS process exists
      const stopped = await this.stop();
      throw new Error(`mnemosyne subprocess failed to become ready: ${spawnError?.message || 'readiness timeout/exit'}; child ${stopped.state}`);
    }
    // health check (the port may be bound before the app is ready)
    const { MemoryClient } = await import('./memory-client.js');
    const client = new MemoryClient({ baseUrl: this.baseUrl, token: this.token });
    let healthy = false;
    let lastErr = null;
    for (let i = 0; i < 20; i += 1) {
      try {
        await client.health();
        healthy = true;
        break;
      } catch (err) {
        lastErr = err;
        await sleep(100);
      }
    }
    if (!healthy) {
      await this.stop();
      throw new Error(`mnemosyne health check failed: ${lastErr?.message || 'unknown'}`);
    }
    return this.info();
  }

  info() {
    return {
      ready: this.ready,
      baseUrl: this.baseUrl,
      token: this.token,
      dataDir: this.dataDir,
      pid: this.child?.pid || null,
    };
  }

  async stop({ timeoutMs = 2000 } = {}) {
    this.ready = false;
    const child = this.child;
    if (!child) return { state: 'stopped', pid: null };
    const exited = () => child.exitCode !== null || child.signalCode !== null;
    if (exited()) { this.child = null; return { state: 'stopped', pid: child.pid }; }
    // Retain ownership until observed exit. kill()/child.killed mean signal sent,
    // not that the process stopped; timeout never permits spawning a replacement.
    return await new Promise(resolve => {
      const finish = state => {
        clearTimeout(timer); child.removeListener('exit', onExit);
        if (state === 'stopped' && this.child === child) this.child = null;
        resolve({ state, pid: child.pid });
      };
      const onExit = () => finish('stopped');
      const timer = setTimeout(() => finish('unresolved'), timeoutMs);
      child.once('exit', onExit);
      try {
        if (!child.kill('SIGTERM')) finish('unresolved');
      } catch { finish('unresolved'); }
    });
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cryptoGetRandom() {
  // eslint-disable-next-line no-undef
  return globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint8Array(24))
    : Buffer.from(String(Date.now()) + Math.random());
}
