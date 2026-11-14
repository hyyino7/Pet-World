import assert from 'node:assert/strict';
import { readFileSync,lstatSync,realpathSync,readdirSync } from 'node:fs';
import { dirname,isAbsolute,join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { boundMemoryDirectory } from './repo-storage.mjs';

function portableMemory(root,manifest,db) {
  assert.ok(Array.isArray(manifest.files),'Portable file declarations are missing');
  const names=manifest.files.map(name=>{
    assert.ok(typeof name==='string' && name && !isAbsolute(name) && !name.split(/[\\/]/).includes('..'),'Invalid portable file declaration');
    return name.split(/[\\/]/).filter(Boolean).join('/');
  });
  // Initializers also create this container for independent recent experience.
  // A directory (or its recent-interactions.sqlite) is not a long-term Bank.
  const fallback=join(root,'.chatpet/data/memory'),container=lstatSync(fallback,{throwIfNoEntry:false});
  assert.ok(!container || container.isDirectory() && !container.isSymbolicLink(),'Portable Memory directory must be local to the Repo');
  const data=container && lstatSync(join(fallback,'data'),{throwIfNoEntry:false});
  assert.ok(!data || data.isDirectory() && !data.isSymbolicLink(),'Portable Memory data directory must be local to the Repo');
  const actual=data && lstatSync(join(fallback,'data/memory.db'),{throwIfNoEntry:false});
  const declarations=[...new Set(names.filter(name=>/(?:^|\/)data\/memory\.db$/.test(name)))];
  assert.ok(declarations.length<=1,'Multiple portable Memory Bank declarations require reconciliation');
  const declared=declarations[0] && dirname(dirname(join(root,'.chatpet',declarations[0])));
  assert.ok(!declared || declared===fallback || !actual,'Multiple retained Memory Banks require reconciliation');
  const meta=key=>{const row=db.prepare('SELECT value FROM meta WHERE key=?').get(key);return row?JSON.parse(row.value):undefined;};
  const prefs=db.prepare("SELECT value FROM records WHERE kind='preferences' AND id='current'").get();
  const storageId=meta('workspace.storage-id') ?? (prefs && JSON.parse(prefs.value).workspace?.id);
  const owner=meta('memory-configured-directory-owner');
  assert.ok(!owner || typeof owner==='object' && typeof owner.id==='string' && owner.id,'Invalid retained Memory ownership; reconcile before resuming');
  assert.ok(!owner || typeof storageId==='string' && storageId,'Retained Memory ownership has no storage identity; reconcile before resuming');
  const selected=declared || (actual ? fallback : undefined);
  if(selected) {
    // Reuse the installed/runtime selector's canonical directory and regular
    // Bank checks, then reject corrupt bytes without Python or initialization.
    const directory=boundMemoryDirectory({memory:{dataDir:selected}},{root,storageId,configuredMemoryOwner:owner});
    assert.equal(directory,selected,'Portable Memory declaration conflicts with retained Bank ownership');
    for(const suffix of ['-wal','-shm','-journal']) {
      const sidecar=lstatSync(join(directory,'data/memory.db')+suffix,{throwIfNoEntry:false});
      assert.ok(!sidecar || sidecar.isFile() && !sidecar.isSymbolicLink() && sidecar.nlink===1,'Invalid retained Memory Bank sidecar');
    }
    const bank=new DatabaseSync(join(directory,'data/memory.db'),{readOnly:true});
    try {assert.equal(Object.values(bank.prepare('PRAGMA quick_check').get())[0],'ok','Retained Memory Bank is corrupt; original preserved');}
    finally {bank.close();}
    return directory;
  }
  assert.ok(!owner || owner.id!==storageId,'Retained Memory Bank ownership has no Bank; restore its data or reconcile before resuming');
  for(const name of container ? readdirSync(fallback) : []) {
    assert.match(name,/^recent-interactions\.sqlite(?:-wal|-shm|-journal)?$/,'Unrecognized retained Memory contents require reconciliation');
    const stat=lstatSync(join(fallback,name));
    assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink===1,'Unexpected recent Memory file; original retained');
  }
}

/** Trusted setup reads portable identity from the same retained Core database.
 * Provider credentials, model routes and Python bindings remain device-owned. */
export function loadPortableRepo(path) {
  const root=realpathSync(path);
  let directory=root;
  for(const part of ['.chatpet','data','core']) {
    directory=join(directory,part);
    assert.ok(lstatSync(directory).isDirectory() && !lstatSync(directory).isSymbolicLink(),'Portable data must be local to the Repo');
  }
  const file=join(directory,'core.sqlite'),stat=lstatSync(file);
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && stat.nlink===1,'Unexpected Core database');
  const db=new DatabaseSync(file,{readOnly:true});
  try {
    const identity=JSON.parse(db.prepare("SELECT value FROM records WHERE kind='identity' AND id='current'").get().value);
    const scopeId=JSON.parse(db.prepare("SELECT value FROM meta WHERE key='scope'").get().value);
    const manifestFile=join(root,'.chatpet/manifest.json'),manifestStat=lstatSync(manifestFile);
    assert.ok(manifestStat.isFile() && !manifestStat.isSymbolicLink() && manifestStat.nlink===1,'Unexpected portable identity manifest');
    const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));
    assert.equal(manifest.companionId,identity.companionId,'Portable identity does not match the Repo');
    assert.ok(identity.companionId && identity.ownerActorId && scopeId,'Incomplete portable identity');
    const memoryDataDir=portableMemory(root,manifest,db);
    return {root,dataDir:directory,companionId:identity.companionId,scopeId,ownerActorId:identity.ownerActorId,
      ...(memoryDataDir?{memoryDataDir}:{})};
  } finally {db.close();}
}
