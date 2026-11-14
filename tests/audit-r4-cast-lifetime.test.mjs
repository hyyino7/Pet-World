import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import ts from 'typescript';

const source=ts.createSourceFile('app.js',readFileSync('vendor/feiyu-room-template/public/room/app.js','utf8'),ts.ScriptTarget.Latest,true);
function actual(name,optional=false){const node=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);if(optional&&!node)return '';assert.ok(node,name);return node.getText(source);}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};

function fixture(t){
  const elements=new Map(),requests=[],toasts=[],bubbles=[],timers=new Map();let sequence=0,streamCount=0;
  const element=id=>{if(!elements.has(id))elements.set(id,{id,style:{setProperty(){}},classList:{toggle(){},add(){},remove(){}},setAttribute(){},
    play:async()=>{},pause(){},remove(){},videoWidth:1280,videoHeight:720,readyState:2,hidden:true});return elements.get(id);};
  const bubble=element('tvCompanionBubble');let bubbleText='';Object.defineProperty(bubble,'textContent',{get:()=>bubbleText,set:value=>{bubbleText=value;bubbles.push(value);}});
  const document={body:{appendChild(){}},createElement:tag=>{
    if(tag!=='canvas')return element('created-'+ ++sequence);
    let cast='';return {getContext:()=>({drawImage:video=>{cast=video.srcObject?.label??'missing';}}),toDataURL:()=> 'data:image/jpeg;base64,'+Buffer.from(cast).toString('base64')};
  }};
  const stream=()=>{const track={stop(){},addEventListener(){}};return {label:'cast-'+ ++streamCount,getTracks:()=>[track],getVideoTracks:()=>[track]};};
  const context=createContext({AbortController,AbortSignal,document,window:{isSecureContext:true},navigator:{mediaDevices:{getDisplayMedia:async()=>stream()}},
    tvStream:null,tvCastGeneration:0,tvCastPending:false,tvVideoEl:null,tvTexture:null,tvMat:{},tvOriginalMap:null,tvOriginalEmissiveMap:null,tvOriginalEmissiveIntensity:.55,
    tvFollowOn:false,tvBubbleOn:true,tvControlOn:false,tvOpinionBusy:false,tvOpinionRequest:null,tvOpinionTimer:0,tvOpinionWarmup:0,tvBubbleTimer:0,tvQuoteTimer:0,
    tvExtensionReady:false,presentationGeneration:0,visible:true,location:{host:'fixture'},$:element,
    displayAllowed:()=>context.visible,api:path=>'/owner'+path,toast:text=>toasts.push(text),applyTvCompanionSize(){},setTvOverlayMode(){},
    THREE:{VideoTexture:class{dispose(){}},SRGBColorSpace:'fixture',LinearFilter:'fixture'},
    setTimeout:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
    setInterval:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,ms});return id;},clearInterval:id=>timers.delete(id),
    roomRequest:(_path,options)=>{const result=deferred();requests.push({options,result});return result.promise;},
  });
  for(const name of ['hideTvCompanionBubble','showTvCompanionBubble','captureTvFrame','cancelTvOpinion','requestTvOpinion','syncTvOpinionTimer',
    'applyTvControlPref','applyTvFollow','applyTvBubblePref','applyTvCastChip','stopTvCast','tvCastUnavailableReason','startTvCast'])
    runInContext(actual(name,name==='cancelTvOpinion'),context);
  const resolve=(index,reply)=>requests[index].result.resolve({ok:true,status:200,json:async()=>({ok:true,reply})});
  t.after(async()=>{context.stopTvCast();for(let i=0;i<requests.length;i++)resolve(i,'fixture teardown');await settle();});
  return {context,requests,toasts,bubbles,timers,resolve,reject:(index,error)=>requests[index].result.reject(error),
    async start(){await context.startTvCast();context.tvFollowOn=true;context.applyTvFollow();},opinion:manual=>context.requestTvOpinion(manual),stop:()=>context.stopTvCast()};
}

