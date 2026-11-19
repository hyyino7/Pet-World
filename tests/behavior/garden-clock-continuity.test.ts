import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {Context} from '@deepseek-ai/cordis';
import {emptyHomeState} from '#feiyu-home';
import {createGarden} from '#feiyu-garden';
import {CompanionRoom} from '../../src/living/body/room.js';
import * as behaviorPlugin from '../../src/living/body/plugin.js';
import {CompanionEconomy} from '../../src/living/economy/plugin.js';
import type {PetCoreHost} from '../../src/core/index.js';
import {mountLivingArea} from '../../src/living/index.js';
import type {CompanionLife} from '../../src/living/plan/plugin.js';

const HOUR=3_600_000, start=Date.parse('2026-11-14T09:00:37.866Z');
function fixture(t:TestContext) {
  t.mock.timers.enable({apis:['Date'],now:start});
  const root=mkdtempSync(join(tmpdir(),'garden-clock-continuity-'));
  const directory=join(root,'.chatpet/data/behavior'),lifeDirectory=join(root,'.chatpet/data/life');
  mkdirSync(directory,{recursive:true});mkdirSync(lifeDirectory);
  const control=join(lifeDirectory,'control.json');writeFileSync(control,JSON.stringify({version:1,enabled:true}));
  writeFileSync(join(directory,'home.json'),JSON.stringify(emptyHomeState(start)));
  const garden=createGarden(start);
  Object.assign(garden.plots[0],{tilled:true,cropId:'radish',progress:0,moisture:.8,plantedAt:start,
    cropProfile:{growMs:12*HOUR,yield:3,waterDurationFactor:1.25,fertilizerGrowth:1.2,fertilizerYield:2}});
  writeFileSync(join(directory,'garden.json'),JSON.stringify(garden));
  const target={id:'fixture-world',path:root,title:'Fixture'},metadata=new Map<string,unknown>();
  const host={workspace:{status:()=>({state:'ready',target}),storageId:()=> 'fixture-storage',runtime:{
    config:{ownerActorId:'owner',companionId:'fish'},identity:()=>({companionId:'fish',displayName:'Fixture'}),
    store:{persisted:()=>true,meta:(key:string)=>metadata.get(key),setMeta:(key:string,value:unknown)=>metadata.set(key,value),transaction:(work:()=>unknown)=>work()},
  }}} as unknown as PetCoreHost;
  let economy:CompanionEconomy;
  const services=new Map<string,unknown>();
  const context={get:(name:string)=>services.get(name)} as unknown as Context;
  const openEconomy=()=>{economy=new CompanionEconomy(context,host,{plan:()=>services.get('petLife') as CompanionLife|undefined});economy.prepare(target);};openEconomy();
  const openRoom=()=>new CompanionRoom(directory,()=>undefined,file=>economy.gardenPort(target.id,file));
  let room=openRoom();
  t.after(()=>{room.flush();economy.close();rmSync(root,{recursive:true,force:true});});
  const saved=()=>{
    const db=new DatabaseSync(economy.prepare(target).databasePath,{readOnly:true});
    try{return JSON.parse(String(db.prepare("SELECT value FROM meta WHERE key='garden'").get()!.value));}finally{db.close();}
  };
  return {host,target,control,directory,services,get economy(){return economy;},get room(){return room;},saved,
    move:(hours:number)=>t.mock.timers.tick(hours*HOUR),
    reopen(){room.flush();economy.close();openEconomy();room=openRoom();},
    closeEconomy(){economy.close();},openEconomy,
  };
}
const closeTo=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);

for(const hours of [4,16])test(`state reads before clock restoration retain ${hours} hours of crop growth`,t=>{
  const f=fixture(t);f.move(hours);const resources=f.economy.prepare(f.target).snapshot();
  const expected=Math.min(1,hours/12),revision=f.economy.prepare(f.target).readGarden().economyRevision;
  for(let pass=0;pass<3;pass++) {
    const view=f.room.garden('state',{}).garden;
    closeTo(view.plots[0].progress,expected);assert.equal(view.plots[0].mature,expected===1);
    assert.equal(view.care.task,null);assert.deepEqual(view.care.queue,[]);
  }
  // Includes the already-reproduced order: query first, then restore enabled Life.
  f.room.setAutonomy(true,Date.now(),true);closeTo(f.room.garden('state',{}).garden.plots[0].progress,expected);
  closeTo(f.saved().plots[0].progress,expected);
  assert.equal(JSON.parse(readFileSync(f.control,'utf8')).enabled,true);
  const after=f.economy.prepare(f.target).snapshot();
  assert.equal(after.balance,resources.balance);assert.deepEqual(after.inventory,resources.inventory);
  assert.ok(f.economy.prepare(f.target).readGarden().economyRevision>=revision);
  assert.equal(f.saved().stats.harvests,0,'Observing maturity never harvests or grants items');
});

