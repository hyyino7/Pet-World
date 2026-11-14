import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {EventEmitter} from 'node:events';
import {join,resolve} from 'node:path';
import ts from 'typescript';
import {createPresentationLoop,createMediaGate} from '../../vendor/feiyu-room-template/public/room/presentation-loop.js';
import {createDesktopPresentationLifecycle,createPresentationFrames} from '../../src/desktop/platform/presentation-lifecycle.js';

function clock(){
  let now=0,next=0;const jobs=new Map();
  const set=(fn,ms=0,repeat=0)=>{const id=++next;jobs.set(id,{fn,at:now+ms,repeat});return id;};
  return {now:()=>now,set,clear:id=>jobs.delete(id),count:()=>jobs.size,
    request:fn=>set(()=>fn(now),0),cancel:id=>jobs.delete(id),
    interval:(fn,ms)=>set(fn,ms,ms),
    advance(ms){const target=now+ms;let calls=0;
      while(true){const due=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!due||due[1].at>target)break;
        assert.ok(++calls<10000,'No unbounded presentation callback loop');
        const [id,job]=due;now=job.at;jobs.delete(id);if(job.repeat)jobs.set(id,{...job,at:now+job.repeat});job.fn();
      }now=target;
    }};
}
class Surface {
  hidden=false;listeners=new Map();videos=[];
  addEventListener(type,fn){const entries=this.listeners.get(type)||new Set();entries.add(fn);this.listeners.set(type,entries);}
  removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
  emit(type,target=this){for(const fn of this.listeners.get(type)||[])fn({target});}
  querySelectorAll(){return this.videos;}
  video(){const video={tagName:'VIDEO',paused:false,isConnected:true,ended:false,plays:0,
    pause(){this.paused=true;},play:()=>{video.paused=false;video.plays++;this.emit('play',video);return Promise.resolve();}};
    this.videos.push(video);return video;
  }
}

test('Room drawing has a frame ceiling, sleeps while hidden and disposes every display callback',()=>{
  const c=clock();let draws=0,rate=30;
  const loop=createPresentationLoop({...c,draw:()=>draws++,fps:()=>rate});
  loop.setVisible(true);c.advance(1000);assert.ok(draws>=29&&draws<=31);
  loop.setVisible(false);const before=draws;assert.equal(c.count(),0);c.advance(3600000);assert.equal(draws,before);
  loop.invalidate();assert.equal(c.count(),0);
  rate=6;loop.setVisible(true);c.advance(1000);assert.ok(draws-before<=7);
  loop.dispose();assert.equal(c.count(),0);loop.invalidate();loop.setVisible(true);assert.equal(c.count(),0);
});

test('a still Room renders only when dirtied; coalesced dirt cannot bypass 30fps',()=>{
  const c=clock();let draws=0;
  const loop=createPresentationLoop({...c,draw:()=>draws++,fps:()=>0});
  loop.setVisible(true);c.advance(0);assert.equal(draws,1);assert.equal(c.count(),0);
  for(let i=0;i<50;i++)loop.invalidate();c.advance(100);assert.equal(draws,2);assert.equal(c.count(),0);
  loop.dispose();
});

test('Room visual media pauses on hide and catches a late async play attempt',async()=>{
  const doc=new Surface(),video=doc.video(),gate=createMediaGate(doc);
  gate.setVisible(false);assert.equal(video.paused,true);
  await video.play();assert.equal(video.paused,true,'Late loaded/play media remains stopped');
  gate.setVisible(true);assert.equal(video.paused,false);
  gate.dispose();assert.equal(video.paused,true);assert.equal(doc.listeners.get('play').size,0);
});