test('R4: one current cast keeps the original frame request, bubble result and opinion cadence',async t=>{
  const f=fixture(t);await f.start();const pending=f.opinion(false);await settle();assert.equal(f.requests.length,1);
  const options=f.requests[0].options;assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{image:'data:image/jpeg;base64,Y2FzdC0x'});
  f.resolve(0,'current cast opinion');await pending;assert.deepEqual(f.bubbles,['current cast opinion']);assert.equal(f.context.tvOpinionBusy,false);
  assert.ok([...f.timers.values()].some(timer=>timer.ms===2200));assert.ok([...f.timers.values()].some(timer=>timer.ms===60000));
});
test('R4: stopping a cast aborts its native opinion request',async t=>{
  const f=fixture(t);await f.start();const pending=f.opinion(false);await settle();const signal=f.requests[0].options.signal;
  assert.ok(signal instanceof AbortSignal);f.stop();assert.equal(signal.aborted,true);f.resolve(0,'old stopped cast');await pending;
  assert.equal(f.bubbles.includes('old stopped cast'),false);
});
test('R4: a late A response cannot enter cast B or clear B pending state',async t=>{
  const f=fixture(t);await f.start();const a=f.opinion(false);await settle();f.stop();await f.start();const b=f.opinion(false);await settle();
  assert.equal(f.requests.length,2);f.resolve(0,'A late');await a;assert.equal(f.bubbles.includes('A late'),false);assert.equal(f.context.tvOpinionBusy,true);
  await f.opinion(false);assert.equal(f.requests.length,2,'B still owns the busy slot');f.resolve(1,'B current');await b;assert.equal(f.bubbles.at(-1),'B current');
});
test('R4: old A failure/finally does not report to B or clear B pending state',async t=>{
  const f=fixture(t);await f.start();const a=f.opinion(true);await settle();f.stop();await f.start();const b=f.opinion(false);await settle();
  assert.equal(f.requests.length,2);f.toasts.length=0;f.reject(0,Error('old A failure'));await a;
  assert.deepEqual(f.toasts,[]);assert.equal(f.context.tvOpinionBusy,true);f.resolve(1,'B current');await b;
});
for(const manual of [false,true])test(`R4: cancelling follow aborts an outstanding ${manual?'manual':'automatic'} opinion`,async t=>{
  const f=fixture(t);await f.start();const pending=f.opinion(manual);await settle();f.context.tvFollowOn=false;f.context.applyTvFollow();
  assert.equal(f.requests[0].options.signal?.aborted,true);f.resolve(0,'no longer following');await pending;
  assert.equal(f.bubbles.includes('no longer following'),false);assert.equal(f.toasts.some(text=>text.includes('no longer following')),false);
});
for(const manual of [false,true])test(`R4: bubble-off ${manual?'preserves deliberate manual toast':'cancels automatic opinion'}`,async t=>{
  const f=fixture(t);await f.start();const pending=f.opinion(manual);await settle();f.context.tvBubbleOn=false;f.context.applyTvBubblePref();
  assert.ok(f.requests[0].options.signal instanceof AbortSignal);assert.equal(f.requests[0].options.signal.aborted,!manual);
  f.resolve(0,'bubble preference result');await pending;
  assert.equal(f.toasts.includes('她：bubble preference result'),manual);assert.equal(f.bubbles.includes('bubble preference result'),false);
});
test('R4: final publication rechecks visibility even before the hidden notification handler runs',async t=>{
  const f=fixture(t);await f.start();const pending=f.opinion(false);await settle();f.context.visible=false;f.resolve(0,'hidden result');await pending;
  assert.equal(f.bubbles.includes('hidden result'),false);
});
test('R4: manual final toast rechecks follow intent even without its UI event',async t=>{
  const f=fixture(t);await f.start();const pending=f.opinion(true);await settle();f.context.tvFollowOn=false;f.context.tvBubbleOn=false;
  f.resolve(0,'cancelled follow result');await pending;assert.equal(f.toasts.includes('她：cancelled follow result'),false);
});
