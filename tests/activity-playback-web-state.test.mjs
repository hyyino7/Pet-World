import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createContext,runInContext} from 'node:vm';
import ts from 'typescript';

// Execute the generated PetMulti effects and card visibility/refresh callbacks.
// Only React setters, transport, clock and video surfaces are substituted. No
// application, real network, installation or personal companion data is used.
const source=process.env.CHATPET_PLAYBACK_WEB_TEST_ARCHIVE
  ? execFileSync('/usr/bin/tar',['-xOf',process.env.CHATPET_PLAYBACK_WEB_TEST_ARCHIVE,'package/src/desktop/platform/client.js'],{encoding:'utf8',maxBuffer:8*1024*1024})
  : readFileSync('src/desktop/platform/client.js','utf8');
const tree=ts.createSourceFile('client.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
function find(predicate,node=tree) {
  if(predicate(node))return node;
  let result;ts.forEachChild(node,child=>{result??=find(predicate,child);});return result;
}
const declaration=name=>{
  const node=find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name
    ||ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(tree)===name));
  assert.ok(node,'Generated declaration missing: '+name);return node.getText(tree);
};
function effectNode(owner,needle) {
  const fn=find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===owner);
  assert.ok(fn,'Generated owner missing: '+owner);
  const node=find(n=>ts.isCallExpression(n)&&n.expression.getText(tree)==='useEffect'
    &&n.arguments[0]?.getText(tree).includes(needle),fn);
  assert.ok(node,'Generated effect missing: '+owner+' / '+needle);
  return node;
}
const effect=(owner,needle)=>effectNode(owner,needle).arguments[0].getText(tree);
const configEffect=effect('createPetMulti','配置响应不是成品聚合');
const stateEffect=effect('createPetMulti','runStatePoll');
const stateEffectCall=effectNode('createPetMulti','runStatePoll').getText(tree);
const cardVisibilityEffect=effect('createCardAnimation','visibilitychange');
const cardRefreshCall=effectNode('createCardAnimation','ownAnim.refreshCompanion').getText(tree);
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function clock() {
  let value=100_000,id=0;const jobs=new Map();
  return {now:()=>value,set:(fn,ms)=>{const key=++id;jobs.set(key,{fn,at:value+ms});return key;},clear:key=>jobs.delete(key),
    count:()=>jobs.size,next:()=>Math.min(...Array.from(jobs.values(),j=>j.at)),
    advance(ms){const until=value+ms;let count=0;while(true){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next||next[1].at>until)break;assert.ok(++count<100,'No unbounded config retry pump');
      value=next[1].at;jobs.delete(next[0]);next[1].fn();}value=until;}};
}
const leaf=(data,counter=1)=>({data,counter});
const snapshot=(pets={},counter=1)=>({counter,sections:{},pets});
const playback=(key='current')=>({version:1,key,kind:'read',activityId:key,phase:'working',startedAt:99_000,
  segments:[{roomClip:'life-read',desktopClip:'read',mode:'loop',durationMs:2000}],gap:false,toolOwner:'none'});
const merged=key=>({main:{pets:[{id:'main',display:'web',animations:{idle:['idle'],events:{}},companionPlayback:playback(key)}]}});

class Video extends EventTarget {
  constructor(){super();this.style={};this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),contains:x=>this.classes.has(x)};
    this.currentTime=0;this.duration=2;this.readyState=0;this.paused=true;this.src='';this.loads=0;}
  load(){this.readyState=0;this.loads++;}
  pause(){this.paused=true;}
  play(){this.paused=false;return Promise.resolve();}
  ready(){this.readyState=3;this.dispatchEvent(new Event('loadeddata'));}
}

