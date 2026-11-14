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
if (process.argv.includes('--json')) console.log(JSON.stringify({ checks, ok: failures.length === 0 }, null, 2));
process.exitCode = failures.length ? 1 : 0;