test('desktop waits for a fresh snapshot after native hide/lock; old responses cannot resume media',()=>{
  const doc=new Surface(),video=doc.video();let notify,wakes=0,resets=0,stops=0;
  const sprite={dragState:{active:true},pendingSquash:true,stopMove(){stops++;},stopThrow(){},stopDragFollow(){},stopSquash(){},syncInputBusy(){}};
  const lifecycle=createDesktopPresentationLifecycle({document:doc,sprites:()=>[sprite],wake:()=>wakes++,reset:()=>resets++,subscribe:fn=>{notify=fn;return()=>{notify=undefined;};}});
  assert.equal(lifecycle.wantsVisible(),false);
  notify({visible:true});const first=lifecycle.ticket();assert.equal(video.paused,true);assert.equal(lifecycle.canPresent(),false);
  lifecycle.ready();assert.equal(video.paused,false);assert.equal(lifecycle.canPresent(),true);
  notify({visible:false});assert.equal(video.paused,true);assert.equal(lifecycle.accepts(first),false);
  assert.equal(sprite.dragState.active,false);assert.equal(sprite.pendingSquash,false);
  notify({visible:true});assert.equal(lifecycle.canPresent(),false);assert.equal(video.paused,true);
  lifecycle.ready();assert.equal(video.paused,false);
  doc.hidden=true;doc.emit('visibilitychange');assert.equal(lifecycle.wantsVisible(),false);assert.equal(video.paused,true);
  assert.ok(wakes>=4&&resets>=4&&stops>=4);
  lifecycle.dispose();assert.equal(notify,undefined);assert.equal(doc.listeners.get('visibilitychange').size,0);
});

test('desktop cosmetic frame batching caps drivers and leaves no hidden timer',()=>{
  const c=clock(),frames=createPresentationFrames(c);let calls=0;
  const step=()=>{calls++;frames.request(step);};frames.setVisible(true);frames.request(step);c.advance(1000);
  assert.ok(calls>=29&&calls<=31);frames.setVisible(false);assert.equal(c.count(),0);
  c.advance(3600000);const before=calls;frames.request(step);c.advance(1000);assert.equal(calls,before);assert.equal(c.count(),0);
});

test('current desktop window keeps visible pointer protection and stops hidden/locked pumps',()=>{
  const c=clock();let pointerReads=0;const created=[];
  class Window extends EventEmitter {
    visible=false;minimized=false;destroyed=false;id=created.length+1;throttled=true;sent=[];
    constructor(){super();created.push(this);this.webContents=new EventEmitter();Object.assign(this.webContents,{
      send:(type,value)=>this.sent.push({type,value}),setBackgroundThrottling:value=>{this.throttled=value;},setZoomFactor(){}});}
    setAlwaysOnTop(){}setVisibleOnAllWorkspaces(){}setIgnoreMouseEvents(){}setSkipTaskbar(){}
    isDestroyed(){return this.destroyed;}isVisible(){return this.visible;}isMinimized(){return this.minimized;}
    getBounds(){return{x:0,y:0,width:200,height:150};}loadFile(){return Promise.resolve();}
    showInactive(){this.visible=true;this.emit('show');}hide(){this.visible=false;this.emit('hide');}
    destroy(){this.destroyed=true;this.emit('closed');}
  }
  const context={module:{exports:{}},process:{env:{DSH_PET_PETS:'[{"id":"main","size":120}]'},platform:'darwin'},console,
    setTimeout:c.set,clearTimeout:c.clear,setInterval:c.interval,clearInterval:c.clear,
    require:name=>{
      if(name==='node:path')return{join:(...parts)=>parts.join('/')};
      if(name==='../pointer-target.js')return{pointerZone:()=> 'margin',decideWindowIgnore:()=>true};
      if(name==='../topmost-watchdog.js')return{TOPMOST_WATCHDOG_ENABLED:false,TOPMOST_WATCHDOG_TICK_MS:1000};
      if(name==='../taskbar-watchdog.js')return{shouldRunTaskbarWatchdog:()=>false,TASKBAR_WATCHDOG_TICK_MS:3000};
      throw Error(name);
    }};
  runInNewContext(readFileSync('vendor/dsh-pet/platform/runtime/electron-helper/main/windows.js','utf8'),context);
  const windows=context.module.exports.createWindows({BrowserWindow:Window,screen:{getAllDisplays:()=>[],getPrimaryDisplay:()=>({id:1})},
    buildDeskGeometry:()=>({hull:{x:0,y:0,width:1000,height:800},areas:[],workAreas:[],panels:[]}),dpi:{petScale:()=>1,currentPointer:()=>{pointerReads++;return{x:0,y:0};}},
    helperDir:'/fixture',topmostLevel:()=> 'floating',shouldReassertTopmost:()=>false,platform:{},taskbarWatchdogEnabled:false});
  windows.create();const win=created[0];assert.equal(c.count(),0,'An initially hidden window has no pointer/topmost pump');
  win.showInactive();assert.equal(win.throttled,false);c.advance(300);assert.ok(pointerReads>=4);
  win.hide();const before=pointerReads;assert.equal(win.throttled,true);assert.equal(c.count(),0);c.advance(5000);assert.equal(pointerReads,before);
  win.showInactive();c.advance(0);windows.setPresentationPaused(true);assert.equal(c.count(),0);assert.equal(win.throttled,true);
  assert.equal(windows.presentationState(win.webContents).visible,false);
  windows.setPresentationPaused(false);c.advance(120);assert.ok(pointerReads>before);assert.equal(windows.presentationState(win.webContents).visible,true);
  win.destroy();assert.equal(c.count(),0);
});

