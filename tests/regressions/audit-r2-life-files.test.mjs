import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,symlinkSync,linkSync,lstatSync,existsSync,readdirSync,renameSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createLifeStore,durableWrite} from '../../vendor/dsh-world/lib/life/lifeStore.js';

function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'audit-life-files-')),repo=join(root,'repo');mkdirSync(repo);
  const store=createLifeStore(repo,'UTC');
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  return {root,repo,store};
}
const time='2026-11-13T12:00:00.000Z';
const outputs=[
  ['wake','life/wakes.jsonl',(store)=>store.appendWake({time,fixture:'wake'})],
  ['compaction','compactions.jsonl',(store)=>store.appendCompaction({time,fixture:'compaction'})],
  ['activity','activity/2026-11-13.jsonl',(store)=>store.appendActivity({time,fixture:'activity'})],
];

for(const [kind,path,append] of outputs)for(const type of ['symlink','hardlink','dangling']) {
  test(`R2-3: ${kind} append rejects a final ${type} without changing the outside target or link`,t=>{
    const {root,repo,store}=fixture(t),target=join(root,'outside'),file=join(repo,path);
    if(type!=='dangling')writeFileSync(target,'fixture sentinel\n');
    if(type==='hardlink')linkSync(target,file);else symlinkSync(target,file);
    const before=lstatSync(file),bytes=existsSync(target)?readFileSync(target,'utf8'):undefined;
    if(kind==='activity')assert.equal(append(store),false);else assert.throws(()=>append(store),/regular|link|unsafe|changed/i);
    assert.equal(existsSync(target),bytes!==undefined);if(bytes!==undefined)assert.equal(readFileSync(target,'utf8'),bytes);
    assert.equal(lstatSync(file).ino,before.ino,'the anomalous original is preserved');
  });
}

test('R2-3: JSONL readers and activity index refuse final links and preserve missing/corrupt-tail behavior',t=>{
  const {root,repo,store}=fixture(t),target=join(root,'outside');writeFileSync(target,'{"fixture":"outside"}\n');
  assert.deepEqual(store.wakes(),[]);assert.deepEqual(store.compactions(),[]);assert.deepEqual(store.activity('invalid'),[]);
  for(const [path,read] of [['life/wakes.jsonl',()=>store.wakes()],['compactions.jsonl',()=>store.compactions()],['activity/2026-11-13.jsonl',()=>store.activity('2026-11-13')]]) {
    for(const type of ['symlink','hardlink','dangling']) {
      const file=join(repo,path);if(type==='hardlink')linkSync(target,file);else symlinkSync(type==='dangling'?join(root,'missing'):target,file);
      assert.throws(read,/regular|link|unsafe|changed/i);
      if(path.startsWith('activity/'))assert.throws(()=>store.activityDays(),/regular|link|unsafe|changed/i);
      unlinkSync(file);
    }
  }
  writeFileSync(join(repo,'life/wakes.jsonl'),'not-json\n{"before":1}\n{"torn":');
  store.appendWake({after:2});assert.deepEqual(store.wakes(),[{before:1},{after:2}]);
  assert.deepEqual(store.activityDays(),[]);
});

test('R2-3: life state reads and writes refuse a final file link instead of replacing it',t=>{
  const {root,repo,store}=fixture(t),target=join(root,'outside'),file=join(repo,'life.json');writeFileSync(target,'{"version":1,"sentinel":true}');
  for(const type of ['symlink','hardlink','dangling']) {
    if(type==='hardlink')linkSync(target,file);else symlinkSync(type==='dangling'?join(root,'missing'):target,file);
    assert.throws(()=>store.read(),/regular|link|unsafe|changed/i);assert.throws(()=>store.write({version:1}),/regular|link|unsafe|changed/i);
    assert.equal(readFileSync(target,'utf8'),'{"version":1,"sentinel":true}');unlinkSync(file);
  }
  store.write({version:1,kept:true});unlinkSync(file);assert.throws(()=>store.read(),/disappeared/);
});

