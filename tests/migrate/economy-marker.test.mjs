import assert from 'node:assert/strict';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {EconomyStore} from '../../dist/src/living/economy/store.js';
import {fileHashes} from '../../scripts/lib/repo-storage.mjs';
import {migrationStatus, runMigration, steps} from '../../scripts/migrate/runner.mjs';
import economyMarkerStep from '../../scripts/migrate/steps/0003-economy-marker.mjs';
import {mockDsh} from './helpers.mjs';
import {economyPaths, offlineFixture} from './offline-helpers.mjs';

const id = '0003-economy-marker';
const selected = [...steps.slice(0, 2), economyMarkerStep];
const prefix = 'economy.initialized:';
const marker = 'economy.initialized';
const identity = f => ({storageId:f.storageId, companionId:f.config.companionId});
const meta = (file, key) => {
  using db = new DatabaseSync(file, {readOnly:true});
  return db.prepare('SELECT value FROM meta WHERE key=?').get(key)?.value;
};
const coreRows = file => {
  using db = new DatabaseSync(file, {readOnly:true});
  return db.prepare("SELECT key,value FROM meta WHERE key GLOB 'economy.initialized:*' ORDER BY key").all();
};

test('0003 transfers one bound marker without touching the wallet or writing during status', async t => {
  mockDsh(t);
  const f = await offlineFixture(t, false, {withLegacyEconomy:true});
  const {core, database, adoption} = economyPaths(f);
  const history = () => {
    using db = new DatabaseSync(database, {readOnly:true});
    return db.prepare('SELECT * FROM ledger ORDER BY sequence').all();
  };
  const ledger = history(), before = fileHashes(f.out);
  assert.deepEqual(migrationStatus(f.installation, selected).steps.at(-1), {id, state:'pending'});
  assert.deepEqual(fileHashes(f.out), before);
  assert.equal(coreRows(core).length, 1);
  assert.equal(meta(database, marker), undefined);
  assert.equal(existsSync(adoption), false);
  await runMigration({installation:f.installation, backup:join(f.out, 'backup')}, selected);
  assert.deepEqual(coreRows(core), []);
  assert.deepEqual(JSON.parse(meta(database, marker)), identity(f));
  assert.deepEqual(JSON.parse(readFileSync(adoption, 'utf8')), identity(f));
  assert.deepEqual(history(), ledger);
  assert.deepEqual(migrationStatus(f.installation, selected).steps.at(-1), {id, state:'complete'});
  const journal = join(f.data, 'migrations.jsonl'), log = readFileSync(journal, 'utf8');
  assert.equal(JSON.parse(log.split('\n')[0]).economyAdopted, true);
  await runMigration({installation:f.installation, resume:true}, selected);
  assert.equal(readFileSync(journal, 'utf8'), log);
});

test('0003 reports a fixed reason for an invalid Body checkpoint during adoption detection', async t => {
  mockDsh(t);
  const f = await offlineFixture(t, false);
  mkdirSync(join(f.data, 'life/home.json'));
  await assert.rejects(runMigration({installation:f.installation, backup:join(f.out, 'backup')}, selected),
    {code:'economy-marker-invalid'});
  assert.equal(existsSync(join(f.data, 'migrations.jsonl')), false);
});

test('runtime journal evidence survives newer segments and ignores damaged or foreign logs', async t => {
  mockDsh(t);
  const f = await offlineFixture(t, false, {withLegacyEconomy:true});
  await runMigration({installation:f.installation, backup:join(f.out, 'backup')}, selected);
  const journal = join(f.data, 'migrations.jsonl'), log = readFileSync(journal, 'utf8');
  const [first, ...events] = log.trimEnd().split('\n'), header = JSON.parse(first), from = header.steps.at(-1).to;
  const next = {...header, id:'future-segment', economyAdopted:false,
    steps:[...header.steps, {id:'0004-fixture', from, to:{...from, living:4}}]};
  const {database, adoption} = economyPaths(f);
  const removeWallet = () => {
    for (const directory of [dirname(database), dirname(adoption)]) rmSync(directory, {recursive:true, force:true});
  };
  const openWallet = () => new EconomyStore({workspacePath:f.repo, ...identity(f)});
  removeWallet();
  const extended = log + JSON.stringify(next) + '\n';
  writeFileSync(journal, extended);
  assert.throws(openWallet, /authoritative economy database is missing/);
  assert.equal(readFileSync(journal, 'utf8'), extended);
  assert.equal(existsSync(database), false);

  const foreign = {...header, binding:{...header.binding, storageId:'other-binding'}};
  for (const content of [[JSON.stringify(foreign), ...events, ''].join('\n'), log + 'broken\n', log + '{', undefined]) {
    if (content === undefined) rmSync(journal);
    else writeFileSync(journal, content);
    const wallet = openWallet();
    try { assert.ok(existsSync(database)); }
    finally { wallet.close(); }
    removeWallet();
    if (content === undefined) assert.equal(existsSync(journal), false);
    else assert.equal(readFileSync(journal, 'utf8'), content);
  }
});

for (const [shape, code] of [
  ['missing', 'economy-database-missing'], ['shell', 'economy-database-invalid'], ['bad schema', 'economy-database-invalid'],
  ['different wallet', 'economy-marker-binding-mismatch'], ['different evidence', 'economy-marker-binding-mismatch'],
  ['multiple', 'economy-marker-multiple'], ['bad JSON', 'economy-marker-invalid'],
  ['different key', 'economy-marker-binding-mismatch'], ['different path', 'economy-marker-binding-mismatch'],
  ['different companion', 'economy-marker-binding-mismatch'],
]) test(`0003 rejects ${shape} and retains the Core marker`, async t => {
  mockDsh(t);
  const f = await offlineFixture(t, false, {withLegacyEconomy:true});
  const {core, database, adoption} = economyPaths(f), key = prefix + f.storageId;
  if (shape === 'missing' || shape === 'shell') {
    rmSync(database);
    if (shape === 'shell') writeFileSync(database, '');
  } else if (shape === 'bad schema' || shape === 'different wallet') {
    using db = new DatabaseSync(database);
    db.prepare('UPDATE meta SET value=? WHERE key=?').run(shape === 'bad schema' ? '"2"' : JSON.stringify({...identity(f), storageId:'different'}),
      shape === 'bad schema' ? 'schema' : 'identity');
  } else if (shape === 'different evidence') {
    mkdirSync(dirname(adoption), {recursive:true});
    writeFileSync(adoption, JSON.stringify({...identity(f), storageId:'different'}));
  } else {
    using db = new DatabaseSync(core);
    const value = JSON.stringify({companionId:shape === 'different companion' ? 'different' : f.config.companionId,
      path:shape === 'different path' ? join(f.out, 'other') : f.repo});
    if (shape !== 'multiple') db.prepare('DELETE FROM meta WHERE key=?').run(key);
    db.prepare('INSERT INTO meta VALUES (?,?)').run(['different key', 'multiple'].includes(shape) ? prefix + 'other' : key,
      shape === 'bad JSON' ? '{' : value);
  }
  const before = coreRows(core);
  await assert.rejects(runMigration({installation:f.installation, backup:join(f.out, 'backup')}, selected), {code});
  assert.deepEqual(coreRows(core), before);
  assert.equal(existsSync(adoption), shape === 'different evidence');
  assert.equal(existsSync(database), shape !== 'missing');
});