function fixture(autoState=false) {
  const c=clock(),document=new EventTarget();document.hidden=false;
  const requests=[],assetRequests=[],applied=[],errors=[],polls=[],ticks={};
  let active=0,maxActive=0,cfg={id:'main',animations:{events:{},idle:['idle']}},currentHook='card';
  const hookDependencies=new Map(),hookCleanups=new Map();
  const a=new Video(),b=new Video(),petBridge={reload(){},current:[]};
  const count=name=>()=>{ticks[name]=(ticks[name]??0)+1;};
  const fetch=(_url,options={})=>new Promise((resolve,reject)=>{
    active++;maxActive=Math.max(maxActive,active);
    const request={options,done:false,
      success(body,deferBody=false){if(this.done)return;this.done=true;active--;
        const json=deferBody?()=>new Promise(done=>{this.finishBody=()=>done(body);}):async()=>body;
        resolve({ok:true,json});},
      fail(){if(this.done)return;this.done=true;active--;reject(Error('temporary config failure'));}};
    requests.push(request);
    options.signal?.addEventListener('abort',()=>request.fail(),{once:true});
  });
  const context=createContext({console:{error:(...args)=>errors.push(args),warn(){}},AbortController,document,petBridge,
    Date:{now:c.now},setTimeout:c.set,clearTimeout:c.clear,window:{setTimeout:c.set,clearTimeout:c.clear},fetch,
    ROUTE_PATH:'/presentation',STATE_WAIT_MS:10_000,STATE_FALLBACK_MS:1000,
    setClickSoundEnabled(){},setSurface(){},setVoiceConfig(){},setVoiceNotifyEnabled(){},
    flattenConfigPets:value=>value.main.pets,
    cfgRef:{current:cfg},
    useEffect:(callback,deps)=>{const before=hookDependencies.get(currentHook);
      const changed=!before||deps.length!==before.length||deps.some((x,i)=>!Object.is(x,before[i]));
      hookDependencies.set(currentHook,Array.from(deps));if(changed){hookCleanups.get(currentHook)?.();hookCleanups.set(currentHook,callback());}},
    setPets:value=>{applied.push(value);cfg=value[0];context.cfgRef.current=cfg;if(context.ownAnim)runInContext(cardRefreshCall,context);},
    setReady:value=>{if(context.ready===value)return;context.ready=value;if(autoState)renderStateEffect();},
    ready:!autoState,lockRef:{current:{}},sleepRef:{current:{}},menuItemsRef:{current:[]},lastFocusTsRef:{current:0},
    setLockTick:count('lock'),setSleepTick:count('sleep'),setMenuItems(){},setStateSnapshot(){},readMenuItems:()=>[],
    jumpToSession(){},applyBalanceRef:{current(){}},setWorkStatus(){},setWorkStatusTick(){},speakWorkStatus(){},notifyFromFrame(){},
    readBalance:()=>null,readWorkStatus:()=>null,sayRef:{current:{}},animCueRef:{current:{}},posCueRef:{current:{}},throwCueRef:{current:{}},
    setSayTick(){},setAnimCueTick(){},setPosCueTick(){},setThrowCueTick(){},readSay:()=>null,readAnim:()=>null,readPosition:()=>null,readThrow:()=>null,
    fetchState(){assert.fail('The poll transport is a fixture boundary');},runStatePoll:deps=>polls.push(deps),
    ASSET_FETCH_TIMEOUT_MS:10_000,ANIMATION_EXT:'.webm',REASON_DECODE:'decode',REASON_ASSET_LOAD:'load',REASON_SUPERSEDED:'superseded',REASON_FROZEN:'frozen',REASON_PLAY_REJECTED:'play',
    isEventAnim:()=>false,animationAssetUrl:({anim})=>anim,thumbExt:()=>'.webm',observeCompanionRandomPlayback(){},
    createAssetLoader:()=>({load(url,callbacks){assetRequests.push({url,...callbacks});},release(){},abortAll(){}}),
    decideEndedCue:()=>({kind:'ignore'})});
  const declarations=['walkLeaves','flattenCounters','takeChanged','SECTION_LEAF_NAMES','PET_LEAF_NAMES',
    'isSectionLeafName','isPetLeafName','resolveLeafPath','readLock','readSleep','FOCUS_REPLAY_WINDOW_MS','readFocusSession','freezeDeadline',
    'sampleActivityPlayback','createActivityPlaybackController','createOwnAnimation'];
  runInContext(declarations.map(declaration).join('\n'),context);
  const disposeConfig=runInContext('('+configEffect+')()',context);
  let disposeCard,disposeState;
  function renderStateEffect() {
    currentHook='state';runInContext(stateEffectCall,context);currentHook='card';
    disposeState=()=>hookCleanups.get('state')?.();
  }
  if(autoState)renderStateEffect();
  function mountCard() {
    context.ownAnim=context.createOwnAnimation({cfg:()=>cfg,videoA:()=>a,videoB:()=>b,
      report(){},clearCuePlayback(){},facing:()=> 'left',onFrontReady(){},currentAnim:()=>'',workStatus:()=>null,onEnded(){},isDragging:()=>false});
    disposeCard=runInContext('('+cardVisibilityEffect+')()',context);
    runInContext(cardRefreshCall,context);
  }
  const finishVideo=()=>{const request=assetRequests.at(-1);assert.ok(request,'A real generated card requested media');
    const url='blob:'+request.url;request.onObjectUrl(url);(a.src===url?a:b).ready();};
  const visible=value=>{document.hidden=!value;document.dispatchEvent(new Event('visibilitychange'));};
  return {c,context,requests,applied,errors,polls,ticks,a,b,assetRequests,mountCard,finishVideo,visible,
    active:()=>active,maxActive:()=>maxActive,front:()=>context.ownAnim.frontVideo(),
    mountState(){disposeState=runInContext('('+stateEffect+')()',context);},
    deliver(value){const poll=polls.at(-1);assert.ok(poll);if(poll.isAlive())poll.onState(value);},
    frozen:petId=>runInContext('freezeDeadline(lockRef.current['+JSON.stringify(petId)+'],Date.now())>0',context),
    dispose(){disposeCard?.();disposeConfig?.();disposeState?.();context.ownAnim?.dispose();}};
}

