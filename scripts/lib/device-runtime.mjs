// Device-owned Python preparation. No package installation, model or Memory
// service is started; callers apply this plan only after stopping DSH/writers.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync,
  realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const REQUIRED = ['fastapi', 'uvicorn', 'pydantic', 'pydantic_settings', 'httpx'];
const RECEIPT = 'runtime.json';
const hash = value => createHash('sha256').update(value).digest('hex');
const within = (root, path) => {
  const local = relative(root, path);
  return local === '' || !isAbsolute(local) && local !== '..' && !local.startsWith('..' + sep);
};
const metadataScript = `import importlib.util,json,platform,sys
required=${JSON.stringify(REQUIRED)}
modules={}
for name in required:
 spec=importlib.util.find_spec(name)
 modules[name]=None if spec is None else spec.origin
print(json.dumps(dict(prefix=sys.prefix,basePrefix=sys.base_prefix,executable=sys.executable,baseExecutable=getattr(sys,'_base_executable',None),version=list(sys.version_info[:3]),platform=sys.platform,machine=platform.machine(),modules=modules)))`;

function regular(path) {
  const stat = lstatSync(path, {throwIfNoEntry:false});
  assert.ok(stat?.isFile() && !stat.isSymbolicLink(), `Expected a regular runtime file: ${path}`);
  return stat;
}
function directory(path) {
  const stat = lstatSync(path, {throwIfNoEntry:false});
  assert.ok(stat?.isDirectory() && !stat.isSymbolicLink(), `Expected a local runtime directory: ${path}`);
}
function walk(root, visit) {
  for (const entry of readdirSync(root, {withFileTypes:true})) {
    const path = join(root, entry.name);
    visit(path, entry);
    if (entry.isDirectory() && !entry.isSymbolicLink()) walk(path, visit);
  }
}
function inspect(python) {
  assert.ok(isAbsolute(python), 'Python must be an explicit absolute path');
  const child = spawnSync(python, ['-I', '-B', '-c', metadataScript], {
    cwd:dirname(python), encoding:'utf8', timeout:15000, maxBuffer:256 * 1024,
    env:{...process.env, PYTHONDONTWRITEBYTECODE:'1', PYTHONPATH:'', PYTHONHOME:''},
  });
  assert.equal(child.status, 0, 'Python metadata could not be inspected; no service or dependency installer was run');
  const data = JSON.parse(child.stdout.trim());
  assert.equal(data.platform, process.platform, 'Device Python platform differs');
  const architecture = {aarch64:'arm64', x86_64:'x64'}[data.machine] ?? data.machine;
  assert.equal(architecture, process.arch, 'Device Python architecture differs');
  for (const name of REQUIRED) assert.ok(data.modules[name], `Existing Python lacks ${name}; offline preparation never installs dependencies`);
  assert.notEqual(data.prefix, data.basePrefix, 'Use the existing dependency-equipped virtual environment');
  return data;
}
function auditSite(venvRoot, forbidden = []) {
  walk(venvRoot, (path, entry) => {
    if (!entry.isFile()) return;
    if (path.endsWith('.egg-link')) throw Error('Editable Python packages require an explicit packaged source; no external source link was copied');
    if (basename(path) === 'direct_url.json') {
      const value = JSON.parse(readFileSync(path, 'utf8'));
      assert.ok(!value.dir_info?.editable, 'Editable Python dependencies cannot provide a source-independent runtime');
    }
    if (!path.endsWith('.pth')) return;
    const content = readFileSync(path, 'utf8');
    for (const root of forbidden) assert.ok(!content.includes(root), 'Python path configuration still refers to development sources');
    for (const line of content.split(/\r?\n/).map(value => value.trim())) {
      if (!line || line.startsWith('#') || line.startsWith('import ')) continue;
      const target = resolve(dirname(path), line);
      assert.ok(within(venvRoot, target), 'Python path configuration uses an external dependency directory');
    }
  });
}
function inspectSource(python) {
  const metadata = inspect(python);
  const venvRoot = realpathSync(metadata.prefix), baseRoot = realpathSync(metadata.basePrefix);
  const executable = realpathSync(metadata.baseExecutable ?? python);
  directory(venvRoot); directory(baseRoot);
  assert.ok(within(baseRoot, executable), 'Python base executable lies outside its distribution');
  assert.ok(!within(venvRoot, baseRoot) && !within(baseRoot, venvRoot), 'Python base and dependency environment must be separate');
  const config = join(venvRoot, 'pyvenv.cfg'); regular(config); regular(executable);
  const configuration = readFileSync(config, 'utf8');
  const configuredHome = /^home\s*=\s*(.+)$/m.exec(configuration)?.[1].trim();
  const baseAliases = [...new Set([metadata.basePrefix, dirname(dirname(metadata.baseExecutable ?? executable)),
    ...(configuredHome ? [dirname(configuredHome)] : [])])];
  for (const alias of baseAliases) assert.equal(realpathSync(alias), baseRoot, 'Python home does not match its base distribution');
  const venvAliases = [...new Set([metadata.prefix, dirname(dirname(python)), venvRoot])];
  for (const alias of venvAliases) assert.equal(realpathSync(alias), venvRoot, 'Python entry does not select its recorded environment');
  for (const name of REQUIRED) assert.ok(within(venvRoot, realpathSync(metadata.modules[name])), `${name} is not contained in the dependency environment`);
  auditSite(venvRoot);
  return {python, venvRoot, baseRoot, baseAliases, venvAliases, executable, metadata,
    fingerprint:hash(JSON.stringify(metadata) + configuration + hash(readFileSync(executable)))};
}
function assertTarget(deviceRoot, sourceRepo) {
  assert.ok(isAbsolute(deviceRoot), 'Device runtime must have an explicit absolute location');
  if (sourceRepo) assert.ok(!within(resolve(sourceRepo), deviceRoot), 'Device runtime must not be stored in the source checkout');
  let path = deviceRoot;
  while (path !== dirname(path)) {
    const stat = lstatSync(path, {throwIfNoEntry:false});
    assert.ok(!stat || stat.isDirectory() && !stat.isSymbolicLink(), 'Device runtime path must not traverse a symlink');
    path = dirname(path);
  }
}
function inspectExisting(deviceRoot, sourceRepo) {
  directory(deviceRoot);
  const file = join(deviceRoot, RECEIPT); regular(file);
  const receipt = JSON.parse(readFileSync(file, 'utf8'));
  const python = join(deviceRoot, 'venv', 'bin', 'python');
  assert.equal(receipt.schemaVersion, 1, 'Existing device runtime is not managed by this initializer');
  assert.equal(receipt.state, 'ready', 'Existing device runtime preparation is incomplete');
  assert.equal(receipt.python, python, 'Device runtime location changed; preserve it and prepare another location');
  const metadata = inspect(python);
  assert.equal(realpathSync(metadata.prefix), join(deviceRoot, 'venv'), 'Device venv prefix escaped its runtime');
  assert.equal(realpathSync(metadata.basePrefix), join(deviceRoot, 'python'), 'Device base prefix escaped its runtime');
  const forbidden = [sourceRepo, receipt.source?.venvRoot, receipt.source?.baseRoot,
    ...(receipt.source?.baseAliases ?? []), ...(receipt.source?.venvAliases ?? [])].filter(Boolean);
  auditSite(join(deviceRoot, 'venv'), forbidden);
  auditEntrypoints(deviceRoot, forbidden);
  auditLinks(deviceRoot, [deviceRoot]);
  for (const name of REQUIRED) assert.ok(within(deviceRoot, realpathSync(metadata.modules[name])), `${name} depends on a source outside the device runtime`);
  return {python, receipt};
}
function auditLinks(root, allowed) {
  walk(root, (path, entry) => {
    if (!entry.isSymbolicLink()) return;
    const target = realpathSync(path);
    assert.ok(allowed.some(directory => within(directory, target)) || target.startsWith('/System/Library/') || target.startsWith('/usr/lib/'),
      `Runtime symlink depends on an external directory: ${path}`);
  });
}

