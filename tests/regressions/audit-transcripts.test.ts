import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {Context} from '@deepseek-ai/cordis';
import type {PetCoreHost} from '../../src/core/index.js';
import {NativeTranscripts} from '../../src/core/native/transcripts.js';

function fixture(t:TestContext) {
  const root=mkdtempSync(join(tmpdir(),'transcript-audit-'));
  const roots={a:join(root,'a'),b:join(root,'b')};for(const path of Object.values(roots))mkdirSync(join(path,'.chatpet'),{recursive:true});
  let binding:'a'|'b'='a',registryAvailable=true;
  const workspaces=new Map(Object.entries(roots).map(([id,path])=>[id,{path,sessionIds:[id+'1',id+'2'],attachSession:async()=>{}}]));
  const logs=new Map(['a1','a2','b1','b2'].map(id=>[id,{header:{id,cwd:roots[id[0] as 'a'|'b']},events:[{seq:0,type:'user/message',text:id}]}]));
  const failures=new Set<string>(),opened:string[]=[],warnings:unknown[]=[];
  let beforeRead:((id:string)=>Promise<void>)|undefined;
  const registry={get:(id:string)=>workspaces.get(id),archivedSessionIds:[] as string[]};
  const ctx={get:()=>registryAvailable?registry:undefined,logger:()=>({warn:(...args:unknown[])=>warnings.push(args)}),
    sessions:{get:()=>undefined,flush:async()=>true},sessionPersistence:{open:async(id:string)=>{
      opened.push(id);if(failures.has(id))throw Error('fixture disk unavailable: '+id);
      const log=logs.get(id);if(!log)throw Error('unknown session');
      return {header:log.header,read:async()=>{await beforeRead?.(id);return {events:structuredClone(log.events)};},close:async()=>{}};
    }}} as unknown as Context;
  const host={workspace:{status:()=>({state:'ready',target:{id:binding,path:roots[binding],title:binding}}),
    storageId:()=>binding+'-stable',
    // Both synthetic repositories are migration-ready even when the other one is bound.
    retainedWritesAllowed:(workspaceId:string,path:string,storageId:string)=>Object.entries(roots)
      .some(([id,rootPath])=>workspaceId===id && path===rootPath && storageId===id+'-stable'),
    runtime:{config:{companionId:'fish',scopeId:'owner',ownerActorId:'owner'}}}} as unknown as PetCoreHost;
  const transcripts=new NativeTranscripts(ctx,host);
  const copies=(which:'a'|'b')=>{const directory=join(roots[which],'.chatpet/data/core/native-sessions');
    try{return readdirSync(directory).filter(name=>/^[a-f0-9]{64}\.json$/.test(name)).map(name=>JSON.parse(readFileSync(join(directory,name),'utf8')));}catch{return [] as any[];}};
  t.after(async()=>{failures.clear();beforeRead=undefined;try{await transcripts.close();}catch{}rmSync(root,{recursive:true,force:true});});
  return {transcripts,roots,logs,failures,opened,warnings,copies,
    bind:(next:'a'|'b')=>{binding=next;},unloadRegistry:()=>{registryAvailable=false;},
    beforeRead:(hook:(id:string)=>Promise<void>)=>{beforeRead=hook;}};
}

test('F2: delayed exports retain the originating workspace and storage identity across A to B binding',async t=>{
  const f=fixture(t);f.transcripts.schedule('a1');f.bind('b');f.transcripts.schedule('b1');await f.transcripts.flush();
  assert.deepEqual(f.copies('a').map(copy=>[copy.header.id,copy.storageId]),[['a1','a-stable']]);
  assert.deepEqual(f.copies('b').map(copy=>[copy.header.id,copy.storageId]),[['b1','b-stable']]);
});

test('F2: a binding switch during native log reading cannot drop or redirect the completed export',async t=>{
  const f=fixture(t);f.transcripts.schedule('a1');f.beforeRead(async()=>{f.bind('b');});await f.transcripts.flush();
  assert.equal(f.copies('a')[0]?.storageId,'a-stable');assert.deepEqual(f.copies('b'),[]);
});

