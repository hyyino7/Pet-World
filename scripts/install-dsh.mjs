// Build a machine-bound local Bundle from the portable package, then use DSH's plugin installer.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, chmodSync, existsSync } from 'node:fs';
import { join, resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';

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
const dir = join(repo, '.cache/install'), archive = join(dir, 'dsh-Chatpet-0.0.0.tgz');
assert.ok(existsSync(archive), 'Build and pack the project first');
const stage = join(dir, 'prepared'); mkdirSync(stage, { recursive: true, mode: 0o700 });
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, COPYFILE_DISABLE: '1' }, ...options });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} failed`);
};
run('/usr/bin/tar', ['-xzf', archive, '-C', stage]);
const old = existsSync(join(dir, 'installation.json')) ? JSON.parse(readFileSync(join(dir, 'installation.json'), 'utf8')) : null;
const config = { dataDir: arg('--data-dir', old?.config?.dataDir ?? join(home, 'codex-pet/core')), cwd: repo,
  companionId: old?.config?.companionId ?? randomUUID(), scopeId: old?.config?.scopeId ?? randomUUID(), ownerActorId: old?.config?.ownerActorId ?? randomUUID(),
  displayName: '大肥鱼', character: 'You are the owner’s thoughtful companion. Answer naturally in the owner’s language. Use actual dialogue, matters and evidence; do not invent memories, progress or external actions.',
  provider: model.provider, model: model.model, maxOutputTokens: 4096 };
assert.ok(isAbsolute(config.dataDir), 'data-dir must be absolute');
// Preserve every portable Bundle declaration and
// Loader !!js expressions. Only bind the Core entry to this machine.
const bundleYaml = require('js-yaml');
const { entryListSchema } = await import(require.resolve('@deepseek-ai/cordis-plugin-include'));
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
writeFileSync(join(dir, 'installation.json'), JSON.stringify({ profileDir, archive: prepared, config }, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ prepared, profile, provider: config.provider, model: config.model, dataDir: config.dataDir }));
if (!process.argv.includes('--apply')) process.exit(0);
const backupDir = join(profileDir, 'backups/codex-pet', new Date().toISOString().replace(/[:.]/g, '-'));
mkdirSync(backupDir, { recursive: true, mode: 0o700 });
for (const file of ['package.json', 'cordis.patch.yml', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) {
  if (existsSync(join(profileDir, file))) { copyFileSync(join(profileDir, file), join(backupDir, file)); chmodSync(join(backupDir, file), 0o600); }
}
const hash = data => createHash('sha256').update(data).digest('hex');
const originalPatch = hash(patch);
const previousProfile = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'));
if (previousProfile.dependencies?.['codex-pet']) {
  assert.ok(process.argv.includes('--replace-codex-pet'), 'Use --replace-codex-pet after fully quitting DSH to replace the previous bundle');
  run(join(app, 'Contents/Resources/runtime/cli/bin/dsh'), ['plugin', '--profile', profile, 'remove', 'codex-pet'], { env: { ...process.env, npm_config_ignore_scripts: 'true', ...(process.argv.includes('--offline') ? { npm_config_offline: 'true' } : {}) } });
}
run(join(app, 'Contents/Resources/runtime/cli/bin/dsh'), ['plugin', '--profile', profile, 'add', prepared, '--ignore-scripts', ...(process.argv.includes('--offline') ? ['--offline'] : [])]);
assert.equal(hash(readFileSync(configPath, 'utf8')), originalPatch, 'Existing user patch changed unexpectedly');
const installed = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'));
assert.ok(installed.dependencies?.['dsh-Chatpet']);
assert.ok(installed.dsh?.profile?.bundles?.includes('dsh-Chatpet'));
console.log(JSON.stringify({ installed: true, profileDir, backupDir, userPatchUnchanged: true }));