/** Read-only planning and interpreter metadata inspection. Does not copy files. */
export function prepareDeviceRuntime({python, deviceRoot, sourceRepo}) {
  deviceRoot = resolve(deviceRoot);
  sourceRepo = sourceRepo ? resolve(sourceRepo) : null;
  assertTarget(deviceRoot, sourceRepo);
  if (existsSync(deviceRoot)) {
    const existing = inspectExisting(deviceRoot, sourceRepo);
    return {schemaVersion:1, state:'existing', deviceRoot, python:existing.python, sourceRepo, source:null};
  }
  assert.ok(typeof python === 'string' && isAbsolute(python), 'Specify the trusted existing Memory Python');
  const source = inspectSource(python);
  assert.ok(!within(source.venvRoot, deviceRoot) && !within(source.baseRoot, deviceRoot), 'Device runtime must be outside its source distributions');
  auditLinks(source.baseRoot, [source.baseRoot, source.venvRoot]);
  auditLinks(source.venvRoot, [source.baseRoot, source.venvRoot]);
  return {schemaVersion:1, state:'copy', deviceRoot, python:join(deviceRoot, 'venv', 'bin', 'python'), sourceRepo, source};
}

function relocateTree(root, mappings) {
  walk(root, (path, entry) => {
    if (!entry.isSymbolicLink()) return;
    const raw = readlinkSync(path);
    const sourceTarget = isAbsolute(raw) ? realpathSync(path) : null;
    if (!sourceTarget) return;
    const mapping = mappings.find(([source]) => within(source, sourceTarget));
    if (!mapping) return;
    const target = join(mapping[1], relative(mapping[0], sourceTarget));
    unlinkSync(path); symlinkSync(relative(dirname(path), target), path);
  });
}
function relocateText(root, mappings) {
  // Python execution uses the venv configuration and binary. Console/activation
  // scripts are also rewritten so an incidental local tool never calls the Repo.
  for (const path of [join(root, 'venv', 'pyvenv.cfg'), ...readdirSync(join(root, 'venv', 'bin')).map(name => join(root, 'venv', 'bin', name)),
    ...readdirSync(join(root, 'python', 'bin')).map(name => join(root, 'python', 'bin', name))]) {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.size > 1024 * 1024) continue;
    const bytes = readFileSync(path);
    if (bytes.includes(0)) continue;
    const original = bytes.toString('utf8');
    let next = original;
    for (const [source, target] of mappings) next = next.split(source).join(target);
    if (next !== original) writeFileSync(path, next, {mode:stat.mode & 0o777});
  }
}
function auditEntrypoints(root, forbidden) {
  for (const path of [join(root, 'venv', 'pyvenv.cfg'),
    ...readdirSync(join(root, 'venv', 'bin')).map(name => join(root, 'venv', 'bin', name))]) {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.size > 1024 * 1024) continue;
    const bytes = readFileSync(path);
    if (bytes.includes(0)) continue;
    const content = bytes.toString('utf8');
    for (const source of forbidden) assert.ok(!content.includes(source), 'Python launcher or activation script still refers to its source environment');
  }
}

