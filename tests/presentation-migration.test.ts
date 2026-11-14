import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DEFAULT_COMPANION_SETTINGS } from '../src/core/companion-settings.js';
import { migratePresentation, resolvePresentationMigration } from '../src/desktop/platform/migration.js';

test('presentation migration uses original JSONC parsing, fills safe fields once and preserves explicit conflicts, unknown data and packs',()=>{
  const directory=realpathSync(mkdtempSync(join(tmpdir(),'pet-migration-'))),file=join(directory,'main-config.jsonc');
  const original=`{// keep original comments and URL strings in the backup\n"unknown":{"url":"https://example.test/a//b","text":"/* data */"},"pets":[{"id":"main","size":462,"fixedEnabled":false,"position":{"corner":"bottom-right","marginX":91,"marginY":70},"custom":42},{"id":"second","size":144,"display":"none"}],"eventsRefreshSec":{"whisper":300,"balance":1800,"sleepTalk":60,"custom":99}}`;
  writeFileSync(file,original);mkdirSync(join(directory,'pet'));const pack=join(directory,'pet/unchanged-config.json');writeFileSync(pack,'{"customPack":true}');
  const prefs={...structuredClone(DEFAULT_COMPANION_SETTINGS),desktopSize:340,desktopFixed:true,desktopClickSound:false,desktopWhisperMinutes:9,
    desktopAppearance:{physics:{gravity:1700},position:{marginX:81}}};
  try{
    const receipt=migratePresentation(directory,prefs);
    assert.equal(receipt.status,'conflicts');assert.deepEqual(receipt.conflicts,[{field:'pets.main.size',legacy:340,current:462},{field:'pets.main.fixedEnabled',legacy:true,current:false},{field:'eventsRefreshSec.whisper',legacy:540,current:300},{field:'pets.main.position.marginX',legacy:81,current:91}]);
    const migrated=JSON.parse(readFileSync(file,'utf8'));
    assert.equal(migrated.pets[0].size,462);assert.equal(migrated.pets[0].fixedEnabled,false);assert.equal(migrated.clickSoundEnabled,false);
    assert.equal(migrated.physics.gravity,1700);assert.equal(migrated.eventsRefreshSec.whisper,300);assert.equal(migrated.eventsRefreshSec.custom,99);
    assert.deepEqual(migrated.unknown,{url:'https://example.test/a//b',text:'/* data */'});assert.equal(migrated.pets[0].custom,42);assert.equal(migrated.pets.length,2);
    assert.equal(readFileSync(receipt.backup!,'utf8'),original);assert.equal(statSync(receipt.backup!).mode&0o777,0o400);
    const once=readFileSync(file,'utf8');assert.deepEqual(migratePresentation(directory,{...prefs,desktopFixed:false}),receipt);assert.equal(readFileSync(file,'utf8'),once,'Another bootstrap never remigrates changed preferences');
    const resolved=resolvePresentationMigration(directory,[{field:'pets.main.size',choice:'legacy'},{field:'pets.main.fixedEnabled',choice:'legacy'},{field:'eventsRefreshSec.whisper',choice:'legacy'},{field:'pets.main.position.marginX',choice:'current'}]);
    assert.equal(resolved.status,'complete');const selected=JSON.parse(readFileSync(file,'utf8'));assert.equal(selected.pets[0].size,340);assert.equal(selected.pets[0].position.marginX,91);
    assert.equal(readFileSync(receipt.backup!,'utf8'),original);assert.equal(readFileSync(pack,'utf8'),'{"customPack":true}');
    assert.deepEqual(receipt.preserved,['desktopReplyBubble','desktopBubbleSeconds']);
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test('malformed presentation JSONC remains untouched and migration does not replace it with defaults',()=>{
  const directory=realpathSync(mkdtempSync(join(tmpdir(),'pet-migration-corrupt-'))),file=join(directory,'main-config.jsonc'),original='{"url":"https://example.test", /* unfinished';
  try{
    writeFileSync(file,original);
    assert.throws(()=>migratePresentation(directory,structuredClone(DEFAULT_COMPANION_SETTINGS)),/parsed/);
    assert.equal(readFileSync(file,'utf8'),original);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
