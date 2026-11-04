import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const failures = [];
const checks = [];
const check = (name, action) => {
  try {
    const detail = action();
    checks.push({ name, ok: true, detail });
    console.log(`OK ${name}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  } catch (error) {
    failures.push(name);
    checks.push({ name, ok: false, error: error.message });
    console.log(`FAIL ${name}: ${error.message}`);
  }
};
check('project Node', () => {
  const expected = readFileSync(join(root, '.node-version'), 'utf8').trim();
  if (process.versions.node !== expected) throw new Error(`Expected ${expected}; source scripts/env.sh first`);
  if (realpathSync(process.execPath) !== realpathSync(join(root, '.tools/node/bin/node'))) throw new Error('Node is not the project runtime');
  return process.version;
});
check('pnpm', () => execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim());
check('TypeScript', () => JSON.parse(readFileSync(require.resolve('typescript/package.json'), 'utf8')).version);
check('Python venv', () => execFileSync(join(root, '.venv/bin/python'), ['--version'], { encoding: 'utf8' }).trim());
for (const name of ['@deepseek-ai/cordis', '@deepseek-ai/dsh-agent', '@deepseek-ai/dsh-session', '@deepseek-ai/dsh-tools', '@deepseek-ai/dsh-system-prompt']) {
  try {
    const module = await import(name);
    check(`SDK ${name}`, () => `${Object.keys(module).length} exports imported`);
  } catch (error) {
    check(`SDK ${name}`, () => { throw error; });
  }
}
check('reference sources', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'references/manifest.json'), 'utf8'));
  for (const entry of manifest.entries) {
    const path = join(root, entry.path);
    if (entry.status !== 'ready' || !existsSync(path)) throw new Error(`${entry.repository}: not ready`);
    if (entry.checkout_type === 'archive') {
      const source = JSON.parse(readFileSync(join(path, '.reference-source.json'), 'utf8'));
      if (source.commit !== entry.commit || source.archive_sha256 !== entry.archive_sha256) throw new Error(`${entry.repository}: archive metadata differs`);
      const archive = join(root, entry.archive_path);
      if (existsSync(archive)) {
        const hash = createHash('sha256').update(readFileSync(archive)).digest('hex');
        if (hash !== entry.archive_sha256) throw new Error(`${entry.repository}: archive checksum differs`);
      }
    } else {
      const commit = execFileSync('git', ['-C', path, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
      if (commit !== entry.commit) throw new Error(`${entry.repository}: commit differs from manifest`);
    }
  }
  return `${manifest.entries.length} source versions match recorded Git/archive identities`;
});
if (process.argv.includes('--json')) console.log(JSON.stringify({ checks, ok: failures.length === 0 }, null, 2));
process.exitCode = failures.length ? 1 : 0;
