#!/usr/bin/env node
// Prepare a machine-bound Bundle from a downloaded package, then use DSH's installer.
import { createRequire, registerHooks } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, cpSync, chmodSync, existsSync, realpathSync, lstatSync, renameSync, rmSync } from 'node:fs';
import { join, resolve, dirname, isAbsolute, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { assertStopped, prepareRepoStorage, relocateRepoStorage, inspectRepoBinding, boundMemoryDirectory } from './lib/repo-storage.mjs';
import { loadPortableRepo } from './lib/portable-repo.mjs';
import { prepareDeviceRuntime, applyDeviceRuntime } from './lib/device-runtime.mjs';
import { prepareCoreConfiguration, prepareMemoryServiceEntry } from './lib/core-config.mjs';

const arg = (key, fallback) => { const i = process.argv.indexOf(key); return i < 0 ? fallback : process.argv[i + 1]; };
const app = arg('--dsh-app', '/Applications/DeepSeek Harness.app');
if (!process.versions.electron) {
  const result = spawnSync(join(app, 'Contents/MacOS/DeepSeek Harness'), [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit',
  });
  if (result.error) throw result.error; process.exit(result.status ?? 1);
}
const require = createRequire(join(app, 'Contents/Resources/app.asar/dsh/package.json'));
const { resolveDshHome } = await import(require.resolve('@deepseek-ai/dsh-home-paths'));
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const home = arg('--dsh-home', resolveDshHome()), profile = arg('--profile', 'desktop');
assert.ok(/^[\w-]+$/.test(profile), 'Invalid profile name');
const profileDir = join(home, 'profiles', profile), configPath = join(profileDir, 'cordis.patch.yml');
const patch = readFileSync(configPath, 'utf8');
const dir = resolve(arg('--output-dir', join(profileDir, 'chatpet-installation')));
const archive = resolve(arg('--archive', join(dir, 'her-world-0.0.0.tgz')));
assert.ok(existsSync(archive), 'Provide an existing plugin archive with --archive');
mkdirSync(dir, { recursive: true, mode: 0o700 });
chmodSync(dir, 0o700);
const stage = mkdtempSync(join(dir, 'prepared-'));
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options, env: { ...(options.env ?? process.env), COPYFILE_DISABLE: '1' } });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} failed`);
};
// AppleDouble files are filesystem metadata, not plugin locales or source.
// Exclude existing sidecars as well as disabling their creation during packing.
const metadataExcludes = ['--exclude', '._*', '--exclude', '*/._*', '--exclude', '__MACOSX', '--exclude', '*/__MACOSX/*', '--exclude', '.DS_Store', '--exclude', '*/.DS_Store'];
run('/usr/bin/tar', [...metadataExcludes, '-xzf', archive, '-C', stage]);
const config = prepareCoreConfiguration({ dataDir: arg('--data-dir', join(home, 'codex-pet/core')),
  companionId: randomUUID(), scopeId: randomUUID(), ownerActorId: randomUUID(),
  displayName: '', character: '' });
assert.ok(isAbsolute(config.dataDir), 'data-dir must be absolute');
// Preserve every portable Bundle declaration and
// Loader !!js expressions. Only bind the Core entry to this machine.
const bundleYaml = require('js-yaml');
const { entryListSchema } = await import(require.resolve('@deepseek-ai/cordis-plugin-include'));
const installedBundle = join(profileDir, 'node_modules/her-world/cordis.patch.yml');
let installedConfig;
if (existsSync(installedBundle)) {
  const installed = bundleYaml.load(readFileSync(installedBundle, 'utf8'), { schema: entryListSchema });
  const installedCore = installed.flatMap(operation => operation.insert ?? []).find(entry => entry.id === '00-Core');
  assert.ok(installedCore?.name === 'her-world/00-Core', 'Inspect the installed Core declaration before replacing it');
  // A newly added portable Bundle has no machine binding yet. Existing
  // configured identity is authoritative; an unconfigured entry is a fresh setup.
  if (installedCore.config !== undefined && installedCore.config !== null
      && !(typeof installedCore.config === 'object' && !Array.isArray(installedCore.config) && Object.keys(installedCore.config).length === 0)) {
    assert.ok(typeof installedCore.config === 'object' && !Array.isArray(installedCore.config)
      && typeof installedCore.config.dataDir === 'string' && installedCore.config.companionId
      && installedCore.config.scopeId && installedCore.config.ownerActorId, 'Installed Core binding is incomplete; preserve and reconcile it');
    installedConfig = structuredClone(installedCore.config);
    Object.assign(config, prepareCoreConfiguration(installedCore.config));
  }
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
  config.memory = { ...config.memory, python: memoryPython, dataDir: memoryDataDir };
}
const configuredBeforeBinding = structuredClone(config);
const binding = inspectRepoBinding(config);
const explicitStorageRepo = arg('--storage-repo', resumeRepo);
const storageRepo = explicitStorageRepo ?? (binding.state === 'ready' ? binding.root : null);
let memoryTarget;
if (storageRepo) {
  const root = realpathSync(resolve(storageRepo));
  if (!resumeRepo) {
    assert.equal(binding.state, 'ready', 'Initialize the selected companion workspace explicitly before relocating its storage');
    assert.equal(root, binding.root, 'Storage Repo must match the current initialized workspace');
  }
  if (config.memory) {
    if (process.argv.includes('--memory-data-dir') || resumeRepo) {
      const directory = resolve(config.memory.dataDir);
      const bank = lstatSync(join(directory, 'data', 'memory.db'), {throwIfNoEntry:false});
      assert.ok(bank && bank.isFile() && !bank.isSymbolicLink() && bank.nlink === 1 && bank.size > 0,
        'The explicitly selected existing Memory Bank is absent or invalid; no new Bank was created');
      const local = relative(root, directory);
      memoryTarget = local && local !== '..' && !local.startsWith('..' + sep) && !isAbsolute(local)
        ? directory : join(root, '.chatpet', 'data', 'memory');
      config.memory.dataDir = directory;
    } else {
      // Match the Bank the current runtime actually selects, not a deleted
      // sibling-workspace path retained in an older installation receipt.
      config.memory.dataDir = boundMemoryDirectory(config, binding);
      memoryTarget = config.memory.dataDir;
    }
  }
}
const sourceConfig = structuredClone(config);
const relocation = storageRepo ? prepareRepoStorage(resolve(storageRepo), sourceConfig, {memoryTarget}) : null;
if (relocation) {
  config.dataDir = join(relocation.data, 'core');
  if (config.memory) config.memory.dataDir = relocation.entries.find(entry => entry.kind === 'memory').target;
}
// A prepared Bundle names the device runtime that --apply will materialize.
// Preparing an archive never copies an environment outside this output directory.
const memoryEntryChoice=arg('--memory-service-entry');
assert.ok(!process.argv.includes('--memory-service-entry') || typeof memoryEntryChoice==='string' && memoryEntryChoice,
  'Provide --memory-service-entry bundled or an absolute custom entry');
if(config.memory) {
  const managedEntries=[];
  for(const root of [packageRoot,dirname(installedBundle)]) {
    managedEntries.push(join(resolve(root),'src/memory/main.py'));
    if(existsSync(root))managedEntries.push(join(realpathSync(root),'src/memory/main.py'));
  }
  const inherited=config.memory.serviceEntry;
  if(memoryEntryChoice===undefined && typeof inherited==='string' && isAbsolute(inherited)) {
    const root=resolve(dirname(inherited),'../..');
    // Old checkout paths are not proven managed by their spelling or a receipt
    // containing that same path. Verify program identity and both shim files.
    try {
      const regular=file=>{const stat=lstatSync(file,{throwIfNoEntry:false});return stat?.isFile() && !stat.isSymbolicLink() && stat.nlink===1;};
      const metadata=join(root,'package.json'),files=['src/memory/main.py','src/memory/provider.py'];
      if(resolve(inherited)===join(root,'src/memory/main.py') && regular(metadata)
        && JSON.parse(readFileSync(metadata,'utf8')).name==='her-world'
        && files.every(file=>regular(join(root,file)) && regular(join(packageRoot,file))
          && createHash('sha256').update(readFileSync(join(root,file))).digest('hex')===createHash('sha256').update(readFileSync(join(packageRoot,file))).digest('hex')))
        managedEntries.push(resolve(inherited));
    } catch {/* Insufficient evidence remains an explicit setup choice below. */}
  }
  if(memoryEntryChoice!==undefined && memoryEntryChoice!=='bundled') {
    assert.ok(isAbsolute(memoryEntryChoice),'Memory service entry must be an absolute custom path or bundled');
    const stat=lstatSync(memoryEntryChoice,{throwIfNoEntry:false});
    assert.ok(stat?.isFile() && !stat.isSymbolicLink() && stat.nlink===1,'Explicit Memory service entry must be an existing regular local file');
  }
  config.memory=prepareMemoryServiceEntry(config.memory,{choice:memoryEntryChoice,managedEntries});
} else prepareMemoryServiceEntry(undefined,{choice:memoryEntryChoice});
const deviceRuntimePlan = config.memory ? prepareDeviceRuntime({
  python: config.memory.python,
  deviceRoot: resolve(arg('--device-runtime', join(profileDir, 'chatpet-runtime'))),
  sourceRepo: packageRoot,
}) : null;
if (deviceRuntimePlan) {
  config.memory.python = deviceRuntimePlan.python;
  config.memory.runtimeRoot = deviceRuntimePlan.deviceRoot;
}
const bundlePath = join(stage, 'package/cordis.patch.yml');
const bundle = bundleYaml.load(readFileSync(bundlePath, 'utf8'), { schema: entryListSchema });
const coreEntry = bundle.flatMap(operation => operation.insert ?? []).find(entry => entry.id === '00-Core');
assert.ok(coreEntry?.name === 'her-world/00-Core', 'Portable Bundle must declare Core');
assert.ok(!bundle.flatMap(operation => operation.insert ?? []).some(entry => entry.id === 'preset-chatpet'), 'Workspace binding must not require a separate Chatpet preset');
coreEntry.config = config;
writeFileSync(bundlePath, bundleYaml.dump(bundle, { schema: entryListSchema, noRefs: true, lineWidth: -1 }));
const packed = join(dir, 'her-world-local.tgz');
run('/usr/bin/tar', ['--no-xattrs', ...metadataExcludes, '-czf', packed, '-C', stage, 'package']);
const inventory = spawnSync('/usr/bin/tar', ['-tzf', packed], {
  env: { ...process.env, COPYFILE_DISABLE: '1' }, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
});
if (inventory.error) throw inventory.error;
assert.equal(inventory.status, 0, 'Prepared archive inventory could not be read');
assert.ok(!inventory.stdout.split(/\r?\n/).some(name => name.split('/').some(part => part.startsWith('._') || part === '__MACOSX' || part === '.DS_Store')),
  'Prepared archive contains macOS metadata; do not install it');
const prepared = join(dir, `her-world-local-${createHash('sha256').update(readFileSync(packed)).digest('hex').slice(0, 12)}.tgz`);
copyFileSync(packed, prepared);
const paths = value => ({coreDataDir: value.dataDir,
  memoryDataDir: value.memory?.dataDir ?? null, memoryPython: value.memory?.python ?? null});
const backupRequested = !process.argv.includes('--no-backup');
// An attempt is not evidence of the currently installed binding. Keep its
// evolving receipt beside its prepared Bundle, and publish the stable receipt
// only at the actual package-mutation boundary and after verified completion.
const attemptReceipt = join(stage, 'installation.json');
const installedReceipt = join(dir, 'installation.json');
const saveAttempt = () => writeFileSync(attemptReceipt, JSON.stringify(installation, null, 2), {mode:0o600});
function publishInstallation(value) {
  const temporary = join(dir, '.installation-' + randomUUID() + '.json');
  try {
    writeFileSync(temporary, JSON.stringify(value, null, 2), {mode:0o600,flag:'wx'});
    renameSync(temporary, installedReceipt);
  } finally { if (existsSync(temporary)) rmSync(temporary); }
}
const installation = { status: 'prepared', profileDir, archive: prepared, config,
  binding: {state: binding.state, workspace: binding.target ?? null, reason: binding.reason ?? null},
  backupPolicy: backupRequested ? 'default' : 'none', plannedPaths: paths(config),
  ...(deviceRuntimePlan ? {deviceRuntime: {status: 'planned', plan: deviceRuntimePlan}} : {}),
  ...(installedConfig ? {installedPathsBefore: paths(installedConfig)} : {}),
  ...(relocation ? { storageRepo: relocation.root, previousConfig: sourceConfig, configuredBeforeBinding,
    migrationRequired: relocation.entries.some(entry => entry.source !== entry.target) } : {}) };
saveAttempt();
console.log(JSON.stringify({ prepared, attemptReceipt, profile, dataDir: config.dataDir }));
if (!process.argv.includes('--apply')) process.exit(0);
const running = spawnSync('/usr/bin/pgrep', ['-x', 'DeepSeek Harness'], { encoding: 'utf8' });
assert.ok(running.status === 0 || running.status === 1, 'Cannot verify DSH is closed');
assert.ok(!running.stdout.trim().split(/\s+/).filter(Boolean).map(Number).some(pid => pid !== process.pid), 'Quit DSH before replacing its package');
assertStopped(sourceConfig.dataDir, 'core');
if (sourceConfig.memory) assertStopped(sourceConfig.memory.dataDir, 'memory');
if (deviceRuntimePlan) {
  const preparedRuntime = applyDeviceRuntime(deviceRuntimePlan);
  assert.equal(preparedRuntime.python, config.memory.python, 'Device runtime differs from the prepared Bundle');
  installation.deviceRuntime = {status: 'ready', deviceRoot: preparedRuntime.deviceRoot,
    python: preparedRuntime.python, receipt: preparedRuntime.receipt};
  saveAttempt();
}
let backupDir = null;
if (backupRequested) {
  backupDir = join(profileDir, 'backups/codex-pet', new Date().toISOString().replace(/[:.]/g, '-'));
  mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  for (const file of ['package.json', 'cordis.patch.yml', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
    if (existsSync(join(profileDir, file))) { copyFileSync(join(profileDir, file), join(backupDir, file)); chmodSync(join(backupDir, file), 0o600); }
  }
  // Optional installation rollback copy, never a substitute for full recovery.
  if (existsSync(sourceConfig.dataDir)) cpSync(sourceConfig.dataDir, join(backupDir, 'core-data'), { recursive: true, dereference: false });
  if (sourceConfig.memory && existsSync(sourceConfig.memory.dataDir))
    cpSync(sourceConfig.memory.dataDir, join(backupDir, 'memory-data'), { recursive: true, dereference: false });
}
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
if (process.argv.includes('--offline')) profileEnv.npm_config_offline='true';
if (previousProfile.dependencies?.['codex-pet'])
  assert.ok(process.argv.includes('--replace-codex-pet'), 'Use --replace-codex-pet after fully quitting DSH to replace the previous bundle');
// After this boundary, a failing CLI can leave the actual binding uncertain.
// Preserve the previous completed receipt verbatim and refuse to advertise it
// as current until this attempt verifies the new installation.
const previousReceipt = join(stage, 'previous-installation.json');
if (existsSync(installedReceipt)) writeFileSync(previousReceipt, readFileSync(installedReceipt), {mode:0o600,flag:'wx'});
publishInstallation({status:'applying',profileDir,attemptReceipt,
  ...(existsSync(previousReceipt) ? {previousReceipt} : {})});
if (previousProfile.dependencies?.['codex-pet']) {
  run(join(app, 'Contents/Resources/runtime/cli/bin/dsh'), ['plugin', '--profile', profile, 'remove', 'codex-pet'], {env:profileEnv});
}
run(join(app, 'Contents/Resources/runtime/cli/bin/dsh'), ['plugin', '--profile', profile, 'add', prepared, '--ignore-scripts', ...(process.argv.includes('--offline') ? ['--offline'] : [])], {env:profileEnv});
assert.equal(hash(readFileSync(configPath, 'utf8')), originalPatch, 'Existing user patch changed unexpectedly');
const installed = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'));
assert.ok(installed.dependencies?.['her-world']);
const enabled = installed.dsh?.profile?.bundles?.includes('her-world') ?? false;
// DSH preserves an existing bundle's on/off setting when updating its package.
const expectedEnabled = previousProfile.dependencies?.['her-world']
  ? (previousProfile.dsh?.profile?.bundles?.includes('her-world') ?? false) : true;
assert.equal(enabled, expectedEnabled, 'Unexpected change to Chatpet bundle activation');
installation.packageInstalled = true;
installation.enabled = enabled;
installation.backupDir = backupDir;
const installedOperations = bundleYaml.load(readFileSync(installedBundle, 'utf8'), {schema:entryListSchema});
const actualConfig = installedOperations.flatMap(operation => operation.insert ?? []).find(entry => entry.id === '00-Core')?.config;
assert.deepEqual(actualConfig, config, 'Installed Core binding differs from the prepared configuration');
installation.actualPaths = paths(actualConfig);
installation.migrationRequired = false;
installation.storageInRepo = Boolean(relocation && actualConfig.dataDir === join(relocation.data, 'core'));
// This is the owner's explicit setup operation, after offline relocation and
// package installation, not an application-startup repair of absent documents.
// Only finish an already recognized, initialized binding. Fresh/unbound or
// missing managed workspaces remain untouched until explicit initialization.
if (binding.state === 'ready' && relocation?.root === binding.root) {
  installation.initialization = {status: 'pending', workspaceId: binding.target.id};
  try {
    const managed = join(binding.root, '.chatpet'), stat = lstatSync(managed, {throwIfNoEntry:false});
    assert.ok(stat && stat.isDirectory() && !stat.isSymbolicLink(), 'Companion files disappeared; refuse to reconstruct them during setup');
    const currentBinding = inspectRepoBinding(actualConfig);
    assert.equal(currentBinding.state, 'ready', 'Workspace is no longer initialized; explicit initialization is required');
    assert.equal(currentBinding.target.id, binding.target.id, 'Selected workspace changed during setup');
    assert.equal(currentBinding.root, binding.root, 'Selected workspace path changed during setup');
    // DSH supplies SDK peers through its application loader, not the profile's
    // node_modules. Resolve only those declared peers from the trusted app;
    // never borrow a development checkout or install another SDK copy.
    const installedRoot = join(profileDir, 'node_modules/her-world');
    const peers = Object.keys(JSON.parse(readFileSync(join(installedRoot, 'package.json'), 'utf8')).peerDependencies ?? {})
      .filter(name => name.startsWith('@deepseek-ai/'));
    // Resolve before registering the hook so require.resolve cannot recurse
    // through this same hook. All package code still comes from installedRoot.
    const peerUrls = new Map(peers.map(name => [name, pathToFileURL(require.resolve(name)).href]));
    const peerHook = registerHooks({resolve(specifier, context, nextResolve) {
      const url = peerUrls.get(specifier);
      return url ? {url, shortCircuit:true} : nextResolve(specifier, context);
    }});
    let host;
    try {
      const {createCore} = await import(pathToFileURL(join(installedRoot, 'dist/src/core/index.js')).href);
      host = createCore(actualConfig);
      const prefs = await host.services.preferences.read(host.operator.request('setup.preferences:' + randomUUID()), {});
      assert.ok(prefs.ok, 'Installed Core preferences could not be read for explicit initialization');
      assert.equal(prefs.value.workspace?.id, binding.target.id, 'Selected workspace changed before initialization');
      assert.equal(prefs.value.workspace?.path, binding.root, 'Selected workspace directory changed before initialization');
      const result = await host.services.workspace.initialize(host.operator.request('setup.workspace.finish:' + randomUUID()), {
        expectedPreferencesRevision: prefs.value.revision,
      });
      if (!result.ok) throw new Error(`Explicit workspace initialization failed (${result.error.code}): ${result.error.message}`);
      assert.equal(result.value.state, 'ready', 'Explicit workspace initialization did not complete');
      const storage = host.workspace.storageStatus();
      installation.initialization = {status: 'pending', workspaceId: binding.target.id,
        revision: result.value.revision, sourceRevision: result.value.sourceRevision,
        storageId: host.workspace.storageId(), files: result.value.files, storage};
      assert.ok(storage.complete, 'Companion documents are ready but actual storage placement is incomplete');
      installation.initialization.status = 'ready';
    } finally {
      try { if (host) await host.close(); }
      finally { peerHook.deregister(); }
    }
  } catch (error) {
    installation.status = 'needs-initialization';
    installation.initialization = {...installation.initialization, status: 'failed', workspaceId: binding.target.id,
      message: error instanceof Error ? error.message : 'Explicit initialization did not complete'};
    saveAttempt();
    throw error;
  }
} else installation.initialization = {status: 'not-requested', reason: 'No existing initialized binding was selected for completion'};
installation.status = 'installed';
saveAttempt();
publishInstallation(installation);
console.log(JSON.stringify({ installed: true, profileDir, backupDir, actualPaths:installation.actualPaths, userPatchUnchanged: true }));
