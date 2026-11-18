import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { MemoryConnection } from '../../src/memory/client.js';

test('reusing a scope object to switch Banks isolates provider reads', { timeout: 30000 }, async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'pet-memory-bank-switch-')));
  const connection = new MemoryConnection({ dataDir: join(root, 'memory'), python: resolve('.venv/bin/python') });
  const scope = { companionId: 'fixture-pet', scopeId: 'fixture-owner', bankId: 'bank-A' };
  const source = { id: 'source-A', revision: '1' };
  const content = 'Synthetic preference for jasmine tea';
  const read = (bankId: string) => connection.call<{ text: string }[]>('materialize', { sources: [source] }, bankId);

  try {
    await connection.start(scope, root, true);
    await connection.call('observe', { source_id: source.id, revision: source.revision, content, actor_id: 'fixture-owner' }, 'bank-A');
    assert.equal((await read('bank-A'))[0].text, content);

    scope.bankId = 'bank-B';
    await connection.start(scope, root, true);
    await assert.rejects(read('bank-B'), /provider source material is unavailable/);
    await assert.rejects(read('bank-A'), { code: 'STALE_BINDING' });

    scope.bankId = 'bank-A';
    await connection.start(scope, root, true);
    assert.equal((await read('bank-A'))[0].text, content);
  } finally {
    await connection.close();
    rmSync(root, { recursive: true, force: true });
  }
});