test('web first state restores an already active lock with the existing lock reader',()=>{
  const f=fixture();f.mountState();f.deliver(snapshot({main:{lock:leaf({locked:true,expiresAt:101_000}),
    sleep:leaf({sleeping:true,start:'in',loop:'loop',end:'out'})}}));
  assert.equal(f.frozen('main'),true);assert.ok(f.ticks.lock>0);assert.equal(f.context.sleepRef.current.main.sleeping,true);
  f.dispose();assert.equal(f.polls[0].isAlive(),false);
});

for(const [name,lock]of [['expired',{locked:true,expiresAt:99_000}],['released',{locked:false}],['malformed',{locked:true,expiresAt:'future'}],['missing',undefined]])
  test('web first state does not freeze a '+name+' lock',()=>{
    const f=fixture();f.mountState();f.deliver(snapshot({main:lock===undefined?{}:{lock:leaf(lock)}}));
    assert.equal(f.frozen('main'),false);f.dispose();
  });

test('web first state honors each pet lock and later counters release only the addressed pet',()=>{
  const f=fixture();f.mountState();const first=snapshot({main:{lock:leaf({locked:true,expiresAt:110_000})},
    other:{lock:leaf({locked:true,expiresAt:120_000})}});f.deliver(first);
  assert.equal(f.frozen('main'),true);assert.equal(f.frozen('other'),true);
  f.deliver(snapshot({main:{lock:leaf({locked:false},2)},other:first.pets.other},2));
  assert.equal(f.frozen('main'),false);assert.equal(f.frozen('other'),true);f.dispose();
});

test('web first state closes the initial config race once without resetting its counter baseline',async()=>{
  const f=fixture(true);assert.equal(f.polls.length,0,'State consumption waits for initial config readiness');
  f.requests[0].success(merged('before-body-transition'));await flush();assert.equal(f.polls.length,1);
  f.mountCard();f.finishVideo();assert.equal(f.applied.at(-1)[0].companionPlayback.key,'before-body-transition');
  const first=snapshot({},2);first.sections.config=leaf({},2);
  f.deliver(first);await flush();assert.equal(f.requests.length,2,'First state must trigger one fresh config read');
  for(let i=0;i<5;i++)f.deliver(structuredClone(first));await flush();
  assert.equal(f.requests.length,2,'The same first counter must not continually supersede the fresh request');
  f.requests[1].success(merged('after-body-transition'));await flush();f.finishVideo();
  assert.equal(f.applied.length,2);assert.equal(f.applied.at(-1)[0].companionPlayback.key,'after-body-transition');
  assert.equal(f.front().paused,false);assert.equal(f.polls.length,1,'A fresh config must not remount the state effect');
  for(let i=0;i<5;i++)f.deliver(structuredClone(first));await flush();
  assert.equal(f.requests.length,2);assert.equal(f.c.count(),0);assert.equal(f.maxActive(),1);f.dispose();
});

test('web config failure schedules one visible retry and success resumes the waiting card',async()=>{
  const f=fixture();f.requests[0].success(merged('initial'));await flush();f.mountCard();f.finishVideo();assert.equal(f.front().paused,false);
  f.visible(false);assert.equal(f.front().paused,true);f.visible(true);await flush();
  assert.equal(f.active(),1);assert.equal(f.front().paused,true,'A stale card remains suspended before fresh config');
  f.requests.at(-1).fail();await flush();assert.equal(f.c.count(),1,'One retry timer survives temporary failure');
  f.c.advance(f.c.next()-f.c.now());await flush();assert.equal(f.active(),1);
  f.requests.at(-1).success(merged('fresh'));await flush();
  // Coalesced visibility/reload requests may require one final fresh fetch.
  if(f.active()){f.requests.at(-1).success(merged('fresh'));await flush();}
  f.finishVideo();assert.equal(f.applied.at(-1)[0].companionPlayback.key,'fresh');assert.equal(f.front().paused,false);
  assert.equal(f.maxActive(),1);assert.equal(f.c.count(),0);f.dispose();
});

