// Same-machine, offline data snapshots. Native session trees are restored as a
// unit with their registry; portable imports remain owned by DSH's native API.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
import { assertStopped, boundMemoryDirectory, fileHashes, inspectRepoBinding } from './repo-storage.mjs';

const format = 'codex-pet.offline-data-backup';
const inside = (parent, child) => child === parent || child.startsWith(parent + sep);
const sha = value => createHash('sha256').update(value).digest('hex');
const json = file => JSON.parse(readFileSync(file, 'utf8'));
function absolute(path) {
  assert.ok(typeof path === 'string' && isAbsolute(path), 'Data bindings must be absolute paths');
  const result = resolve(path);
  let ancestor = result;
  while (!lstatSync(ancestor, {throwIfNoEntry: false})) ancestor = dirname(ancestor);
  assert.equal(realpathSync(ancestor), ancestor, 'Resolve symlinked data bindings before backup/restore');
  return result;
}

// DSH JSONL path convention (the pinned DSH source's format.ts). No native
// log decoding or event rewriting is performed by this offline copier.
function segment(value) {
  assert.ok(typeof value === 'string' && value.length, 'Empty native path component');
  if (value === '.' || value === '..') return '~002E'.repeat(value.length);
  return value.split('').map(ch => /^[A-Za-z0-9._-]$/.test(ch) ? ch : '~' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join('');
}
function projectKey(path) {
  const readable = path.replace(/[\\/:]+/g, '-').split('').map(ch => /^[A-Za-z0-9._-]$/.test(ch) ? ch : '~' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join('');
  return '--' + (readable.replace(/^-+/, '') || 'root').slice(0, 251) + '--';
}
function channelWorkspace(plan, path) {
  if(inside(plan.channelsDirectory,path))return true;
  const portable=join(plan.repo,'.chatpet','data','channels','conversations');
  return inside(portable,path) && /^[a-f0-9]{64}$/.test(relative(portable,path));
}
function scopedWorkspaces(plan, registry = json(plan.registryFile)) {
  assert.ok(registry.unit && registry.global && registry.tables?.workspaces, 'Unsupported native workspace storage');
  const selected = Object.entries(registry.tables.workspaces).filter(([id, value]) =>
    id === plan.workspaceId || channelWorkspace(plan,value.path));
  assert.ok(selected.some(([id, value]) => id === plan.workspaceId && value.path === plan.repo), 'Native bound workspace is absent or changed');
  for (const [, value] of selected) assert.ok(Array.isArray(value.sessionIds) && value.sessionIds.every(id => typeof id === 'string'), 'Invalid native session membership');
  const ids = new Set(selected.flatMap(([, value]) => value.sessionIds));
  return { unit: registry.unit, entries: Object.fromEntries(selected),
    archived: (registry.global.archivedSessionIds ?? []).filter(id => ids.has(id)),
    pinned: (registry.global.pinnedSessionIds ?? []).filter(id => ids.has(id)) };
}
function mergeWorkspaces(plan, saved, registry) {
  assert.deepEqual(registry.unit, saved.unit, 'Native workspace storage version changed');
  const current = scopedWorkspaces(plan, registry);
  const savedIds = new Set(Object.values(saved.entries).flatMap(entry => entry.sessionIds ?? []));
  for (const values of [saved.archived,saved.pinned]) assert.ok(Array.isArray(values) && values.every(id => savedIds.has(id)), 'Saved archive/pin state is outside selected sessions');
  for (const [id, entry] of Object.entries(saved.entries)) {
    assert.ok(/^[A-Za-z0-9_-]+$/.test(id) && !['__proto__','constructor','prototype'].includes(id), 'Invalid native workspace ID');
    assert.equal(entry.path,absolute(entry.path),'Saved native workspace path is not canonical');
    assert.ok((id === plan.workspaceId && entry.path === plan.repo) || (id !== plan.workspaceId && channelWorkspace(plan,entry.path)), 'Saved workspace is outside companion scope');
    assert.ok(!registry.tables.workspaces[id] || current.entries[id], 'Saved workspace ID now belongs to an unrelated workspace');
    assert.ok(Array.isArray(entry.sessionIds) && entry.sessionIds.every(id => typeof id === 'string'), 'Invalid saved session membership');
    const others = Object.entries(registry.tables.workspaces).filter(([key]) => !current.entries[key]);
    assert.ok(others.every(([,other]) => projectKey(other.path) !== projectKey(entry.path)), 'Saved native path collides with an unrelated workspace');
    const otherIds = others.flatMap(([,value]) => value.sessionIds);
    assert.ok(entry.sessionIds.every(id => !otherIds.includes(id)), 'Saved session ID belongs to an unrelated workspace');
  }
  const affected = new Set([
    ...Object.values(current.entries).flatMap(value => value.sessionIds),
    ...Object.values(saved.entries).flatMap(value => value.sessionIds),
  ]);
  const removed = new Set(Object.keys(current.entries));
  for (const id of removed) delete registry.tables.workspaces[id];
  Object.assign(registry.tables.workspaces, saved.entries);
  registry.global.workspaceIds = [...new Set([...(registry.global.workspaceIds ?? []).filter(id => !removed.has(id)), ...Object.keys(saved.entries)])];
  for (const [key, values] of [['archivedSessionIds', saved.archived], ['pinnedSessionIds', saved.pinned]])
    registry.global[key] = [...(registry.global[key] ?? []).filter(id => !affected.has(id)), ...values];
  // The app's currently selected/default unrelated workspace is not rolled back.
  if (removed.has(registry.global.defaultWorkspaceId) && !saved.entries[registry.global.defaultWorkspaceId]) registry.global.defaultWorkspaceId = plan.workspaceId;
  return registry;
}

/** Trusted installation bindings plus the current native registry select the
 * companion's own storage. Other workspaces/profile state is never replaced. */
export function backupPlan({ repo, workspaceId, profileDir, dshHome, config, storageId, directories = {} }) {
  const managed = join(absolute(repo), '.chatpet');
  profileDir = absolute(profileDir); dshHome = absolute(dshHome);
  assert.equal(dirname(profileDir), join(dshHome, 'profiles'), 'Profile does not belong to this DSH home');
  const manifest = json(join(managed, 'manifest.json'));
  assert.equal(manifest.companionId, config.companionId, 'Repo and configured companion identities differ');
  assert.ok(config.scopeId && config.ownerActorId && workspaceId, 'Incomplete companion binding');
  const binding = backupBinding(config, dirname(managed), workspaceId);
  if (storageId !== undefined) assert.equal(storageId, binding.storageId, 'Core storage binding changed');
  storageId = binding.storageId;
  // A stale external receipt path is only input to the existing runtime Bank
  // selector; it is never promoted to this companion's data root.
  const configuredMemoryDirectory = config.memory?.dataDir;
  if (config.memory) assert.ok(typeof configuredMemoryDirectory === 'string' && isAbsolute(configuredMemoryDirectory), 'Memory binding must be an absolute path');
  const memoryDirectory = boundMemoryDirectory(config, binding) ?? undefined;
  const channelsDirectory = absolute(directories.channels ?? join(profileDir, 'chatpet-channels', 'sha256:' + sha(JSON.stringify(storageId))));
  const voiceDirectory = absolute(directories.voice ?? join(profileDir, 'chatpet-voice', 'sha256:' + sha(JSON.stringify(storageId))));
  const plan = { repo: dirname(managed), workspaceId, storageId, profileDir, dshHome, channelsDirectory,
    registryFile: absolute(directories.registry ?? join(dshHome, 'storages', 'workspace.json')),
    sessionsDirectory: absolute(directories.sessions ?? join(dshHome, 'sessions')),
    cacheDirectory: absolute(directories.projectionCache ?? join(dshHome, 'storages', 'session_projcache', 'sessions')),
    attachmentsDirectory: absolute(directories.attachments ?? join(dshHome, 'attachments')),
    companionId: config.companionId, scopeId: config.scopeId, ownerActorId: config.ownerActorId,
    coreDirectory: absolute(config.dataDir), configuredMemoryDirectory, memoryDirectory,
    installedPackage: join(profileDir, 'node_modules', 'her-world') };
  const workspaces = scopedWorkspaces(plan), roots = [{ id: 'companion', path: managed, mode: 'replace' }, {id:'workspace-instructions',path:join(dirname(managed),'AGENTS.md'),mode:'replace'}];
  for (const [id, path] of [['core', plan.coreDirectory], ['memory', memoryDirectory]]) {
    if (path && !inside(managed, absolute(path))) roots.push({ id, path: absolute(path), mode: 'replace' });
  }
  roots.push({ id: 'channels', path: channelsDirectory, mode: 'replace' }, { id: 'voice', path: voiceDirectory, mode: 'replace' });
  const all = json(plan.registryFile).tables.workspaces;
  for (const [id, workspace] of Object.entries(workspaces.entries)) {
    const native = join(plan.sessionsDirectory, projectKey(workspace.path));
    assert.ok(Object.entries(all).every(([otherId, other]) => workspaces.entries[otherId] || projectKey(other.path) !== projectKey(workspace.path)), 'Native project path collision with an unrelated workspace');
    roots.push({ id: 'sessions-' + segment(id), path: native, mode: 'replace' });
    for (const sessionId of workspace.sessionIds) {
      assert.ok(/^[A-Za-z0-9._-]+$/.test(sessionId) && sessionId !== '.' && sessionId !== '..', 'Unsupported session cache ID; use native portable import');
      roots.push({id:'cache-' + sessionId,path:join(plan.cacheDirectory,sessionId + '.json'),mode:'replace'});
    }
  }
  // Content-addressed attachment objects are immutable and may be shared. Never
  // delete or replace them while recovering one companion's references.
  roots.push({ id: 'attachments', path: plan.attachmentsDirectory, mode: 'merge' });
  for (const [id, path] of [['profile-patch', join(profileDir, 'cordis.patch.yml')], ['profile-config', join(profileDir, 'cordis.yml')]])
    roots.push({ id, path, mode: 'reference' });
  for (const [index, root] of roots.entries()) assert.ok(!roots.slice(0, index).some(other => inside(other.path, root.path) || inside(root.path, other.path)), 'Overlapping backup roots');
  return { ...plan, roots };
}

function backupBinding(config, repo, workspaceId) {
  const binding = inspectRepoBinding(config);
  assert.equal(binding.state, 'ready', 'Initialize the companion Repo before backup: ' + binding.reason);
  assert.equal(binding.root, repo, 'Core Repo binding changed');
  assert.equal(binding.target.id, workspaceId, 'Core workspace binding changed');
  assert.ok(typeof binding.storageId === 'string' && binding.storageId, 'Invalid Core storage binding');
  const owner = binding.configuredMemoryOwner;
  assert.ok(owner === null || (owner && typeof owner.id === 'string' && owner.id), 'Invalid Memory directory ownership metadata');
  return binding;
}

export function assertDshStopped(plan) {
  const result = spawnSync('pgrep', ['-x', 'DeepSeek Harness'], { encoding: 'utf8' });
  assert.ok(!result.error && (result.status === 0 || result.status === 1), 'Cannot verify that DSH is stopped');
  assert.ok(!result.stdout.trim().split(/\s+/).filter(Boolean).map(Number).some(pid => pid !== process.pid), 'Quit DSH before backup or restore');
  const locks = [];
  function visit(path) {
    const stat = lstatSync(path, {throwIfNoEntry:false}); if (!stat) return;
    assert.ok(!stat.isSymbolicLink(), 'Unexpected native log symlink');
    if (stat.isDirectory()) for (const name of readdirSync(path)) visit(join(path,name));
    else if (path.endsWith(sep + 'session.lock')) locks.push(path);
  }
  for (const root of plan?.roots ?? []) if (root.id.startsWith('sessions-')) visit(root.path);
  for (let index=0; index<locks.length; index+=64) {
    const owners=spawnSync('lsof',['-t','--',...locks.slice(index,index+64)],{encoding:'utf8'});
    assert.ok(!owners.error && (owners.status===0 || owners.status===1) && !owners.stderr.trim(), 'Cannot verify native session writers are stopped');
    assert.ok(!owners.stdout.trim(), 'A native session still has a live writer; quit all DSH processes');
  }
}
function offline(plan, probe) {
  probe(plan);
  assertStopped(plan.coreDirectory, 'core');
  assertStopped(join(plan.repo,'.chatpet','data','economy'), 'economy');
  const config = {dataDir:plan.coreDirectory,companionId:plan.companionId,scopeId:plan.scopeId,ownerActorId:plan.ownerActorId,
    ...(plan.configuredMemoryDirectory === undefined ? {} : {memory:{dataDir:plan.configuredMemoryDirectory}})};
  const binding = backupBinding(config, plan.repo, plan.workspaceId);
  assert.equal(binding.storageId, plan.storageId, 'Core storage binding changed after backup planning');
  assert.equal(boundMemoryDirectory(config, binding) ?? undefined, plan.memoryDirectory, 'Memory binding changed after backup planning');
  if (plan.memoryDirectory) assertStopped(plan.memoryDirectory, 'memory');
  assertRetainedMemoryStopped(plan);
}

// Disabled/retained Banks are still replaced with their containing data tree.
// Recognize only the Memory namespace, Bank layout or upstream owner signature;
// an arbitrary package's runtime/service.json remains ordinary backed-up data.
function assertRetainedMemoryStopped(plan) {
  const managed = join(plan.repo,'.chatpet');
  const known = new Set([join(managed,'data','memory'), plan.memoryDirectory].filter(Boolean));
  for (const name of json(join(managed,'manifest.json')).files) {
    if (name.endsWith('/data/memory.db')) known.add(dirname(dirname(join(managed,name))));
  }
  function visit(path) {
    const stat = lstatSync(path,{throwIfNoEntry:false});
    if (!stat) return;
    assert.ok(!stat.isSymbolicLink(), 'Symlink is not supported during backup: ' + path);
    if (!stat.isDirectory()) return;
    if (path.endsWith(sep+'runtime')) {
      const owner = join(path,'service.json'), ownerStat = lstatSync(owner,{throwIfNoEntry:false});
      if (ownerStat) {
        const directory = dirname(path);
        let memory = known.has(directory) || existsSync(join(directory,'data','memory.db'));
        if (!memory && ownerStat.isFile() && !ownerStat.isSymbolicLink()) {
          try {memory = json(owner)?.token_env === 'DSH_MEMORY_TOKEN';}
          catch (error) {if (!(error instanceof SyntaxError)) throw error;}
        }
        if (memory) {
          assert.ok(ownerStat.isFile() && !ownerStat.isSymbolicLink(), 'Invalid Memory owner file: ' + owner);
          assertStopped(directory,'memory');
        }
      }
    }
    for (const name of readdirSync(path)) visit(join(path,name));
  }
  for (const root of plan.roots) if (root.mode === 'replace') visit(root.path);
}
function packageFingerprint(directory) {
  if (!existsSync(directory)) return null;
  const files = {};
  // Dependency symlinks are installed by DSH, not restored as data. Package code
  // and its machine-bound bundle must match before old data is put back.
  for (const name of readdirSync(directory).sort().filter(name => name !== 'node_modules')) {
    const path = join(directory, name);
    for (const [file, hash] of Object.entries(fileHashes(path))) files[join(name, file)] = hash;
  }
  return sha(JSON.stringify(files));
}
function snapshot(path) {
  absolute(path);
  const stat = lstatSync(path, {throwIfNoEntry:false});
  if (!stat) return { present: false, hashes: {} };
  assert.ok(!stat.isSymbolicLink() && (stat.isDirectory() || stat.isFile()), 'Backup root must be a regular file or directory');
  return { present: true, kind: stat.isDirectory() ? 'directory' : 'file', hashes: fileHashes(path) };
}
function destination(plan, directory) {
  const result = absolute(directory);
  assert.ok(plan.roots.every(root => !inside(root.path, result) && !inside(result, root.path)), 'Backup destination overlaps live data');
  assert.ok(!existsSync(result), 'Backup destination already exists; choose a new directory');
  return result;
}

export function createOfflineBackup(plan, directory, { probe = assertDshStopped } = {}) {
  const output = destination(plan, directory);
  offline(plan, probe);
  const initial = plan.roots.map(root => ({ ...root, ...snapshot(root.path) }));
  const workspace = scopedWorkspaces(plan), registryBefore = sha(readFileSync(plan.registryFile));
  const codeFingerprint = packageFingerprint(plan.installedPackage);
  assert.ok(codeFingerprint, 'Install the companion package before creating a restorable backup');
  const stage = join(dirname(output), '.offline-backup-' + randomUUID());
  mkdirSync(stage, { recursive: true, mode: 0o700 });
  try {
    for (const root of initial) {
      if (!root.present) continue;
      const parent = join(stage, 'data', root.id); mkdirSync(parent, { recursive: true, mode: 0o700 });
      cpSync(root.path, join(parent, 'payload'), { recursive: true, dereference: false, errorOnExist: true, force: false });
      assert.deepEqual(snapshot(join(parent, 'payload')), { present: root.present, kind: root.kind, hashes: root.hashes }, 'Backup copy differs from source');
    }
    offline(plan, probe);
    for (const root of initial) assert.deepEqual(snapshot(root.path), { present: root.present, ...(root.kind ? { kind: root.kind } : {}), hashes: root.hashes }, 'Source changed during backup');
    assert.equal(packageFingerprint(plan.installedPackage), codeFingerprint, 'Installed package changed during backup');
    assert.equal(sha(readFileSync(plan.registryFile)), registryBefore, 'Workspace registry changed during backup');
    const manifest = { format, schema: 1, createdAt: new Date().toISOString(),
      companionId: plan.companionId, scopeId: plan.scopeId, ownerActorId: plan.ownerActorId,
      repo: plan.repo, workspaceId: plan.workspaceId, profileDir: plan.profileDir, dshHome: plan.dshHome, codeFingerprint, workspace,
      nativeScope: 'Only the bound workspace and this companion\'s verified channel workspaces; unrelated registry entries and native logs remain unchanged. Shared attachment objects are only added when missing.',
      retainedOnRestore: ['Current Qzone publication/draft/quota journals', 'Current WeChat outbox database and sidecars',
        'Current group read/wake journals', ...protectedCoreKinds.map(kind=>'Current Core records:'+kind), 'Current Life spend only'],
      exclusions: ['DSH credentials and account/model setup', 'Executable packages and dependency installation'], roots: initial };
    writeFileSync(join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
    assert.ok(!existsSync(output), 'Backup destination appeared during copy');
    renameSync(stage, output);
    return { directory: output, manifest };
  } finally { if (existsSync(stage)) rmSync(stage, { recursive: true }); }
}

export function verifyOfflineBackup(directory, plan) {
  directory = absolute(directory);
  const manifest = json(join(directory, 'manifest.json'));
  assert.equal(manifest.format, format); assert.equal(manifest.schema, 1);
  assert.equal(manifest.companionId, plan.companionId, 'Backup belongs to another companion');
  assert.equal(manifest.scopeId, plan.scopeId, 'Backup belongs to another scope');
  assert.equal(manifest.ownerActorId, plan.ownerActorId, 'Backup belongs to another owner');
  assert.equal(manifest.repo, plan.repo, 'Offline restore is same-path; use resume-repo for device migration');
  assert.equal(manifest.workspaceId, plan.workspaceId); assert.equal(manifest.profileDir, plan.profileDir); assert.equal(manifest.dshHome, plan.dshHome);
  assert.equal(manifest.codeFingerprint, packageFingerprint(plan.installedPackage), 'Reinstall the matching plugin package before restoring this data');
  assert.ok(Array.isArray(manifest.roots) && new Set(manifest.roots.map(root => root.id)).size === manifest.roots.length, 'Duplicate or invalid backup roots');
  mergeWorkspaces(plan, manifest.workspace, json(plan.registryFile));
  const known = new Map(plan.roots.map(root => [root.id, root]));
  for (const root of manifest.roots) {
    if (!known.has(root.id) && root.id.startsWith('cache-')) {
      const sessionId = root.id.slice(6);
      assert.ok(/^[A-Za-z0-9._-]+$/.test(sessionId) && Object.values(manifest.workspace.entries).some(entry => entry.sessionIds.includes(sessionId)), 'Saved cache is outside companion scope');
      known.set(root.id, {id:root.id,path:join(plan.cacheDirectory,sessionId + '.json'),mode:'replace'});
    }
    if (!known.has(root.id) && root.id.startsWith('sessions-')) {
      const id = Object.keys(manifest.workspace.entries).find(id => 'sessions-' + segment(id) === root.id);
      assert.ok(id && (id === plan.workspaceId || channelWorkspace(plan,manifest.workspace.entries[id].path)), 'Backup native workspace is outside this companion');
      known.set(root.id, {id: root.id, path: join(plan.sessionsDirectory, projectKey(manifest.workspace.entries[id].path)), mode: 'replace'});
    }
    assert.deepEqual({id:root.id,path:root.path,mode:root.mode}, known.get(root.id), 'Backup paths differ from current trusted bindings');
  }
  for (const root of plan.roots.filter(root => !root.id.startsWith('sessions-') && !root.id.startsWith('cache-'))) assert.ok(manifest.roots.some(saved => saved.id === root.id), 'Backup lacks a required data root');
  for (const [id, workspace] of Object.entries(manifest.workspace.entries)) {
    assert.ok(manifest.roots.some(root=>root.id==='sessions-'+segment(id)), 'Backup lacks selected native logs');
    for (const sessionId of workspace.sessionIds) assert.ok(manifest.roots.some(root=>root.id==='cache-'+sessionId), 'Backup lacks selected native cache inventory');
  }
  for (const root of manifest.roots) {
    const payload = join(directory, 'data', root.id, 'payload');
    assert.deepEqual(snapshot(payload), { present: root.present, ...(root.kind ? { kind: root.kind } : {}), hashes: root.hashes }, `Backup data changed: ${root.id}`);
  }
  return manifest;
}

// These are existing outcome/quota records, not rewindable companion memories.
// Sources: channels/group-qzone.ts, messaging.ts, bridge.ts, usage.ts,
// group-social.ts and the original WeChat sending.js outbox.
const protectedCoreKinds = ['channel-received','channel-reach','life-outlet-delivery','channel-usage','channel-usage-event'];
const protectedChannelFile = name => /^qzone-\d{1,24}\/published\.json$/.test(name)
  || /^wechat-[a-f0-9]{24}\/wechat-outbox\.sqlite(?:-(?:wal|shm|journal))?$/.test(name)
  || /^group-material\/[a-f0-9]{64}\/social\.json$/.test(name);
const slash = name => name.split(sep).join('/');
function reconcileRequired(path) {
  throw new Error(`Current external outcome/quota journal is missing: ${path}. Reconcile actual deliveries and spent quota before recovery; backup-only queues will not be re-enabled.`);
}
function preserveChannelJournals(current, staged, saved, prefix='', label='channels/') {
  const currentFiles = fileHashes(current), savedFiles = saved.hashes;
  const names = [...new Set([...Object.keys(currentFiles),...Object.keys(savedFiles)].filter(name => {
    const normalized=slash(name);
    return normalized.startsWith(prefix) && protectedChannelFile(normalized.slice(prefix.length));
  }))];
  // A checkpoint can remove WAL/SHM, but never substitute an older outbox base.
  for (const name of names.filter(name => Object.hasOwn(savedFiles,name))) {
    const base = name.replace(/-(wal|shm|journal)$/,'');
    if (!Object.hasOwn(currentFiles,base)) reconcileRequired(join(current,base));
  }
  for (const name of names) {
    const target = join(staged,name);
    rmSync(target,{force:true});
    if (Object.hasOwn(currentFiles,name)) {
      mkdirSync(dirname(target),{recursive:true,mode:0o700});
      cpSync(join(current,name),target,{errorOnExist:true,force:false});
    }
  }
  return names.filter(name => Object.hasOwn(currentFiles,name)).map(name => label+slash(name));
}
function readCoreJournals(file) {
  if (!existsSync(file)) return [];
  // Read a private scratch copy: opening a WAL database may create shared-memory
  // files even in read-only mode. Neither live data nor the safety archive moves.
  const scratch=mkdtempSync(join(tmpdir(),'fish-current-ledgers-'));
  try {
    const copy=join(scratch,'core.sqlite');
    for (const suffix of ['','-wal','-shm','-journal']) if(existsSync(file+suffix))cpSync(file+suffix,copy+suffix);
    const db=new DatabaseSync(copy,{readOnly:true});
    try {return db.prepare(`SELECT kind,id,value FROM records WHERE kind IN (${protectedCoreKinds.map(()=>'?').join(',')})`).all(...protectedCoreKinds);}
    finally {db.close();}
  } finally {rmSync(scratch,{recursive:true,force:true});}
}
function preserveCoreJournals(current, staged) {
  const rows=readCoreJournals(current), saved=readCoreJournals(staged);
  const keys=new Set(rows.map(row=>JSON.stringify([row.kind,row.id])));
  for(const row of saved)if(!keys.has(JSON.stringify([row.kind,row.id])))reconcileRequired(`${current} records:${row.kind}/${row.id}`);
  if(!rows.length&&!saved.length)return [];
  if(!existsSync(staged))reconcileRequired(staged);
  const db=new DatabaseSync(staged);
  try {
    db.exec('BEGIN IMMEDIATE');
    db.prepare(`DELETE FROM records WHERE kind IN (${protectedCoreKinds.map(()=>'?').join(',')})`).run(...protectedCoreKinds);
    const put=db.prepare('INSERT INTO records(kind,id,value) VALUES (?,?,?)');
    for(const row of rows)put.run(row.kind,row.id,row.value);
    db.exec('COMMIT');db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch(error) {try{db.exec('ROLLBACK');}catch{}throw error;}
  finally {db.close();}
  return [...new Set(rows.map(row=>'core records:'+row.kind))];
}
function preserveSpend(current, staged) {
  const latest=existsSync(current)?json(current):undefined, saved=existsSync(staged)?json(staged):undefined;
  if(saved?.spend!==undefined&&latest?.spend===undefined)reconcileRequired(current+' spend');
  if(latest?.spend===undefined)return [];
  const spend=latest.spend;
  assert.ok(spend&&/^\d{4}-\d{2}-\d{2}$/.test(spend.day)&&Number.isFinite(spend.yuan)&&spend.yuan>=0,'Invalid current Life spend; reconcile actual charges before recovery');
  mkdirSync(dirname(staged),{recursive:true,mode:0o700});
  writeFileSync(staged,JSON.stringify({...saved,version:saved?.version??1,spend},null,2)+'\n',{mode:0o600});
  return ['life/life.json:spend'];
}
function backupFile(manifest, directory, livePath) {
  const root=manifest.roots.find(root=>root.mode==='replace'&&inside(root.path,livePath));
  assert.ok(root,'Current Core/Life data is outside the backup inventory');
  return join(directory,'data',root.id,'payload',relative(root.path,livePath));
}
function stagedFile(staged, livePath) {
  const entry=staged.find(({root})=>inside(root.path,livePath));
  assert.ok(entry,'Current Core/Life data is outside the staged recovery');
  return join(entry.path,relative(entry.root.path,livePath));
}

/** Validate and stage every root before touching any current file. A complete
 * pre-restore snapshot and renamed originals survive even if a replacement fails. */
export function restoreOfflineBackup(plan, directory, beforeDirectory, { probe = assertDshStopped } = {}) {
  offline(plan, probe);
  const manifest = verifyOfflineBackup(directory, plan);
  const safety = createOfflineBackup(plan, beforeDirectory, { probe });
  const registryOriginal = readFileSync(plan.registryFile), registryNext = mergeWorkspaces(plan, manifest.workspace, JSON.parse(registryOriginal));
  const staged = [], originals = [], applied = [], added = [];
  let preservedJournals=[];
  let registryChanged = false;
  try {
    for (const root of manifest.roots.filter(root => root.mode === 'replace')) {
      const path = join(dirname(root.path), '.restore-' + randomUUID());
      staged.push({ root, path });
      if (root.present) {
        mkdirSync(dirname(path), {recursive: true, mode: 0o700});
        cpSync(join(directory, 'data', root.id, 'payload'), path, { recursive: true, dereference: false, errorOnExist: true, force: false });
        assert.deepEqual(snapshot(path), { present: true, kind: root.kind, hashes: root.hashes });
      }
    }
    const channels=staged.find(({root})=>root.id==='channels');
    if(channels)preservedJournals.push(...preserveChannelJournals(
      backupFile(safety.manifest,safety.directory,plan.channelsDirectory),channels.path,channels.root));
    // Portable channel journals now live inside the companion root, so the
    // old device-only root scan cannot protect them from being rewound.
    const companion=staged.find(({root})=>root.id==='companion');
    if(companion)preservedJournals.push(...preserveChannelJournals(
      backupFile(safety.manifest,safety.directory,join(plan.repo,'.chatpet')),companion.path,companion.root,
      'data/channels/','companion/'));
    const core=join(plan.coreDirectory,'core.sqlite'), life=join(plan.repo,'.chatpet','data','life','life.json');
    preservedJournals.push(...preserveCoreJournals(backupFile(safety.manifest,safety.directory,core),stagedFile(staged,core)));
    preservedJournals.push(...preserveSpend(backupFile(safety.manifest,safety.directory,life),stagedFile(staged,life)));
    for(const entry of staged)entry.expected=snapshot(entry.path);
    // Preflight every shared-object collision before making any replacement.
    const shared = manifest.roots.find(root => root.mode === 'merge');
    for (const [file, hash] of Object.entries(shared?.hashes ?? {})) {
      const target = join(shared.path, file);
      if (existsSync(target)) assert.equal(sha(readFileSync(target)), hash, 'Shared attachment conflicts with backup; existing bytes retained');
    }
    offline(plan, probe);
    assert.equal(sha(readFileSync(plan.registryFile)), sha(registryOriginal), 'Native registry changed after safety backup');
    assert.equal(packageFingerprint(plan.installedPackage),manifest.codeFingerprint,'Installed package changed during restore');
    for (const current of safety.manifest.roots) assert.deepEqual(snapshot(current.path), { present: current.present, ...(current.kind ? { kind: current.kind } : {}), hashes: current.hashes }, 'Live data changed after safety backup');
    for (const { root, path, expected } of staged) {
      const old = join(dirname(root.path), '.before-restore-' + randomUUID());
      if (existsSync(root.path)) { renameSync(root.path, old); originals.push({ path: root.path, old }); }
      if (expected.present) renameSync(path, root.path);
      applied.push(root.path);
    }
    for (const file of Object.keys(shared?.hashes ?? {})) {
      const target = join(shared.path, file);
      if (!existsSync(target)) {
        mkdirSync(dirname(target), {recursive:true,mode:0o700});
        cpSync(join(directory,'data',shared.id,'payload',file), target, {errorOnExist:true,force:false}); added.push(target);
      }
    }
    const registryStage = plan.registryFile + '.restore-' + randomUUID();
    writeFileSync(registryStage, JSON.stringify(registryNext, null, 2) + '\n', {mode:0o600});
    renameSync(registryStage, plan.registryFile); registryChanged = true;
    for (const entry of staged) assert.deepEqual(snapshot(entry.root.path),entry.expected);
    const retainedOriginals = [];
    for (const { old } of originals) { try {rmSync(old, { recursive: true });} catch {retainedOriginals.push(old);} }
    return { restored: true, safetyBackup: safety.directory, restoredAt: new Date().toISOString(), roots: staged.map(({root}) => root.id),
      workspaces: Object.keys(manifest.workspace.entries), retainedOriginals, preservedJournals,
      profileSettings: 'Reference copies retained; current global settings were not replaced.' };
  } catch (error) {
    if (registryChanged) writeFileSync(plan.registryFile, registryOriginal, {mode:0o600});
    for (const file of added) rmSync(file);
    for (const path of applied.reverse()) if (existsSync(path)) rmSync(path, { recursive: true });
    for (const { path, old } of originals.reverse()) if (existsSync(old)) renameSync(old, path);
    throw error;
  } finally { for (const { path } of staged) if (existsSync(path)) rmSync(path, { recursive: true }); }
}
