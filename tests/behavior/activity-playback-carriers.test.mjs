import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import ts from 'typescript';

// Actual generated carriers, with only video/clock/asset transport substituted.
// No application, model, account, installer or personal workspace is used.
const native = readFileSync('vendor/dsh-pet/platform/runtime/electron-helper/events.js','utf8');
const web = readFileSync('src/desktop/platform/client.js','utf8');
function declaration(source,name) {
  const ast=ts.createSourceFile('carrier.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  let found;
  function visit(node) {
    if(ts.isFunctionDeclaration(node)&&node.name?.text===name)found=node.getText(ast);
    if(ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>ts.isObjectBindingPattern(row.name)
      &&row.name.elements.some(entry=>entry.name.getText(ast)===name)))found=node.getText(ast);
    if(!found)ts.forEachChild(node,visit);
  }
  visit(ast);assert.ok(found,'Generated carrier lost '+name);return found;
}
function clock() {
  let now=100_000,sequence=0;const jobs=new Map();
  return {now:()=>now,set:(fn,ms)=>{const id=++sequence;jobs.set(id,{fn,at:now+ms});return id;},clear:id=>jobs.delete(id),
    count:()=>jobs.size,
    advance(ms){const until=now+ms;let turns=0;while(true){const first=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];
      if(!first||first[1].at>until)break;assert.ok(++turns<100,'No animation polling loop');
      now=first[1].at;jobs.delete(first[0]);first[1].fn();}now=until;}};
}
class Video extends EventTarget {
  constructor(){super();this.listeners=new Map();this.style={visibility:'',transform:''};this.onended=null;this.classes=new Set();this.classList={
    add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),contains:name=>this.classes.has(name)};
    this.duration=2;this.readyState=0;this.currentTime=0;this.paused=true;this.plays=0;this.loads=0;this.src='';this.tagName='VIDEO';}
  addEventListener(type,fn,options={}){super.addEventListener(type,fn,options);const rows=this.listeners.get(type)||[];rows.push({fn,options});this.listeners.set(type,rows);}
  removeEventListener(type,fn){super.removeEventListener(type,fn);this.listeners.set(type,(this.listeners.get(type)||[]).filter(row=>row.fn!==fn));}
  emit(type){const property=event=>this['on'+type]?.(event);super.addEventListener(type,property);
    this.dispatchEvent(new Event(type));super.removeEventListener(type,property);}
  ready(){this.readyState=3;this.emit('loadeddata');}
  load(){this.readyState=0;this.loads++;}
  pause(){this.paused=true;}
  play(){this.plays++;if(this.playFailure==='throw')throw Error('play rejected');
    if(this.playFailure==='reject')return Promise.reject(Error('play rejected'));this.paused=false;return Promise.resolve();}
}
const descriptor=(key='read-1',startedAt=99_500,mode='loop')=>({version:1,key,activityId:key,phase:'working',kind:'read',startedAt,
  segments:[{roomClip:'life-read',desktopClip:'生活-专心阅读',mode,durationMs:2000}],gap:false,toolOwner:'none'});
