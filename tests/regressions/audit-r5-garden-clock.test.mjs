import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {emptyHomeState} from '#feiyu-home';
import {createGarden} from '#feiyu-garden';
import {CompanionRoom} from '../../dist/src/living/body/room.js';
import {CompanionBehavior} from '../../dist/src/living/body/plugin.js';
import {CompanionEconomy} from '../../dist/src/living/economy/plugin.js';

const HOUR=3_600_000;
function fixture(t,{service=false}={}) {
  const start=Date.parse('2026-11-13T05:00:00Z');
  t.mock.timers.enable({apis:['Date'],now:start});
  const root=mkdtempSync(join(tmpdir(),'r5-garden-clock-')),directory=join(root,'.chatpet/data/life');
  mkdirSync(directory,{recursive:true});
  const home=emptyHomeState(start);
  home.gardenClockEnabled=false; // This fixture represents an explicit owner pause.
  Object.assign(home,{needs:{hunger:.3,thirst:.3,energy:.8,bladder:.1,pain:0},asleep:false,
    sleepPending:false,route:null,dwell:null,command:null,freeTarget:null,reactionUntil:0,eventLog:[],lastInteractionAt:0});
  const garden=createGarden(start);garden.care.autoEnabled=false;
  Object.assign(garden.plots[0],{tilled:true,cropId:'radish',progress:0,moisture:.8,plantedAt:start,
    cropProfile:{growMs:12*HOUR,yield:3,waterDurationFactor:.75,fertilizerGrowth:1.2,fertilizerYield:2}});
  writeFileSync(join(directory,'home.json'),JSON.stringify(home));
  writeFileSync(join(directory,'garden.json'),JSON.stringify(garden));
  const target={id:'workspace',path:root,title:'Fixture'},metadata=new Map();
  const host={workspace:{status:()=>({state:'ready',target}),storageId:()=> 'storage',runtime:{
    config:{ownerActorId:'owner',companionId:'fish'},identity:()=>({companionId:'fish',displayName:'Fixture'}),
    store:{persisted:()=>true,meta:key=>metadata.get(key),setMeta:(key,value)=>metadata.set(key,value),transaction:work=>work()},
  }}};
  let economy,room,body,emotionRead;
  const ctx={get:name=>name==='petEconomy'?economy:name==='petBehavior'?body:name==='petEmotion'&&emotionRead?{read:emotionRead,roomSnapshot:()=>undefined}:undefined,
    on:()=>()=>{},emit(){},logger:()=>({warn(){}})};
  const open=()=>{
    economy=new CompanionEconomy(ctx,host,{body:()=>body});economy.prepare(target);
    if(service)body=new CompanionBehavior(ctx,host,{economy:()=>economy});
    else room=new CompanionRoom(directory,()=>undefined,file=>economy.gardenPort(target.id,file));
  };
  open();
  t.after(async()=>{if(body)await body.close();else room.flush();economy.close();rmSync(root,{recursive:true,force:true});});
  return {root,directory,target,start,ctx,get room(){return room;},get body(){return body;},get economy(){return economy;},
    get store(){return economy.prepare(target);},
    move:ms=>t.mock.timers.tick(ms),setEmotionRead:read=>{emotionRead=read;},
    saved(){const db=new DatabaseSync(economy.prepare(target).databasePath,{readOnly:true});
      try{return JSON.parse(db.prepare("SELECT value FROM meta WHERE key='garden'").get().value);}finally{db.close();}},
    async reopen(){if(body)await body.close();else room.flush();economy.close();body=undefined;open();},
  };
}
const closeTo=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} should equal ${b}`);
const pausedClock={enabled:false};

test('R5: paused Store projection skips elapsed growth before pure advance and keeps its CAS revision',t=>{
  const f=fixture(t),before=f.store.readGarden(f.start);f.move(6*HOUR);
  const paused=f.store.readGarden(Date.now(),pausedClock);
  assert.equal(paused.plots[0].progress,0);assert.equal(paused.plots[0].moisture,.8);
  assert.equal(paused.updatedAt,Date.now());assert.equal(paused.economyRevision,before.economyRevision);
  assert.equal(f.saved().updatedAt,f.start,'A read projects clock admission without committing data');
});

test('R5: actual Economy garden port forwards paused admission for reading and manual actions',t=>{
  const f=fixture(t);f.move(6*HOUR);const port=f.economy.gardenPort(f.target.id,join(f.directory,'garden.json'));
  assert.equal(port.loadGarden(Date.now(),pausedClock).plots[0].progress,0);
  const result=port.actGarden({type:'water',plotId:0,requestId:'direct-water'},Date.now(),pausedClock);
  assert.equal(result.ok,true);assert.equal(result.garden.plots[0].progress,0);
  assert.equal(f.saved().plots[0].progress,0);
});

test('R5: paused Body read/checkpoint does not commit six hours of projected Economy growth',t=>{
  const f=fixture(t);f.move(6*HOUR);const result=f.room.garden('state',{});
  assert.equal(result.ok,true);assert.equal(result.garden.plots[0].progress,0);
  assert.equal(f.saved().plots[0].progress,0);assert.equal(f.saved().updatedAt,Date.now());
  assert.equal(f.room.state.needs.hunger,.3);
  f.move(3*HOUR);assert.equal(f.room.garden('state',{}).garden.plots[0].progress,0);
  assert.equal(f.saved().plots[0].moisture,.8);
});

test('R5: owner water remains available while paused without growing crops or duplicating its receipt',t=>{
  const f=fixture(t);f.move(6*HOUR);
  const action={type:'water',plotId:0,requestId:'owner-water'};
  assert.equal(f.room.garden('act',action).ok,true);
  assert.equal(f.saved().plots[0].progress,0);const resources=f.store.snapshot();
  f.move(HOUR);assert.equal(f.room.garden('act',action).ok,true);
  assert.equal(f.saved().plots[0].progress,0);assert.deepEqual(f.store.snapshot().inventory,resources.inventory);
  const db=new DatabaseSync(f.store.databasePath,{readOnly:true});
  try{assert.equal(db.prepare("SELECT COUNT(*) AS count FROM requests WHERE id='owner-water'").get().count,1);}finally{db.close();}
});

test('R5: enabled Body retains deterministic elapsed growth and invents no garden job',t=>{
  const f=fixture(t);f.room.setAutonomy(true,f.start);f.move(6*HOUR);
  const state=f.room.garden('state',{}).garden;
  closeTo(state.plots[0].progress,.5);assert.equal(state.care.task,null);assert.deepEqual(state.care.queue,[]);
});

test('R5: pause settles the active interval and resume excludes only the paused interval',t=>{
  const f=fixture(t);f.room.setAutonomy(true,f.start);f.move(HOUR);f.room.setAutonomy(false);
  closeTo(f.saved().plots[0].progress,1/12);
  f.move(6*HOUR);f.room.setAutonomy(true);closeTo(f.room.garden('state',{}).garden.plots[0].progress,1/12);
  f.move(HOUR);closeTo(f.room.garden('state',{}).garden.plots[0].progress,2/12);
});

test('R5: a paused restart and later explicit enable do not catch up disabled crop time',async t=>{
  const f=fixture(t);f.room.tick();f.move(6*HOUR);await f.reopen();
  assert.equal(f.room.garden('state',{}).garden.plots[0].progress,0);
  f.move(2*HOUR);f.room.setAutonomy(true);assert.equal(f.room.garden('state',{}).garden.plots[0].progress,0);
  f.move(HOUR);closeTo(f.room.garden('state',{}).garden.plots[0].progress,1/12);
});

test('R5: explicit enabled restart restoreElapsed still restores deterministic crop time',async t=>{
  const f=fixture(t);f.room.setAutonomy(true,f.start);f.move(6*HOUR);await f.reopen();
  f.room.setAutonomy(true,Date.now(),true);
  closeTo(f.room.garden('state',{}).garden.plots[0].progress,.5);
});

test('R5: paused garden checkpoints retain the original stale-revision guard and wallet',t=>{
  const f=fixture(t),stale=f.store.readGarden(f.start,pausedClock);f.move(6*HOUR);
  f.room.garden('state',{});const before=f.store.snapshot();
  assert.throws(()=>f.store.writeGarden(stale,stale.economyRevision),/stale/i);
  assert.equal(f.saved().plots[0].progress,0);assert.equal(f.store.snapshot().balance,before.balance);
  assert.deepEqual(f.store.snapshot().inventory,before.inventory);
});

test('R5: a backwards clock cannot rewind the paused garden checkpoint',t=>{
  const f=fixture(t);f.move(6*HOUR);f.room.tick();const before=f.saved();
  f.room.garden('state',{},false,f.start+HOUR);
  assert.equal(f.saved().updatedAt,before.updatedAt);assert.equal(f.saved().plots[0].progress,0);
  assert.equal(f.store.readGarden(f.start+HOUR,pausedClock).updatedAt,before.updatedAt);
});

test('R5: Economy settings synchronize the real paused Body before committing old growth',async t=>{
  const f=fixture(t,{service:true});await f.body.snapshot(f.target.id);f.move(6*HOUR);
  const before=await f.economy.snapshot(f.target.id);
  await f.economy.settings(f.target.id,before.configurationVersion,{crops:{radish:{growMs:24*HOUR}}},'paused-rules',new AbortController().signal);
  assert.equal(f.saved().plots[0].progress,0);assert.equal(f.saved().updatedAt,Date.now());
  const after=await f.economy.snapshot(f.target.id);
  assert.equal(after.configuration.crops.radish.growMs,24*HOUR);assert.equal(after.balance,before.balance);
});

test('R5: Economy settings preserve active elapsed growth under the planted crop profile',async t=>{
  const f=fixture(t,{service:true});await f.body.setAutonomy(f.target.id,true);f.move(6*HOUR);
  const before=await f.economy.snapshot(f.target.id);
  await f.economy.settings(f.target.id,before.configurationVersion,{crops:{radish:{growMs:24*HOUR}}},'active-rules',new AbortController().signal);
  closeTo(f.saved().plots[0].progress,.5);
  assert.equal(f.saved().plots[0].cropProfile.growMs,12*HOUR);
});

test('R5: stale settings cannot change configuration or wallet while the Body stays paused',async t=>{
  const f=fixture(t,{service:true});await f.body.snapshot(f.target.id);const before=await f.economy.snapshot(f.target.id);
  f.move(6*HOUR);
  await assert.rejects(f.economy.settings(f.target.id,'999',{articlePrice:99},'stale-rules',new AbortController().signal),/changed/i);
  const after=await f.economy.snapshot(f.target.id);
  assert.equal(after.configuration.articlePrice,before.configuration.articlePrice);assert.equal(after.balance,before.balance);
  assert.equal(f.saved().plots[0].progress,0);
});

test('R5: paused owner seed purchase, planting and sale retain actual inventory, money and request deduplication',t=>{
  const f=fixture(t);f.store.grantMoney('starting-budget',100);f.store.giftItem('retained-harvest','harvest:radish',2);
  const crop=f.store.readGarden().economyConfig.crops.find(row=>row.id==='radish'),before=f.store.snapshot();
  f.move(6*HOUR);
  const buy={type:'buySeed',cropId:'radish',quantity:1,requestId:'owner-seed'};
  assert.equal(f.room.garden('act',buy).ok,true);
  assert.equal(f.room.garden('act',{type:'till',plotId:1,requestId:'owner-till'}).ok,true);
  assert.equal(f.room.garden('act',{type:'plant',plotId:1,cropId:'radish',requestId:'owner-plant'}).ok,true);
  f.move(HOUR);
  assert.equal(f.room.garden('act',{type:'sell',cropId:'radish',quantity:1,requestId:'owner-sale'}).ok,true);
  assert.equal(f.room.garden('act',buy).ok,true);
  const after=f.store.snapshot(),saved=f.saved();
  assert.equal(after.balance,before.balance-crop.seedCost+crop.sellPrice);
  assert.equal(after.inventory.find(row=>row.itemId==='seed:radish').quantity,0);
  assert.equal(after.inventory.find(row=>row.itemId==='harvest:radish').quantity,1);
  assert.equal(saved.plots[0].progress,0);assert.equal(saved.plots[1].progress,0);
  assert.equal(saved.plots[1].cropId,'radish');
});

test('R5: settings with unknown clock intent preserve elapsed growth without creating a second body',async t=>{
  const f=fixture(t);f.move(6*HOUR);const before=await f.economy.snapshot(f.target.id);
  await f.economy.settings(f.target.id,before.configurationVersion,{articlePrice:21},'unloaded-body-rules',new AbortController().signal);
  closeTo(f.saved().plots[0].progress,.5);assert.equal(f.saved().updatedAt,Date.now());
  assert.equal(f.ctx.get('petBehavior'),undefined);
});

test('R5: cancellation while the real Body checkpoint waits prevents the later settings commit',async t=>{
  const f=fixture(t,{service:true});await f.body.snapshot(f.target.id);
  const before=await f.economy.snapshot(f.target.id);f.move(6*HOUR);
  let release;
  f.setEmotionRead(()=>new Promise(resolve=>{release=resolve;}));
  const controller=new AbortController();
  const pending=f.economy.settings(f.target.id,before.configurationVersion,{articlePrice:99},'cancelled-rules',controller.signal);
  await new Promise(setImmediate);assert.equal(typeof release,'function');
  controller.abort(new Error('Cancelled settings fixture'));release();
  await assert.rejects(pending,/Cancelled settings fixture/);f.setEmotionRead(undefined);
  const after=await f.economy.snapshot(f.target.id);
  assert.equal(after.configurationVersion,before.configurationVersion);
  assert.equal(after.configuration.articlePrice,before.configuration.articlePrice);assert.equal(after.balance,before.balance);
  assert.equal(f.saved().plots[0].progress,0);
});
