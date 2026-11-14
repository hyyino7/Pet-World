import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {Context} from '@deepseek-ai/cordis';
import type {PetCoreHost} from '../src/core/index.js';
import {CompanionLife} from '../src/life/plugin.js';
import {CompanionRecordLibrary} from '../src/core/records.js';

function fixture(t:TestContext,enabled?:boolean) {
  t.mock.timers.enable({apis:['Date','setTimeout'],now:Date.parse('2026-11-13T05:00:00Z')});
  const root=mkdtempSync(join(tmpdir(),'life-clock-intent-')),directory=join(root,'.chatpet/data/life');
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  if(enabled!==undefined){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,'control.json'),JSON.stringify({version:1,enabled}));}
  const target={id:'world',path:root,sessionIds:[]},order:string[]=[],clockChanges:boolean[]=[];
  const host={native:{},records:{getLibrary:()=>new CompanionRecordLibrary(root,'UTC')},workspace:{status:()=>({state:'ready',target}),
    storageId:()=> 'storage',runtime:{identity:()=>({companionId:'fish',displayName:'Fixture'})}}} as unknown as PetCoreHost;
  let life:CompanionLife,row:any,starts=0,resumes=0;
  const body={setAutonomy:async(_workspace:string,value:boolean)=>{clockChanges.push(value);},setReconsiderConditions:async()=>{},
    inspectPlanned:async(_workspace:string,id:string)=>row?.operationId===id?structuredClone(row):undefined,
    startPlanned:async(_workspace:string,input:any)=>{starts++;row={...input,status:'running',phase:'working',startedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};return structuredClone(row);},
    pausePlanned:async()=>{row.status='paused';return structuredClone(row);},
    resumePlanned:async()=>{resumes++;order.push('resume');row.status='running';return structuredClone(row);}};
  const ctx={get:(name:string)=>name==='workspaceRegistry'?{get:()=>target}:name==='petBehavior'?body:undefined,
    tools:{register:()=>()=>{}},on:()=>()=>{},effect:()=>()=>{},emit:()=>{},logger:{warn(){}}} as unknown as Context;
  life=new CompanionLife(ctx,host,'standard');
  (life as any).startRuntime=async()=>{order.push('native-start');throw Error('scripted native home unavailable');};
  t.after(()=>life.close());
  return {life,root,directory,body,order,clockChanges,get starts(){return starts;},get resumes(){return resumes;}};
}

test('synchronous body clock discovery creates no missing directories or control file',t=>{
  const f=fixture(t);
  assert.deepEqual(f.life.bodyClockState('world'),{enabled:false,restoreElapsed:false});
  assert.equal(f.life.bodyClockState('other'),undefined);
  assert.equal(existsSync(join(f.root,'.chatpet')),false);
});

test('persisted enabled intent restores elapsed time before the native planner is ready',async t=>{
  const f=fixture(t,true),before=readFileSync(join(f.directory,'control.json'),'utf8');
  assert.deepEqual(f.life.bodyClockState('world'),{enabled:true,restoreElapsed:true});assert.equal(f.life.running(),false);
  await (f.life as any).synchronize();
  await assert.rejects((f.life as any).tick(),/native home unavailable/);
  assert.deepEqual(f.life.bodyClockState('world'),{enabled:true,restoreElapsed:true});
  assert.deepEqual(f.clockChanges,[],'Planner startup failure does not disable the accepted body clock');
  assert.equal(readFileSync(join(f.directory,'control.json'),'utf8'),before);
});

test('explicit owner disable and re-enable do not catch up the paused interval',async t=>{
  const f=fixture(t,true);await f.life.control('world',false);
  assert.deepEqual(f.life.bodyClockState('world'),{enabled:false,restoreElapsed:false});
  t.mock.timers.tick(60*60_000);
  await assert.rejects(f.life.control('world',true),/native home unavailable/);
  assert.deepEqual(f.life.bodyClockState('world'),{enabled:true,restoreElapsed:false});
  assert.equal(JSON.parse(readFileSync(join(f.directory,'control.json'),'utf8')).enabled,true);
  assert.deepEqual(f.clockChanges,[false]);
});

test('previously accepted work resumes on its original receipt before native startup',async t=>{
  const f=fixture(t,true);await (f.life as any).synchronize();const plan=(f.life as any).binding.plan;
  await plan.commit(0,{goal:'Rest',reason:'Keep an accepted quiet activity',steps:[{id:'rest',kind:'hold',activity:'Resting'}],nextConsiderAt:null},f.body,'world');
  await plan.advance('world',f.body);const original=plan.read().plan.operationId;
  await plan.control(plan.read().revision,'pause','Owner paused Life',f.body,'world');plan.markAutoResume(true);
  f.order.length=0;await assert.rejects((f.life as any).tick(),/native home unavailable/);
  assert.equal(f.resumes,1);assert.equal(f.starts,1);assert.deepEqual(f.order,['resume','native-start']);
  const current=plan.read().plan;assert.equal(current.operationId,original);assert.equal(current.status,'active');assert.equal(current.resumeOnEnable,false);
});

test('invalid saved clock controls are reported without silently rewriting them',t=>{
  const f=fixture(t,true),file=join(f.directory,'control.json'),invalid='{"version":1,"enabled":"yes"}';writeFileSync(file,invalid);
  assert.throws(()=>f.life.bodyClockState('world'),/开关文件无效/);assert.equal(readFileSync(file,'utf8'),invalid);
});
