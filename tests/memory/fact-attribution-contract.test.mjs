import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {FACT_ACTOR_NAMES, FACT_DOMAIN_NAMES} from '../../dist/src/contracts/interaction.js';

test('Python 事实识别与 TypeScript 领域和参与者声明双向一致', () => {
  const python = fileURLToPath(new URL('../../.venv/bin/python', import.meta.url));
  const script = fileURLToPath(new URL('./fact_attribution_contract.py', import.meta.url));
  execFileSync(python, ['-B', script], {
    input:JSON.stringify({domains:FACT_DOMAIN_NAMES, actors:FACT_ACTOR_NAMES}), timeout:10_000,
  });
});
