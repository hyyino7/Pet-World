import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

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
  if (process.versions.node !== expected) throw new Error(`Expected Node ${expected}, found ${process.versions.node}`);
  return process.version;
});
check('pnpm', () => {
  const expected = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).packageManager.slice('pnpm@'.length);
  const actual = execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim();
  if (actual !== expected) throw new Error(`Expected pnpm ${expected}, found ${actual}`);
  return actual;
});
check('TypeScript', () => JSON.parse(readFileSync(require.resolve('typescript/package.json'), 'utf8')).version);
check('Python venv', () => {
  const expected = readFileSync(join(root, '.python-version'), 'utf8').trim();
  const actual = execFileSync(join(root, '.venv/bin/python'), ['--version'], { encoding: 'utf8' }).trim();
  if (actual !== `Python ${expected}`) throw new Error(`Expected Python ${expected}, found ${actual}`);
  return actual;
});
check('Python venv location', () => {
  const expected = join(root, '.venv');
  const activation = readFileSync(join(expected, 'bin/activate'), 'utf8');
  const virtualEnv = activation.match(/^VIRTUAL_ENV=(['"])(.*?)\1\r?$/m)?.[2];
  if (!virtualEnv) throw new Error('Missing VIRTUAL_ENV in .venv/bin/activate');
  if (realpathSync(virtualEnv) !== realpathSync(expected)) throw new Error(`Expected VIRTUAL_ENV ${expected}, found ${virtualEnv}`);
  return virtualEnv;
});
for (const name of ['@deepseek-ai/cordis', '@deepseek-ai/dsh-agent', '@deepseek-ai/dsh-session', '@deepseek-ai/dsh-tools', '@deepseek-ai/dsh-system-prompt']) {
  try {
    const module = await import(name);
    check(`SDK ${name}`, () => `${Object.keys(module).length} exports imported`);
  } catch (error) {
    check(`SDK ${name}`, () => { throw error; });
  }
}
if (process.argv.includes('--json')) console.log(JSON.stringify({ checks, ok: failures.length === 0 }, null, 2));
if (failures.length) console.log('Run the recovery command in docs/development.md#local-tools from a fresh login shell.');
process.exitCode = failures.length ? 1 : 0;
