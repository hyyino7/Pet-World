import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncBuiltinESMExports } from 'node:module';
import vm from 'node:vm';
import { createCore } from '../../dist/src/core/index.js';
import { prepareCoreConfiguration } from '../../scripts/lib/core-config.mjs';
import { fileHashes, inspectRepoBinding, prepareRepoStorage, relocateRepoStorage } from '../../scripts/lib/repo-storage.mjs';

const value = result => { assert.ok(result.ok, JSON.stringify(result.error)); return result.value; };

// Exercise the actual default setup prefix, stopping before installed discovery.
// Every host/account/archive boundary is replaced; no installer process runs.
function defaultConfiguration(root) {
  const entry = new URL('../../scripts/install-dsh.mjs', import.meta.url), source = readFileSync(entry, 'utf8');
  const marker = '// Preserve every portable Bundle declaration and';
  const homeImport = "const { resolveDshHome } = await import(require.resolve('@deepseek-ai/dsh-home-paths'));";
  assert.equal(source.split(marker).length, 2);
  const prefix = source.slice(0, source.indexOf(marker)).replace(/^#![^\n]*\n/, '').replace(/^import [^\n]+;\n/gm, '');
  assert.equal(prefix.split(homeImport).length, 2);
  const home = join(root, 'dsh-home'), spawns = [];
  const context = vm.createContext({ assert, join, resolve, dirname, isAbsolute, fileURLToPath, prepareCoreConfiguration, structuredClone,
    process: { versions: { electron: 'fixture' }, argv: ['node', fileURLToPath(entry), '--dsh-home', home, '--profile', 'fixture'] },
    createRequire: () => Object.assign(name => { throw Error('Unexpected host dependency: ' + name); }, { resolve: name => name }),
    resolveDshHomeFixture: () => ({ resolveDshHome: () => home }),
    readFileSync: () => '# Isolated native profile\n', existsSync: () => true,
    mkdirSync() {}, chmodSync() {}, mkdtempSync: () => join(root, 'prepared'),
    randomUUID: (() => { let sequence = 0; return () => 'first-install-' + ++sequence; })(),
    spawnSync: (...args) => { spawns.push(args); return { status: 0 }; },
  });
  vm.runInContext(prefix.replace(homeImport, 'const { resolveDshHome } = resolveDshHomeFixture();')
    .replaceAll('import.meta.url', JSON.stringify(entry.href)) + '\nglobalThis.preparedConfig=config;', context);
  assert.equal(spawns.length, 1);
  assert.equal(spawns[0][0], '/usr/bin/tar', 'Archive extraction is simulated; no Electron or model runs');
  const config = JSON.parse(JSON.stringify(context.preparedConfig));
  assert.equal(config.dataDir, join(home, 'codex-pet/core'));
  return config;
}

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'chatpet-first-install-'))), repo = join(root, 'repo');
  mkdirSync(repo);
  const config = defaultConfiguration(root);
  let host = createCore(config), sequence = 0;
  const request = () => host.operator.request('first-install-' + ++sequence);
  t.after(async () => { await host.close(); rmSync(root, { recursive: true, force: true }); });
  return {
    root, repo, config, request, get host() { return host; },
    async close() { await host.close(); },
    async reopen(next = config) { await host.close(); host = createCore(next); },
    async bind() {
      const initial = value(await host.services.preferences.read(request(), {}));
      return value(await host.services.preferences.save(request(), { expectedRevision: initial.revision,
        workspace: { id: 'repo', path: repo, title: 'New companion Repo' }, conversation: initial.conversation }));
    },
    async initialize(revision) {
      return host.services.workspace.initialize(request(), { expectedPreferencesRevision: revision });
    },
  };
}

