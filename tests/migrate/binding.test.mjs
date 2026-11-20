import test from 'node:test';
import assert from 'node:assert/strict';
import {linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCore} from '../../dist/src/core/index.js';
import {settingsHandler} from '../../dist/src/console/settings.js';
import {inspectRepoBinding} from '../../scripts/lib/repo-storage.mjs';
import {offlineFixture} from './offline-helpers.mjs';
import {read, refusedCli} from './helpers.mjs';

async function initialize(t, {portable = false} = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'migration-binding-')));
  const repo = join(root, 'repo'), managed = join(repo, '.chatpet');
  mkdirSync(repo);
  t.after(() => rmSync(root, {recursive:true, force:true}));
  const config = {dataDir:portable ? join(managed, 'data/core') : join(root, 'core'),
    companionId:'fixture', scopeId:'fixture-scope', ownerActorId:'fixture-owner', displayName:'Fixture', character:''};
  const host = createCore(config), request = () => host.operator.request('binding-fixture');
  try {
    const before = await host.services.preferences.read(request(), {});
    assert.ok(before.ok);
    const saved = await host.services.preferences.save(request(), {expectedRevision:before.value.revision,
      workspace:{id:'repo', path:repo, title:'Fixture'}, conversation:before.value.conversation});
    assert.ok(saved.ok);
    const result = await host.services.workspace.initialize(request(), {expectedPreferencesRevision:saved.value.revision});
    assert.equal(result.value?.state, 'ready');
    return {root, repo, managed, config, prefs:saved.value};
  } finally { await host.close(); }
}

async function snapshot(host) {
  const signal = new AbortController().signal;
  const result = await settingsHandler(() => host, () => undefined)('snapshot', {requestId:'binding-snapshot', input:{}},
    signal, {signal, principal:{kind:'owner'}});
  assert.ok(result.ok, result.error?.code);
  return result.value;
}

async function assertRepairHint(host) {
  const {workspace, migrationHelp} = await snapshot(host);
  assert.equal(workspace.state, 'migration-required');
  assert.equal(workspace.migrationReason, 'binding-not-migratable');
  assert.equal(migrationHelp, '在版本页换回 0.2.0，把工作区选择和初始化理顺后再升级。');
}

test('旧版选了 B，初始化留在 A，设置指向原版本修复绑定', async t => {
  const f = await initialize(t), other = join(f.root, 'other');
  mkdirSync(other);
  let host = createCore(f.config);
  try {
    const result = await host.services.preferences.save(host.operator.request('select-other'), {
      expectedRevision:f.prefs.revision, workspace:{id:'other', path:other, title:'Other'}, conversation:f.prefs.conversation});
    assert.ok(result.ok);
    await host.close();
    rmSync(join(f.managed, 'data/storage-manifest.json'));
    assert.equal(inspectRepoBinding(f.config).state, 'pending');
    host = createCore(f.config);
    await assertRepairHint(host);
  } finally { await host.close(); }
});

test('迁到新设备的旧 Repo 保留原路径绑定，设置指向原版本修复绑定', async t => {
  const f = await initialize(t, {portable:true}), relocated = join(f.root, 'relocated');
  rmSync(join(f.managed, 'data/storage-manifest.json'));
  renameSync(f.repo, relocated);
  const config = {...f.config, dataDir:join(relocated, '.chatpet/data/core')};
  assert.equal(inspectRepoBinding(config).state, 'unavailable');
  const host = createCore(config);
  try { await assertRepairHint(host); }
  finally { await host.close(); }
});

test('绑定缺少 .chatpet 时可初始化，原路径暂离时显示不可用且可恢复', async t => {
  const f = await initialize(t);
  for (const [path, state] of [[f.managed, 'pending'], [f.repo, 'unavailable']]) {
    await t.test(state, async () => {
      renameSync(path, path + '-away');
      const host = createCore(f.config);
      try {
        assert.equal(inspectRepoBinding(f.config).state, state);
        const {workspace, migrationHelp} = await snapshot(host);
        assert.equal(workspace.state, state);
        assert.equal(workspace.migrationReason, undefined);
        assert.match(workspace.error, state === 'pending' ? /initialize explicitly/ : /cannot be loaded/);
        assert.equal(migrationHelp, null);
      } finally { renameSync(path + '-away', path); await host.close(); }
      const restored = createCore(f.config);
      try { assert.equal(restored.workspace.status().state, 'ready'); }
      finally { await restored.close(); }
    });
  }
});