test('web repeated reloads retain one in-flight config request and apply only the newest request',async()=>{
  const f=fixture();for(let i=0;i<30;i++)f.context.petBridge.reload();await flush();
  assert.equal(f.active(),1);f.requests[0].success(merged('obsolete'));await flush();
  assert.equal(f.applied.length,0,'Superseded initial response cannot apply');assert.equal(f.active(),1);
  f.requests.at(-1).success(merged('latest'));await flush();assert.equal(f.applied.length,1);
  assert.equal(f.applied[0][0].companionPlayback.key,'latest');assert.equal(f.maxActive(),1);f.dispose();
});

test('web hiding cancels visible retry work and visible return requests fresh config once',async()=>{
  const f=fixture();f.requests[0].fail();await flush();assert.equal(f.c.count(),1);
  f.visible(false);assert.equal(f.c.count(),0);const before=f.requests.length;f.c.advance(300_000);await flush();
  assert.equal(f.requests.length,before);f.visible(true);await flush();assert.equal(f.active(),1);
  f.requests.at(-1).success(merged('visible'));await flush();assert.equal(f.applied.at(-1)[0].companionPlayback.key,'visible');
  assert.equal(f.c.count(),0);f.dispose();
});

test('web stale JSON completion after hide and show cannot replace the fresh config',async()=>{
  const f=fixture();f.requests[0].success(merged('stale-json'),true);await flush();
  assert.equal(f.applied.length,0);f.visible(false);f.visible(true);await flush();
  assert.equal(f.requests.length,1,'The existing config operation remains the only in-flight operation');
  f.requests[0].finishBody();await flush();assert.equal(f.applied.length,0);
  assert.equal(f.requests.length,2);f.requests[1].success(merged('fresh-json'));await flush();
  assert.equal(f.applied.length,1);assert.equal(f.applied[0][0].companionPlayback.key,'fresh-json');f.dispose();
});

test('web fresh cfg-object effect releases a hidden retirement even when both descriptors are absent',async()=>{
  const f=fixture();f.requests[0].success(merged('shared'));await flush();f.mountCard();f.finishVideo();
  f.visible(false);const retired=merged('retired');delete retired.main.pets[0].companionPlayback;
  f.context.setPets(retired.main.pets);assert.equal(f.front().paused,true);
  f.visible(true);await flush();const fresh=merged('custom');delete fresh.main.pets[0].companionPlayback;
  f.requests.at(-1).success(fresh);await flush();f.finishVideo();
  assert.equal(f.front().paused,false);assert.equal(f.front().src,'blob:idle');f.dispose();
});

test('web repeated config failures keep one bounded retry timer and success clears it',async()=>{
  const f=fixture();
  for(let i=0;i<8;i++){
    assert.equal(f.active(),1);f.requests.at(-1).fail();await flush();assert.equal(f.c.count(),1);
    const wait=f.c.next()-f.c.now();assert.ok(wait>0&&wait<=30_000);f.c.advance(wait);await flush();
  }
  f.requests.at(-1).success(merged('recovered'));await flush();assert.equal(f.c.count(),0);assert.equal(f.applied.length,1);
  assert.equal(f.maxActive(),1);f.dispose();
});

test('web dispose aborts pending config and suppresses late application and timers',async()=>{
  const f=fixture(),first=f.requests[0];f.dispose();first.success(merged('too-late'));await flush();
  assert.equal(f.applied.length,0);assert.equal(f.c.count(),0);const count=f.requests.length;
  f.context.petBridge.reload();f.visible(false);f.visible(true);f.c.advance(60_000);await flush();assert.equal(f.requests.length,count);
});

test('web JSON completion after disposal cannot apply or start a retry',async()=>{
  const f=fixture();f.requests[0].success(merged('late-body'),true);await flush();f.dispose();
  f.requests[0].finishBody();await flush();assert.equal(f.applied.length,0);assert.equal(f.c.count(),0);assert.equal(f.requests.length,1);
});
