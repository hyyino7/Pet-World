import test from 'node:test';
import { offlineFixture } from './offline-helpers.mjs';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, rmSync, symlinkSync, linkSync } from 'node:fs';
import { join } from 'node:path';
import { runMigration } from '../../scripts/migrate/runner.mjs';
import { expectedManifest, loadInstallation } from '../../scripts/migrate/context.mjs';
import { fileHashes } from '../../scripts/lib/repo-storage.mjs';
import { variants, fixture, mockDsh, read, refusedCli } from './helpers.mjs';

for (const variant of [...variants,'offline-metadata']) test(`${variant}: refusals retain all live bytes before data writes`, {timeout:60000}, async t => {
  mockDsh(t); const f = await (variant === 'offline-metadata' ? offlineFixture(t) : fixture(t,variant)), backup = join(f.out,'backup');
  const run = options => runMigration({installation:f.installation,backup,...options});
  async function refuses(code, options) {
    const before = fileHashes(f.managed);
    await assert.rejects(run());
    refusedCli(f,['run','--installation',f.installation,'--backup',backup],code,options);
    assert.deepEqual(fileHashes(f.managed),before);
    assert.equal(existsSync(backup),false);
  }
  const cases = [
    ['unclassified filesystem input',f.installation,JSON.stringify({...read(f.installation),config:{...f.config,dataDir:'\u0000SYNTHETIC_PATH_817'}})],
    ['not installed',f.installation,JSON.stringify({...read(f.installation),status:'prepared'})],
    ['foreign receipt',f.installation,JSON.stringify({...read(f.installation),config:{...f.config,companionId:'foreign'}})],
    ['bad receipt JSON',f.installation,'{'],
    ['bad identity JSON',join(f.managed,'manifest.json'),'{'],
    ['foreign identity',join(f.managed,'manifest.json'),JSON.stringify({...read(join(f.managed,'manifest.json')),companionId:'foreign'})],
    ['bad storage JSON',join(f.data,'storage-manifest.json'),'{'],
    ['foreign storage identity',join(f.data,'storage-manifest.json'),JSON.stringify({...expectedManifest(loadInstallation(f.installation)),companionId:'foreign'})],
    ['inconsistent module version',join(f.data,'storage-manifest.json'),JSON.stringify({...expectedManifest(loadInstallation(f.installation)),modules:{core:99}})],
    ['bad journal JSON',join(f.data,'migrations.jsonl'),'{bad}\n'],
    ['live migration lock',join(f.data,'migration.lock'),`${process.pid}:synthetic-token`],
    ['invalid migration lock',join(f.data,'migration.lock'),'invalid'],
    ['live Core',join(f.config.dataDir,'core.lock'),`${process.pid}:synthetic-token`],
    ['live Economy',join(f.data,'economy/economy.lock'),`${process.pid}:synthetic-token`],
    ['live Memory',join(f.data,'memory/runtime/service.json'),JSON.stringify({pid:process.pid})],
  ];
  const codes = ['unknown','receipt-invalid', 'binding-changed', 'receipt-invalid', 'binding-changed', 'binding-changed', 'manifest-mismatch', 'manifest-mismatch', 'manifest-mismatch', 'journal-invalid', 'lock-held', 'lock-invalid', 'writer-running', 'writer-running', 'writer-running'];
  for (const [index,[name,file,text]] of cases.entries()) await t.test(name,async () => {
    const saved = existsSync(file) ? readFileSync(file) : undefined;
    writeFileSync(file,text);
    try { await refuses(codes[index]); } finally { if (saved) writeFileSync(file,saved); else rmSync(file); }
  });
  await t.test('DSH still running',async sub => {mockDsh(sub,true);await refuses('dsh-running',{running:true});});
  await t.test('symlink',async () => {
    const link = join(f.data,'linked'); symlinkSync(join(f.managed,'SOUL.md'),link);
    const before = readFileSync(join(f.managed,'SOUL.md'));
    try {await assert.rejects(run());refusedCli(f,['run','--installation',f.installation,'--backup',backup],'symlink-or-hardlink');assert.deepEqual(readFileSync(join(f.managed,'SOUL.md')),before);assert.equal(existsSync(backup),false);}
    finally {rmSync(link);}
  });
  await t.test('hardlink',async () => {
    const original = join(f.data,'hardlink-source'), link = join(f.data,'hardlinked');
    writeFileSync(original,'SYNTHETIC_HARDLINK_817'); linkSync(original,link);
    try {refusedCli(f,['run','--installation',f.installation,'--backup',backup],'symlink-or-hardlink');}
    finally {rmSync(link);rmSync(original);}
  });
  await t.test('missing resume journal',async () => {
    const before = fileHashes(f.managed);await assert.rejects(run({resume:true,backup:undefined}));refusedCli(f,['run','--resume','--installation',f.installation],'resume-journal-missing');assert.deepEqual(fileHashes(f.managed),before);
  });
  await t.test('CLI usage', () => {
    for (const args of [[],['invalid'],['run'],['run','--installation',f.installation],['status','--installation',f.installation,'--resume']])
      refusedCli(f,args,'usage');
    refusedCli(f,[],'usage',{inventory:true});
  });
  await t.test('inventory refusals', () => {
    const saved = readFileSync(f.installation);
    writeFileSync(f.installation,'{');
    try {refusedCli(f,['--installation',f.installation],'receipt-invalid',{inventory:true});}
    finally {writeFileSync(f.installation,saved);}
    const link = join(f.data,'inventory-linked'); symlinkSync(join(f.managed,'SOUL.md'),link);
    try {refusedCli(f,['--installation',f.installation],'symlink-or-hardlink',{inventory:true});}
    finally {rmSync(link);}
  });
  await run();
  const savedManifest = readFileSync(join(backup,'manifest.json'));
  await t.test('backup hash changed',async () => {
    const before = fileHashes(f.managed), file = join(backup,'manifest.json');
    writeFileSync(file,readFileSync(file,'utf8') + '\n');
    await assert.rejects(run({resume:true,backup:undefined}));refusedCli(f,['run','--resume','--installation',f.installation],'backup-invalid');assert.deepEqual(fileHashes(f.managed),before);
    writeFileSync(file,savedManifest);
  });
  await t.test('backup payload changed',async () => {
    const before = fileHashes(f.managed);
    writeFileSync(join(backup,'data/companion/payload/SOUL.md'),'synthetic corrupt backup');
    await assert.rejects(run({resume:true,backup:undefined}));refusedCli(f,['run','--resume','--installation',f.installation],'backup-invalid');assert.deepEqual(fileHashes(f.managed),before);
  });
});
