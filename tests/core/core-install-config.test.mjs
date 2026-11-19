import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {prepareCoreConfiguration} from '../../scripts/lib/core-config.mjs';
import {createCore} from '../../dist/src/core/index.js';
import {profileFixture} from '../behavior-list/setup-config.test.mjs';

const identity={dataDir:'/fixture/core',companionId:'fixture-fish',scopeId:'fixture-scope',ownerActorId:'fixture-owner',displayName:'Xiaoxi',character:'The existing companion.'};

test('actual installer preparation requires no default model and creates only native Core configuration', t => {
  const f = profileFixture(t), patch = '# Native profile without a model selection\n[]\n';
  writeFileSync(f.patchPath, patch);
  const {attemptReceipt} = f.checked([]);
  const {config} = JSON.parse(readFileSync(attemptReceipt));
  assert.deepEqual(Object.keys(config).sort(),['character','companionId','dataDir','displayName','ownerActorId','scopeId'].sort());
  assert.ok(config.companionId&&config.scopeId&&config.ownerActorId);
  assert.equal(config.dataDir, join(f.home, 'codex-pet/core'));
  assert.equal(readFileSync(f.patchPath, 'utf8'), patch);
  assert.equal(readFileSync(f.manifest, 'utf8'), '{}');
  assert.deepEqual(f.calls(), [], 'Preparation installs no package and starts no host or model');
});

test('upgrade selection preserves identity, Memory and real conversation limits while dropping retired driver fields',()=>{
  const conversation={maxContextChars:18000,maxSteps:12,maxToolCalls:8,maxDurationMs:120000};
  const memory={python:'/fixture/device/python',dataDir:'/fixture/workspace/.chatpet/data/memory',runtimeRoot:'/fixture/device',serviceEntry:'/fixture/memory-entry.py'};
  const installed={...identity,conversation:{...conversation,maxHistoryMessages:24},memory,cwd:'/obsolete/checkout',provider:'retired-provider',model:'retired-model',maxOutputTokens:4096,unknownLegacyMode:true};
  const selected=prepareCoreConfiguration({...identity,companionId:'new-unused-fish'},installed);
  assert.deepEqual(selected,{...identity,conversation,memory});
  selected.memory.dataDir='/fixture/new-memory';selected.conversation.maxSteps=5;
  assert.equal(memory.dataDir,'/fixture/workspace/.chatpet/data/memory');assert.equal(conversation.maxSteps,12,'Setup cannot mutate the source binding while rebinding its copy');
});

test('explicit resume layers override only declared binding fields and retain the existing companion settings',()=>{
  const memory={python:'/fixture/new-device/python',dataDir:'/fixture/copied-workspace/.chatpet/data/memory'};
  const selected=prepareCoreConfiguration({...identity,conversation:{maxSteps:9}},undefined,
    {dataDir:'/fixture/copied-workspace/.chatpet/data/core',memory,provider:'not-a-Core-setting',cwd:'/not-a-Core-binding'});
  assert.deepEqual(selected,{...identity,dataDir:'/fixture/copied-workspace/.chatpet/data/core',conversation:{maxSteps:9},memory});
  assert.throws(()=>prepareCoreConfiguration(identity,[]),/configuration must be an object/);
});

const migrate = ['migrate-core-config'];
const apply = [...migrate, '--apply'];
const configFor = f => ({...identity, dataDir: join(f.home, 'core')});
const read = path => JSON.parse(readFileSync(path));
const completed = (f, config) => ({status: 'installed', packageInstalled: true, profileDir: f.profileDir, config,
  actualPaths: {coreDataDir: config.dataDir, memoryDataDir: config.memory?.dataDir ?? null, memoryPython: config.memory?.python ?? null}});
const putReceipt = (f, receipt) => {
  mkdirSync(f.receiptDir, {recursive: true});
  writeFileSync(f.receiptPath, JSON.stringify(receipt));
};
function assertRejected(result, reason, config) {
  assert.equal(result.status, 1, result.stderr);
  assert.equal(JSON.parse(result.stderr.trim().split('\n').at(-1)).reason, reason);
  for (const key of ['companionId', 'scopeId', 'ownerActorId']) assert.ok(!result.stderr.includes(config[key]));
  assert.equal(result.stdout, '');
}

test('migrate-core-config moves legacy Core and preserves other patches, then a repeat leaves both files intact', t => {
  const f = profileFixture(t), config = configFor(f);
  f.installFixture(config);
  const other = '# keep owner comments\n- insert:\n    - id: another-entry\n      name: another\n      config: !!js untouched\n';
  writeFileSync(f.patchPath, other);
  const bundle = readFileSync(f.bundlePatch);
  assert.equal(f.checked(migrate).status, 'migration-required');
  assert.equal(readFileSync(f.patchPath, 'utf8'), other);
  assert.equal(existsSync(f.receiptDir), false);

  assert.equal(f.checked(apply).status, 'migrated');
  assert.deepEqual(readFileSync(f.bundlePatch), bundle);
  assert.ok(readFileSync(f.patchPath, 'utf8').startsWith(other));
  assert.deepEqual(f.coreConfig(), config);
  const receipt = read(f.receiptPath);
  assert.equal(receipt.status, 'installed');
  assert.deepEqual(receipt.config, config);
  const output = readdirSync(f.receiptDir), timestamps = [f.patchPath, f.receiptPath].map(path => statSync(path, {bigint: true}).mtimeNs);
  assert.equal(f.checked(apply).status, 'checked');
  assert.deepEqual(readdirSync(f.receiptDir), output);
  assert.deepEqual([f.patchPath, f.receiptPath].map(path => statSync(path, {bigint: true}).mtimeNs), timestamps);
  assert.deepEqual(f.calls().filter(call => call.args), []);
});