function harness(kind) {
  const c=clock(),a=new Video(),b=new Video(),document=new EventTarget();document.hidden=false;document.querySelectorAll=()=>[a,b];
  let cfg={id:'main',companionPlayback:descriptor(),animations:{events:{},idle:['idle']}};
  const reports=[],requests=[],observations=[];let disposed=false,notice;
  class FixtureDate extends Date {constructor(...args){super(...(args.length?args:[c.now()]));}static now(){return c.now();}}
  const context=createContext({console,document,Date:FixtureDate,setTimeout:c.set,clearTimeout:c.clear,
    window:{setTimeout:c.set,clearTimeout:c.clear},S:{ANIMATION_EXT:'.webm',rollKind:()=> 'idle',pick:items=>items[0]},
    REASON_DECODE:'decode-error',REASON_ASSET_LOAD:'asset-load',REASON_SUPERSEDED:'superseded',REASON_PLAY_REJECTED:'play-rejected',
    REASON_FROZEN:'frozen',ASSET_FETCH_TIMEOUT_MS:10000,
    ANIMATION_EXT:JSON.parse(web.match(/const ANIMATION_EXT = ("[^"]+");/)[1]),
    isEventAnim:()=>false,animationAssetUrl:({anim})=>anim,thumbExt:()=>'.webm',
    observeCompanionRandomPlayback:(...args)=>observations.push(args),
    decideEndedCue:()=>({kind:'old-random-chain'}),
    createAssetLoader:()=>({load(url,{onObjectUrl,onError}){requests.push({url,onObjectUrl,onError});},release(){},abortAll(){disposed=true;}})});
  runInContext(declaration(kind==='native'?native:web,'sampleActivityPlayback')+'\n'
    +declaration(kind==='native'?native:web,'createActivityPlaybackController'),context);
  let player,sprite;
  if(kind==='native') {
    runInContext('class PetSprite {}; PetSprite.prototype.dispose=function(){}; PetSprite.prototype.onMenuAction=function(){};globalThis.Sprite=PetSprite;',context);
    runInContext(readFileSync('vendor/dsh-pet/platform/runtime/electron-helper/sprite/playback.js','utf8'),context);
    runInContext(declaration(native,'installNativeActivityPlayback'),context);
    context.lifecycle={canPresent:()=>!document.hidden};
    runInContext('installNativeActivityPlayback(Sprite,{sample:sampleActivityPlayback,lifecycle});',context);
    sprite=new context.Sprite();Object.assign(sprite,{pet:cfg,animations:cfg.animations,weights:{idle:100},assetBase:'/',gen:0,front:0,videoA:a,videoB:b,pending:null,
      facing:'right',stopMove(){},stopThrow(){},stopDragFollow(){},stopSquash(){},syncInputBusy(){},
      renderBubble(){},resumeSleepAnim:()=>false,resumeWorkStatusAnim:()=>false,
      reportPlayback:(...args)=>reports.push(args),showWhisper:text=>notice=text});
    player={switchTo:(...args)=>sprite.switchTo(...args),refreshCompanion:()=>sprite.applyCompanionPlayback(true),
      suspendCompanion:()=>sprite.companionPlaybackController?.suspend(),dispose:()=>sprite.dispose(),
      setFrozen:next=>sprite.applyFreeze(next)};
  } else {
    runInContext(declaration(web,'createOwnAnimation')+'\nglobalThis.make=createOwnAnimation;',context);
    player=context.make({cfg:()=>cfg,videoA:()=>a,videoB:()=>b,report:(...args)=>reports.push(args),
      clearCuePlayback(){},facing:()=> 'right',onFrontReady(){},currentAnim:()=>'',workStatus:()=>null,
      onEnded:()=>assert.fail('Accepted body entered old ended chain'),isDragging:()=>false});
  }
  return {c,a,b,player,sprite,context,reports,requests,document,observations,
    cfg:()=>cfg,set(next){cfg={...cfg,companionPlayback:next};if(sprite)sprite.pet=cfg;},
    start(){player.switchTo('unrelated',true,null);},
    ready(index=requests.length-1){let target;if(kind==='web'){const url='blob:'+requests[index].url;requests[index].onObjectUrl(url);target=a.src===url?a:b;}else target=sprite.front===0?b:a;target.ready();},
    front(){return sprite?(sprite.front===0?a:b):player.frontVideo();},
    notice:()=>notice,disposed:()=>disposed};
}

async function release(h,carrier,idle=['legacy']) {
  h.set(undefined);h.cfg().animations.idle=idle;
  if(carrier==='web'){h.player.refreshCompanion();return;}
  Object.assign(h.context,{sprites:[h.sprite],config:{pets:[h.sprite.pet]},
    companionPresentation:{ticket:()=>1,accepts:()=>true},
    loadConfig:async()=>({pets:[{id:'main',animations:{idle},animationWeights:{idle:100}}]})});
  runInContext(declaration(native,'refreshCompanionPresentation')+'\nglobalThis.refresh=refreshCompanionPresentation;',h.context);
  assert.equal(await h.context.refresh(),true);
}

for(const carrier of ['native','web']) {
  test(carrier+': first playback seeks to shared progress and incidental selections do not reload it',()=>{
    const h=harness(carrier);h.start();h.ready();const front=h.front();assert.equal(front.currentTime,.5);assert.equal(front.paused,false);
    const loads=h.a.loads+h.b.loads,at=front.currentTime;h.c.advance(300);
    h.player.switchTo('chat-emotion',true,'unrelated-cue');h.player.switchTo('drag',true,null);
    assert.equal(h.a.loads+h.b.loads,loads);assert.equal(front.currentTime,at);
    assert.ok(h.reports.some(row=>row[0]==='unrelated-cue'&&row[1]==='cancelled'));
  });
  test(carrier+': repeated one-shot holds final pose without random chaining or business effects',()=>{
    const h=harness(carrier);h.set(descriptor('reaction',99_500,'once'));h.start();h.ready();
    assert.equal(h.c.count(),1);h.c.advance(1600);assert.equal(h.front().paused,true);
    assert.ok(h.front().currentTime>1.99);assert.equal(h.c.count(),0);
    const loads=h.a.loads+h.b.loads;h.front().emit('ended');assert.equal(h.a.loads+h.b.loads,loads);
  });
  test(carrier+': a new operation with the same clip has its own progress',()=>{
    const h=harness(carrier);h.start();h.ready();const loads=h.a.loads+h.b.loads;
    h.set(descriptor('read-2',99_900));h.start();h.ready();assert.equal(h.a.loads+h.b.loads,loads+1);
    assert.ok(Math.abs(h.front().currentTime-.1)<.001);
  });
  test(carrier+': sleep entry advances to shared loop using one boundary timer',()=>{
    const h=harness(carrier);h.set({...descriptor('sleep',99_500),kind:'sleep',segments:[
      {roomClip:'sleep_in',desktopClip:'enter',mode:'once',durationMs:2000},
      {roomClip:'sleep_loop',desktopClip:'sleep-loop',mode:'loop',durationMs:2000}]});
    h.start();h.ready();assert.equal(h.c.count(),1);h.c.advance(1600);h.ready();assert.equal(h.front().loop,true);
    assert.equal(h.c.count(),0);assert.ok(Math.abs(h.front().currentTime-.1)<.001);
  });
  test(carrier+': hidden state cancels boundary work and a fresh resume skips past entry',()=>{
    const h=harness(carrier);h.set(descriptor('reaction',99_500,'once'));h.start();h.ready();
    h.document.hidden=true;h.player.suspendCompanion();assert.equal(h.c.count(),0);assert.equal(h.front().paused,true);
    h.c.advance(30_000);h.document.hidden=false;h.set(descriptor('new-current-read',h.c.now()-700));
    h.player.refreshCompanion();h.ready();assert.equal(h.front().paused,false);assert.equal(h.front().currentTime,.7);
  });
  test(carrier+': late first-frame delivery from a hidden load cannot start old activity',()=>{
    const h=harness(carrier);h.start();h.document.hidden=true;h.player.suspendCompanion();h.ready();
    assert.equal(h.a.paused,true);assert.equal(h.b.paused,true);assert.equal(h.c.count(),0);
    h.document.hidden=false;h.set(descriptor('resumed',h.c.now()-900));h.player.refreshCompanion();h.ready();
    assert.equal(h.front().currentTime,.9);
  });
  test(carrier+': superseded asynchronous loads cannot become the front activity',()=>{
    const h=harness(carrier);h.start();h.set({...descriptor('new-drink',99_750),kind:'drink',segments:[
      {roomClip:'life-drink',desktopClip:'drink',mode:'loop',durationMs:2000}]});h.start();
    if(carrier==='web')h.requests[0].onObjectUrl('blob:obsolete');
    else h.b.emit('loadeddata');
    h.ready();assert.equal(h.front().paused,false);assert.equal(h.front().currentTime,.25);
  });
  test(carrier+': unknown historical one-shot onset holds without replay',()=>{
    const h=harness(carrier);h.set(descriptor('old-reaction',0,'once'));h.start();h.ready();
    assert.equal(h.front().paused,true);assert.equal(h.c.count(),0);assert.ok(h.front().currentTime>1.99);
    assert.equal(h.front().plays,0,'Historical one-shot must seek before any play');
  });
  test(carrier+': managed display never inherits a saved/random mirror direction',()=>{
    const h=harness(carrier);h.start();h.ready();assert.equal(h.front().style.transform,'');
  });
  test(carrier+': repeated same-buffer supersession retains bounded listeners and the latest activity',()=>{
    const h=harness(carrier);
    for(let i=0;i<25;i++){
      h.set(descriptor('replaced-'+i,h.c.now()-i*10));h.start();
      for(const video of [h.a,h.b])assert.ok((video.listeners.get('loadeddata')||[]).length<=2,
        'Only the current native loader and managed ready may remain');
    }
    h.ready();assert.equal(h.front().currentTime,.24);
    assert.ok(h.front().plays>=1);assert.equal(h.front().paused,false);
    for(let i=0;i<12;i++){h.set(descriptor('healthy-'+i,h.c.now()-i*10));h.start();h.ready();}
    for(const video of [h.a,h.b])assert.ok((video.listeners.get('error')||[]).length<=1);
    h.player.dispose();assert.equal(h.c.count(),0);
    for(const video of [h.a,h.b])assert.equal((video.listeners.get('error')||[]).length,0);
  });
  test(carrier+': failed source stops presentation instead of replaying another activity',()=>{
    const h=harness(carrier);h.start();
    if(carrier==='web')h.requests[0].onError(Error('unavailable'));
    else h.b.emit('error');
    assert.equal(h.a.paused,true);assert.equal(h.b.paused,true);assert.equal(h.c.count(),0);
    assert.equal(h.a.style.visibility,'hidden');assert.equal(h.b.style.visibility,'hidden');
  });
  test(carrier+': a failed entry retains only its actual next-stage deadline',()=>{
    const h=harness(carrier);h.set({...descriptor('sleep',99_500),kind:'sleep',segments:[
      {roomClip:'sleep_in',desktopClip:'enter',mode:'once',durationMs:2000},
      {roomClip:'sleep_loop',desktopClip:'sleep-loop',mode:'loop',durationMs:2000}]});
    h.start();h.c.advance(750);
    if(carrier==='web')h.requests[0].onError(Error('entry unavailable'));else h.b.emit('error');
    assert.equal(h.c.count(),1);const before=h.a.loads+h.b.loads,requests=h.requests.length;
    h.c.advance(749);assert.equal(h.a.loads+h.b.loads,before);assert.equal(h.requests.length,requests);
    h.c.advance(2);h.ready();assert.equal(h.front().loop,true);assert.equal(h.front().paused,false);
    assert.ok(h.front().currentTime<.01);assert.equal(h.c.count(),0);
  });
  test(carrier+': a late ended event after decode failure cannot retry the failed final loop',()=>{
    const h=harness(carrier);h.start();h.ready();const video=h.front();video.emit('error');
    const loads=h.a.loads+h.b.loads,requests=h.requests.length;video.emit('ended');
    assert.equal(h.a.loads+h.b.loads,loads);assert.equal(h.requests.length,requests);assert.equal(h.c.count(),0);
  });
  test(carrier+': hiding or disposal cancels the boundary retained after entry failure',()=>{
    const h=harness(carrier);h.set({...descriptor('sleep',99_500),kind:'sleep',segments:[
      {roomClip:'sleep_in',desktopClip:'enter',mode:'once',durationMs:2000},
      {roomClip:'sleep_loop',desktopClip:'sleep-loop',mode:'loop',durationMs:2000}]});h.start();
    if(carrier==='web')h.requests[0].onError(Error('entry unavailable'));else h.b.emit('error');
    assert.equal(h.c.count(),1);h.document.hidden=true;h.player.suspendCompanion();assert.equal(h.c.count(),0);
    h.c.advance(30_000);h.player.dispose();assert.equal(h.c.count(),0);
  });
  test(carrier+': removing shared playback returns to the original custom player',async()=>{
    const h=harness(carrier);h.set({...descriptor('sleep',99_500),kind:'sleep'});h.start();h.ready();
    if(carrier==='native') {
      Object.assign(h.context,{sprites:[h.sprite],config:{pets:[h.sprite.pet]},
        companionPresentation:{ticket:()=>1,accepts:()=>true},
        loadConfig:async()=>({pets:[{id:'main',animations:{idle:['legacy']},animationWeights:{idle:100}}]})});
      runInContext(declaration(native,'refreshCompanionPresentation')+'\nglobalThis.refresh=refreshCompanionPresentation;',h.context);
      assert.equal(await h.context.refresh(),true);assert.equal(Object.hasOwn(h.sprite.pet,'companionPlayback'),false);
      assert.equal(h.sprite.companionPlaybackController,undefined);assert.equal(h.sprite.sleeping,false);assert.equal(h.sprite.sleepPhase,null);
      h.ready();assert.ok(h.front().src.includes('legacy'));
    } else {h.set(undefined);h.player.refreshCompanion();}
    h.player.switchTo('custom',false,null);h.ready();assert.equal(h.front().paused,false);
    assert.ok(h.front().src.includes('custom'));assert.equal(h.front().style.transform,'scaleX(-1)');
    if(carrier==='web')assert.equal(h.player.handleEnded({currentTarget:h.front()}).kind,'old-random-chain');
  });
  test(carrier+': unmanaged custom presentation retains the original player',async()=>{
    const h=harness(carrier);h.set(undefined);h.player.switchTo('custom',false,null);h.ready();
    assert.equal(h.front().paused,false);assert.equal(h.front().style.transform,'scaleX(-1)');
    await Promise.resolve();assert.equal(h.observations.length,carrier==='web'?1:0);
  });
  test(carrier+': failed shared media releases only owned styles and displays the original idle',async()=>{
    const h=harness(carrier);h.a.style.opacity='.4';h.start();
    if(carrier==='web')h.requests[0].onError(Error('unavailable'));else h.b.emit('error');
    assert.equal(h.a.style.visibility,'hidden');await release(h,carrier);h.ready();
    assert.equal(h.front().style.visibility,'');assert.equal(h.front().paused,false);
    assert.ok(h.front().src.includes('legacy'));assert.equal(h.front().style.transform,'scaleX(-1)');assert.equal(h.a.style.opacity,'.4');
  });
  for(const reason of ['throw','reject'])test(carrier+': same-video resume reveals only successful playback after '+reason,async()=>{
    const h=harness(carrier);h.start();h.b.playFailure=reason;h.ready();
    await Promise.resolve();await Promise.resolve();assert.equal(h.front().style.visibility,'hidden');
    const front=h.front(),loads=h.a.loads+h.b.loads;
    h.document.hidden=true;h.player.suspendCompanion();h.document.hidden=false;h.player.refreshCompanion();
    await Promise.resolve();await Promise.resolve();assert.equal(front.style.visibility,'hidden','Another rejected resume stays failed');
    front.playFailure=null;h.document.hidden=true;h.player.suspendCompanion();h.c.advance(600);
    h.document.hidden=false;h.player.refreshCompanion();await Promise.resolve();
    assert.equal(h.front(),front);assert.equal(h.a.loads+h.b.loads,loads);
    assert.equal(front.style.visibility,'');assert.equal(front.paused,false);assert.equal(front.style.transform,'');
    assert.ok(Math.abs(front.currentTime-1.1)<.001);
  });
  for(const state of ['loop','once','pending'])test(carrier+': descriptor removal stops the shared '+state+' and starts configured idle',async()=>{
    const h=harness(carrier);h.set(descriptor('release',99_500,state==='once'?'once':'loop'));h.start();if(state!=='pending')h.ready();const old=h.front();
    await release(h,carrier);assert.equal(old.paused,true);assert.equal(old.onended,null);
    h.ready();assert.equal(h.front().paused,false);assert.equal(h.front().style.visibility,'');assert.ok(h.front().src.includes('legacy'));
    const loads=h.a.loads+h.b.loads;h.c.advance(20_000);assert.equal(h.a.loads+h.b.loads,loads);
  });
  test(carrier+': descriptor removal with no idle safely holds without an old completion callback',async()=>{
    const h=harness(carrier);h.start();h.ready();const old=h.front(),loads=h.a.loads+h.b.loads;
    await release(h,carrier,[]);assert.equal(old.paused,true);assert.equal(old.onended,null);
    assert.equal(h.a.loads+h.b.loads,loads);assert.equal(h.c.count(),0);
  });
  for(const mode of ['loop','once'])test(carrier+': original freeze gates all managed changes and resumes current '+mode+' phase',()=>{
    const h=harness(carrier);h.set(descriptor('locked',99_500,mode));h.start();h.ready();h.player.setFrozen(true);
    assert.equal(h.front().paused,true);const plays=h.a.plays+h.b.plays,loads=h.a.loads+h.b.loads;
    h.c.advance(3000);h.start();h.player.refreshCompanion();assert.equal(h.a.plays+h.b.plays,plays);assert.equal(h.a.loads+h.b.loads,loads);
    h.player.setFrozen(false);assert.equal(h.front().paused,mode==='once');
    if(mode==='once')assert.ok(h.front().currentTime>1.99);else assert.equal(h.front().currentTime,1.5);
    assert.equal(h.c.count(),0);
  });
  test(carrier+': a frozen sleep cannot play through a stage boundary or a forced refresh',()=>{
    const h=harness(carrier);h.set({...descriptor('sleep',99_500),kind:'sleep',segments:[
      {roomClip:'sleep_in',desktopClip:'enter',mode:'once',durationMs:2000},
      {roomClip:'sleep_loop',desktopClip:'sleep-loop',mode:'loop',durationMs:2000}]});h.start();h.ready();h.player.setFrozen(true);
    const plays=h.a.plays+h.b.plays,loads=h.a.loads+h.b.loads;h.c.advance(2100);h.player.refreshCompanion();h.start();
    assert.equal(h.a.plays+h.b.plays,plays);assert.equal(h.a.loads+h.b.loads,loads);assert.equal(h.c.count(),0);
    h.player.setFrozen(false);h.ready();assert.equal(h.front().loop,true);assert.equal(h.front().paused,false);
    assert.ok(Math.abs(h.front().currentTime-.6)<.001);assert.equal(h.c.count(),0);
  });
  test(carrier+': resumed same-video decoding errors use the current generation',()=>{
    const h=harness(carrier);h.start();h.ready();h.player.setFrozen(true);h.c.advance(300);h.player.setFrozen(false);
    const video=h.front();video.error={code:3};video.readyState=0;video.pause();video.emit('error');
    assert.equal(h.a.style.visibility,'hidden');assert.equal(h.b.style.visibility,'hidden');assert.equal(h.c.count(),0);
    if(carrier==='native')assert.ok(h.notice());
  });
}

for(const [name,userAgent,platform,customExt] of [
  ['Safari macOS','Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15','MacIntel','.mov'],
  ['Safari iOS','Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile Safari/604.1','iPhone','.mov'],
  ['Chrome','Mozilla/5.0 (Macintosh) Chrome/130.0 Safari/537.36','MacIntel','.webm'],
])test('web '+name+' requests shipped managed WebM while preserving ordinary pack format choice',()=>{
  for(const managed of [true,false]){
    const h=harness('web');h.context.navigator={userAgent,platform};
    runInContext('let resolvedExt=null;const ROUTE_PATH="/presentation";\n'+declaration(web,'prefersMov')+'\n'
      +declaration(web,'thumbExt')+'\n'+declaration(web,'animationAssetUrl'),h.context);
    if(!managed)h.set(undefined);h.start();
    assert.ok(h.requests[0].url.endsWith(managed?'.webm':customExt),h.requests[0].url);
    assert.ok(h.requests[0].url.startsWith('/presentation/thumb/main/'));
  }
});

test('actual card config effect consumes hidden release when fresh config still has no descriptor',()=>{
  const h=harness('web'),refs=[],effects=[];let refIndex=0,effectIndex=0,queued=[],reloads=0;
  const rt={useRef:value=>refs[refIndex++] ?? (refs[refIndex-1]={current:value}),
    useEffect(fn,deps){const index=effectIndex++,prior=effects[index];
      if(!prior || deps.length!==prior.deps.length || deps.some((value,i)=>value!==prior.deps[i])){
        queued.push(()=>{prior?.cleanup?.();effects[index]={deps:[...deps],cleanup:fn()};});
      }}};
  Object.assign(h.context,{createOwnAnimation:()=>h.player,petBridge:{reload:()=>reloads++},registerPose:()=>()=>{},registerProgress:()=>()=>{}});
  h.context.window.addEventListener=()=>{};h.context.window.removeEventListener=()=>{};
  runInContext(declaration(web,'createCardAnimation')+'\nglobalThis.makeCardAnimation=createCardAnimation;',h.context);
  const hook=h.context.makeCardAnimation(rt),cfgRef={current:h.cfg()},input={cfgRef,
    card:{state:{anim:'initial',cuePlayback:null,once:false,seq:0},animRef:{current:'initial'},facingRef:{current:'right'},actions:{}},
    live:{current:{center:()=>({x:0,y:0}),stopMove(){},drag:{stopFollow(){}},flight:{stop(){}},squash:{stop(){}}}},
    pendingSquash:{current:false},workStatusRef:{current:null},petId:'main'};
  const render=()=>{refIndex=0;effectIndex=0;queued=[];hook(input);for(const run of queued)run();};
  render();h.ready();h.document.hidden=true;h.document.dispatchEvent(new Event('visibilitychange'));
  h.set(undefined);cfgRef.current=h.cfg();render();assert.equal(h.requests.length,1);assert.equal(h.front().paused,true);
  h.document.hidden=false;h.document.dispatchEvent(new Event('visibilitychange'));assert.equal(reloads,0,'The parent config effect owns the single fresh request');
  h.set(undefined);h.cfg().animations.idle=['fresh-idle'];cfgRef.current=h.cfg();render();h.ready();
  assert.ok(h.front().src.includes('fresh-idle'));assert.equal(h.front().paused,false);assert.equal(h.front().style.visibility,'');
  for(const entry of effects)entry?.cleanup?.();
});

test('native original lock expiry rejoins a changed activity without playing through the lock',()=>{
  const h=harness('native');h.start();h.ready();h.sprite.setLock({locked:true,expiresAt:h.c.now()+3000});
  const before=h.a.plays+h.b.plays;h.set(descriptor('latest',h.c.now()-1000));h.start();h.c.advance(2999);
  assert.equal(h.a.plays+h.b.plays,before);h.c.advance(2);h.ready();assert.equal(h.front().paused,false);
  assert.ok(Math.abs(h.front().currentTime-.001)<.001);assert.equal(h.c.count(),0);
});

test('generated carriers inline only their consumed shared presentation functions',()=>{
  assert.ok(native.includes('function sampleActivityPlayback('));assert.ok(web.includes('function sampleActivityPlayback('));
  assert.equal(native.includes('function resolveActivityPlayback('),false);assert.equal(web.includes('function resolveActivityPlayback('),false);
  assert.equal(web.includes('function installNativeActivityPlayback('),false);
});

test('native hung final-loop load reports failure through the existing timeout without retries',()=>{
  const h=harness('native');h.start();h.c.advance(10_001);
  assert.ok(h.notice());assert.equal(h.a.style.visibility,'hidden');assert.equal(h.b.style.visibility,'hidden');
  assert.equal(h.c.count(),0);const loads=h.a.loads+h.b.loads;h.c.advance(60_000);h.start();
  assert.equal(h.a.loads+h.b.loads,loads);assert.equal(h.c.count(),0);
});

test('native hung entry uses the original load timeout and still reaches its next visual stage',()=>{
  const h=harness('native');h.set({...descriptor('sleep',99_500),kind:'sleep',segments:[
    {roomClip:'sleep_in',desktopClip:'enter',mode:'once',durationMs:20_000},
    {roomClip:'sleep_loop',desktopClip:'sleep-loop',mode:'loop',durationMs:2000}]});h.start();
  h.c.advance(10_001);assert.ok(h.notice());assert.equal(h.c.count(),1);
  h.c.advance(9499);h.ready();assert.equal(h.front().loop,true);assert.equal(h.front().paused,false);assert.equal(h.c.count(),0);
});

test('native configuration without a previously managed controller retains external sleep state',async()=>{
  const h=harness('native');h.set(undefined);h.sprite.sleeping=true;h.sprite.sleepPhase='loop';const sleepSet={loop:'external'};h.sprite.sleepSet=sleepSet;
  Object.assign(h.context,{sprites:[h.sprite],config:{pets:[h.sprite.pet]},
    companionPresentation:{ticket:()=>1,accepts:()=>true},loadConfig:async()=>({pets:[{id:'main',animations:{idle:['legacy']}}]})});
  runInContext(declaration(native,'refreshCompanionPresentation')+'\nglobalThis.refresh=refreshCompanionPresentation;',h.context);
  await h.context.refresh();assert.equal(h.sprite.sleeping,true);assert.equal(h.sprite.sleepPhase,'loop');assert.equal(h.sprite.sleepSet,sleepSet);
});

test('native real display lifecycle bootstraps and restores sleeping Body after fresh configuration',()=>{
  const h=harness('native');h.context.activeSprites=[h.sprite];
  runInContext(declaration(native,'createDesktopPresentationLifecycle')+`
    globalThis.display=createDesktopPresentationLifecycle({document,sprites:()=>activeSprites,wake(){},reset(){}});
    lifecycle.canPresent=()=>display.canPresent();`,h.context);
  h.set({...descriptor('sleep',99_500),kind:'sleep',segments:[
    {roomClip:'sleep_in',desktopClip:'enter',mode:'once',durationMs:2000},
    {roomClip:'sleep_loop',desktopClip:'sleep-loop',mode:'loop',durationMs:2000}]});
  h.sprite.applyCompanionPlayback();assert.equal(h.a.loads+h.b.loads,0,'Configuration precedes display ready');
  h.context.display.ready();h.ready();assert.equal(h.front().currentTime,.5);assert.equal(h.front().paused,false);
  h.document.hidden=true;h.document.dispatchEvent(new Event('visibilitychange'));assert.equal(h.c.count(),0);
  h.c.advance(30_000);h.document.hidden=false;h.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(h.front().paused,true,'Visibility alone does not replay stale data');
  h.sprite.applyCompanionPlayback();h.context.display.ready();h.ready();assert.equal(h.front().loop,true);
  assert.equal(h.c.count(),0);h.context.display.dispose();assert.equal(h.front().paused,true);
});

test('both generated flatteners preserve the renderer-only per-pet projection',()=>{
  for(const source of [web,readFileSync('vendor/dsh-pet/platform/runtime/electron-helper/shared-core.js','utf8')]) {
    const context=createContext({});runInContext(declaration(source,'flattenConfigPets')+'\nglobalThis.flatten=flattenConfigPets;',context);
    const playback=descriptor(),pets=context.flatten({main:{pets:[{id:'main',companionPlayback:playback}]}});
    assert.equal(pets[0].companionPlayback,playback);
  }
});

test('native configuration await rejects an obsolete display lifetime before touching sprites',async()=>{
  let lifetime=1,resolveConfig,updates=0;const initial={id:'main',companionPlayback:descriptor('prior')};
  const sprite={pet:initial,applyCompanionPlayback(){updates++;}},original={pets:[initial]};
  const context=createContext({sprites:[sprite],config:original,
    companionPresentation:{ticket:()=>lifetime,accepts:ticket=>ticket===lifetime},
    loadConfig:()=>new Promise(resolve=>resolveConfig=resolve)});
  runInContext(declaration(native,'refreshCompanionPresentation')+'\nglobalThis.refresh=refreshCompanionPresentation;',context);
  const late=context.refresh();lifetime++;resolveConfig({pets:[{id:'main',companionPlayback:descriptor('obsolete')}]});
  assert.equal(await late,false);assert.equal(context.config,original);assert.equal(sprite.pet,initial);assert.equal(updates,0);
  const fresh=context.refresh(),next={pets:[{id:'main',companionPlayback:descriptor('fresh')}]};resolveConfig(next);
  assert.equal(await fresh,true);assert.equal(context.config,next);assert.equal(sprite.pet.companionPlayback.key,'fresh');assert.equal(updates,1);
});
