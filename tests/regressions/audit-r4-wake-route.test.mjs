import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {HOME_LAYOUT,emptyHomeState,applyHomeAction,advanceHomeState,currentPosition,currentFacing,homeView,normalizeHomeState,normalizeFreePoint} from '#feiyu-home';
import {CompanionBehavior} from '../../dist/src/living/body/plugin.js';

const now=Date.UTC(2026,10,13,12),env={autonomy:false,goalPolicy:'planned'};
function pendingSleep() {
  const initial=emptyHomeState(now);
  Object.assign(initial,{room:'living',spot:'sofa',route:null,dwell:null,freeTarget:null,command:null,reactionUntil:0});
  const requested=applyHomeAction(initial,{action:'sleep',at:now}).state;
  const state=advanceHomeState(requested,now,env).state;
  assert.ok(state.route);assert.equal(state.route.target.effect,'sleep');assert.equal(state.sleepPending,true);assert.equal(state.asleep,false);
  return state;
}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

for(const fraction of [.1,.25,.5,.75,.9])test(`R4-4: wake at ${fraction} of the accepted sleep route stops at the actual point, including room boundaries`,()=>{
  const state=pendingSleep(),at=state.route.departAt+(state.route.arriveAt-state.route.departAt)*fraction;
  const pos=currentPosition(state,at),facing=currentFacing(state,at),before=homeView(state,at);
  const wake=applyHomeAction(state,{action:'wake',at});
  assert.equal(wake.changed,true);assert.equal(wake.state.route,null);assert.equal(wake.state.dwell,null);
  assert.equal(wake.state.walking,false);assert.equal(wake.state.asleep,false);assert.equal(wake.state.sleepPending,false);
  assert.equal(wake.state.spot,'free');assert.ok(distance(currentPosition(wake.state,at),pos)<1e-9);
  const after=homeView(wake.state,at);assert.deepEqual(after.her.pos,before.her.pos);assert.equal(after.her.elev,before.her.elev);
  assert.ok(Math.abs(after.her.facing-facing)<.11);
  const restored=normalizeHomeState(JSON.parse(JSON.stringify(wake.state)),at+5000);
  assert.ok(distance(currentPosition(restored,at+5000),pos)<1e-9,'the next read must retain the interpolated stop');
  const continued=advanceHomeState(restored,at+12_000,env).state;
  assert.equal(continued.route,null);assert.equal(continued.asleep,false);assert.ok(distance(currentPosition(continued,at+12_000),pos)<1e-9);
});

test('R4-4: already sleeping wake keeps its existing bedside pose, height and reaction',()=>{
  const state=emptyHomeState(now);Object.assign(state,{room:'her_room',spot:'bed',asleep:true,sleepPending:false,pose:'lie',elev:.52,route:null,dwell:null});
  const before=homeView(state,now),wake=applyHomeAction(state,{action:'wake',at:now});
  assert.equal(wake.changed,true);assert.equal(wake.state.kind,'wake');assert.equal(wake.state.pose,'lie');assert.equal(wake.state.elev,.52);
  assert.equal(wake.state.spot,'bed');assert.deepEqual(homeView(wake.state,now).her.pos,before.her.pos);
  assert.equal(applyHomeAction(wake.state,{action:'wake',at:now+1}).changed,false);
});

test('R4-4: retained physical free positions preserve legal doorway coordinates while new targets keep their original padding',()=>{
  const room=HOME_LAYOUT.rooms.find(room=>room.id==='her_room'),point=[room.bounds[0]+.01,(room.bounds[1]+room.bounds[3])/2];
  const target=normalizeFreePoint(point);assert.ok(distance(target,point)>.1);
  const state=emptyHomeState(now);Object.assign(state,{room:'her_room',spot:'free',freePos:point,elev:0});
  assert.deepEqual(normalizeHomeState(state,now).freePos,point);
  assert.deepEqual(applyHomeAction(emptyHomeState(now),{action:'go',pos:point,at:now}).state.freeTarget.pos,target);
  assert.deepEqual(applyHomeAction(emptyHomeState(now),{action:'place',pos:point,free:true,at:now}).state.freePos,target);
  assert.equal(normalizeFreePoint([Infinity,1],{preservePosition:true}),null);
  assert.equal(normalizeFreePoint([1e9,1e9],{preservePosition:true}),null);
});

test('R4-4: actual manual Behavior sleep/wake retains the stop and deduplicates its interaction after restart',async t=>{
  t.mock.timers.enable({apis:['Date'],now});
  const root=mkdtempSync(join(tmpdir(),'wake-route-code-')),directory=join(root,'.chatpet/data/life');mkdirSync(directory,{recursive:true});
  const initial=emptyHomeState(now);Object.assign(initial,{room:'living',spot:'sofa',route:null,dwell:null,freeTarget:null,command:null,reactionUntil:0});
  writeFileSync(join(directory,'home.json'),JSON.stringify(initial));
  const host={native:{},workspace:{status:()=>({state:'ready',target:{id:'a',path:root}}),storageId:()=>'a',runtime:{config:{companionId:'fixture',ownerActorId:'owner'},store:{meta:()=>undefined},identity:()=>({displayName:'Fixture'})}}};
  const ctx={on:()=>()=>{},get:()=>undefined,emit:()=>{},logger:()=>({warn(){}})};
  let behavior=new CompanionBehavior(ctx,host);
  t.after(async()=>{await behavior.close();rmSync(root,{recursive:true,force:true});});
  const sleep=await behavior.act('a','sleep','manual-sleep','desktop');assert.equal(sleep.changed,true);
  let saved=JSON.parse(readFileSync(join(directory,'home.json'),'utf8'));assert.equal(saved.companionAction.action,'sleep');assert.ok(saved.route);
  t.mock.timers.tick(Math.round((saved.route.arriveAt-saved.route.departAt)/2));
  const before=(await behavior.snapshot('a')).home.her;
  const wake=await behavior.act('a','wake','manual-wake','desktop');
  assert.equal(wake.fact.actor.kind,'owner');assert.equal(wake.fact.actor.channel,'desktop');assert.equal(wake.fact.result.status,'completed');
  assert.deepEqual(wake.home.her.pos,before.pos);assert.equal(wake.home.her.elev,before.elev);
  saved=JSON.parse(readFileSync(join(directory,'home.json'),'utf8'));assert.equal(saved.route,null);assert.equal(saved.companionAction.action,'wake');assert.equal(saved.sleepPending,false);
  const count=Object.keys(saved.interactionReceipts).length;await behavior.close();behavior=new CompanionBehavior(ctx,host);
  const duplicate=await behavior.act('a','wake','manual-wake','desktop');assert.equal(duplicate.fact.id,wake.fact.id);assert.deepEqual(duplicate.home.her.pos,before.pos);
  const reopened=JSON.parse(readFileSync(join(directory,'home.json'),'utf8'));assert.equal(Object.keys(reopened.interactionReceipts).length,count);
  assert.equal(reopened.asleep,false);assert.equal(reopened.route,null);
});