function adaptedRoom(){
  const source=readFileSync('src/room/assets.ts','utf8');
  const section=source.slice(source.indexOf('/** Preserve the shipped scene;'),source.indexOf('/** The public route serves'));
  const compiled=ts.transpileModule(section,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const adapt=runInNewContext(compiled+'\nexports.adaptRoomApp;',{exports:{},feelingLabels:{}});
  return adapt(readFileSync('vendor/feiyu-room-template/public/room/app.js','utf8'));
}
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

test('actual Room refresh reuses native changes, rejects stale snapshots and reads once after show',async()=>{
  const source=adaptedRoom();new Function(source.replace(/^import .*;\n/gm,''));
  const section=(start,end)=>{const at=source.indexOf(start),to=source.indexOf(end,at);assert.ok(at>=0&&to>at);return source.slice(at,to);};
  const c=clock(),doc=new Surface(),win=new Surface(),requests=[],loop={visible:false,setVisible(value){this.visible=value;},invalidate(){},dispose(){}},media={visible:false,setVisible(value){this.visible=value;},dispose(){}};
  let visibility,reads=0;
  win.chatpetRoomBridge={onChanged(){},onVisibility(fn){visibility=fn;return()=>{};}};
  const context={window:win,document:doc,console,performance:{now:c.now},Date,queueMicrotask,setTimeout:c.set,clearTimeout:c.clear,
    roomRequest:()=>{reads++;return new Promise(resolve=>requests.push(value=>resolve({ok:true,json:async()=>value})));},
    withToken:x=>x,createPresentationLoop:()=>loop,actor:{setSuspended(){}},mediaGate:media,
    gardenController:{setVisible(){},changed(){},destroy(){}},world:{updateEnvironment(){},setClock(){}},
    $:()=>({classList:{add(){},remove(){}},textContent:''}),renderHUD(){},syncCharacter(){},presentAnimationFeedback(){},syncTvOpinionTimer(){},clearOpenViewKeys(){},frame(){}};
  runInNewContext(`
    const SHOT=false;let nativeVisible=false,presentationReady=false,presentationNeedsSnapshot=true,presentationDisposed=false;
    let viewRefreshTimer,viewRefreshAt,presentationLoop,activeViewUntil=0,prevT=0,presentationGeneration=0;
    const displayAllowed=()=>!presentationDisposed&&!document.hidden&&nativeVisible;
    let state=null,roomView=null,visitRegistered=false,walkPredict=null,lastDisplayPos=null,placeHold=null,charDrag=null;
    let bubbleOn=false,lastActivity='',bubbleUntil=0,clickMarkerUntil=0,tvStream=null,tvCastPending=false;
    ${section('let requestInFlight = false;','let lastActivity =')}
    ${section('function applyState(next)','\nfunction renderHUD()')}
    ${section('async function poll()','// ── 主循环')}
    globalThis.view={start:startPresentation,changed:refreshCompanionRoom,snapshot:()=>state};
  `,context);
  const snapshot=revision=>({ok:true,now:1000,identity:{displayName:'Fixture'},behavior:{bootId:'boot',revision},her:{pos:[0,0],walking:false}});
  context.view.start();c.advance(0);assert.equal(reads,0);
  visibility({visible:true});c.advance(0);assert.equal(reads,1);assert.equal(loop.visible,false);
  context.view.changed({bootId:'boot',revision:2});c.advance(0);assert.equal(reads,1,'One in-flight read is coalesced');
  requests.shift()(snapshot(1));await settle();c.advance(0);assert.equal(reads,2,'Stale reply cannot postpone a pending native change behind retry backoff');
  assert.equal(loop.visible,false);requests.shift()(snapshot(2));await settle();assert.equal(loop.visible,true);assert.equal(media.visible,true);
  c.advance(60000);assert.equal(reads,2,'A healthy native connection has no periodic view reads');
  visibility({visible:false});context.view.changed({bootId:'boot',revision:3});c.advance(60000);assert.equal(reads,2);assert.equal(loop.visible,false);assert.equal(media.visible,false);
  visibility({visible:true});c.advance(0);assert.equal(reads,3);visibility({visible:false});requests.shift()(snapshot(3));await settle();assert.equal(loop.visible,false);
  visibility({visible:true});c.advance(0);assert.equal(reads,4);requests.shift()(snapshot(4));await settle();assert.equal(loop.visible,true);assert.equal(context.view.snapshot().behavior.revision,4);
  context.view.changed({bootId:'boot',revision:5});c.advance(0);assert.equal(reads,5);
  visibility({visible:false});visibility({visible:true});c.advance(0);assert.equal(reads,5);
  requests.shift()(snapshot(5));await settle();assert.equal(loop.visible,false,'A pre-hide reply cannot resume a later show generation');
  assert.equal(context.view.snapshot().behavior.revision,4,'The old generation cannot replace even an otherwise valid revision');
  c.advance(0);assert.equal(reads,6);requests.shift()(snapshot(6));await settle();assert.equal(loop.visible,true);assert.equal(context.view.snapshot().behavior.revision,6);
  win.emit('pagehide');assert.equal(c.count(),0);
});

test('Room preload cannot let a late initial visibility query overwrite a newer native event',async()=>{
  const ipc=new EventEmitter(),win=new Surface();let bridge,resolveInitial;
  ipc.invoke=()=>new Promise(resolve=>{resolveInitial=resolve;});ipc.send=()=>{};
  const context={window:win,queueMicrotask,require:()=>({ipcRenderer:ipc,contextBridge:{exposeInMainWorld:(_name,value)=>{bridge=value;}}})};
  runInNewContext(readFileSync('src/room/window-preload.cjs','utf8'),context);
  const seen=[];bridge.onVisibility(value=>seen.push(value.visible));
  ipc.emit('chatpet-room:visibility',null,{visible:false,revision:2});resolveInitial({visible:true,revision:1});await settle();
  assert.deepEqual(seen,[false]);ipc.emit('chatpet-room:visibility',null,{visible:true,revision:3});assert.deepEqual(seen,[false,true]);
  win.emit('unload');assert.equal(ipc.listenerCount('chatpet-room:visibility'),0);
});

test('desktop bridge clears completed request deadlines and retains real timeout failures',async()=>{
  const c=clock();let receive;
  const context={module:{exports:{}},console,setTimeout:c.set,clearTimeout:c.clear,process:{stdout:{write(){}}},
    require:name=>{
      if(name==='node:fs/promises')return{};
      if(name==='../range.js')return{parseRange(){}};
      if(name==='node:http')return{createServer:handler=>{receive=handler;return{on(){},listen(_port,_host,ready){ready();},address:()=>({port:12345})};}};
      throw Error(name);
    }};
  runInNewContext(readFileSync('vendor/dsh-pet/platform/runtime/electron-helper/main/bridge.js','utf8'),context);
  const bridge=context.module.exports.createBridge({isBridge:true,prefix:'fixture:'});bridge.startCallback();
  const response=bridge.hostRequest('GET','/fixture');assert.equal(c.count(),1);
  const req=Object.assign(new EventEmitter(),{method:'POST',url:'/respond'});receive(req,{writeHead(){},end(){}});
  req.emit('data',JSON.stringify({id:1,status:200,body:'done'}));req.emit('end');assert.equal((await response).body,'done');assert.equal(c.count(),0);
  const failed=bridge.hostRequest('GET','/fixture');c.advance(45000);await assert.rejects(failed,/timeout/);assert.equal(c.count(),0);
});

test('desktop physical interactions receive stable request identifiers before bridge transport',async()=>{
  const c=clock(),sent=[];let receive,sequence=0;
  const context={module:{exports:{}},console,setTimeout:c.set,clearTimeout:c.clear,
    process:{stdout:{write(line){sent.push(JSON.parse(line.slice('fixture:'.length)));}}},
    require:name=>{
      if(name==='node:fs/promises')return{};
      if(name==='node:crypto')return{randomUUID:()=>`click-${++sequence}`};
      if(name==='../range.js')return{parseRange(){}};
      if(name==='node:http')return{createServer:handler=>{receive=handler;return{on(){},listen(_port,_host,ready){ready();},address:()=>({port:12345})};}};
      throw Error(name);
    }};
  runInNewContext(readFileSync('vendor/dsh-pet/platform/runtime/electron-helper/main/bridge.js','utf8'),context);
  const bridge=context.module.exports.createBridge({isBridge:true,prefix:'fixture:'});bridge.startCallback();
  const finish=async(promise)=>{const req=Object.assign(new EventEmitter(),{method:'POST',url:'/respond'});receive(req,{writeHead(){},end(){}});
    req.emit('data',JSON.stringify({id:sent.at(-1).id,status:200,body:'ok'}));req.emit('end');await promise;};
  await finish(bridge.hostRequest('POST','/chatpet-presentation/anim?pet=main',JSON.stringify({name:'meal'})));
  const original=JSON.parse(sent[0].body);assert.equal(original.requestId,'click-1');assert.equal(original.name,'meal');
  await finish(bridge.hostRequest('POST','/chatpet-presentation/anim?pet=main',sent[0].body));
  assert.equal(JSON.parse(sent[1].body).requestId,original.requestId);
  await finish(bridge.hostRequest('POST','/chatpet-presentation/wake'));
  assert.equal(JSON.parse(sent[2].body).requestId,'click-2');assert.equal(c.count(),0);
});

test('a late screen picker cannot attach a stream after hide, hide/show or pagehide',async()=>{
  const source=adaptedRoom();
  const section=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
  for(const ending of ['hide','hide-show','pagehide']) {
    const c=clock(),doc=new Surface(),win=new Surface();let visibility,resolveMedia,stopped=0,created=0;
    doc.createElement=()=>{created++;throw Error('An obsolete capture must not create visual media');};
    win.chatpetRoomBridge={onChanged(){},onVisibility(fn){visibility=fn;return()=>{};}};
    const context={window:win,document:doc,navigator:{mediaDevices:{getDisplayMedia:()=>new Promise(resolve=>{resolveMedia=resolve;})}},
      console,performance:{now:c.now},setTimeout:c.set,clearTimeout:c.clear,
      createPresentationLoop:()=>({setVisible(){},invalidate(){},dispose(){}}),frame(){},
      actor:{setSuspended(){}},mediaGate:{setVisible(){},dispose(){}},gardenController:{setVisible(){},destroy(){}},
      $:()=>({classList:{remove(){}}}),syncTvOpinionTimer(){},clearOpenViewKeys(){},toast(){},tvCastUnavailableReason:()=>'',stopTvCast(){},roomRequest:()=>new Promise(()=>{}),withToken:x=>x};
    runInNewContext(`
      const SHOT=false;let presentationGeneration=0,nativeVisible=false,presentationReady=false,presentationNeedsSnapshot=true,presentationDisposed=false;
      let viewRefreshTimer,viewRefreshAt,presentationLoop,activeViewUntil=0,prevT=0,requestInFlight=false,visitRegistered=false;
      const displayAllowed=()=>!presentationDisposed&&!document.hidden&&nativeVisible;
      let tvStream=null,tvCastPending=false,tvCastGeneration=0,tvOpinionRequest=null,tvOpinionBusy=false;const tvMat={};
      let state=null,charDrag=null,clickMarkerUntil=0;
      ${section('function cancelTvOpinion()', 'async function requestTvOpinion(')}
      ${section('async function startTvCast()', '\nconst scene =')}
      ${section('async function poll()', '// ── 主循环')}
      globalThis.view={start:startPresentation,capture:startTvCast,stream:()=>tvStream};
    `,context);
    context.view.start();visibility({visible:true});const capture=context.view.capture();
    if(ending==='pagehide')win.emit('pagehide');
    else {visibility({visible:false});if(ending==='hide-show')visibility({visible:true});}
    resolveMedia({getTracks:()=>[{stop(){stopped++;}}]});await capture;
    assert.equal(stopped,1,ending);assert.equal(created,0,ending);assert.equal(context.view.stream(),null,ending);
    win.emit('pagehide');
  }
});

function generatedHelperEvents(){
  return readFileSync('vendor/dsh-pet/platform/runtime/electron-helper/events.js','utf8');
}

test('generated desktop fresh snapshots reconstruct lock state without replaying hidden commands',async()=>{
  const source=generatedHelperEvents(),shared=readFileSync('vendor/dsh-pet/platform/runtime/electron-helper/shared-core.js','utf8');
  const readLock=runInNewContext(shared.slice(shared.indexOf('function readLock('),shared.indexOf('function readSleep('))+'\nreadLock;');
  const start=source.indexOf('async function pollStateOnce()'),end=source.indexOf('\nfunction startLoops()',start);
  let snapshot,ready=0,transients=0;
  const sprite={pet:{id:'main'},frozen:false,sleeping:false,setLock(value){this.frozen=value.locked===true;},playIdle(){}};
  const context={sprites:[sprite],STATE_URL:'/fixture',S:{fetchState:async()=>snapshot,flattenCounters:()=>({}),takeChanged:()=>[],readLock},
    companionPresentation:{wantsVisible:()=>true,ticket:()=>1,accepts:()=>true,ready:()=>{ready++;}},
    refreshCompanionPresentation:async()=>{},applyMenuLeaf(){},applySleepLeaf(){},applySayLeaf(){transients++;},applyAnimLeaf(){transients++;}};
  runInNewContext(`let stateBaseline=null,stateSince,stateLongPoll=true;${source.slice(start,end)}
    globalThis.view={poll:pollStateOnce,reset:()=>{stateBaseline=null;}};`,context);
  const snap=lock=>({counter:1,sections:{},pets:{main:{lock,say:{data:{text:'old'}},anim:{data:{name:'old'}}}}});
  snapshot=snap({data:{locked:true,expiresAt:Date.now()+60000}});await context.view.poll();assert.equal(sprite.frozen,true);
  context.view.reset();snapshot=snap({data:{locked:false}});await context.view.poll();assert.equal(sprite.frozen,false);
  sprite.frozen=true;context.view.reset();snapshot=snap(undefined);await context.view.poll();assert.equal(sprite.frozen,false);
  assert.equal(ready,3);assert.equal(transients,0);
});

test('desktop resume does not restart frozen or superseded video layers',()=>{
  const doc=new Surface(),front=doc.video(),old=doc.video();let notify;
  const sprite={videoA:front,videoB:old,front:0,frozen:true,stopMove(){},stopThrow(){},stopDragFollow(){},stopSquash(){},syncInputBusy(){}};
  const view=createDesktopPresentationLifecycle({document:doc,sprites:()=>[sprite],wake(){},reset(){},subscribe:fn=>{notify=fn;}});
  notify({visible:true});view.ready();assert.equal(front.paused,true);assert.equal(old.paused,true);
  view.dispose();
});
