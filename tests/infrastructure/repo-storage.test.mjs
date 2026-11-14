import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, realpathSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { prepareRepoStorage, relocateRepoStorage, fileHashes } from '../../scripts/lib/repo-storage.mjs';

function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'chatpet-relocate-')));
  const repo = join(root, 'repo'), core = join(root, 'old-core'), memory = join(root, 'old-memory');
  for (const dir of [join(repo, '.chatpet'), core, join(memory, 'data')]) mkdirSync(dir, { recursive: true });
  writeFileSync(join(repo, '.chatpet/manifest.json'), JSON.stringify({ companionId: 'same-fish' }));
  for (const [dir, file] of [[core, 'core.sqlite'], [join(memory, 'data'), 'memory.db']]) {
    const db = new DatabaseSync(join(dir, file));
    db.exec('CREATE TABLE retained (id TEXT PRIMARY KEY, value TEXT);');
    db.prepare('INSERT INTO retained VALUES (?, ?)').run('identity-or-withdrawal', 'preserved'); db.close();
  }
  return { root, repo, core, memory, config: { companionId: 'same-fish', dataDir: core, memory: { dataDir: memory } } };
}

test('offline relocation retains databases, all sidecars and old rollback bytes; refuses overwrite', () => {
  const f = fixture();
  try {
    writeFileSync(join(f.memory, 'data/observation.json'), '{"pending":true}');
    const before = [fileHashes(f.core), fileHashes(f.memory)];
    const plan = prepareRepoStorage(f.repo, f.config); const copies = relocateRepoStorage(plan);
    assert.equal(copies.length, 2);
    for (const [index, entry] of plan.entries.entries()) {
      assert.deepEqual(fileHashes(entry.source), before[index]);
      assert.deepEqual(fileHashes(entry.target), before[index]);
      const db = new DatabaseSync(join(entry.target, index ? 'data/memory.db' : 'core.sqlite'), { readOnly: true });
      assert.equal(db.prepare('SELECT value FROM retained').get().value, 'preserved'); db.close();
    }
    assert.equal(readFileSync(join(f.repo, '.chatpet/.gitignore'), 'utf8'), '/data/\n');
    assert.throws(() => prepareRepoStorage(f.repo, f.config), /Destination already exists/);
    assert.equal(relocateRepoStorage(prepareRepoStorage(f.repo, { ...f.config,
      dataDir: plan.entries[0].target, memory: { dataDir: plan.entries[1].target } })).length, 0);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test('live writer, foreign identity and symlink data cannot be relocated', () => {
  const f = fixture();
  try {
    assert.throws(() => prepareRepoStorage(f.repo, { ...f.config, companionId: 'another-fish' }), /another companion/);
    writeFileSync(join(f.core, 'core.lock'), `${process.pid}:active`);
    const plan = prepareRepoStorage(f.repo, f.config);
    assert.throws(() => relocateRepoStorage(plan), /live writer/);
    assert.equal(existsSync(join(f.repo, '.chatpet/data')), false);
    rmSync(join(f.core, 'core.lock'));
    symlinkSync(join(f.core, 'core.sqlite'), join(f.memory, 'linked'));
    assert.throws(() => relocateRepoStorage(plan), /Symlink/);
    assert.equal(existsSync(plan.entries[0].target), false);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});
