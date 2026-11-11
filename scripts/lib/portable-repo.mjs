import assert from 'node:assert/strict';
import { readFileSync,lstatSync,realpathSync,existsSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

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
    const manifest=JSON.parse(readFileSync(join(root,'.chatpet/manifest.json'),'utf8'));
    assert.equal(manifest.companionId,identity.companionId,'Portable identity does not match the Repo');
    assert.ok(identity.companionId && identity.ownerActorId && scopeId,'Incomplete portable identity');
    return {root,dataDir:directory,companionId:identity.companionId,scopeId,ownerActorId:identity.ownerActorId,
      ...(existsSync(join(root,'.chatpet/data/memory'))?{memoryDataDir:join(root,'.chatpet/data/memory')}:{})};
  } finally {db.close();}
}
