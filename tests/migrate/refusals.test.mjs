import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { runMigration } from '../../scripts/migrate/runner.mjs';
import { expectedManifest, loadInstallation } from '../../scripts/migrate/context.mjs';
import { fileHashes } from '../../scripts/lib/repo-storage.mjs';
import { variants, fixture, mockDsh, read } from './helpers.mjs';

for (const variant of variants) test(`${variant}: refusals retain all live bytes before data writes`, {timeout:60000}, async t => {
  mockDsh(t); const f = await fixture(t,variant), backup = join(f.out,'backup');
  const run = options => runMigration({installation:f.installation,backup,...options});
  async function refuses() {
    const before = fileHashes(f.managed);
    await assert.rejects(run());
    assert.deepEqual(fileHashes(f.managed),before);
    assert.equal(existsSync(backup),false);
  }
  const cases = [
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
  for (const [name,file,text] of cases) await t.test(name,async () => {
    const saved = existsSync(file) ? readFileSync(file) : undefined;
    writeFileSync(file,text);
    try { await refuses(); } finally { if (saved) writeFileSync(file,saved); else rmSync(file); }
  });
  await t.test('DSH still running',async sub => {mockDsh(sub,true);await refuses();});
  await t.test('symlink',async () => {
    const link = join(f.data,'linked'); symlinkSync(join(f.managed,'SOUL.md'),link);
    const before = readFileSync(join(f.managed,'SOUL.md'));
    try {await assert.rejects(run());assert.deepEqual(readFileSync(join(f.managed,'SOUL.md')),before);assert.equal(existsSync(backup),false);}
    finally {rmSync(link);}
  });
  await t.test('missing resume journal',async () => {
    const before = fileHashes(f.managed);await assert.rejects(run({resume:true,backup:undefined}));assert.deepEqual(fileHashes(f.managed),before);
  });
  await run();
  const savedManifest = readFileSync(join(backup,'manifest.json'));
  await t.test('backup hash changed',async () => {
    const before = fileHashes(f.managed), file = join(backup,'manifest.json');
    writeFileSync(file,readFileSync(file,'utf8') + '\n');
    await assert.rejects(run({resume:true,backup:undefined}));assert.deepEqual(fileHashes(f.managed),before);
    writeFileSync(file,savedManifest);
  });
  await t.test('backup payload changed',async () => {
    const before = fileHashes(f.managed);
    writeFileSync(join(backup,'data/companion/payload/SOUL.md'),'synthetic corrupt backup');
    await assert.rejects(run({resume:true,backup:undefined}));assert.deepEqual(fileHashes(f.managed),before);
  });
});