test('F2: captured membership survives native workspace service disposal at shutdown',async t=>{
  const f=fixture(t);f.transcripts.schedule('a1');f.unloadRegistry();await f.transcripts.flush();assert.equal(f.copies('a')[0]?.header.id,'a1');
});

test('F2: replacing the original workspace directory never authorizes writing a new directory at that path',async t=>{
  const f=fixture(t);f.transcripts.schedule('a1');renameSync(f.roots.a,f.roots.a+'-old');mkdirSync(f.roots.a);f.bind('b');
  await assert.rejects(f.transcripts.flush(),(error:AggregateError)=>error.errors.some(cause=>/changed|replaced/i.test(String(cause))));assert.deepEqual(f.copies('a'),[]);assert.deepEqual(f.copies('b'),[]);
});

test('F3: one failed export neither drops nor blocks later sessions, and explicit retry preserves the tail',async t=>{
  const f=fixture(t);f.failures.add('a1');f.transcripts.schedule('a1');f.transcripts.schedule('a2');
  await assert.rejects(f.transcripts.flush(),/export|transcript/i);assert.equal(f.copies('a')[0]?.header.id,'a2');
  f.failures.clear();await f.transcripts.flush();assert.deepEqual(f.copies('a').map(copy=>copy.header.id).sort(),['a1','a2']);
});

test('F2: replacing only the managed directory cannot inherit an accepted export from the previous companion storage',async t=>{
  const f=fixture(t);f.transcripts.schedule('a1');renameSync(join(f.roots.a,'.chatpet'),join(f.roots.a,'.chatpet-old'));mkdirSync(join(f.roots.a,'.chatpet'));
  await assert.rejects(f.transcripts.flush(),(error:AggregateError)=>error.errors.some(cause=>/changed|replaced/i.test(String(cause))));assert.deepEqual(f.copies('a'),[]);
});

test('F3: a new event captured during export remains queued for the following flush',async t=>{
  const f=fixture(t);f.transcripts.schedule('a1');let first=true;
  f.beforeRead(async()=>{if(first){first=false;f.transcripts.schedule('a1');}});await f.transcripts.flush();
  f.logs.get('a1')!.events.push({seq:1,type:'assistant/message',text:'tail'});await f.transcripts.flush();
  assert.equal(f.copies('a')[0]?.events.length,2);
});

test('F3: automatic retries are bounded and observable, while an explicit retry can recover',async t=>{
  t.mock.timers.enable({apis:['setTimeout','Date']});const f=fixture(t);f.failures.add('a1');f.transcripts.schedule('a1');
  for(let i=0;i<8;i++){t.mock.timers.tick(60_000);for(let turn=0;turn<10;turn++)await new Promise(resolve=>setImmediate(resolve));}
  assert.ok(f.opened.length>=2 && f.opened.length<=4,'bounded delayed retries');assert.ok(f.warnings.length>0);
  const attempts=f.opened.length;t.mock.timers.tick(3_600_000);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.opened.length,attempts);
  f.failures.clear();await f.transcripts.flush();assert.equal(f.copies('a')[0]?.header.id,'a1');
});

test('F3: a concurrent final flush waits for a newer event captured after an in-flight export began',async t=>{
  const f=fixture(t);let release!:()=>void,entered!:()=>void;
  const started=new Promise<void>(resolve=>{entered=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});let first=true;
  f.beforeRead(async()=>{if(first){first=false;entered();await gate;}});f.transcripts.schedule('a1');
  const active=f.transcripts.flush();await started;f.transcripts.schedule('a2');const shutdown=f.transcripts.flush();release();
  await Promise.all([active,shutdown]);assert.deepEqual(f.copies('a').map(copy=>copy.header.id).sort(),['a1','a2']);
});
