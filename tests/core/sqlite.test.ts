import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {CoreStore} from '../../src/core/storage.js';
import {EconomyStore} from '../../src/living/economy/store.js';

for (const kind of ['core', 'economy'] as const) test(`${kind} metadata and lease use the same SQLite contract`, t => {
  const root = mkdtempSync(join(tmpdir(), 'sqlite-meta-'));
  t.after(() => rmSync(root, {recursive:true, force:true}));
  const open = () => kind === 'core' ? new CoreStore(join(root, 'core'))
    : new EconomyStore({workspacePath:root, storageId:'fixture-storage', companionId:'fixture-companion'});
  const store = open();
  t.after(() => store.close());
  const lock = join(store.directory, `${kind}.lock`);
  const key = 'fixture-marker';
  const db = store instanceof CoreStore ? store.db : store['db'];
  const setMeta = (value: unknown) => store instanceof CoreStore ? store.setMeta(key, value) : store['setMeta'](key, value);
  const transaction = (run: () => void) => store instanceof CoreStore ? store.transaction(run) : store['transaction'](run);
  const raw = () => db.prepare('SELECT value FROM meta WHERE key=?').get(key)?.value;
  const original = {storageId:'fixture-storage', companionId:'fixture-companion'};
  setMeta(original);
  assert.equal(raw(), '{"companionId":"fixture-companion","storageId":"fixture-storage"}');
  setMeta({...original, storageId:'replaced'});
  const updated = '{"companionId":"fixture-companion","storageId":"replaced"}';
  assert.equal(raw(), updated);
  assert.throws(() => transaction(() => {
    setMeta(original);
    throw Error('roll back metadata');
  }), /roll back metadata/);
  assert.equal(raw(), updated);
  store.close();
  store.close();
  assert.equal(existsSync(lock), false);

  const next = open();
  t.after(() => next.close());
  assert.deepEqual(next instanceof CoreStore ? next.meta(key) : next['meta'](key), {...original, storageId:'replaced'});
  const replacement = `${process.pid}:different-owner`;
  writeFileSync(lock, replacement);
  next.close();
  next.close();
  assert.equal(readFileSync(lock, 'utf8'), replacement);
});
