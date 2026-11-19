import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,realpathSync,readFileSync,writeFileSync,rmSync,readdirSync,lstatSync,symlinkSync,linkSync} from 'node:fs';
import {join,resolve,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {runInNewContext} from 'node:vm';
import {createCore} from '../../dist/src/core/index.js';
import {checkedSetup,requireSetup} from '../../scripts/lib/core-config.mjs';
import {loadPortableRepo} from '../../scripts/lib/portable-repo.mjs';

const value=result=>{assert.equal(result.ok,true,result.error?.message);return result.value;};
async function fixture(t) {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'portable-memory-code-'))),repo=join(root,'repo');mkdirSync(repo);
  const config={dataDir:join(repo,'.chatpet/data/core'),companionId:'fixture-fish',scopeId:'fixture-owner',ownerActorId:'owner',displayName:'Fixture',character:''};
  const host=createCore(config);let closed=false,sequence=0;
  const request=()=>host.operator.request('portable-'+ ++sequence);
  const prefs=value(await host.services.preferences.read(request(),{}));
  const bound=value(await host.services.preferences.save(request(),{expectedRevision:prefs.revision,workspace:{id:'fixture-world',path:repo,title:'Fixture'},conversation:prefs.conversation}));
  value(await host.services.workspace.initialize(request(),{expectedPreferencesRevision:bound.revision}));
  t.after(async()=>{if(!closed)await host.close();rmSync(root,{recursive:true,force:true});});
  const manifestPath=join(repo,'.chatpet/manifest.json');
  const declaration=local=>{const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));manifest.files.push(local);writeFileSync(manifestPath,JSON.stringify(manifest));};
  const bank=(relative='data/memory')=>{
    const directory=join(repo,'.chatpet',relative);mkdirSync(join(directory,'data'),{recursive:true});
    const file=join(directory,'data/memory.db'),db=new DatabaseSync(file);try{db.exec('CREATE TABLE fixture (value TEXT); INSERT INTO fixture VALUES (\'retained Bank\');');}finally{db.close();}
    return {directory,file};
  };
  return {root,repo,host,config,declaration,bank,defaultDirectory:join(repo,'.chatpet/data/memory'),
    close:async()=>{if(!closed){await host.close();closed=true;}}};
}

test('R3-1: actual no-Memory initialization resumes without an interpreter despite its recent-interaction container',async t=>{
  const f=await fixture(t);assert.ok(readdirSync(f.defaultDirectory).includes('recent-interactions.sqlite'));
  await f.close();const portable=loadPortableRepo(f.repo);assert.equal(portable.companionId,'fixture-fish');assert.equal(portable.memoryDataDir,undefined);
  const source=readFileSync('scripts/install-dsh.mjs','utf8');
  const from=source.indexOf('const resumeRepo ='),to=source.indexOf('const configuredBeforeBinding =',from);assert.ok(from>0&&to>from);
  const config={memory:{python:'/old-device/python',dataDir:'/old-device/bank'}};
  runInNewContext(source.slice(from,to)+'\nglobalThis.result=config;',{
    assert,loadPortableRepo,checkedSetup,requireSetup,resolve,isAbsolute,config,
    arg:(name,fallback)=>name==='--resume-repo'?f.repo:fallback,
  });
  assert.equal(config.memory,undefined,'The actual resume decision drops stale device bindings without inventing a Bank');
});

test('R3-1: a truly empty unconfigured compatibility container is not an initialized Bank',async t=>{
  const f=await fixture(t);await f.close();rmSync(f.defaultDirectory,{recursive:true});mkdirSync(f.defaultDirectory);
  assert.equal(loadPortableRepo(f.repo).memoryDataDir,undefined);assert.deepEqual(readdirSync(f.defaultDirectory),[]);
});

test('R3-1: declared retained Banks stay required and do not need Python merely to inspect the binding',async t=>{
  const f=await fixture(t),bank=f.bank();f.declaration('data/memory/data/memory.db');await f.close();
  const before=readFileSync(bank.file);assert.equal(loadPortableRepo(f.repo).memoryDataDir,bank.directory);assert.deepEqual(readFileSync(bank.file),before);
  const source=readFileSync('scripts/install-dsh.mjs','utf8'),from=source.indexOf('const resumeRepo ='),to=source.indexOf('const configuredBeforeBinding =',from);
  assert.throws(()=>runInNewContext(source.slice(from,to),{
    assert,loadPortableRepo,checkedSetup,requireSetup,resolve,isAbsolute,config:{},
    arg:(name,fallback)=>name==='--resume-repo'?f.repo:fallback,
  }),/--memory-python/);
});

for(const state of ['missing','empty','corrupt'])test(`R3-1: a declared ${state} Bank fails closed without replacing retained files`,async t=>{
  const f=await fixture(t);f.declaration('data/memory/data/memory.db');mkdirSync(join(f.defaultDirectory,'data'));
  const file=join(f.defaultDirectory,'data/memory.db');if(state!=='missing')writeFileSync(file,state==='empty'?'':'not a database');
  await f.close();const before=state==='missing'?undefined:readFileSync(file);
  assert.throws(()=>loadPortableRepo(f.repo),/Memory|database|Bank/i);
  if(before===undefined)assert.equal(lstatSync(file,{throwIfNoEntry:false}),undefined);else assert.deepEqual(readFileSync(file),before);
});

