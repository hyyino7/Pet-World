// Export a private native profile override. Never edits DSH, installs or moves data.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,join,dirname,isAbsolute} from 'node:path';
import {parseDocument,stringify} from 'yaml';
import {prepareCoreConfiguration} from './lib/core-config.mjs';

const arg=name=>{const at=process.argv.indexOf(name);return at<0?undefined:process.argv[at+1];};
assert.ok(arg('--profile-dir')&&arg('--output'),
  'Usage: node scripts/prepare-store-switch.mjs --profile-dir ABSOLUTE_PROFILE --output PRIVATE_FILE');
const profile=resolve(arg('--profile-dir')),output=resolve(arg('--output'));
const legacy=join(profile,'node_modules/dsh-Chatpet');
assert.ok(existsSync(join(legacy,'cordis.patch.yml')),'Expected the old dsh-Chatpet bundle');
const read=path=>{
  const doc=parseDocument(readFileSync(path,'utf8'),{
    customTags:[{tag:'tag:yaml.org,2002:js',resolve:value=>value}],
  });
  assert.equal(doc.errors.length,0,'Invalid YAML: '+path);
  return doc.toJS();
};
const base=read(join(legacy,'cordis.patch.yml')).flatMap(p=>p.insert??[])
  .find(row=>row.id==='00-Core'&&row.name==='dsh-Chatpet/00-Core');
assert.ok(base,'Legacy Core row missing');
const patches=read(join(profile,'cordis.patch.yml'));
const overriding=patches.findLast(p=>p.id==='00-Core'&&!p.insert
  &&(!p.name||p.name==='dsh-Chatpet/00-Core')&&Object.hasOwn(p,'config'));
const config=prepareCoreConfiguration(overriding?overriding.config:base.config);
assert.ok(typeof config.dataDir==='string'&&isAbsolute(config.dataDir),'Core must use an absolute existing binding');
for(const field of ['companionId','scopeId','ownerActorId'])assert.ok(typeof config[field]==='string'&&config[field],field);
// A verified old package-local shim is replaced by the new package's default
// shim; explicit custom service entries retain their existing value.
if(config.memory?.serviceEntry&&resolve(config.memory.serviceEntry)===join(legacy,'src/memory/main.py'))
  delete config.memory.serviceEntry;
mkdirSync(dirname(output),{recursive:true,mode:0o700});
writeFileSync(output,
  '# PRIVATE device configuration. Append to the native profile patch while DSH is stopped. Never upload.\n'
  +stringify([{id:'00-Core',name:'her-world/00-Core',config}]),{mode:0o600,flag:'wx'});
console.log('Prepared private Core override. No DSH/profile/data files were changed.');