test('actual default external Core initializes one bootstrap companion and reports unfinished portable storage', async t => {
  const f = fixture(t), prefs = await f.bind();
  const initialized = value(await f.initialize(prefs.revision));
  assert.equal(initialized.state, 'ready');
  assert.ok(!initialized.files.includes('data/core/core.sqlite'), 'Bootstrap inventory does not advertise an uncopied Core');
  for (const path of initialized.files) assert.ok(existsSync(join(f.repo, '.chatpet', path)), path + ' really exists');
  const target = join(f.repo, '.chatpet/data/core'), storage = f.host.workspace.storageStatus();
  assert.equal(storage.complete, false); assert.equal(storage.core.ready, false);
  assert.equal(storage.core.current, f.config.dataDir); assert.equal(storage.core.expected, target);
  assert.equal(existsSync(join(target, 'core.sqlite')), false, 'Initialization creates no second identity database');
  assert.equal(existsSync(join(f.repo, '.chatpet/.initialization-pending.json')), false);
  assert.throws(() => createCore({ ...f.config, dataDir: target }), /migrate its existing Core|recover its data/);
  assert.equal(existsSync(join(target, 'core.sqlite')), false, 'A bootstrap manifest cannot authorize an empty local Core');
  const identity = value(await f.host.services.core.getIdentity(f.request(), {}));
  value(await f.host.services.core.reviseIdentity(f.request(), { expectedScope:f.host.workspace.editScope(),expectedRevision: identity.revision, displayName: '小汐', character: 'One retained companion.' }));
  await f.reopen();
  assert.equal(value(await f.host.services.workspace.inspect(f.request(), {})).state, 'ready');
  assert.equal(value(await f.host.services.core.getIdentity(f.request(), {})).displayName, '小汐');
  assert.equal(value(await f.initialize(prefs.revision)).state, 'ready');
  await f.close();
  assert.equal(inspectRepoBinding(f.config).state, 'ready', 'The existing stopped migration recognizes document readiness');
});

test('failed module initialization retries against the same external Core without resetting documents', async t => {
  const f = fixture(t), prefs = await f.bind();
  let fail = true;
  const prepare = target => {
    if (fail) throw Error('Injected schema preparation failure');
    writeFileSync(join(target.path, '.chatpet/data/behavior/fixture.json'), '{"prepared":true}\n');
  };
  f.host.workspace.registerInitializer('controlled-first-install-failure', prepare, ['data/behavior/fixture.json']);
  const initialIdentity = value(await f.host.services.core.getIdentity(f.request(), {}));
  assert.equal((await f.initialize(prefs.revision)).ok, false);
  assert.equal(existsSync(join(f.repo, '.chatpet/.initialization-pending.json')), true);
  assert.equal(value(await f.host.services.workspace.inspect(f.request(), {})).state, 'pending');
  assert.equal(inspectRepoBinding(f.config).state, 'pending');
  const soul = join(f.repo, '.chatpet/SOUL.md'); writeFileSync(soul, '# Owner-edited name\n\nPreserve this text.');
  assert.equal((await f.initialize(prefs.revision)).ok, false, 'A repeat failure does not reset the same companion');
  await f.reopen();
  f.host.workspace.registerInitializer('controlled-first-install-failure', prepare, ['data/behavior/fixture.json']);
  assert.equal(value(await f.host.services.workspace.inspect(f.request(), {})).state, 'pending');
  fail = false;
  assert.equal(value(await f.initialize(prefs.revision)).state, 'ready');
  assert.equal(readFileSync(soul, 'utf8'), '# Owner-edited name\n\nPreserve this text.');
  assert.equal(value(await f.host.services.core.getIdentity(f.request(), {})).companionId, initialIdentity.companionId);
  assert.equal(existsSync(join(f.repo, '.chatpet/data/core/core.sqlite')), false);
  assert.equal(existsSync(join(f.repo, '.chatpet/.initialization-pending.json')), false);
  await f.reopen();
  assert.equal(value(await f.host.services.workspace.inspect(f.request(), {})).state, 'ready');
});