test('R3-1: current retained Bank ownership is not downgraded when its declaration/file is missing',async t=>{
  const f=await fixture(t);f.host.workspace.runtime.store.setMeta('memory-configured-directory-owner',{id:f.host.workspace.storageId(),path:f.repo});
  await f.close();assert.throws(()=>loadPortableRepo(f.repo),/Bank|Memory/);
});

test('R3-1: a legacy default Bank without a modern declaration is still selected',async t=>{
  const f=await fixture(t),bank=f.bank();await f.close();assert.equal(loadPortableRepo(f.repo).memoryDataDir,bank.directory);
});

test('R3-1: an owner record for a different storage does not turn current recent experience into that other Bank',async t=>{
  const f=await fixture(t);f.host.workspace.runtime.store.setMeta('memory-configured-directory-owner',{id:'different-storage',path:'/previous-device/other-repo'});
  await f.close();assert.equal(loadPortableRepo(f.repo).memoryDataDir,undefined);
});

test('R3-1: malformed ownership is retained and rejected rather than treated as no Bank',async t=>{
  const f=await fixture(t);f.host.workspace.runtime.store.setMeta('memory-configured-directory-owner',{path:f.repo});
  await f.close();assert.throws(()=>loadPortableRepo(f.repo),/Memory ownership/);
});

test('R3-1: retained ownership without a current storage identity is ambiguous and cannot be downgraded',async t=>{
  const f=await fixture(t);f.host.workspace.runtime.store.setMeta('memory-configured-directory-owner',{id:'retained-storage'});await f.close();
  const db=new DatabaseSync(join(f.config.dataDir,'core.sqlite'));
  try {db.exec("DELETE FROM meta WHERE key='workspace.storage-id'; DELETE FROM records WHERE kind='preferences' AND id='current';");}finally{db.close();}
  assert.throws(()=>loadPortableRepo(f.repo),/Memory ownership has no storage identity/);
});

test('R3-1: a custom declared Bank relocates by its Repo path instead of a prior device absolute path',async t=>{
  const f=await fixture(t),bank=f.bank('data/retained-memory');f.declaration('data/retained-memory/data/memory.db');
  f.host.workspace.runtime.store.setMeta('memory-configured-directory-owner',{id:f.host.workspace.storageId(),path:'/previous-device/repo'});
  await f.close();assert.equal(loadPortableRepo(f.repo).memoryDataDir,bank.directory);
});

test('R3-1: a custom Bank declaration cannot override conflicting retained configured-directory ownership',async t=>{
  const f=await fixture(t);f.bank('data/retained-memory');f.declaration('data/retained-memory/data/memory.db');
  f.host.workspace.runtime.store.setMeta('memory-configured-directory-owner',{id:'different-storage',path:'/previous-device/other-repo'});
  await f.close();assert.throws(()=>loadPortableRepo(f.repo),/Memory|Bank/);
});

test('R3-1: unrecognized Memory remnants are retained for reconciliation rather than treated as an empty disabled Bank',async t=>{
  const f=await fixture(t),unknown=join(f.defaultDirectory,'unrecognized-save.json');writeFileSync(unknown,'{"retained":true}');await f.close();
  assert.throws(()=>loadPortableRepo(f.repo),/Memory|Bank|retained/i);assert.equal(readFileSync(unknown,'utf8'),'{"retained":true}');
});

for(const type of ['directory-link','bank-link','bank-hardlink','dangling-bank'])test(`R3-1: ${type} never authorizes a portable Bank or silently drops it`,async t=>{
  const f=await fixture(t),outside=join(f.root,'outside');mkdirSync(join(outside,'data'),{recursive:true});
  const original=new DatabaseSync(join(outside,'data/memory.db'));original.exec('CREATE TABLE fixture (value TEXT)');original.close();
  await f.close();rmSync(f.defaultDirectory,{recursive:true});
  if(type==='directory-link')symlinkSync(outside,f.defaultDirectory);
  else {
    mkdirSync(join(f.defaultDirectory,'data'),{recursive:true});const file=join(f.defaultDirectory,'data/memory.db');
    if(type==='bank-hardlink')linkSync(join(outside,'data/memory.db'),file);else symlinkSync(type==='dangling-bank'?join(outside,'missing'):join(outside,'data/memory.db'),file);
  }
  assert.throws(()=>loadPortableRepo(f.repo),/Memory|Bank|regular|local/i);
});

test('R3-1: conflicting declared Banks require explicit reconciliation',async t=>{
  const f=await fixture(t);f.bank();f.bank('data/other-memory');f.declaration('data/memory/data/memory.db');f.declaration('data/other-memory/data/memory.db');await f.close();
  assert.throws(()=>loadPortableRepo(f.repo),/Bank|Memory/);
});

test('R3-1: a linked Bank sidecar is rejected before SQLite opens it',async t=>{
  const f=await fixture(t),bank=f.bank(),outside=join(f.root,'outside-sidecar');writeFileSync(outside,'retained sentinel');await f.close();
  symlinkSync(outside,bank.file+'-wal');assert.throws(()=>loadPortableRepo(f.repo),/Memory Bank sidecar/);assert.equal(readFileSync(outside,'utf8'),'retained sentinel');
});
