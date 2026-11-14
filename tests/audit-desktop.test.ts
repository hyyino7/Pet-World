import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdtempSync,mkdirSync,readFileSync,realpathSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {Context} from '@deepseek-ai/cordis';
import type {PetCoreHost} from '../src/core/index.js';
import {DEFAULT_COMPANION_SETTINGS} from '../src/core/companion-settings.js';
import {DesktopFeatures} from '../src/desktop/features.js';
import {Desktop} from '../src/desktop/index.js';
import {Conversation,type Binding,type NativeDesktopHost,type NativeSession} from '../src/desktop/conversation.js';

function deferred<T>() {let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};}
function workspaceFixture() {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'audit-desktop-')));
  const a={id:'a',path:join(root,'a'),storageId:'fish:a'},b={id:'b',path:join(root,'b'),storageId:'fish:b'};
  for(const scope of [a,b]) {
    mkdirSync(join(scope.path,'.chatpet/data/desktop'),{recursive:true});
    writeFileSync(join(scope.path,'.chatpet/data/desktop/todos.json'),JSON.stringify({version:1,todos:[{id:'existing',text:scope.id+' original',dueAt:null,
      done:false,createdAt:1,updatedAt:1,completedAt:null,lastRemindedAt:null}]}));
  }
  let binding=a;
  const values=new Map<string,string>([[a.storageId,'a-existing'],[b.storageId,'b-existing']]);
  const events=new Map<string,((...args:any[])=>void)[]>();
  const frames:{type:string;value:any}[]=[],warnings:unknown[]=[];
  const host={workspace:{status:()=>({state:'ready',target:binding}),storageId:()=>binding.storageId,
    companionSettings:()=>({...DEFAULT_COMPANION_SETTINGS,desktopWhisperEnabled:true}),runtime:{conversation:{maxDurationMs:1000},
      store:{get:(_kind:string,key:string)=>values.get(key),put:(_kind:string,key:string,value:string)=>values.set(key,value)},
      identity:()=>({displayName:'Fixture'}),policy:()=>({quiet:false})}},native:{context:()=>({identity:'Fixture identity'})}} as unknown as PetCoreHost;
  const ctx={on:(name:string,fn:(...args:any[])=>void)=>{events.set(name,[...(events.get(name)??[]),fn]);return ()=>{};},
    get:(_name:string):unknown=>undefined,logger:()=>({warn:(...args:unknown[])=>warnings.push(args)})} as unknown as Context;
  return {root,a,b,values,host,ctx,frames,warnings,binding:()=>binding,change:()=>{binding=b;},changeStorage:()=>{binding={...a,storageId:'fish:replacement'};},
    emit:(name:string,...args:any[])=>events.get(name)?.forEach(fn=>fn(...args)),
    bytes:()=>[a,b].map(scope=>readFileSync(join(scope.path,'.chatpet/data/desktop/todos.json'),'utf8')),
    cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
function nativeFixture(binding:()=>Binding) {
  const created=deferred<void>(),release=deferred<void>(),sessions=new Map<string,NativeSession>();
  let calls=0,cancels=0;
  const native:NativeDesktopHost={prepareWorkspace:async()=>{},workspaceRegistry:{
    get:id=>({path:id==='a'?binding().path.replace(/\/b$/,'/a'):binding().path.replace(/\/a$/,'/b'),sessionIds:[...sessions.values()].filter(s=>s.header.cwd.endsWith('/'+id)).map(s=>s.id)}),
    archivedSessionIds:[],archiveSession:async()=>{}},sessions:{flush:async()=>{}},agents:{get:()=>undefined},
    sessionController:{create:async({workspaceId,sessionId})=>{const path=binding().path;created.resolve();await release.promise;
      assert.equal(workspaceId,'a');sessions.set(sessionId,{id:sessionId,header:{cwd:path},snapshotEvents:()=>[]});return {sessionId};},
      resolveAgent:async id=>({agent:{status:'idle',session:sessions.get(id)!,followup(){calls++;}}}),cancel:()=>{cancels++;return {accepted:true};}}};
  return {native,created,release,stats:()=>({calls,cancels})};
}

for(const method of ['POST','PATCH','DELETE'])test('F4: suspended todo '+method+' cannot mutate B after rebinding',async()=>{
    const f=workspaceFixture(),before=f.bytes(),features=new DesktopFeatures(f.ctx,f.host,()=>{},()=>true,()=>false);
    try {
      const pending=features.request({path:method==='POST'?'/todos':'/todos/existing',method,body:'{"text":"A only"}'});
      f.change();await assert.rejects(pending,/切换|取消/);
      assert.deepEqual(f.bytes(),before,'neither workspace receives a cancelled stale request');
    } finally {await features.close();f.cleanup();}
  });

test('F4: a changed storage identity revokes a captured todo request even with the same workspace id and path',async()=>{
  const f=workspaceFixture(),before=f.bytes(),features=new DesktopFeatures(f.ctx,f.host,()=>{},()=>true,()=>false);
  try {
    const pending=features.request({path:'/todos',method:'POST',body:'{"text":"Old identity only"}'});
    f.changeStorage();await assert.rejects(pending,/切换|取消/);assert.deepEqual(f.bytes(),before);
  } finally {await features.close();f.cleanup();}
});

test('F4: late native session creation never changes either captured or newly bound association',async()=>{
  const f=workspaceFixture(),n=nativeFixture(f.binding);
  const desk=new Desktop({...n.native,getEmotion:()=>undefined,on:()=>()=>{}},f.host);
  const before=[...f.values];
  try {
    const pending=desk.chat.run('open',{});
    await n.created.promise;f.change();n.release.resolve();
    await assert.rejects(pending,/工作区|取消/);
    assert.deepEqual([...f.values],before);
    assert.equal(desk.chat.snapshot().sessionId,null);
  } finally {n.release.resolve();desk.closeChat();f.cleanup();}
});

test('F4/F7: queued prepare and late session resolution cannot adopt a new binding or closed view',async()=>{
  const f=workspaceFixture(),n=nativeFixture(f.binding),prepared=deferred<void>();
  const chat=new Conversation({...n.native,prepareWorkspace:()=>prepared.promise},f.binding,key=>f.values.get(key),(key,id)=>{f.values.set(key,id);},()=>{});
  try {
    const pending=chat.run('open',{});f.change();prepared.resolve();n.release.resolve();
    await assert.rejects(pending,/工作区|取消/);assert.deepEqual([...f.values.values()],['a-existing','b-existing']);
  } finally {prepared.resolve();n.release.resolve();f.cleanup();}
});

test('F7: a late create after chat close cannot restore the closed projection or save its association',async()=>{
  const f=workspaceFixture(),n=nativeFixture(f.binding),desk=new Desktop({...n.native,getEmotion:()=>undefined,on:()=>()=>{}},f.host);
  const before=[...f.values];
  try {
    const pending=desk.chat.run('open',{});await n.created.promise;desk.closeChat();n.release.resolve();
    await assert.rejects(pending,/取消|关闭/);assert.equal(desk.chat.snapshot().sessionId,null);assert.deepEqual([...f.values],before);
  } finally {n.release.resolve();desk.closeChat();f.cleanup();}
});

test('F4: a rebind while resolving a created agent cannot persist the stale session association',async()=>{
  const f=workspaceFixture(),n=nativeFixture(f.binding),resolving=deferred<void>(),release=deferred<void>(),original=n.native.sessionController.resolveAgent;
  n.native.sessionController.resolveAgent=async id=>{resolving.resolve();await release.promise;return original(id);};
  const desk=new Desktop({...n.native,getEmotion:()=>undefined,on:()=>()=>{}},f.host),before=[...f.values];
  try {
    n.release.resolve();const pending=desk.chat.run('open',{});await resolving.promise;f.changeStorage();release.resolve();
    await assert.rejects(pending,/工作区|取消/);assert.deepEqual([...f.values],before);assert.equal(desk.chat.snapshot().sessionId,null);
  } finally {release.resolve();n.release.resolve();desk.closeChat();f.cleanup();}
});

function childFixture(desk:Desktop,binding:Binding) {
  const tick=setTimeout(()=>{},60_000),clock=setTimeout(()=>{},60_000);tick.unref();clock.unref();
  const child=Object.assign(new EventEmitter(),{exitCode:null,ended:0,killed:0,stdin:{end(){child.ended++;}},
    cleanup(){clearTimeout(tick);clearTimeout(clock);},kill(){child.killed++;child.emit('exit');}});
  Object.assign(desk,{child,bodyBinding:binding,tick,clock});
  return child;
}
test('F7: hide rejection still closes chat, clears timers and invalidates its projection',async()=>{
  const f=workspaceFixture(),n=nativeFixture(f.binding),desk=new Desktop({...n.native,getEmotion:()=>undefined,on:()=>()=>{},
    getPresentation:()=>({show:async()=>{},hide:async()=>{throw Error('platform hide refused');},bodyStatus:()=>({running:true})})},f.host);
  const child=childFixture(desk,f.a);
  try {
    await assert.rejects(desk.closeWindow(),/hide refused/);
    assert.equal(child.ended,1);assert.equal(desk['child'],undefined);assert.equal(desk['tick'],undefined);assert.equal(desk['clock'],undefined);
  } finally {desk.closeChat();child.cleanup();child.emit('exit');f.cleanup();}
});
test('F7: settings event catches rejected hide in both platform-close event orders',async()=>{
  for(const platformAlreadyClosed of [false,true]) {
    const f=workspaceFixture(),n=nativeFixture(f.binding),rejections:unknown[]=[];
    let running=!platformAlreadyClosed;
    const desk=new Desktop({...n.native,getEmotion:()=>undefined,on:()=>()=>{},getPresentation:()=>({show:async()=>{},
      hide:async()=>{running=false;throw Error('platform binding gone');},bodyStatus:()=>({running})})},f.host),child=childFixture(desk,f.a);
    const onRejection=(reason:unknown)=>rejections.push(reason);process.on('unhandledRejection',onRejection);
    try {
      f.change();desk.settingsChanged();await new Promise<void>(resolve=>setImmediate(resolve));
      assert.equal(child.ended,1);assert.equal(desk['child'],undefined);assert.deepEqual(rejections,[]);
    } finally {process.off('unhandledRejection',onRejection);desk.closeChat();child.cleanup();child.emit('exit');f.cleanup();}
  }
});

async function deadlineCase(t:TestContext,dream:boolean,rebind=false) {
  const f=workspaceFixture(),started=deferred<AbortSignal>();let calls=0;
  t.mock.timers.enable({apis:['Date','setTimeout'],now:Date.now()});
  const get=(name:string):unknown=>{
    if(name==='petBehavior')return {restState:()=>({sleeping:dream,pending:false})};
    if(name==='petLife')return {running:()=>false};
    if(name==='agentDefaultModel')return {currentSelection:()=>({provider:'fake',model:'local'})};
    if(name==='llm')return {async *stream(options:any){calls++;started.resolve(options.signal);
      await new Promise<void>((_resolve,reject)=>{if(options.signal.aborted)reject(options.signal.reason);else options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});});}};
  };
  Object.assign(f.ctx,{get});
  const features=new DesktopFeatures(f.ctx,f.host,(type,value)=>f.frames.push({type,value}),()=>true,()=>false);
  let pending:Promise<unknown>|undefined;
  try {
    features[dream?'lastDream':'lastWhisper']=Date.now()-60*60_000;
    pending=features['tick']();const signal=await started.promise;
    assert.equal(calls,1);t.mock.timers.tick(999);assert.equal(signal.aborted,false);
    if(rebind){f.change();f.emit('pet/core.changed','workspace.bind');}else t.mock.timers.tick(1);
    assert.equal(signal.aborted,true,rebind?'binding change aborts the original request':'saved 1000ms limit aborts a stream that never finishes itself');
    await pending;assert.equal(f.frames.some(frame=>frame.type==='say'||frame.type==='notice'),false);
  } finally {features.pause();await pending;await features.close();t.mock.timers.reset();f.cleanup();}
}
test('F6: automatic whisper obeys the saved background deadline without a model response',async t=>deadlineCase(t,false));
test('F6: sleep talk obeys the same background deadline without a model response',async t=>deadlineCase(t,true));
test('F6: workspace changes abort an in-flight direct LLM request and suppress old output',async t=>deadlineCase(t,false,true));

test('F6: the ordinary owner native conversation is not cancelled by the automatic budget',async t=>{
  const f=workspaceFixture(),n=nativeFixture(f.binding);
  const chat=new Conversation(n.native,f.binding,key=>f.values.get(key),(key,id)=>{f.values.set(key,id);},()=>{});
  try {
    n.release.resolve();const opened=await chat.run('open',{});
    await chat.run('send',{sessionId:opened.sessionId!,workspaceId:'a',text:'Owner input',requestId:'owner-one'});
    t.mock.timers.enable({apis:['Date','setTimeout'],now:Date.now()});t.mock.timers.tick(1001);
    assert.deepEqual(n.stats(),{calls:1,cancels:0});
  } finally {t.mock.timers.reset();f.cleanup();}
});
