import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {dirname,join,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareCoreConfiguration} from '../../scripts/lib/core-config.mjs';

const identity={dataDir:'/fixture/core',companionId:'fixture-fish',scopeId:'fixture-scope',ownerActorId:'fixture-owner',displayName:'Xiaoxi',character:'The existing companion.'};

test('actual installer preparation requires no default model and creates only native Core configuration',()=>{
  const entry=new URL('../../scripts/install-dsh.mjs',import.meta.url),source=readFileSync(entry,'utf8');
  const marker='// Preserve every portable Bundle declaration and';
  assert.equal(source.split(marker).length,2,'The fixture must stop before installed-binding discovery');
  const homeImport="const { resolveDshHome } = await import(require.resolve('@deepseek-ai/dsh-home-paths'));";
  const prefix=source.slice(0,source.indexOf(marker)).replace(/^#![^\n]*\n/,'').replace(/^import [^\n]+;\n/gm,'');
  assert.equal(prefix.split(homeImport).length,2,'Isolate the native home provider explicitly');
  const requests=[],reads=[],spawns=[];
  const context=vm.createContext({assert,join,resolve,dirname,isAbsolute,fileURLToPath,prepareCoreConfiguration,structuredClone,
    process:{versions:{electron:'fixture'},argv:['node',fileURLToPath(entry),'--dsh-home','/fixture/dsh','--profile','fixture']},
    createRequire:()=>Object.assign(name=>{requests.push(name);if(name==='yaml')return {parse:()=>[]};throw Error('Unexpected native dependency '+name);},{resolve:name=>name}),
    resolveDshHomeFixture:()=>({resolveDshHome:()=>'/fixture/dsh'}),
    readFileSync:path=>{reads.push(path);return '# Native profile without a model selection\n';},existsSync:()=>true,
    mkdirSync(){},chmodSync(){},mkdtempSync:()=>'/fixture/prepared',randomUUID:(()=>{let seq=0;return()=>`fixture-${++seq}`;})(),
    spawnSync:(...args)=>{spawns.push(args);return {status:0};},
  });
  vm.runInContext(prefix.replace(homeImport,'const { resolveDshHome } = resolveDshHomeFixture();')
    .replaceAll('import.meta.url',JSON.stringify(entry.href))+'\nglobalThis.preparedConfig=config;',context);
  const config=JSON.parse(JSON.stringify(context.preparedConfig));
  assert.deepEqual(Object.keys(config).sort(),['character','companionId','dataDir','displayName','ownerActorId','scopeId'].sort());
  assert.ok(config.companionId&&config.scopeId&&config.ownerActorId);
  assert.equal(config.dataDir,'/fixture/dsh/codex-pet/core');
  assert.deepEqual(requests,[],'Preparation does not discover or parse a native default-model service');
  assert.equal(reads.length,1,'The original profile text is retained only for the later unchanged-patch check');
  assert.equal(spawns.length,1);assert.equal(spawns[0][0],'/usr/bin/tar','Only archive extraction is simulated; no Electron process runs');
});

test('upgrade selection preserves identity, Memory and real conversation limits while dropping retired driver fields',()=>{
  const conversation={maxContextChars:18000,maxSteps:12,maxToolCalls:8,maxDurationMs:120000};
  const memory={python:'/fixture/device/python',dataDir:'/fixture/workspace/.chatpet/data/memory',runtimeRoot:'/fixture/device',serviceEntry:'/fixture/memory-entry.py'};
  const installed={...identity,conversation:{...conversation,maxHistoryMessages:24},memory,cwd:'/obsolete/checkout',provider:'retired-provider',model:'retired-model',maxOutputTokens:4096,unknownLegacyMode:true};
  const selected=prepareCoreConfiguration({...identity,companionId:'new-unused-fish'},installed);
  assert.deepEqual(selected,{...identity,conversation,memory});
  selected.memory.dataDir='/fixture/new-memory';selected.conversation.maxSteps=5;
  assert.equal(memory.dataDir,'/fixture/workspace/.chatpet/data/memory');assert.equal(conversation.maxSteps,12,'Setup cannot mutate the source binding while rebinding its copy');
});

test('explicit resume layers override only declared binding fields and retain the existing companion settings',()=>{
  const memory={python:'/fixture/new-device/python',dataDir:'/fixture/copied-workspace/.chatpet/data/memory'};
  const selected=prepareCoreConfiguration({...identity,conversation:{maxSteps:9}},undefined,
    {dataDir:'/fixture/copied-workspace/.chatpet/data/core',memory,provider:'not-a-Core-setting',cwd:'/not-a-Core-binding'});
  assert.deepEqual(selected,{...identity,dataDir:'/fixture/copied-workspace/.chatpet/data/core',conversation:{maxSteps:9},memory});
  assert.throws(()=>prepareCoreConfiguration(identity,[]),/configuration must be an object/);
});