test('R2-3: replacing an owned log directory is rejected on subsequent read, write and enumeration',t=>{
  const {root,repo,store}=fixture(t),outside=join(root,'outside');mkdirSync(outside);writeFileSync(join(outside,'2026-11-13.jsonl'),'{"sentinel":true}\n');
  renameSync(join(repo,'activity'),join(repo,'old-activity'));symlinkSync(outside,join(repo,'activity'));
  assert.equal(store.appendActivity({time}),false);assert.throws(()=>store.activity('2026-11-13'),/directory|link|unsafe|changed/i);assert.throws(()=>store.activityDays(),/directory|link|unsafe|changed/i);
  assert.equal(readFileSync(join(outside,'2026-11-13.jsonl'),'utf8'),'{"sentinel":true}\n');
});

test('R2-3: a failed activity preserves its gap marker and succeeds after the anomalous file is removed',t=>{
  const {root,repo,store}=fixture(t),outside=join(root,'outside'),file=join(repo,'activity/2026-11-13.jsonl');writeFileSync(outside,'sentinel');symlinkSync(outside,file);
  assert.equal(store.appendActivity({time,first:true}),false);unlinkSync(file);
  assert.equal(store.appendActivity({time,second:true}),true);assert.deepEqual(store.activity('2026-11-13'),[{time,second:true,gapBefore:true}]);
  assert.equal(readFileSync(outside,'utf8'),'sentinel');
});

test('R2-3: durable replacement refuses linked targets and leaves every original untouched',t=>{
  const {root,repo}=fixture(t),target=join(root,'outside'),file=join(repo,'state.json');writeFileSync(target,'sentinel');
  for(const type of ['symlink','hardlink','dangling']) {
    if(type==='hardlink')linkSync(target,file);else symlinkSync(type==='dangling'?join(root,'missing'):target,file);
    assert.throws(()=>durableWrite(file,'replacement'),/regular|link|unsafe|changed/i);assert.equal(readFileSync(target,'utf8'),'sentinel');assert.ok(lstatSync(file));unlinkSync(file);
  }
});

test('R2-3: legacy predictable temporary links are never followed, truncated or removed',t=>{
  const {root,repo}=fixture(t),target=join(root,'outside'),file=join(repo,'state.json'),legacy=file+'.'+process.pid+'.tmp';writeFileSync(target,'sentinel');symlinkSync(target,legacy);
  durableWrite(file,'safe new state');assert.equal(readFileSync(file,'utf8'),'safe new state');assert.equal(readFileSync(target,'utf8'),'sentinel');assert.equal(lstatSync(legacy).isSymbolicLink(),true);
});

test('R2-3: durable replacement preserves the prior file on failure, cleans only its own temporary file and retries transient rename',t=>{
  const {repo}=fixture(t),file=join(repo,'state.json');writeFileSync(file,'previous');
  assert.throws(()=>durableWrite(file,'failed',()=>{throw Object.assign(Error('injected permanent failure'),{code:'EIO'});}),/injected/);
  assert.equal(readFileSync(file,'utf8'),'previous');assert.deepEqual(readdirSync(repo).filter(name=>name.includes('.tmp')),[]);
  let attempts=0;durableWrite(file,'committed',(from,to)=>{if(++attempts===1)throw Object.assign(Error('injected transient lock'),{code:'EBUSY'});renameSync(from,to);});
  assert.equal(attempts,2);assert.equal(readFileSync(file,'utf8'),'committed');assert.deepEqual(readdirSync(repo).filter(name=>name.includes('.tmp')),[]);
});

test('R2-3: rename retry refuses a replaced temporary path and never removes the unowned replacement',t=>{
  const {root,repo}=fixture(t),file=join(repo,'state.json'),outside=join(root,'outside');writeFileSync(file,'previous');writeFileSync(outside,'sentinel');let replacement;
  assert.throws(()=>durableWrite(file,'new state',(from)=>{replacement=from;unlinkSync(from);symlinkSync(outside,from);throw Object.assign(Error('injected lock plus replaced temp'),{code:'EBUSY'});}),/regular|link|unsafe|changed/i);
  assert.equal(readFileSync(file,'utf8'),'previous');assert.equal(readFileSync(outside,'utf8'),'sentinel');assert.equal(lstatSync(replacement).isSymbolicLink(),true);
});
