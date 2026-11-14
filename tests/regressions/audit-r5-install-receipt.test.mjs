import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash, randomUUID} from 'node:crypto';
import vm from 'node:vm';

// Execute the real installation receipt/apply suffix. Only host/runtime/CLI
// boundaries are substituted; all receipt bytes and transitions use real files.
const installer=fs.readFileSync(new URL('../../scripts/install-dsh.mjs',import.meta.url),'utf8');
assert.equal(installer.split('const paths = value =>').length,2);
const suffix=installer.slice(installer.indexOf('const paths = value =>'));
const write=(file,value)=>{fs.mkdirSync(dirname(file),{recursive:true});fs.writeFileSync(file,value);};
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
function fixture(t,options={}) {
  const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'fish-install-receipt-')));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const dir=join(root,'receipts'),stage=join(dir,'prepared-attempt'),profileDir=join(root,'profile');
  fs.mkdirSync(stage,{recursive:true});fs.mkdirSync(profileDir,{recursive:true});
  const config={companionId:'fish',scopeId:'scope',ownerActorId:'owner',dataDir:join(root,'repo','.chatpet','data','core')};
  const old={status:'installed',packageInstalled:true,profileDir,config:{...config,dataDir:join(root,'old-core')},actualPaths:{coreDataDir:join(root,'old-core')}};
  const stable=join(dir,'installation.json'),oldBytes=JSON.stringify(old,null,2)+'\n';
  if(!options.fresh)write(stable,oldBytes);
  write(join(profileDir,'package.json'),JSON.stringify({dependencies:{'her-world':'old'},dsh:{profile:{bundles:['her-world']}}}));
  const configPath=join(profileDir,'cordis.patch.yml'),patch='retain owner patch\n';write(configPath,patch);
  const installedBundle=join(profileDir,'node_modules','her-world','cordis.patch.yml');
  write(installedBundle,JSON.stringify([{insert:[{id:'00-Core',config:old.config}]}]));
  const hostCalls=[];let publications=0;
  const context=vm.createContext({
    ...fs,join,dirname,randomUUID,createHash,assert,
    renameSync(from,to){
      if(options.publishFailure && ++publications===2)throw Error('fixture final receipt publication failure');
      return fs.renameSync(from,to);
    },
    process:{argv:['node','install-dsh.mjs','--no-backup',...(options.apply?['--apply']:[])],pid:process.pid,env:{}},
    console:{log(){}},dir,stage,profileDir,config,configPath,patch,installedBundle,
    profile:'desktop',app:join(root,'inert-app'),packageRoot:join(root,'inert-source'),
    prepared:join(stage,'prepared.tgz'),installedConfig:old.config,
    sourceConfig:config,configuredBeforeBinding:config,
    binding:options.initializationFailure?{state:'ready',root:join(root,'repo'),target:{id:'workspace'}}:{state:'unbound'},
    relocation:options.initializationFailure?{root:join(root,'repo'),data:join(root,'repo','.chatpet','data'),entries:[]}:null,
    deviceRuntimePlan:options.runtimeFailure?{python:'/inert/python'}:null,
    assertStopped(){hostCalls.push('writer-check');},
    spawnSync(){hostCalls.push('process-check');return {status:options.running?0:1,stdout:options.running?'999999999':''};},
    applyDeviceRuntime(){hostCalls.push('runtime');throw Error('fixture runtime failure');},
    relocateRepoStorage(){hostCalls.push('relocate');return [];},
    bundleYaml:{load:text=>JSON.parse(text)},entryListSchema:{},
    inspectRepoBinding(){hostCalls.push('binding-check');return {state:'pending'};},
    registerHooks(){throw Error('Unexpected native peer loading');},
    run(_command,args){
      hostCalls.push('package-cli');
      if(options.cliFailure)throw Error('fixture package CLI failure');
      write(installedBundle,JSON.stringify([{insert:[{id:'00-Core',config}]}]));
      if(options.changedPatch)write(configPath,'unexpected patch');
    },
  });
  context.process.exit=code=>{throw Object.assign(Error('fixture exit'),{fixtureExit:code});};
  if(options.initializationFailure)fs.mkdirSync(join(root,'repo','.chatpet'),{recursive:true});
  return {root,dir,stage,stable,old,oldBytes,config,hostCalls,context,
    run:()=>new vm.Script('(async()=>{'+suffix+'\n})()').runInContext(context)};
}

