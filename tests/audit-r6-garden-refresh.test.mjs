import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import ts from 'typescript';
import {createGarden,gardenView} from '#feiyu-garden';
import {emptyHomeState,nextHomeBoundary} from '#feiyu-home';
import {nextGardenCareBoundary} from '#feiyu-room/garden-autonomy';

const source=readFileSync(process.env.CHATPET_GARDEN_CLIENT_FIXTURE_SOURCE
  ||new URL('../vendor/feiyu-room-template/public/room/garden-client.js',import.meta.url),'utf8');
const emitted=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const settle=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
function clock(){
  let now=Date.UTC(2026,10,13),id=0;const timers=new Map();
  return {now:()=>now,set:(fn,ms=0)=>{const key=++id;timers.set(key,{fn,at:now+ms});return key;},clear:key=>timers.delete(key),
    count:()=>timers.size,nextDelay:()=>timers.size?Math.min(...[...timers.values()].map(row=>row.at-now)):null,
    async advance(ms){const end=now+ms;let calls=0;
      while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;
        assert.ok(++calls<1000,'No unbounded timer or refresh loop');now=next[1].at;timers.delete(next[0]);next[1].fn();await settle();
      }now=end;await settle();
    }};
}
function planted(now,{growMs=60000,moisture=1,progress=0}={}){
  const base=createGarden(now);
  Object.assign(base.plots[0],{cropId:'radish',tilled:true,progress,moisture,plantedAt:now,
    cropProfile:{growMs,yield:3,waterDurationFactor:2,fertilizerGrowth:1.2,fertilizerYield:2}});
  return base;
}
class Element {
  children=[];hidden=false;textContent='';listeners=new Map();
  append(...children){this.children.push(...children);}
  setAttribute(){}
  addEventListener(name,fn){this.listeners.set(name,fn);}
  remove(){}
}
function fixture({native=true,kind='growing',provider,ignoreAbort=false,cropOptions={}}={}){
  const c=clock(),base=kind==='empty'?createGarden(c.now()):planted(c.now(),kind==='dry'?{moisture:0}:kind==='mature'?{progress:1}:cropOptions);
  const document={hidden:false,body:new Element(),createElement:()=>new Element(),getElementById:()=>null};
  const requests=[],views=[],modelViews=[];let maxInFlight=0,inFlight=0,nextMode='auto',uiOptions;
  const getView=provider||(()=>gardenView(base,c.now()));
  function roomRequest(url,options){
    const mode=nextMode;nextMode='auto';maxInFlight=Math.max(maxInFlight,++inFlight);
    const response={ok:true,json:async()=>({ok:true,garden:getView()})};
    let resolve,reject,settled=false;
    const result=new Promise((yes,no)=>{resolve=value=>{if(!settled){settled=true;inFlight--;yes(value||response);}};reject=error=>{if(!settled){settled=true;inFlight--;no(error);}};});
    const entry={url,options,at:c.now(),resolve,reject};requests.push(entry);
    if(!ignoreAbort)options.signal.addEventListener('abort',()=>reject(Object.assign(Error('cancelled fixture request'),{name:'AbortError'})),{once:true});
    if(mode==='auto')resolve();else if(mode==='error')reject(Error('fixture unavailable'));
    return result;
  }
  class Geometry {attributes={};setFromPoints(){return this;}setAttribute(name,value){this.attributes[name]=value;return this;}dispose(){}}
  class Material {constructor(options){Object.assign(this,options);this.color={set(){}};}dispose(){}}
  class Mesh {constructor(geometry,material){this.geometry=geometry;this.material=material;this.position={set(){}};}}
  const three={Raycaster:class{},Vector2:class{},Vector3:class{},LineLoop:Mesh,Points:Mesh,BufferGeometry:Geometry,BufferAttribute:class{},LineBasicMaterial:Material,PointsMaterial:Material};
  const model={group:{children:[]},pickables:[],update:value=>modelViews.push(value),updateCharacter(){},animateCharacter(){},dispose(){}};
  const modules={'./native-room.js':{roomRequest},'./vendor/three.module.js':three,
    './garden-world.js':{createGardenWorld:()=>model,GARDEN_PLOTS:Array.from({length:8},(_,id)=>({id,x:id,z:0}))},
    './garden-ui.js':{mountGardenUI:options=>{uiOptions=options;return {setView:value=>views.push(value),selectPlot(){},setOpen(){},destroy(){}};}}};
  const context=createContext({document,window:{...(native?{chatpetRoomBridge:{onChanged(){}}}: {})},exports:{},
    require:name=>{assert.ok(modules[name],name);return modules[name];},AbortController,AbortSignal,
    performance:{now:c.now},setTimeout:c.set,clearTimeout:c.clear});
  runInContext(emitted,context);
  const client=context.exports.createGardenClient({world:{scene:{add(){},remove(){}}},renderer:{},camera:{},api:path=>'/fixture'+path,onOpen(){},onClose(){}});
  return {c,base,client,document,requests,views,modelViews,getView,nextMode:value=>{nextMode=value;},maxInFlight:()=>maxInFlight,
    actions:()=>uiOptions,start:async()=>{client.setVisible(true);client.setOpen(true);await settle();await c.advance(0);},
    close:async()=>{client.destroy();await settle();assert.equal(c.count(),0);}};
}

