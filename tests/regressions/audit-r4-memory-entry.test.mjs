import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync,lstatSync,realpathSync,symlinkSync} from 'node:fs';
import {join,resolve,dirname,isAbsolute,relative,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import * as preparation from '../../scripts/lib/core-config.mjs';

function fixture(t) {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'memory-entry-code-'))),current=join(root,'current-bundle'),installed=join(root,'profile/node_modules/her-world');
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const bundle=directory=>{
    mkdirSync(join(directory,'src/memory'),{recursive:true});writeFileSync(join(directory,'package.json'),JSON.stringify({name:'her-world'}));
    writeFileSync(join(directory,'src/memory/main.py'),'# packaged fixture shim\n');writeFileSync(join(directory,'src/memory/provider.py'),'# packaged fixture provider\n');
    return join(directory,'src/memory/main.py');
  };
  bundle(current);bundle(installed);
  const memory={python:join(root,'source-python'),dataDir:join(root,'retained-bank'),serviceEntry:undefined};
  function run(entry,choice,settings={}) {
    const config=preparation.prepareCoreConfiguration({dataDir:join(root,'core'),companionId:'fixture-fish',scopeId:'fixture-scope',ownerActorId:'owner',memory:{...memory,...(entry===undefined?{}:{serviceEntry:entry})}});
    const before=structuredClone(config),plans=[];
    const source=readFileSync('scripts/install-dsh.mjs','utf8'),from=source.indexOf('// A prepared Bundle names the device runtime'),to=source.indexOf('const bundlePath =',from);
    assert.ok(from>0&&to>from,'The fixture executes the actual program/runtime binding block');
    const context={assert,config,structuredClone,packageRoot:current,installedBundle:join(installed,'cordis.patch.yml'),profileDir:join(root,'profile'),
      prepareMemoryServiceEntry:preparation.prepareMemoryServiceEntry,
      arg:(name,fallback)=>name==='--memory-service-entry'?choice:fallback,
      process:{argv:settings.missingChoice?['node','installer','--memory-service-entry']:choice===undefined?[]:['node','installer','--memory-service-entry',choice]},
      prepareDeviceRuntime:options=>{plans.push(structuredClone(options));return {python:join(root,'device/venv/bin/python'),deviceRoot:join(root,'device')};},
      join,resolve,dirname,isAbsolute,relative,sep,existsSync,lstatSync,realpathSync,readFileSync,createHash,
    };
    if(settings.noMemory)delete config.memory;
    try {runInNewContext(source.slice(from,to),context);}
    catch(error){error.fixture={config,before,plans};throw error;}
    return {config,before,plans};
  }
  return {root,current,installed,bundle,memory,run};
}

test('R4-2: a default Memory entry stays package-relative while Bank and identity remain the same',t=>{
  const f=fixture(t),result=f.run();assert.equal(result.config.memory.serviceEntry,undefined);
  assert.equal(result.config.memory.dataDir,f.memory.dataDir);assert.equal(result.config.companionId,'fixture-fish');
  assert.equal(result.plans[0].python,f.memory.python);assert.equal(result.config.memory.python,join(f.root,'device/venv/bin/python'));
});

test('R4-2: inherited managed entries from current or previous installed Bundle rebind to the new shim',t=>{
  const f=fixture(t);
  for(const directory of [f.current,f.installed]) {
    const result=f.run(join(directory,'src/memory/main.py'));assert.equal(result.config.memory.serviceEntry,undefined);
    assert.equal(result.config.memory.dataDir,result.before.memory.dataDir);
  }
});

test('R4-2: a deleted old installed shim is recognized by its trusted installed Bundle location',t=>{
  const f=fixture(t),entry=join(f.installed,'src/memory/main.py');rmSync(entry);
  assert.equal(f.run(entry).config.memory.serviceEntry,undefined);
});

test('R4-2: a canonical package-store path is recognized through the prior installed-package root',t=>{
  const f=fixture(t),actual=join(f.root,'package-store/old-bundle');f.bundle(actual);rmSync(f.installed,{recursive:true});symlinkSync(actual,f.installed);
  assert.equal(f.run(join(actual,'src/memory/main.py')).config.memory.serviceEntry,undefined);
});

test('R4-2: a verifiable old development Bundle shim/provider rebinds without retaining a checkout dependency',t=>{
  const f=fixture(t),old=join(f.root,'old-checkout'),entry=f.bundle(old);
  assert.equal(f.run(entry).config.memory.serviceEntry,undefined);
});

test('R4-2: unproven inherited entries fail before probing an interpreter or mutating the configuration',t=>{
  const f=fixture(t),custom=join(f.root,'custom.py');writeFileSync(custom,'# deliberate custom entry\n');
  assert.throws(()=>f.run(custom),error=>{
    assert.match(error.message,/--memory-service-entry/);assert.equal(error.fixture.plans.length,0);assert.deepEqual(error.fixture.config,error.fixture.before);return true;
  });
});

test('R4-2: a user can explicitly select the current Bundle or preserve a deliberate custom host entry',t=>{
  const f=fixture(t),custom=join(f.root,'custom.py');writeFileSync(custom,'# deliberate custom entry\n');
  assert.equal(f.run(custom,'bundled').config.memory.serviceEntry,undefined);
  assert.equal(f.run(custom,custom).config.memory.serviceEntry,custom);
  assert.equal(f.run(join(f.current,'src/memory/main.py'),custom).config.memory.serviceEntry,custom,'explicit current choice overrides inherited managed classification');
});

test('R4-2: matching names alone cannot classify modified or incomplete developer code as managed',t=>{
  const f=fixture(t),old=join(f.root,'custom-bundle'),entry=f.bundle(old);writeFileSync(join(old,'src/memory/provider.py'),'# customized provider\n');
  assert.throws(()=>f.run(entry),/--memory-service-entry/);
  writeFileSync(join(old,'src/memory/provider.py'),'# packaged fixture provider\n');writeFileSync(join(old,'package.json'),JSON.stringify({name:'another-program'}));
  assert.throws(()=>f.run(entry),/--memory-service-entry/);
});

test('R4-2: an arbitrary custom program inside the package is not silently erased as if it were the managed shim',t=>{
  const f=fixture(t),custom=join(f.current,'custom.py');writeFileSync(custom,'# intentional custom program\n');
  assert.throws(()=>f.run(custom),/--memory-service-entry/);assert.equal(f.run(custom,custom).config.memory.serviceEntry,custom);
});

test('R4-2: explicit missing, relative or linked custom entries fail without runtime preparation',t=>{
  const f=fixture(t),linked=join(f.root,'linked.py');symlinkSync(join(f.current,'src/memory/main.py'),linked);
  for(const choice of [join(f.root,'missing.py'),'relative.py',linked])assert.throws(()=>f.run(undefined,choice),error=>{
    assert.equal(error.fixture.plans.length,0);assert.match(error.message,/entry|Entry|absolute|regular|--memory-service-entry/);return true;
  });
});

test('R4-2: no-Memory configuration never requires an entry selection or interpreter',t=>{
  const f=fixture(t),result=f.run(undefined,undefined,{noMemory:true});assert.equal(result.config.memory,undefined);assert.deepEqual(result.plans,[]);
  assert.equal(f.run(undefined,'bundled',{noMemory:true}).config.memory,undefined);
});

test('R4-2: a supplied entry flag without its value fails before runtime preparation',t=>{
  const f=fixture(t);assert.throws(()=>f.run(undefined,undefined,{missingChoice:true}),error=>{
    assert.equal(error.fixture.plans.length,0);assert.match(error.message,/Provide --memory-service-entry/);return true;
  });
});
