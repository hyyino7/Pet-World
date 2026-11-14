import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {parse,stringify} from 'yaml';

test('old embedded binding becomes a private native override without modifying the profile or data',t=>{
  const root=mkdtempSync(join(tmpdir(),'her-world-switch-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const bundle=join(root,'node_modules/dsh-Chatpet');mkdirSync(bundle,{recursive:true});
  const core={dataDir:join(root,'existing-data'),companionId:'same-companion',scopeId:'same-scope',
    ownerActorId:'same-owner',displayName:'Saved',character:'Existing',
    memory:{python:join(root,'device-python'),dataDir:join(root,'existing-memory'),serviceEntry:join(bundle,'src/memory/main.py')}};
  const bundleFile=join(bundle,'cordis.patch.yml');
  writeFileSync(bundleFile,stringify([{insert:[{id:'00-Core',name:'dsh-Chatpet/00-Core',config:core}]}]));
  const profileFile=join(root,'cordis.patch.yml');
  const text='# Keep comments and native JS tags\n- id: unrelated\n  config: !!js "({ untouched: true })"\n';
  writeFileSync(profileFile,text);
  const output=join(root,'private/override.yml');
  const run=()=>spawnSync(process.execPath,[resolve('scripts/prepare-store-switch.mjs'),'--profile-dir',root,'--output',output],{encoding:'utf8'});
  assert.equal(run().status,0);
  const [override]=parse(readFileSync(output,'utf8'));
  assert.equal(override.name,'her-world/00-Core');
  assert.equal(override.id,'00-Core');
  assert.deepEqual(override.config,{...core,memory:{python:core.memory.python,dataDir:core.memory.dataDir}});
  assert.equal(statSync(output).mode&0o777,0o600);
  assert.equal(readFileSync(profileFile,'utf8'),text);
  assert.deepEqual(parse(readFileSync(bundleFile,'utf8'))[0].insert[0].config,core);
  const saved=readFileSync(output,'utf8');
  assert.notEqual(run().status,0,'A repeated export must not overwrite the reviewed override');
  assert.equal(readFileSync(output,'utf8'),saved);
});
