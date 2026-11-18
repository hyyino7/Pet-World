import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync,linkSync,unlinkSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import type {Context} from '@deepseek-ai/cordis';
import type {PetCoreHost} from '../../src/core/index.js';
import {assertLifeReviewFile,installLifeReviewFileGuard,type LifeReviewFileAccess} from '../../src/life/review-files.js';

function fixture(t:TestContext) {
  const root=mkdtempSync(join(tmpdir(),'life-review-files-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const records=join(root,'.chatpet'),life=join(records,'data/life');
  for(const directory of [join(records,'diary'),join(records,'self.history'),join(records,'data/core'),join(life,'activity'),join(life,'conversations')])mkdirSync(directory,{recursive:true});
  for(const name of ['self.md','diary/2026-11-12.md','diary/2026-11-13.md','self.history/2026-11-12.md'])writeFileSync(join(records,name),'fixture');
  for(const kind of ['activity','conversations'])writeFileSync(join(life,kind,'2026-11-12.jsonl'),'{}\n');
  writeFileSync(join(life,'life.json'),'{}');
  let target={id:'workspace',path:root};
  const host={workspace:{status:()=>({state:'ready',target}),storageId:()=> 'storage'}} as unknown as PetCoreHost;
  const access:LifeReviewFileAccess={workspaceId:target.id,root,storageId:'storage',sessionId:'home',guest:false,reviewDay:'2026-11-12',
    writing:{id:target.id,directory:records,timeZone:'UTC',sessionIds:['home'],isHome:id=>id==='home'}};
  return{root,records,life,host,access,rebind:()=>{target={id:'other',path:join(root,'other')};}};
}
const today=new Date('2026-11-13T05:00:00Z');

test('review reads its existing materials and Core records but writes only self and open diary days',t=>{
  const f=fixture(t);
  for(const name of ['diary','self.history']) {
    assert.doesNotThrow(()=>assertLifeReviewFile(f.host,f.access,'read',join(f.records,name),today));
    assert.throws(()=>assertLifeReviewFile(f.host,f.access,'write',join(f.records,name),today));
  }
  for(const name of ['self.md','diary/2026-11-12.md','diary/2026-11-13.md','self.history/2026-11-12.md'])
    assert.doesNotThrow(()=>assertLifeReviewFile(f.host,f.access,'read',join(f.records,name),today));
  for(const kind of ['activity','conversations'])assert.doesNotThrow(()=>assertLifeReviewFile(f.host,f.access,'read',join(f.life,kind,'2026-11-12.jsonl'),today));
  for(const name of ['self.md','diary/2026-11-13.md'])assert.doesNotThrow(()=>assertLifeReviewFile(f.host,f.access,'write',join(f.records,name),today));
  assert.throws(()=>assertLifeReviewFile(f.host,f.access,'write',join(f.records,'diary/2026-11-12.md'),today),/历史日记已经存在/);
  unlinkSync(join(f.records,'diary/2026-11-12.md'));
  assert.doesNotThrow(()=>assertLifeReviewFile(f.host,f.access,'write',join(f.records,'diary/2026-11-12.md'),today));
  for(const file of [join(f.life,'life.json'),join(f.life,'home.json'),join(f.records,'data/core/core.sqlite'),join(f.records,'data/economy/economy.sqlite'),join(f.records,'USER.md'),join(f.root,'outside.txt')])
    for(const tool of ['read','write'])assert.throws(()=>assertLifeReviewFile(f.host,f.access,tool,file,today));
  for(const name of ['self.history/2026-11-12.md','diary/2026-11-11.md'])assert.throws(()=>assertLifeReviewFile(f.host,f.access,'write',join(f.records,name),today));
  assert.throws(()=>assertLifeReviewFile(f.host,{...f.access,reviewDay:'2026-11-99'},'write',join(f.records,'self.md'),today));
});

test('review rejects traversal, symlinks, hard links, guests and stale workspace bindings',t=>{
  const f=fixture(t),self=join(f.records,'self.md');
  assert.throws(()=>assertLifeReviewFile(f.host,f.access,'write',resolve(f.records,'diary/../../escape.md'),today));
  unlinkSync(self);symlinkSync(join(f.life,'life.json'),self);assert.throws(()=>assertLifeReviewFile(f.host,f.access,'write',self,today));
  unlinkSync(self);linkSync(join(f.life,'life.json'),self);assert.throws(()=>assertLifeReviewFile(f.host,f.access,'write',self,today));
  renameSync(join(f.records,'diary'),join(f.records,'old-diary'));
  symlinkSync(join(f.records,'old-diary'),join(f.records,'diary'));
  assert.throws(()=>assertLifeReviewFile(f.host,f.access,'read',join(f.records,'diary'),today));
  assert.throws(()=>assertLifeReviewFile(f.host,{...f.access,guest:true},'read',join(f.life,'activity/2026-11-12.jsonl'),today));
  f.rebind();assert.throws(()=>assertLifeReviewFile(f.host,f.access,'read',join(f.life,'activity/2026-11-12.jsonl'),today));
});

test('review preserves the established legacy writing owner instead of authorizing a second self file',t=>{
  const f=fixture(t);renameSync(join(f.records,'self.md'),join(f.life,'self.md'));
  const access={...f.access,writing:{...f.access.writing!,directory:f.life}};
  assert.doesNotThrow(()=>assertLifeReviewFile(f.host,access,'write',join(f.life,'self.md'),today));
  assert.throws(()=>assertLifeReviewFile(f.host,access,'write',join(f.records,'self.md'),today));
});

test('native review file guard resolves cwd, rechecks aliases and releases on owner takeover',async t=>{
  const f=fixture(t),handlers=new Map<string,Function>(),guards:Function[]=[];
  let access:LifeReviewFileAccess|undefined=f.access,cwd=f.root;
  const ctx={on:(name:string,handler:Function)=>{handlers.set(name,handler);return()=>handlers.delete(name);},
    tools:{guard:(handler:Function)=>{guards.push(handler);return()=>{};}},get:(name:string)=>name==='fs'?{
      resolve:async(path:string,options:{cwd:string})=>resolve(options.cwd,path),processPath:(path:string)=>path,
    }:name==='workingDirectory'?{ensure:async()=>cwd}:undefined} as unknown as Context;
  const stop=installLifeReviewFileGuard(ctx,f.host,()=>access,()=>today);t.after(stop);
  const exec=(file:string)=>({name:'write',agent:{id:'home'},token:{},arguments:{file_path:file,content:'fixture'},signal:new AbortController().signal});
  const prepare=async(item:any)=>{await handlers.get('tools/pre-execute')!(item,async()=>{});return guards[0](item);};
  assert.equal(await prepare(exec('.chatpet/self.md')),undefined);
  const denied=exec('.chatpet/data/life/life.json');assert.match(await prepare(denied),/仅访问/);
  access=undefined;assert.equal(guards[0](denied),undefined,'The ordinary owner turn retains DSH file permissions');
  assert.equal(await prepare(exec('.chatpet/data/life/life.json')),undefined);
  access=f.access;cwd=join(f.records,'diary');assert.equal(await prepare(exec('../self.md')),undefined);
  const item=exec('2026-11-13.md');await prepare(item);
  renameSync(join(f.records,'diary'),join(f.records,'old-diary'));symlinkSync(join(f.records,'old-diary'),join(f.records,'diary'));
  assert.match(guards[0](item),/writing path/,'A path changed after preparation is rechecked before dispatch');
  access={...f.access,guest:true};assert.match(await prepare(exec('../self.md')),/范围/);
});

 test('backfill creation is revoked if a historical file appears before native dispatch',async t=>{
  const f=fixture(t),handlers=new Map<string,Function>(),guards:Function[]=[];
  const day='2026-11-11',path=join(f.records,'diary',day+'.md'),access={...f.access,reviewDay:day};
  const ctx={on:(name:string,fn:Function)=>{handlers.set(name,fn);return()=>{};},tools:{guard:(fn:Function)=>{guards.push(fn);return()=>{};}},
    get:(name:string)=>name==='fs'?{resolve:async(p:string)=>p,processPath:(p:string)=>p}:name==='workingDirectory'?{ensure:async()=>f.root}:undefined} as unknown as Context;
  t.after(installLifeReviewFileGuard(ctx,f.host,()=>access,()=>today));
  const exec={name:'write',agent:{id:'home'},token:{},arguments:{file_path:path,content:'Backfill'},signal:new AbortController().signal};
  await handlers.get('tools/pre-execute')!(exec,async()=>{});
  assert.equal(guards[0](exec),undefined);
  writeFileSync(path,'An existing historical diary');
  assert.match(guards[0](exec),/历史日记已经存在/);
});