test('full storage restart before a projected mature crop was checkpointed cannot rewind it',t=>{
  const f=fixture(t);f.room.setAutonomy(true,start);f.move(16);
  assert.equal(f.room.garden('state',{}).garden.plots[0].mature,true);
  assert.equal(f.saved().plots[0].progress,0,'Exercise a real uncommitted active projection');
  f.reopen();
  for(let pass=0;pass<3;pass++)assert.equal(f.room.garden('state',{}).garden.plots[0].mature,true);
  f.room.setAutonomy(true,Date.now(),true);assert.equal(f.room.garden('state',{}).garden.plots[0].mature,true);
});

test('an explicit owner pause survives storage restart and excludes only the disabled interval',t=>{
  const f=fixture(t);f.room.setAutonomy(true,start);f.move(3);f.room.setAutonomy(false);
  closeTo(f.saved().plots[0].progress,.25);
  f.move(8);f.reopen();closeTo(f.room.garden('state',{}).garden.plots[0].progress,.25);
  f.move(2);f.room.setAutonomy(true);closeTo(f.room.garden('state',{}).garden.plots[0].progress,.25);
  f.move(3);closeTo(f.room.garden('state',{}).garden.plots[0].progress,.5);
});

test('clock-only checkpoints cannot reduce committed growth with a current revision',t=>{
  const f=fixture(t);f.move(16);f.room.garden('state',{});
  const store=f.economy.prepare(f.target),state=store.readGarden();state.plots[0].progress=0;
  const before=f.saved();assert.throws(()=>store.writeGarden(state,state.economyRevision),/rewind/);
  assert.deepEqual(f.saved(),before);
  const backwards=store.readGarden();backwards.updatedAt=start;
  assert.throws(()=>store.writeGarden(backwards,backwards.economyRevision),/rewind its clock/);
  assert.deepEqual(f.saved(),before);
});

test('settings preserve elapsed growth while enabled Life is waiting for its Body executor',async t=>{
  const f=fixture(t);f.services.set('petLife',{bodyClockState:()=>({enabled:true,restoreElapsed:true}),running:()=>false});
  f.move(16);const before=await f.economy.snapshot(f.target.id);
  await f.economy.settings(f.target.id,before.configurationVersion,{articlePrice:21},'restore-settings',new AbortController().signal);
  assert.equal(f.saved().plots[0].progress,1);
  assert.equal((await f.economy.snapshot(f.target.id)).balance,before.balance);
});

test('settings honor explicit disabled Life even with Body unloaded',async t=>{
  const f=fixture(t);f.room.setAutonomy(true,start);f.move(3);f.room.setAutonomy(false);
  f.services.set('petLife',{bodyClockState:()=>({enabled:false,restoreElapsed:false}),running:()=>false});
  f.move(8);const before=await f.economy.snapshot(f.target.id);
  await f.economy.settings(f.target.id,before.configurationVersion,{articlePrice:21},'paused-settings',new AbortController().signal);
  closeTo(f.saved().plots[0].progress,.25);
});

test('real Cordis Life unload and Body/Economy replacement preserve the enabled crop clock',async t=>{
  const f=fixture(t),ctx=new Context();
  await ctx.plugin({apply(scope){scope.provide('petCore',f.host);}});
  const loadEconomy=()=>ctx.plugin({apply(scope){return mountLivingArea(scope,f.host,'economy',()=>f.economy,
    economy=>{scope.provide('petEconomy',economy);},()=>{});}});
  let economyComponent=await loadEconomy();
  const savedLife={bodyClockState:()=>({enabled:true,restoreElapsed:true}),running:()=>false} as unknown as CompanionLife;
  const loadLife=()=>ctx.plugin({apply(scope){return mountLivingArea(scope,f.host,'plan',()=>savedLife,
    life=>{scope.provide('petLife',life);},()=>{});}});
  const lifeComponent=await loadLife();
  let bodyComponent=await ctx.plugin(behaviorPlugin);
  t.after(()=>ctx.fiber.dispose());
  const settle=async()=>{for(let pass=0;pass<8;pass++){await (ctx.petBehavior as any).serial;await new Promise<void>(setImmediate);}};
  await settle();f.move(4);
  closeTo((await ctx.petBehavior.garden(f.target.id,'state')).garden.plots[0].progress,1/3);
  await lifeComponent.dispose();await settle();
  f.move(4);
  closeTo((await ctx.petBehavior.garden(f.target.id,'state')).garden.plots[0].progress,2/3);
  await bodyComponent.dispose();
  // Simulate update replacement while retaining the entire domain storage.
  await economyComponent.dispose();f.closeEconomy();f.openEconomy();
  economyComponent=await loadEconomy();
  f.move(8);bodyComponent=await ctx.plugin(behaviorPlugin);await settle();
  assert.equal((await ctx.petBehavior.garden(f.target.id,'state')).garden.plots[0].mature,true);
  await loadLife();await settle();
  assert.equal((await ctx.petBehavior.garden(f.target.id,'state')).garden.plots[0].mature,true);
  assert.equal(JSON.parse(readFileSync(f.control,'utf8')).enabled,true);
  assert.equal(f.saved().stats.harvests,0);
  await ctx.fiber.dispose();
});