/** Explicit offline application. The caller must stop DSH and Memory first.
 * Never replaces an existing unmanaged environment or modifies its source. */
export function applyDeviceRuntime(plan) {
  assert.equal(plan?.schemaVersion, 1, 'Unsupported device runtime plan');
  assertTarget(plan.deviceRoot, plan.sourceRepo);
  if (plan.state === 'existing') {
    const existing = inspectExisting(plan.deviceRoot, plan.sourceRepo);
    return {python:existing.python, deviceRoot:plan.deviceRoot, receipt:existing.receipt};
  }
  assert.equal(plan.state, 'copy', 'Unexpected device runtime operation');
  assert.equal(plan.python, join(plan.deviceRoot, 'venv', 'bin', 'python'), 'Device Python target changed');
  assert.ok(!existsSync(plan.deviceRoot), 'Device runtime appeared after planning; inspect it instead of replacing it');
  const source = inspectSource(plan.source.python);
  assert.equal(source.fingerprint, plan.source.fingerprint, 'Source Python changed after preparation; prepare again');
  mkdirSync(dirname(plan.deviceRoot), {recursive:true, mode:0o700});
  const stage = join(dirname(plan.deviceRoot), `.${basename(plan.deviceRoot)}.stage-${randomUUID()}`);
  mkdirSync(stage, {mode:0o700});
  try {
    const mappings = [...source.venvAliases.map(alias => [alias, join(stage, 'venv')]),
      ...source.baseAliases.map(alias => [alias, join(stage, 'python')])];
    cpSync(source.baseRoot, join(stage, 'python'), {recursive:true, dereference:false, verbatimSymlinks:true});
    cpSync(source.venvRoot, join(stage, 'venv'), {recursive:true, dereference:false, verbatimSymlinks:true});
    relocateTree(stage, mappings); relocateText(stage, mappings);
    const metadata = inspect(join(stage, 'venv', 'bin', 'python'));
    assert.equal(realpathSync(metadata.prefix), join(stage, 'venv'), 'Copied Python did not select the device venv');
    assert.equal(realpathSync(metadata.basePrefix), join(stage, 'python'), 'Copied Python still depends on its source base');
    auditSite(join(stage, 'venv'), [source.venvRoot, source.baseRoot, plan.sourceRepo].filter(Boolean));
    auditLinks(stage, [stage]);
    relocateText(stage, [[stage, plan.deviceRoot]]);
    assert.ok(!existsSync(plan.deviceRoot), 'Device runtime appeared during copying; no existing environment was replaced');
    renameSync(stage, plan.deviceRoot);
    const receipt = {schemaVersion:1, state:'ready', createdAt:new Date().toISOString(), python:plan.python,
      source:{venvRoot:source.venvRoot, baseRoot:source.baseRoot, baseAliases:source.baseAliases,
        venvAliases:source.venvAliases, fingerprint:source.fingerprint},
      version:metadata.version, platform:metadata.platform, machine:metadata.machine};
    writeFileSync(join(plan.deviceRoot, RECEIPT), JSON.stringify(receipt, null, 2) + '\n', {flag:'wx', mode:0o600});
    const existing = inspectExisting(plan.deviceRoot, plan.sourceRepo);
    return {python:existing.python, deviceRoot:plan.deviceRoot, receipt:existing.receipt};
  } finally {rmSync(stage, {recursive:true, force:true});}
}

/** Explicit ensure operation, never used by installer preparation implicitly. */
export function ensureDeviceRuntime(options) {
  return applyDeviceRuntime(prepareDeviceRuntime(options));
}