test('只有旧格式标记的空 Repo 保持待初始化，可以显式完成初始化', async t => {
  const f = await initialize(t);
  rmSync(f.managed, {recursive:true});
  mkdirSync(f.managed);
  writeFileSync(join(f.managed, '.initialization-pending.json'), JSON.stringify({companionId:f.config.companionId}));
  assert.equal(inspectRepoBinding(f.config).state, 'pending');
  const host = createCore(f.config);
  try {
    const {workspace, migrationHelp} = await snapshot(host);
    assert.equal(workspace.state, 'pending');
    assert.match(workspace.error, /retry to prepare/);
    assert.equal(migrationHelp, null);
    const reply = await host.services.workspace.initialize(host.operator.request('retry-initialize'), {expectedPreferencesRevision:f.prefs.revision});
    assert.equal(reply.value?.state, 'ready', reply.error?.code);
  } finally { await host.close(); }
});

test('已提示迁移的绑定暂时离线时不再提示迁移，目录恢复后仍保留进程门禁', async t => {
  const f = await initialize(t), manifest = join(f.managed, 'data/storage-manifest.json');
  const current = readFileSync(manifest), away = f.repo + '-away';
  rmSync(manifest);
  const host = createCore(f.config);
  try {
    assert.equal(host.workspace.status().migrationReason, 'storage-version-outdated');
    renameSync(f.repo, away);
    try {
      assert.equal(inspectRepoBinding(f.config).state, 'unavailable');
      const {workspace, migrationHelp} = await snapshot(host);
      assert.equal(workspace.state, 'unavailable');
      assert.equal(migrationHelp, null);
    } finally { renameSync(away, f.repo); }
    writeFileSync(manifest, current);
    assert.equal(host.workspace.status().state, 'migration-required');
  } finally { await host.close(); }
});

test('同一组待升级的合成形状，运行时可迁移与 inspectRepoBinding 的 ready 等价', async t => {
  const edit = (f, changes) => {
    const file = join(f.managed, 'manifest.json');
    writeFileSync(file, JSON.stringify({...read(file), ...changes}));
  };
  for (const [label, prepare, ready] of [
    ['schema 3', () => {}, true],
    ['schema 3 with a large manifest', f => edit(f, {description:'x'.repeat(65 * 1024)}), true],
    ['schema 1 without STATE.md', f => edit(f, {schemaVersion:1,files:['STATE.md']}), true],
    ['schema 2 without extra file', f => edit(f, {schemaVersion:2,files:['old-extra']}), true],
    ['schema 3 with a missing declaration', f => edit(f, {files:['missing/']}), false],
    ['schema 3 with an invalid declaration', f => edit(f, {files:['../outside']}), false],
    ['marker with initialized data', f => writeFileSync(join(f.managed, '.initialization-pending.json'), JSON.stringify({companionId:f.config.companionId})), false],
    ['missing companion manifest', f => rmSync(join(f.managed, 'manifest.json')), false],
    ['foreign companion manifest', f => edit(f, {companionId:'another'}), false],
    ['hardlinked managed document', f => linkSync(join(f.managed, 'SOUL.md'), join(f.out, 'other-link')), false],
  ]) await t.test(label, async t => {
    const f = await offlineFixture(t, false);
    prepare(f);
    let offlineReady = false;
    try { offlineReady = inspectRepoBinding(f.config).state === 'ready'; } catch (error) { assert.equal(error.code, 'ERR_ASSERTION'); }
    assert.equal(offlineReady, ready);
    const host = createCore(f.config);
    try {
      const state = host.workspace.status();
      assert.equal(state.state, 'migration-required');
      assert.equal(['storage-version-outdated', 'manifest-mismatch', 'migration-incomplete'].includes(state.migrationReason), offlineReady);
    } finally { await host.close(); }
  });
});

test('旧步骤集未完成时，设置引导用原包和源码续做或回退', async t => {
  const f = await offlineFixture(t, false);
  writeFileSync(join(f.data, 'migrations.jsonl'), JSON.stringify({event:'migration', id:'old-run',
    backup:f.out, manifestHash:'a'.repeat(64)}) + '\n');
  refusedCli(f, ['run', '--installation', f.installation, '--resume'], 'journal-step-mismatch');
  const host = createCore(f.config);
  try {
    const {workspace, migrationHelp} = await snapshot(host);
    assert.equal(workspace.migrationReason, 'migration-incomplete');
    assert.match(migrationHelp, /换回原版本的包和源码续做，或按回退流程恢复/);
  } finally { await host.close(); }
});
