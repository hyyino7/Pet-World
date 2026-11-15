import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {emptyHomeState} from '#feiyu-home';
import {CompanionRoom} from '../../src/behavior/room.js';
import {gardenHomeProjection,gardenReceiptProjection,gardenReceiptText} from '../../src/behavior/garden-receipt.js';
import {PersistentLifePlan,type CurrentLifePlan} from '../../src/life/plan.js';

const receipt='小蓝鱼：收获小萝卜 × 3，已经放进仓库；这块田可以再播种了。';

test('legacy garden projections remove only generated role labels without mutating archived sources',()=>{
  const state={activity:receipt,eventLog:[{type:'garden',text:receipt},{type:'talk',text:'小蓝鱼：这是主人保留的留言'}]};
  const original=JSON.stringify(state);
  const projected=gardenHomeProjection(state);
  assert.equal(projected.eventLog[0].text,receipt.slice(4));
  assert.equal(projected.eventLog[1].text,state.eventLog[1].text);
  assert.equal(projected.activity,receipt,'A later non-garden event does not establish the current activity provenance');
  assert.equal(gardenHomeProjection({...state,eventLog:[state.eventLog[0]]}).activity,receipt.slice(4));
  assert.equal(JSON.stringify(state),original);
  assert.equal(gardenReceiptText('主人说“小蓝鱼：收获小萝卜”'), '主人说“小蓝鱼：收获小萝卜”');
  const garden={care:{status:'小蓝鱼正在采收',receipts:[{message:receipt}],recent:[{message:receipt}]},note:'小蓝鱼是主人写的原话'};
  const saved=JSON.stringify(garden),view=gardenReceiptProjection(garden);
  assert.equal(view.care.status,'正在采收');
  assert.equal(view.care.receipts[0].message,receipt.slice(4));
  assert.equal(view.care.recent[0].message,receipt.slice(4));
  assert.equal(view.note,garden.note);
  assert.equal(JSON.stringify(garden),saved);
});

test('old completed garden execution and Body display remain readable without rewriting save bytes',t=>{
  const root=mkdtempSync(join(tmpdir(),'garden-receipt-projection-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const now=Date.parse('2026-11-15T05:00:00Z'),home=emptyHomeState(now),file=join(root,'home.json');
  home.activity=receipt;
  home.eventLog=[{at:now,type:'garden',text:receipt,room:'garden',spot:'plot0'}];
  writeFileSync(file,JSON.stringify(home));
  const saved=readFileSync(file,'utf8'),room=new CompanionRoom(root,()=>undefined);
  assert.equal(room.view(now).her.activity,receipt.slice(4));
  assert.equal(room.view(now).events[0].text,receipt.slice(4));
  assert.equal(readFileSync(file,'utf8'),saved);
  assert.equal(room.state.activity,receipt);
  const plan={id:'original',goal:'主人说小蓝鱼',reason:'保留小蓝鱼这段原文',status:'active',steps:[],cursor:0,
    execution:{kind:'garden',reason:receipt},nextConsiderAt:null,reconsiderWhen:[],pauseReason:null,replanReason:null} as unknown as CurrentLifePlan;
  const raw=JSON.stringify(plan),description=JSON.parse(PersistentLifePlan.describe({revision:1,plan}));
  assert.equal(description.plan.execution.reason,receipt.slice(4));
  assert.equal(description.plan.goal,plan.goal);
  assert.equal(description.plan.reason,plan.reason);
  assert.equal(JSON.stringify(plan),raw);
  plan.execution={kind:'hold',reason:receipt};
  assert.equal(JSON.parse(PersistentLifePlan.describe({revision:1,plan})).plan.execution.reason,receipt);
});
