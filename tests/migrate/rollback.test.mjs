import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { inspectRepoBinding } from '../../scripts/lib/repo-storage.mjs';
import { verifyOfflineBackup } from '../../scripts/lib/offline-backup.mjs';
import { fixture, cli, planFor, coreAtLegacyVersion, read } from './helpers.mjs';
import { selectBootstrapCli } from './migration-child.mjs';

function run(args) {
  const [script,...options] = args;
  return spawnSync(process.execPath,['--import',resolve('tests/migrate/dsh-probe.mjs'),resolve(script),...options],{encoding:'utf8'});
}
const checked = result => { assert.equal(result.status,0,result.stderr); return JSON.parse(result.stdout || 'null'); };
const write = (file,text) => { mkdirSync(dirname(file),{recursive:true}); writeFileSync(file,text); };

test('same-package restart and old-package rollback keep binding, native files and irreversible state', {timeout:30000}, async t => {
  selectBootstrapCli(t);
  const f = await fixture(t,'current'), plan = planFor(f);
  const backup = (...args) => run(['scripts/companion-backup.mjs',...args,'--installation',f.installation]);
  const old = join(f.out,'rollback'), upgrade = join(f.out,'same-package'), historical = join(f.out,'bootstrap');
  const restore = (source, name) => backup('restore','--backup',source,'--before',join(f.out,name));
  const log = join(f.data,'migrations.jsonl'), manifest = join(f.data,'storage-manifest.json');
  const nativeLog = join(plan.roots.find(root => root.id.startsWith('sessions-')).path,'fixture-session/session.v4.jsonl.zstd');
  const cache = join(plan.cacheDirectory,'fixture-session.json');
  const attachment = join(plan.attachmentsDirectory,'v1/objects/00/fixture');
  const addedAttachment = join(plan.attachmentsDirectory,'v1/objects/00/later');
  const devicePatch = join(f.profile,'cordis.patch.yml'), instructions = join(f.repo,'AGENTS.md');
  const home = join(f.data,'life/life.json'), dbFile = join(f.config.dataDir,'core.sqlite');
  const pkg = join(plan.installedPackage,'package.json');
  const packageVersion = version => writeFileSync(pkg,JSON.stringify({name:'her-world',version,synthetic:true}));
  packageVersion('0.2.0');
  const codeBefore = readFileSync(pkg), oldBindings = readFileSync(f.installation);
  const original = [nativeLog,cache,attachment,instructions].map(path => readFileSync(path));
  const registry = read(plan.registryFile);
  const bindingQuery = "SELECT value FROM records WHERE kind='workspace-binding' AND id='current'";
  const readBinding = db => JSON.parse(db.prepare(bindingQuery).get().value);

  checked(cli(f,['run','--installation',f.installation,'--backup',historical]));
  checked(backup('create','--output',old));
  const oldFingerprint = verifyOfflineBackup(old,planFor(f)).codeFingerprint;
  packageVersion('0.3.0');
  assert.notEqual(restore(old,'wrong-package').status,0);
  assert.equal(existsSync(join(f.out,'wrong-package')),false);
  checked(run(['tests/migrate/migration-child.mjs',f.installation,upgrade,'']));
  const newFingerprint = verifyOfflineBackup(upgrade,planFor(f)).codeFingerprint;
  assert.notEqual(newFingerprint,oldFingerprint);
  assert.equal(read(manifest).modules.core,2);
  const restored = checked(restore(upgrade,'before-same-package'));
  assert.equal(restored.restored,true);
  assert.equal(read(manifest).modules.core,1);
  assert.ok(existsSync(join(f.data,'migration.lock')),'Same-package backup retains the dead migrator lease');
  checked(run(['tests/migrate/migration-child.mjs',f.installation,join(f.out,'repeat-second'),'']));
  assert.match(readFileSync(log,'utf8'),/"event":"lock-takeover"/);
  assert.equal(existsSync(join(f.data,'migration.lock')),false);

  write(nativeLog,'SYNTHETIC_NEW_NATIVE_LOG'); write(cache,'{}'); rmSync(attachment);
  write(addedAttachment,'SYNTHETIC_NEW_ATTACHMENT');
  write(devicePatch,'# Current device settings'); write(instructions,'# After upgrade');
  const modifiedRegistry = read(plan.registryFile);
  modifiedRegistry.global.pinnedSessionIds.push('fixture-session');
  modifiedRegistry.tables.workspaces[f.target.id].title = 'New fixture title';
  write(plan.registryFile,JSON.stringify(modifiedRegistry));
  const after = [['life-outlet-delivery','delivery'],['channel-usage-event','quota']];
  const db = new DatabaseSync(dbFile);
  let originalBinding;
  try {
    originalBinding = readBinding(db);
    db.prepare("UPDATE records SET value=? WHERE kind='workspace-binding' AND id='current'")
      .run(JSON.stringify({...originalBinding,revision:originalBinding.revision + 1}));
    for (const row of after) db.prepare('INSERT INTO records(kind,id,value) VALUES(?,?,?)').run(...row,'true');
  }
  finally { db.close(); }
  write(home,JSON.stringify({...read(home),homeSessionId:'new-home',spend:{day:'2026-01-02',yuan:4}}));
  writeFileSync(pkg,codeBefore);
  assert.throws(() => verifyOfflineBackup(upgrade,planFor(f)),/package/i);
  const rolledBack = checked(restore(old,'before-rollback'));
  assert.equal(rolledBack.restored,true);
  assert.deepEqual(readFileSync(pkg),codeBefore);
  assert.deepEqual(readFileSync(f.installation),oldBindings);
  assert.equal(inspectRepoBinding(f.config).storageId,f.storageId);
  assert.equal(inspectRepoBinding(f.config).target.id,f.target.id);
  assert.deepEqual(read(plan.registryFile),registry);
  assert.deepEqual([nativeLog,cache,attachment,instructions].map(path => readFileSync(path)),original);
  const sessionRoot = plan.roots.find(root => root.id.startsWith('sessions-'));
  assert.equal(readFileSync(join(f.out,'before-rollback','data',sessionRoot.id,'payload','fixture-session/session.v4.jsonl.zstd'),'utf8'),
    'SYNTHETIC_NEW_NATIVE_LOG');
  assert.equal(readFileSync(addedAttachment,'utf8'),'SYNTHETIC_NEW_ATTACHMENT');
  assert.equal(readFileSync(devicePatch,'utf8'),'# Current device settings');
  assert.equal(readFileSync(join(old,'data/profile-patch/payload'),'utf8'),'# Synthetic configuration\n');
  assert.equal(read(manifest).modules.core,1);
  assert.equal(existsSync(join(f.data,'synthetic-step.json')),false);
  assert.equal(read(home).homeSessionId,'fixture-session');
  assert.equal(read(home).spend.yuan,4);
  assert.ok(after.every(([kind]) => rolledBack.preservedJournals.includes('core records:' + kind)));
  const reopened = new DatabaseSync(dbFile);
  try {
    assert.deepEqual(readBinding(reopened),originalBinding);
    for (const row of after) assert.equal(reopened.prepare('SELECT value FROM records WHERE kind=? AND id=?').get(...row).value,'true');
  } finally { reopened.close(); }
  await coreAtLegacyVersion(f);
});
