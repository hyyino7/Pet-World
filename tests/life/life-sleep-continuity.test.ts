import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {Context} from '@deepseek-ai/cordis';
import type {PetCoreHost} from '../../src/core/index.js';
import {emptyHomeState} from '#feiyu-home';
import {createGarden} from '#feiyu-garden';
import {CompanionBehavior} from '../../src/living/body/plugin.js';
import {CompanionLife} from '../../src/life/plugin.js';
import {CompanionRecordLibrary} from '../../src/core/records.js';

/** Real Life coordinator and Body, with only native model startup replaced.
 * No test calls plan.advance to manufacture continuation between steps. */
test('quiet waiting stays awake; explicit sleep reaches bed, survives gentle touch and waiting completion',async t=>{
  t.mock.timers.enable({apis:['Date','setTimeout'],now:Date.parse('2026-11-16T01:00:00Z')});
  const root=mkdtempSync(join(tmpdir(),'life-sleep-continuity-')),directory=join(root,'.chatpet/data/life');
  mkdirSync(directory,{recursive:true});
  const home=Object.assign(emptyHomeState(Date.now()),{room:'living',spot:'sofa',asleep:false,sleepPending:false,
    route:null,dwell:null,command:null,freeTarget:null,reactionUntil:0,lastInteractionAt:0,
    needs:{hunger:.1,thirst:.1,energy:.6,bladder:.1,pain:0},eventLog:[]});
  writeFileSync(join(directory,'home.json'),JSON.stringify(home));writeFileSync(join(directory,'garden.json'),JSON.stringify(createGarden(Date.now())));
  writeFileSync(join(directory,'control.json'),JSON.stringify({version:1,enabled:true}));
  const target={id:'world',path:root,sessionIds:[]},listeners=new Map<string,Set<Function>>();
  const host={native:{},records:{getLibrary:()=>new CompanionRecordLibrary(root,'UTC')},workspace:{status:()=>({state:'ready',target}),storageId:()=> 'storage',
    runtime:{config:{ownerActorId:'owner',companionId:'fish'},identity:()=>({companionId:'fish',displayName:'Fixture'}),store:{meta:()=>undefined}}}} as unknown as PetCoreHost;
  let life:CompanionLife;
  const ctx={get:(name:string)=>name==='petBehavior'?body:name==='petLife'?life:name==='workspaceRegistry'?{get:()=>target}:undefined,
    on(name:string,fn:Function){const set=listeners.get(name)??new Set();listeners.set(name,set);set.add(fn);return()=>set.delete(fn);},
    emit(name:string,...args:unknown[]){for(const fn of listeners.get(name)??[])fn(...args);},tools:{register:()=>()=>{}},effect:()=>()=>{},logger:()=>({warn(){}})} as unknown as Context;
  const body=new CompanionBehavior(ctx,host);life=new CompanionLife(ctx,host,'standard');
  (life as any).startRuntime=async()=>{};
  t.after(async()=>{await life.close();await body.close();rmSync(root,{recursive:true,force:true});});
  const settle=async()=>{for(let i=0;i<20;i++){t.mock.timers.tick(25);await Promise.resolve();}await (life as any).serial;};
  await body.setAutonomy(target.id,true);
  await life.updatePlan(target.id,0,{goal:'Quiet night',reason:'Waiting is an awake choice',steps:[{id:'quiet',kind:'hold',activity:'In bed, I am sleeping',durationMinutes:1}],nextConsiderAt:'2026-11-16T07:00:00Z'});
  await settle();assert.deepEqual(body.restState(target.id),{sleeping:false,pending:false});
  assert.match(body.promptLine(target.id),/未入睡，且没有待执行/);
  const revision=(await life.readPlan(target.id)).revision;
  await life.updatePlan(target.id,revision,{goal:'Sleep',reason:'Explicit bodily sleep choice',steps:[
    {id:'sleep',kind:'body',activity:'Go to sleep',action:'sleep'},
    {id:'wait',kind:'hold',activity:'Stay asleep',durationMinutes:1},
  ],nextConsiderAt:'2026-11-16T07:00:00Z'});
  await settle();let state=await life.readPlan(target.id);const operation=state.plan!.operationId!;
  assert.equal(state.plan!.cursor,0);assert.equal((await body.inspectPlanned(target.id,operation))!.status,'running');
  const moving=await body.roomState(target.id);assert.equal(moving.her.asleep,false);
  t.mock.timers.tick(120_000);await body.snapshot(target.id);await settle();
  state=await life.readPlan(target.id);assert.equal(state.plan!.cursor,1,'Arrival completion starts accepted hold via the real coordinator');
  assert.equal(body.restState(target.id)!.sleeping,true);assert.match(body.promptLine(target.id),/已入睡/);
  await body.act(target.id,'pet','sleeping-touch','room');await settle();assert.equal(body.restState(target.id)!.sleeping,true);
  t.mock.timers.tick(61_000);await body.snapshot(target.id);await settle();
  assert.equal((await life.readPlan(target.id)).plan!.cursor,2);assert.equal(body.restState(target.id)!.sleeping,true,'End of quiet wait does not wake the body');
});