test('R6-04: a native sleeping/no-job garden renders natural maturity without a body change or model request',async()=>{
  const f=fixture();try {
    const home=emptyHomeState(f.c.now());Object.assign(home,{asleep:true,sleepPending:false,room:'her_room',spot:'bed',kind:'sleep',route:null,dwell:null});
    assert.equal(nextHomeBoundary(home,f.c.now(),[],true),null);
    assert.equal(nextGardenCareBoundary(f.base,home,f.c.now(),{goalPolicy:'planned',autonomy:false}),null);
    await f.start();assert.equal(f.requests.length,1);assert.equal(f.client.inspect().view.plots[0].progress,0);
    await f.c.advance(60000);assert.equal(f.client.inspect().view.plots[0].mature,true);
    assert.equal(f.requests.length,5);assert.equal(f.c.count(),0,'A mature view returns to native event-driven refresh');
    assert.ok(f.requests.every(row=>row.url==='/fixture/api/garden/state'&&row.options.method==='GET'));
  }finally{await f.close();}
});
for(const kind of ['empty','mature','dry'])test(`R6-04: native ${kind} garden keeps no natural-display timer`,async()=>{
  const f=fixture({kind});try {await f.start();assert.equal(f.c.count(),0);await f.c.advance(3600000);assert.equal(f.requests.length,1);}finally{await f.close();}
});
test('R6-04: existing compatibility refresh remains available without a native change source',async()=>{
  const f=fixture({kind:'empty',native:false});try {await f.start();await f.c.advance(60000);assert.equal(f.requests.length,5);assert.equal(f.c.count(),1);}finally{await f.close();}
});
test('R6-04: natural water exhaustion refreshes the dry state and then returns to native events',async()=>{
  const f=fixture({cropOptions:{moisture:.1}});try {
    await f.start();await f.c.advance(15000);const plot=f.client.inspect().view.plots[0];
    assert.equal(plot.moisture,0);assert.equal(plot.mature,false);assert.equal(plot.progress,.2);
    assert.equal(f.requests.length,2);assert.equal(f.c.count(),0);
  }finally{await f.close();}
});
for(const operation of ['onAction','onControl'])test(`R6-04: ${operation} starts natural refresh from an empty native view without a change event`,async()=>{
  const f=fixture({kind:'empty'});try {
    await f.start();assert.equal(f.c.count(),0);
    Object.assign(f.base.plots[0],planted(f.c.now()).plots[0]);
    await f.actions()[operation]({type:operation==='onAction'?'plant':'careNow',cropId:'radish',plotId:0});
    assert.equal(f.c.nextDelay(),15000);await f.c.advance(60000);
    assert.equal(f.client.inspect().view.plots[0].mature,true);assert.equal(f.c.count(),0);
    assert.equal(f.requests.filter(row=>row.options.method==='GET').length,5);
    assert.equal(f.requests.filter(row=>row.options.method==='POST').length,1);
  }finally{await f.close();}
});
test('R6-04: accepted terminal projections clear an obsolete natural timer without waiting for native events',async()=>{
  for(const terminal of ['mature','dry']){
    const f=fixture();try {
      await f.start();assert.equal(f.c.count(),1);
      if(terminal==='mature')f.base.plots[0].progress=1;else f.base.plots[0].moisture=0;
      await f.actions().onControl({type:'careNow'});assert.equal(f.c.count(),0);
      await f.c.advance(60000);assert.equal(f.requests.length,2,terminal);
    }finally{await f.close();}
  }
});
test('R6-04: tiny, zero, invalid or paused ETAs cannot make the visible refresh loop exceed its existing cadence',async()=>{
  for(const eta of [0,0.01,-10,Infinity,NaN,undefined]){
    let view;
    const f=fixture({provider:()=>view});
    view={plots:[{id:0,cropId:'radish',progress:0,moisture:1,mature:false,remainingMs:eta,waterRemainingMs:eta}]};
    try {await f.start();await f.c.advance(60000);assert.equal(f.requests.length,5,String(eta));assert.equal(f.c.count(),1);assert.equal(f.maxInFlight(),1);}finally{await f.close();}
  }
});
test('R6-04: native event bursts replace the single natural timer and never duplicate a scheduled read',async()=>{
  const f=fixture();try {
    await f.start();await f.c.advance(14999);
    for(let i=0;i<100;i++)f.client.changed();assert.equal(f.c.count(),1);
    await f.c.advance(0);assert.equal(f.requests.length,2);assert.equal(f.c.count(),1);
    await f.c.advance(1);assert.equal(f.requests.length,2);
    await f.c.advance(14999);assert.equal(f.requests.length,3);assert.equal(f.maxInFlight(),1);
  }finally{await f.close();}
});
test('R6-04: changes during an in-flight read coalesce to one fresh follow-up',async()=>{
  const f=fixture();try {
    await f.start();f.nextMode('defer');f.client.changed();await f.c.advance(0);assert.equal(f.requests.length,2);
    for(let i=0;i<50;i++){f.client.changed();await f.c.advance(0);}
    assert.equal(f.requests.length,2);f.requests[1].resolve();await settle();await f.c.advance(0);
    assert.equal(f.requests.length,3);assert.equal(f.maxInFlight(),1);assert.equal(f.c.count(),1);
  }finally{await f.close();}
});
test('R6-04: hide/minimize/lock cancels display reads and schedules nothing until a fresh visible generation',async()=>{
  const f=fixture();try {
    await f.start();f.nextMode('defer');f.client.changed();await f.c.advance(0);const pending=f.requests.at(-1);
    f.client.setVisible(false);await settle();assert.equal(pending.options.signal.aborted,true);assert.equal(f.c.count(),0);
    for(let i=0;i<10;i++)f.client.changed();await f.c.advance(3600000);assert.equal(f.requests.length,2);
    f.client.setVisible(true);await f.c.advance(0);assert.equal(f.requests.length,3);assert.equal(f.client.inspect().view.plots[0].mature,true);
  }finally{await f.close();}
});
test('R6-04: an old unabortable read cannot replace the restored view or publish while document-hidden',async()=>{
  const f=fixture({ignoreAbort:true});try {
    await f.start();const before=f.views.length;f.nextMode('defer');f.client.changed();await f.c.advance(0);
    const old=f.requests.at(-1);f.document.hidden=true;f.client.setVisible(false);f.client.setVisible(true);
    old.resolve({ok:true,json:async()=>({garden:{plots:[{id:0,cropId:'stale'}]}})});await settle();
    assert.equal(f.views.length,before);assert.equal(f.c.count(),0);
    f.client.setVisible(false);f.document.hidden=false;f.client.setVisible(true);await f.c.advance(0);
    assert.equal(f.views.at(-1).plots[0].cropId,'radish');assert.equal(f.maxInFlight(),1);
  }finally{await f.close();}
});
test('R6-04: document hiding itself blocks a late reply before the native visibility callback runs',async()=>{
  const f=fixture({ignoreAbort:true});try {
    await f.start();const before=f.views.length;f.nextMode('defer');f.client.changed();await f.c.advance(0);
    f.document.hidden=true;f.requests.at(-1).resolve({ok:true,json:async()=>({garden:{plots:[{id:0,cropId:'hidden'}]}})});await settle();
    assert.equal(f.views.length,before);assert.equal(f.c.count(),0);
  }finally{await f.close();}
});
test('R6-04: a failed natural read retries using the original backoff then returns to the natural cadence',async()=>{
  const f=fixture();try {
    await f.start();f.nextMode('error');await f.c.advance(15000);assert.equal(f.requests.length,2);assert.equal(f.c.nextDelay(),5000);
    await f.c.advance(4999);assert.equal(f.requests.length,2);await f.c.advance(1);assert.equal(f.requests.length,3);assert.equal(f.c.nextDelay(),15000);
  }finally{await f.close();}
});
test('R6-04: timeout releases its request and retry timer, and destroy prevents later work',async()=>{
  const f=fixture();try {
    await f.start();f.nextMode('defer');await f.c.advance(15000);assert.equal(f.requests.length,2);
    await f.c.advance(10000);assert.equal(f.requests.at(-1).options.signal.aborted,true);assert.equal(f.c.nextDelay(),5000);
    f.client.destroy();await settle();assert.equal(f.c.count(),0);await f.c.advance(60000);assert.equal(f.requests.length,2);
  }finally{await f.close();}
});
test('R6-04: an accepted write blocks timer reads, then one coalesced fresh read uses the existing authority',async()=>{
  const f=fixture({ignoreAbort:true});try {
    await f.start();f.nextMode('defer');const action=f.actions().onAction({type:'water',plotId:0});
    await f.c.advance(15000);assert.equal(f.requests.length,2);f.client.changed();await f.c.advance(0);assert.equal(f.requests.length,2);
    f.requests[1].resolve();await action;await f.c.advance(0);assert.equal(f.requests.length,3);assert.equal(f.maxInFlight(),1);
    assert.equal(f.requests[1].url,'/fixture/api/garden/act');
  }finally{await f.close();}
});
test('R6-04: a write overlapping an old read keeps the newer projection and resumes its one natural timer',async()=>{
  const f=fixture();try {
    await f.start();f.nextMode('defer');f.client.changed();await f.c.advance(0);const old=f.requests.at(-1);
    f.base.plots[0].progress=.25;await f.actions().onAction({type:'water',plotId:0});
    assert.equal(f.views.at(-1).plots[0].progress,.25);const accepted=f.views.length;
    old.resolve({ok:true,json:async()=>({garden:{plots:[{id:0,cropId:'radish',progress:0,moisture:1}]}})});await settle();
    assert.equal(f.views.length,accepted);assert.equal(f.c.nextDelay(),15000);
    await f.c.advance(15000);assert.equal(f.requests.length,4);
    assert.equal(f.maxInFlight(),2,'One previously started read may overlap the accepted write; no second read is started');
  }finally{await f.close();}
});
test('R6-04: a native event delivered inside write completion remains a single immediate fresh read',async()=>{
  const f=fixture();try {
    await f.start();f.nextMode('defer');const action=f.actions().onControl({type:'careNow'});
    f.requests.at(-1).resolve({ok:true,json:async()=>{f.client.changed();return {ok:true,garden:f.getView()};}});
    await action;assert.equal(f.c.nextDelay(),0);await f.c.advance(0);
    assert.equal(f.requests.length,3);assert.equal(f.c.count(),1);assert.equal(f.maxInFlight(),1);
  }finally{await f.close();}
});
for(const operation of ['onAction','onControl'])test(`R6-04: late accepted ${operation} completion after hide/destroy does not touch the old display`,async()=>{
  const f=fixture({ignoreAbort:true});try {
    await f.start();const before=f.views.length;f.nextMode('defer');
    const action=f.actions()[operation]({type:'water',plotId:0});f.client.setVisible(false);f.client.destroy();
    f.requests.at(-1).resolve({ok:true,json:async()=>({ok:true,garden:{plots:[{id:0,cropId:'old-world'}]}})});
    const result=await action;assert.equal(result.ok,true,'Display disposal does not invent an undo of accepted server work');
    assert.equal(f.views.length,before);assert.equal(f.modelViews.length,before);assert.equal(f.c.count(),0);
  }finally{await f.close();}
});
test('R6-04: an old write failure cannot publish its connection error into a later visible generation',async()=>{
  const f=fixture({ignoreAbort:true});try {
    await f.start();f.nextMode('defer');const action=f.actions().onAction({type:'water',plotId:0});
    f.client.setVisible(false);f.client.setVisible(true);await f.c.advance(0);
    f.requests.at(-1).reject(Error('old uncertain response'));const result=await action;
    assert.equal(result.ok,false);assert.equal(f.document.body.children[0].children[0].textContent,'');
    await f.c.advance(0);assert.equal(f.requests.length,3);assert.equal(f.maxInFlight(),1);
  }finally{await f.close();}
});