test('migrate-core-config backfills a receipt for an existing disabled npm profile', t => {
  const f = profileFixture(t);
  const config = {...configFor(f), memory: {python: join(f.home, 'python'), dataDir: join(f.home, 'bank')}};
  f.installFixture(undefined, {enabled: false, spec: '^0.2.0', version: '0.2.0'});
  const patch = '# existing profile\n' + f.dump([{id: '00-Core', config}]);
  writeFileSync(f.patchPath, patch);
  const manifest = readFileSync(f.manifest);
  assert.equal(f.checked(migrate).status, 'migration-required');
  assert.equal(existsSync(f.receiptPath), false);
  const result = f.checked(apply);
  assert.equal(result.status, 'migrated');
  assert.equal(result.enabled, false);
  assert.equal(readFileSync(f.patchPath, 'utf8'), patch);
  assert.deepEqual(readFileSync(f.manifest), manifest);
  assert.deepEqual(read(f.receiptPath), {...read(f.receiptPath), ...completed(f, config), enabled: false});
  assert.equal(f.checked(migrate).status, 'checked');
  assert.deepEqual(f.calls().filter(call => call.args), []);
});

test('receipt-only recovery requires the private Core identity and a verified workspace binding', async t => {
  const f = profileFixture(t), repo = join(f.home, 'workspace');
  const workspace = {id: 'synthetic-world', path: repo, title: 'Synthetic workspace'};
  const config = {...configFor(f), dataDir: join(repo, '.chatpet/data/core')};
  f.installFixture(undefined, {spec: '0.2.0', version: '0.2.0'});
  const receipt = {...completed(f, config), binding: {state: 'ready', workspace}, storageRepo: repo, storageInRepo: true};
  putReceipt(f, receipt);
  assertRejected(f.command(apply), 'receipt-recovery-unverified', config);
  mkdirSync(repo);
  const host = createCore(config);
  try {
    const {value: prefs} = await host.services.preferences.read(host.operator.request('before'), {});
    const saved = await host.services.preferences.save(host.operator.request('bind'), {expectedRevision: prefs.revision,
      workspace, conversation: prefs.conversation});
    assert.equal(saved.ok, true);
    assert.equal((await host.services.workspace.initialize(host.operator.request('initialize'), {expectedPreferencesRevision: saved.value.revision})).ok, true);
  } finally { await host.close(); }

  putReceipt(f, {...receipt, config: {...config, scopeId: 'wrong-scope'}});
  assertRejected(f.command(apply), 'core-binding-conflict', config);
  assert.equal(readFileSync(f.patchPath, 'utf8'), '[]\n');
  putReceipt(f, receipt);
  const original = readFileSync(f.receiptPath);
  assert.equal(f.checked(apply).status, 'migrated');
  assert.deepEqual(f.coreConfig(), config);
  assert.deepEqual(readFileSync(f.receiptPath), original);
});

test('migrate-core-config leaves invalid, conflicting or in-progress evidence untouched', t => {
  const f = profileFixture(t), config = configFor(f);
  f.installFixture(config);
  const override = changed => f.dump([{id: '00-Core', config: changed}]);
  const cases = [
    {patch: 'not a sequence', reason: 'patch-invalid'},
    {patch: override({...config, ownerActorId: 'different-owner'}), reason: 'core-binding-conflict'},
    {patch: override(config) + override(config), reason: 'core-duplicate'},
    {patch: '[]\n', home: override({...config, displayName: 'Home override'}), reason: 'home-core-conflict'},
    {patch: '[]\n', receipt: {...completed(f, config), status: 'applying'}, reason: 'receipt-incomplete'},
    {patch: '[]\n', receipt: {...completed(f, config), status: 'prepared'}, reason: 'receipt-incomplete'},
    {patch: '[]\n', receipt: {...completed(f, config), profileDir: f.home}, reason: 'receipt-profile-conflict'},
    {patch: '[]\n', receipt: completed(f, {...config, memory: {python: join(f.home, 'python'), dataDir: join(f.home, 'other-bank')}}), reason: 'receipt-binding-conflict'},
  ];
  const homePatch = join(f.home, 'cordis.patch.yml');
  for (const row of cases) {
    writeFileSync(f.patchPath, row.patch);
    if (row.home) writeFileSync(homePatch, row.home);
    else rmSync(homePatch, {force: true});
    if (row.receipt) putReceipt(f, row.receipt);
    else rmSync(f.receiptPath, {force: true});
    assertRejected(f.command(apply), row.reason, config);
    assert.equal(readFileSync(f.patchPath, 'utf8'), row.patch);
    if (row.receipt) assert.deepEqual(read(f.receiptPath), row.receipt);
    else assert.equal(existsSync(f.receiptPath), false);
  }
  assert.deepEqual(f.calls().filter(call => call.args), []);
});

test('setup rejects a legacy archive and refuses to invent identity for an unconfigured installed package', t => {
  const f = profileFixture(t);
  const gone = f.command(['--apply', '--archive=/fixture/old.tgz']);
  assert.equal(gone.status, 1);
  assert.match(gone.stderr, /archive-unsupported.*--version/);
  assert.deepEqual(f.calls(), []);
  f.installFixture(undefined, {version: '0.2.0', spec: '0.2.0'});
  assertRejected(f.command(['--apply']), 'migrate-core-config-required', identity);
  assert.deepEqual(f.calls().filter(call => call.args), []);
  assert.equal(existsSync(f.receiptDir), false);
});