test('R5: preparation preserves the completed receipt byte-for-byte and records its own planned binding',async t=>{
  const f=fixture(t);
  await assert.rejects(f.run(),error=>error.fixtureExit===0);
  assert.equal(fs.readFileSync(f.stable,'utf8'),f.oldBytes);
  const attempt=json(join(f.stage,'installation.json'));
  assert.equal(attempt.status,'prepared');assert.equal(attempt.config.dataDir,f.config.dataDir);
  assert.deepEqual(f.hostCalls,[]);
});
test('R5: fresh preparation creates no installed receipt',async t=>{
  const f=fixture(t,{fresh:true});await assert.rejects(f.run(),error=>error.fixtureExit===0);
  assert.equal(fs.existsSync(f.stable),false);assert.equal(json(join(f.stage,'installation.json')).status,'prepared');
});
for(const [options,reason] of [[{running:true},/Quit DSH/],[{runtimeFailure:true},/fixture runtime failure/]]) {
  test('R5: failed pre-install gate retains the last completed receipt: '+reason,async t=>{
    const f=fixture(t,{apply:true,...options});await assert.rejects(f.run(),reason);
    assert.equal(fs.readFileSync(f.stable,'utf8'),f.oldBytes);
    assert.equal(f.hostCalls.includes('package-cli'),false);
  });
}
for(const [options,reason] of [[{cliFailure:true},/fixture package CLI failure/],[{changedPatch:true},/patch changed/],[{initializationFailure:true},/Workspace is no longer initialized/]]) {
  test('R5: uncertain apply refuses to advertise a completed binding and retains the previous receipt: '+reason,async t=>{
    const f=fixture(t,{apply:true,...options});await assert.rejects(f.run(),reason);
    const current=json(f.stable);
    assert.equal(current.status,'applying');assert.equal(current.packageInstalled,undefined);
    assert.equal(fs.readFileSync(current.previousReceipt,'utf8'),f.oldBytes);
    assert.equal(current.attemptReceipt,join(f.stage,'installation.json'));
    if(options.initializationFailure)assert.equal(json(current.attemptReceipt).status,'needs-initialization');
  });
}
test('R5: verified apply publishes only the actual completed binding after native boundaries succeed',async t=>{
  const f=fixture(t,{apply:true});await f.run();
  const installed=json(f.stable);
  assert.equal(installed.status,'installed');assert.equal(installed.packageInstalled,true);
  assert.equal(installed.enabled,true);assert.equal(installed.config.dataDir,f.config.dataDir);
  assert.equal(installed.actualPaths.coreDataDir,f.config.dataDir);
  assert.equal(fs.readFileSync(join(f.stage,'previous-installation.json'),'utf8'),f.oldBytes);
  assert.deepEqual(installed,json(join(f.stage,'installation.json')));
  assert.deepEqual(fs.readdirSync(f.dir).sort(),['installation.json','prepared-attempt']);
  assert.ok(f.hostCalls.indexOf('writer-check')<f.hostCalls.indexOf('package-cli'));
});
test('R5: failed final receipt publication retains a non-completed marker, previous bytes and no partial temporary file',async t=>{
  const f=fixture(t,{apply:true,publishFailure:true});await assert.rejects(f.run(),/final receipt publication failure/);
  const current=json(f.stable);assert.equal(current.status,'applying');
  assert.equal(fs.readFileSync(current.previousReceipt,'utf8'),f.oldBytes);
  assert.equal(json(current.attemptReceipt).status,'installed');
  assert.deepEqual(fs.readdirSync(f.dir).sort(),['installation.json','prepared-attempt']);
});

// Invalid receipts must be rejected by the actual backup CLI before Core,
// process/lock probes or planning. No real CLI/app is launched by this fixture.
function backupAdmission(receipt,command='plan') {
  const source=fs.readFileSync(new URL('../../scripts/companion-backup.mjs',import.meta.url),'utf8');
  const start=source.indexOf('const args ='),stops=['const db =','const binding ='].map(marker=>source.indexOf(marker)).filter(index=>index>start);
  assert.ok(start>=0 && stops.length>0,'Backup admission fixture markers changed');
  const prefix=source.slice(start,Math.min(...stops));let probed=false;
  const context=vm.createContext({assert,process:{argv:['node','companion-backup.mjs',command,'--installation','/inert/receipt.json']},
    resolve:path=>path,readFileSync:()=>JSON.stringify(receipt),console:{log(){}},assertDshStopped(){probed=true;}});
  return {run:()=>new vm.Script(prefix).runInContext(context),probed:()=>probed};
}
for(const [status,packageInstalled] of [['prepared',false],['applying',false],['needs-initialization',true],[undefined,true],['installed',false]]) {
  test(`R5: backup rejects non-completed receipt ${status}/${packageInstalled} before probing any live state`,()=>{
    const f=backupAdmission({status,packageInstalled,config:{dataDir:'/inert/core'},profileDir:'/inert/profile'},'create');
    assert.throws(f.run,/completed installed receipt/);assert.equal(f.probed(),false);
  });
}
test('R5: installed but disabled remains eligible for offline backup planning',()=>{
  const f=backupAdmission({status:'installed',packageInstalled:true,enabled:false,config:{dataDir:'/inert/core'},profileDir:'/inert/profile'});
  f.run();assert.equal(f.probed(),false);
});