test('bootstrap completes stopped relocation, retries a failed manifest write, and keeps all original Core bytes', async t => {
  const f = fixture(t), prefs = await f.bind();
  value(await f.initialize(prefs.revision));
  const profile = value(await f.host.services.workspace.readProfile(f.request(), {}));
  value(await f.host.services.workspace.saveProfile(f.request(), { expectedScope:f.host.workspace.editScope(),expectedRevision: profile.revision, text: '# Owner\n\nRetained profile.' }));
  const identity = value(await f.host.services.core.getIdentity(f.request(), {}));
  value(await f.host.services.core.reviseIdentity(f.request(), { expectedScope:f.host.workspace.editScope(),expectedRevision: identity.revision, displayName: '小汐', character: 'Continuous identity.' }));
  await f.close();
  assert.equal(inspectRepoBinding(f.config).state, 'ready');
  const before = fileHashes(f.config.dataDir), target = join(f.repo, '.chatpet/data/core');
  const plan = prepareRepoStorage(f.repo, f.config), manifestFile = join(f.repo, '.chatpet/manifest.json');
  const originalRename = fs.renameSync;
  const rename = t.mock.method(fs, 'renameSync', (from, to) => {
    if (to === manifestFile) throw Error('Injected manifest rename failure');
    return originalRename(from, to);
  });
  syncBuiltinESMExports();
  try { assert.throws(() => relocateRepoStorage(plan), /Injected manifest rename failure/); }
  finally { rename.mock.restore(); syncBuiltinESMExports(); }
  assert.deepEqual(fileHashes(f.config.dataDir), before, 'A failed completion never changes the original Core');
  assert.ok(existsSync(join(target, 'core.sqlite')), 'The valid copied database remains for retry');
  assert.ok(!JSON.parse(readFileSync(manifestFile, 'utf8')).files.includes('data/core/core.sqlite'));
  assert.ok(!readdirSync(dirname(manifestFile)).some(name => name.startsWith('.manifest-relocate-')), 'Failed atomic writes clean their temporary files');
  // Even before the final declaration, loss of the copied DB cannot create a
  // blank companion. This covers the migration crash/finalization window.
  const retained = join(f.root, 'retained-core.sqlite'); renameSync(join(target, 'core.sqlite'), retained);
  assert.throws(() => createCore({ ...f.config, dataDir: target }), /migrate its existing Core|recover its data/);
  assert.equal(existsSync(join(target, 'core.sqlite')), false);
  renameSync(retained, join(target, 'core.sqlite'));
  relocateRepoStorage(prepareRepoStorage(f.repo, f.config));
  assert.ok(JSON.parse(readFileSync(manifestFile, 'utf8')).files.includes('data/core/core.sqlite'));
  assert.deepEqual(fileHashes(f.config.dataDir), before);
  for (const [name, hash] of Object.entries(before)) assert.equal(fileHashes(target)[name], hash, 'Migrated ' + name + ' retains exact bytes');
  const portable = { ...f.config, dataDir: target };
  await f.reopen(portable);
  assert.equal(value(await f.initialize(prefs.revision)).state, 'ready');
  assert.equal(f.host.workspace.storageStatus().complete, true);
  assert.equal(value(await f.host.services.core.getIdentity(f.request(), {})).displayName, '小汐');
  assert.equal(value(await f.host.services.workspace.readProfile(f.request(), {})).text, '# Owner\n\nRetained profile.');
  assert.deepEqual(fileHashes(f.config.dataDir), before, 'Starting the migrated Core does not mutate its retained source');
  await f.close();
  assert.equal(inspectRepoBinding(portable).state, 'ready');
  assert.equal(relocateRepoStorage(prepareRepoStorage(f.repo, portable)).length, 0, 'Completed migration is safely repeatable');
  renameSync(join(target, 'core.sqlite'), retained);
  for (const pending of [false, true]) {
    if (pending) writeFileSync(join(f.repo, '.chatpet/.initialization-pending.json'), JSON.stringify({ companionId: f.config.companionId }));
    assert.throws(() => createCore(portable), /migrate its existing Core|recover its data/);
    assert.equal(existsSync(join(target, 'core.sqlite')), false, 'A missing initialized DB must never be regenerated');
  }
});

test('an existing portable Core declaration stays required when an external bootstrap Core is still available', async t => {
  const f = fixture(t), prefs = await f.bind();
  value(await f.initialize(prefs.revision));
  const file = join(f.repo, '.chatpet/manifest.json'), manifest = JSON.parse(readFileSync(file, 'utf8'));
  manifest.files.push('data/core/core.sqlite'); writeFileSync(file, JSON.stringify(manifest));
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.equal((await f.initialize(prefs.revision)).ok, false);
    assert.ok(JSON.parse(readFileSync(file, 'utf8')).files.includes('data/core/core.sqlite'), 'Retry must preserve the missing authority declaration');
    assert.equal(existsSync(join(f.repo, '.chatpet/data/core/core.sqlite')), false);
    assert.equal(inspectRepoBinding(f.config).state, 'pending');
  }
});
