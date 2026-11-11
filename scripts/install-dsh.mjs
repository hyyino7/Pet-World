// Build a machine-bound local Bundle from the portable package, then use DSH's plugin installer.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, cpSync, chmodSync, existsSync } from 'node:fs';
import { join, resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { assertStopped, prepareRepoStorage, relocateRepoStorage } from './lib/repo-storage.mjs';
import { loadPortableRepo } from './lib/portable-repo.mjs';

const arg = (key, fallback) => { const i = process.argv.indexOf(key); return i < 0 ? fallback : process.argv[i + 1]; };
const app = arg('--dsh-app', '/Applications/DeepSeek Harness.app');
if (!process.versions.electron) {
  const result = spawnSync(join(app, 'Contents/MacOS/DeepSeek Harness'), [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit',
  });
  if (result.error) throw result.error; process.exit(result.status ?? 1);
}
const require = createRequire(join(app, 'Contents/Resources/app.asar/dsh/package.json'));
const yaml = require('yaml');
const { resolveDshHome } = await import(require.resolve('@deepseek-ai/dsh-home-paths'));
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const home = arg('--dsh-home', resolveDshHome()), profile = arg('--profile', 'desktop');
assert.ok(/^[\w-]+$/.test(profile), 'Invalid profile name');
const profileDir = join(home, 'profiles', profile), configPath = join(profileDir, 'cordis.patch.yml');
const patch = readFileSync(configPath, 'utf8');
const model = yaml.parse(patch).find(entry => entry.name === '@deepseek-ai/dsh-agent-default-model')?.config;
assert.ok(model?.provider && model?.model, 'Configure the DSH model before installing Core');
const previousDir = join(repo, '.cache/install');
const dir = resolve(arg('--output-dir', previousDir)), archive = resolve(arg('--archive', join(dir, 'dsh-Chatpet-0.0.0.tgz')));
assert.ok(existsSync(archive), 'Build and pack the project first');
mkdirSync(dir, { recursive: true, mode: 0o700 });
chmodSync(dir, 0o700);
const stage = mkdtempSync(join(dir, 'prepared-'));
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, COPYFILE_DISABLE: '1' }, ...options });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} failed`);
};
run('/usr/bin/tar', ['-xzf', archive, '-C', stage]);
const old = existsSync(join(previousDir, 'installation.json')) ? JSON.parse(readFileSync(join(previousDir, 'installation.json'), 'utf8')) : null;
const config = { dataDir: arg('--data-dir', old?.config?.dataDir ?? join(home, 'codex-pet/core')), cwd: repo,
  companionId: old?.config?.companionId ?? randomUUID(), scopeId: old?.config?.scopeId ?? randomUUID(), ownerActorId: old?.config?.ownerActorId ?? randomUUID(),
  displayName: '大肥鱼', character: '你是大肥鱼，用户体贴、可靠的陪伴助手。默认用简体中文自然交流，用户明确要求其他语言时按要求回应。根据真实对话、记忆和材料提供帮助，不编造记忆、进度或外部操作。普通聊天无须创建事项。',
  ...old?.config, provider: model.provider, model: model.model, maxOutputTokens: old?.config?.maxOutputTokens ?? 4096 };
assert.ok(isAbsolute(config.dataDir), 'data-dir must be absolute');
// Preserve every portable Bundle declaration and
// Loader !!js expressions. Only bind the Core entry to this machine.
const bundleYaml = require('js-yaml');
const { entryListSchema } = await import(require.resolve('@deepseek-ai/cordis-plugin-include'));
const installedBundle = join(profileDir, 'node_modules/dsh-Chatpet/cordis.patch.yml');
if (existsSync(installedBundle)) {
  const installed = bundleYaml.load(readFileSync(installedBundle, 'utf8'), { schema: entryListSchema });
  const installedCore = installed.flatMap(operation => operation.insert ?? []).find(entry => entry.id === '00-Core');
  assert.ok(installedCore?.config, 'Inspect the installed Core binding before replacing it');
  Object.assign(config, installedCore.config, { provider: model.provider, model: model.model });
}
config.dataDir = arg('--data-dir', config.dataDir);
const resumeRepo = arg('--resume-repo');
const portable = resumeRepo ? loadPortableRepo(resolve(resumeRepo)) : null;
if (portable) {
  Object.assign(config,{dataDir:portable.dataDir,companionId:portable.companionId,scopeId:portable.scopeId,ownerActorId:portable.ownerActorId});
  if (portable.memoryDataDir) {
    assert.ok(arg('--memory-python'),'Rebind Memory with --memory-python for this device; its existing Bank will be preserved');
    config.memory={python:arg('--memory-python'),dataDir:portable.memoryDataDir};
  } else delete config.memory;
}
assert.ok(isAbsolute(config.dataDir), 'Installed Core data directory must be absolute');
const memoryPython = arg('--memory-python', config.memory?.python), memoryDataDir = arg('--memory-data-dir', config.memory?.dataDir);
assert.equal(Boolean(memoryPython), Boolean(memoryDataDir), 'Specify both Memory python and data directory');
if (memoryPython) {
  assert.ok(isAbsolute(memoryPython) && isAbsolute(memoryDataDir), 'Memory bindings must be absolute');
  config.memory = { python: memoryPython, dataDir: memoryDataDir };
}
const sourceConfig = structuredClone(config);
const storageRepo = arg('--storage-repo', resumeRepo);
const relocation = storageRepo ? prepareRepoStorage(resolve(storageRepo), sourceConfig) : null;
if (relocation) {
  config.dataDir = join(relocation.data, 'core');
  if (config.memory) config.memory.dataDir = join(relocation.data, 'memory');
}
const bundlePath = join(stage, 'package/cordis.patch.yml');
const bundle = bundleYaml.load(readFileSync(bundlePath, 'utf8'), { schema: entryListSchema });
const coreEntry = bundle.flatMap(operation => operation.insert ?? []).find(entry => entry.id === '00-Core');
assert.ok(coreEntry?.name === 'dsh-Chatpet/00-Core', 'Portable Bundle must declare Core');
assert.ok(!bundle.flatMap(operation => operation.insert ?? []).some(entry => entry.id === 'preset-chatpet'), 'Workspace binding must not require a separate Chatpet preset');
coreEntry.config = config;
writeFileSync(bundlePath, bundleYaml.dump(bundle, { schema: entryListSchema, noRefs: true, lineWidth: -1 }));
const packed = join(dir, 'dsh-Chatpet-local.tgz');
run('/usr/bin/tar', ['-czf', packed, '-C', stage, 'package']);
const prepared = join(dir, `dsh-Chatpet-local-${createHash('sha256').update(readFileSync(packed)).digest('hex').slice(0, 12)}.tgz`);
copyFileSync(packed, prepared);
const installation = { status: 'prepared', profileDir, archive: prepared, config,
  ...(relocation ? { storageRepo: relocation.root, previousConfig: sourceConfig } : {}) };
writeFileSync(join(dir, 'installation.json'), JSON.stringify(installation, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ prepared, profile, provider: config.provider, model: config.model, dataDir: config.dataDir }));
if (!process.argv.includes('--apply')) process.exit(0);
const running = spawnSync('/usr/bin/pgrep', ['-x', 'DeepSeek Harness'], { encoding: 'utf8' });
assert.ok(running.status === 0 || running.status === 1, 'Cannot verify DSH is closed');
assert.ok(!running.stdout.trim().split(/\s+/).filter(Boolean).map(Number).some(pid => pid !== process.pid), 'Quit DSH before replacing its package');
assertStopped(sourceConfig.dataDir, 'core');
if (sourceConfig.memory) assertStopped(sourceConfig.memory.dataDir, 'memory');
const backupDir = join(profileDir, 'backups/codex-pet', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(backupDir, { recursive: true, mode: 0o700 });
for (const file of ['package.json', 'cordis.patch.yml', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
  if (existsSync(join(profileDir, file))) { copyFileSync(join(profileDir, file), join(backupDir, file)); chmodSync(join(backupDir, file), 0o600); }
}
// The host is closed. Preserve the actual old Core bytes before enabling new
// guard/ack records; this is an installation rollback copy, not full restore.
if (existsSync(sourceConfig.dataDir)) cpSync(sourceConfig.dataDir, join(backupDir, 'core-data'), { recursive: true, dereference: false });
if (sourceConfig.memory && existsSync(sourceConfig.memory.dataDir))
  cpSync(sourceConfig.memory.dataDir, join(backupDir, 'memory-data'), { recursive: true, dereference: false });
if (relocation) {
  const copied = relocateRepoStorage(relocation);
  // This receipt contains file hashes, never credentials or database contents.
  writeFileSync(join(dir, 'storage-migration.json'), JSON.stringify({ at: new Date().toISOString(),
    root: relocation.root, backupDir, copied }, null, 2), { mode: 0o600 });
}
const hash = data => createHash('sha256').update(data).digest('hex');
const originalPatch = hash(patch);
const previousProfile = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'));
const profileEnv = {...process.env,npm_config_ignore_scripts:'true'};
// A source build's project-local store must not replace the DSH profile's package store.
if (profileEnv.pnpm_config_store_dir === join(repo,'.cache','pnpm-store')) delete profileEnv.pnpm_config_store_dir;
if (process.argv.includes('--offline')) profileEnv.npm_config_offline='true';
if (previousProfile.dependencies?.['codex-pet']) {
  assert.ok(process.argv.includes('--replace-codex-pet'), 'Use --replace-codex-pet after fully quitting DSH to replace the previous bundle');
  run(join(app, 'Contents/Resources/runtime/cli/bin/dsh'), ['plugin', '--profile', profile, 'remove', 'codex-pet'], {env:profileEnv});
}
run(join(app, 'Contents/Resources/runtime/cli/bin/dsh'), ['plugin', '--profile', profile, 'add', prepared, '--ignore-scripts', ...(process.argv.includes('--offline') ? ['--offline'] : [])], {env:profileEnv});
assert.equal(hash(readFileSync(configPath, 'utf8')), originalPatch, 'Existing user patch changed unexpectedly');
const installed = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'));
assert.ok(installed.dependencies?.['dsh-Chatpet']);
const enabled = installed.dsh?.profile?.bundles?.includes('dsh-Chatpet') ?? false;
// DSH preserves an existing bundle's on/off setting when updating its package.
const expectedEnabled = previousProfile.dependencies?.['dsh-Chatpet']
  ? (previousProfile.dsh?.profile?.bundles?.includes('dsh-Chatpet') ?? false) : true;
assert.equal(enabled, expectedEnabled, 'Unexpected change to Chatpet bundle activation');
installation.status = 'installed';
installation.enabled = enabled;
installation.backupDir = backupDir;
writeFileSync(join(dir, 'installation.json'), JSON.stringify(installation, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ installed: true, profileDir, backupDir, userPatchUnchanged: true }));
