import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
import {setTimeout as pause} from 'node:timers/promises';
import {fixture,until} from './fixture.mjs';

async function ownerPlan(f,steps){
  const active=await f.begin(),before=await f.tool(active,'life_plan_read',{view:'full'});
  await f.tool(active,'life_plan_update',{expectedRevision:before.revision,plan:{goal:'Synthetic intention',reason:'Behavior preservation',steps,nextConsiderAt:null}});
  await f.end(active);
}
async function cursor(f,expected){await until(async()=>{await f.body.snapshot('world');return (await f.life.readPlan('world')).plan?.cursor===expected;},'计划自动推进到 '+expected);}

test('计划完成事件自动续行一次并跨重启保留',async t=>{
  const f=await fixture(t);await f.enable();
  const guest=await f.begin('guest');await assert.rejects(f.tool(guest,'life_plan_update',{expectedRevision:0,plan:{}}),/admitted|可用/);await f.end(guest);
  await ownerPlan(f,[{id:'one',kind:'hold',activity:'First wait',durationMinutes:1},{id:'two',kind:'hold',activity:'Second wait'}]);
  await until(async()=>!!(await f.life.readPlan('world')).plan?.operationId);
  const first=await f.life.readPlan('world'),firstId=first.plan.operationId;
  assert.equal(first.plan.cursor,0);const calls=f.sent.length;
  t.mock.timers.tick(61_000);await cursor(f,1);
  await until(async()=>!!(await f.life.readPlan('world')).plan?.operationId);
  const next=await f.life.readPlan('world'),nextId=next.plan.operationId;
  assert.notEqual(nextId,firstId);assert.equal((await f.body.inspectPlanned('world',firstId)).status,'completed');
  assert.equal((await f.body.inspectPlanned('world',nextId)).status,'running');
  for(let i=0;i<3;i++)await f.body.snapshot('world');
  assert.equal((await f.life.readPlan('world')).plan.operationId,nextId);assert.equal(f.sent.length,calls,'续行不要求额外模型请求');
  await f.restart();await until(()=>f.life.running());
  const restored=await f.life.readPlan('world');assert.equal(restored.plan.id,first.plan.id);assert.equal(restored.plan.cursor,1);assert.equal(restored.plan.operationId,nextId);
  const saved=JSON.parse(readFileSync(join(f.repo,'.chatpet/data/life/life.json'),'utf8'));assert.ok(saved.currentPlan);
});

test('插件入口种植暂停及重启均不倒退时钟',async t=>{
  const f=await fixture(t);await f.enable();
  // 新菜园没有种子；先按真实目录拨款，再由原生入口提交购买计划。
  const seed=(await f.economy.snapshot('world')).catalog.find(row=>row.id==='seed:radish');
  await f.ownerAction({kind:'grant',amount:seed.purchasePrice},'seed-money');
  await ownerPlan(f,[{id:'buy-seed',kind:'economy',activity:'Buy radish seed',economy:{type:'buy',itemId:seed.id,quantity:1}},{id:'ready',kind:'hold',activity:'Ready to plant'}]);
  await cursor(f,1);
  const purchased=await f.economy.snapshot('world');
  assert.equal(purchased.inventory.find(row=>row.itemId===seed.id).quantity,1);
  assert.equal(purchased.ledger.filter(row=>row.kind==='purchase').length,1);
  await ownerPlan(f,[{id:'till',kind:'garden',activity:'Till',garden:{type:'till',plotId:0}},{id:'plant',kind:'garden',activity:'Plant',garden:{type:'plant',plotId:0,cropId:'radish'}},{id:'hold',kind:'hold',activity:'Watch crops'}]);
  for(let i=0;i<6&&(await f.life.readPlan('world')).plan.cursor<2;i++){t.mock.timers.tick(120_000);await f.body.snapshot('world');await pause(15);}
  await cursor(f,2);
  const garden=()=>f.body.garden('world','state');
  const planted=(await garden()).garden.plots[0];assert.equal(planted.cropId,'radish');
  t.mock.timers.tick(3*3_600_000);await f.body.snapshot('world');const grown=(await garden()).garden.plots[0].progress;assert.ok(grown>0);
  await f.life.control('world',false);const frozen=(await garden()).garden.plots[0].progress;
  t.mock.timers.tick(8*3_600_000);await f.restart();assert.equal((await garden()).garden.plots[0].progress,frozen);
  await f.life.control('world',true);await f.body.setAutonomy('world',true);
  t.mock.timers.tick(24*3_600_000);await f.body.snapshot('world');const mature=(await garden()).garden.plots[0];
  assert.equal(mature.progress,1);assert.equal(mature.mature,true);
  await f.restart();assert.equal((await garden()).garden.plots[0].progress,1);assert.equal((await garden()).garden.plots[0].mature,true);
  assert.ok(existsSync(join(f.repo,'.chatpet/data/economy/economy.sqlite')));
});

test('自主回顾跨日重启续原日期且主人补写不能覆盖历史',async t=>{
  const f=await fixture(t,{now:'2026-11-15T15:59:00Z'});await f.enable();
  await ownerPlan(f,[]);
  const preferences=(await f.life.snapshot('world')).preferences;
  await f.life.settings('world',preferences,{...preferences,review:'23:00'});
  t.mock.timers.tick(61_000);await f.restart();
  await until(()=>f.agent('home').inbox.nextStep.some(message=>message.source?.purpose==='review'),'自主回顾到达原生入口');
  const first=f.agent('home').inbox.nextStep.find(message=>message.source?.purpose==='review'),day=first.source.reviewDay;
  const failed=await f.begin('home',first);
  await assert.rejects(f.tool(failed,'bash',{}),/restriction|自主回顾/);
  await f.end(failed,'aborted');
  t.mock.timers.tick(24*3_600_000);await f.restart();
  await until(()=>f.agent('home').inbox.nextStep.some(message=>message.source?.reviewDay===day),'跨日恢复原日期');
  const retry=f.agent('home').inbox.nextStep.find(message=>message.source?.reviewDay===day);
  const review=await f.begin('home',retry),path=join(f.repo,'.chatpet/diary',day+'.md');
  await f.tool(review,'write',{file_path:path,content:'Synthetic autonomous diary.'});await f.end(review);
  assert.equal(readFileSync(path,'utf8'),'Synthetic autonomous diary.');
  const owner=await f.begin();await assert.rejects(f.tool(owner,'write',{file_path:path,content:'Overwrite'}),/已经合上|存在|覆盖/);await f.end(owner);
  // 当天的回顾再次失败，留给第二天的主人聊天补写。
  // 旧日期完成后，后续日期有一分钟间隔；只伪造 Date，重启重建到期闹钟。
  t.mock.timers.tick(61_000);await f.restart();
  await until(()=>f.agent('home').inbox.nextStep.some(message=>message.source?.purpose==='review'&&message.source.reviewDay!==day),'当天回顾独立到达');
  const today=f.agent('home').inbox.nextStep.find(message=>message.source?.purpose==='review'&&message.source.reviewDay!==day);
  await f.end(await f.begin('home',today),'aborted');
  t.mock.timers.tick(3*3_600_000);await f.restart();
  const backfill=await f.begin(),historical=join(f.repo,'.chatpet/diary',today.source.reviewDay+'.md');
  await f.tool(backfill,'write',{file_path:historical,content:'Synthetic owner backfill.'});
  await assert.rejects(f.tool(backfill,'write',{file_path:historical,content:'Overwrite'}),/已经合上|存在|覆盖/);await f.end(backfill);
  assert.equal(readFileSync(historical,'utf8'),'Synthetic owner backfill.');
  await f.restart();assert.equal(readFileSync(path,'utf8'),'Synthetic autonomous diary.');
  assert.equal((await f.life.snapshot('world')).life.pendingReviews?.some(row=>row.day===today.source.reviewDay),false);
});

test('语音插件关闭取消识别并拒绝晚到音频和结果',async t=>{
  let finish,captured,calls=0;
  const recognizer={listProviders:()=>['synthetic'],resolve:input=>input,
    transcribe(_input,signal){captured=signal;calls++;return new Promise(resolve=>{finish=resolve;});}};
  const f=await fixture(t,{recognizer,life:false,economy:false});
  const source=readFileSync('src/desktop/platform/client.js','utf8'),from=source.indexOf('function createHearControl(opts) {'),to=source.indexOf('\n//#endregion',from);
  assert.ok(from>=0&&to>from);
  let grant,finishRecording,intervals=0;
  const input={isConnected:true,value:'',selectionStart:0,selectionEnd:0,focus(){},blur(){},setSelectionRange(){}};
  const voice=f.service('petVoice');
  const factory=vm.runInNewContext(source.slice(from,to)+'\ncreateHearControl',{
    AbortController,document:{activeElement:null},window:{setInterval(){intervals++;return 1;},clearInterval(){intervals=0;}},canRecord:()=>true,
    startRecording:()=>new Promise(resolve=>{grant=()=>resolve({elapsedMs:()=>500,cancel(){},stop:()=>new Promise(ok=>{finishRecording=ok;})});}),
    hearAudio:async(_url,_audio,signal)=>{const result=await voice.handle({rest:'voice/hear',method:'POST',body:JSON.stringify({audio:'AQI='}),signal});return result.obj;},
    toBase64:()=> 'AQI=',MIN_RECORD_MS:100,MAX_RECORD_MS:24000,SILENCE_PEAK:.1});
  const control=()=>factory({micBtn:{dataset:{},addEventListener(){}},input,hint:{show(){},hide(){},flash(){}},resizeInput(){},hearUrl:'fixture://voice'});
  const first=control();first.start();grant();await pause(1);first.stop();finishRecording({peak:1,wave:new ArrayBuffer(0)});
  await until(()=>calls===1);finish({text:'Synthetic recognized input'});await until(()=>!!input.value);
  await f.end(await f.begin('home',{id:'spoken',role:'user',source:{kind:'user'},content:[{type:'text',text:input.value}]}));first.dispose();input.value='';
  const second=control();second.start();grant();await pause(1);second.stop();finishRecording({peak:1,wave:new ArrayBuffer(0)});
  await until(()=>calls===2);second.dispose();await f.unloadVoice();assert.equal(captured.aborted,true);
  finish({text:'Late result must not be used'});await pause(5);assert.equal(input.value,'');assert.equal(intervals,0);
  const late=control();late.start();late.dispose();grant();await pause(5);assert.equal(calls,2);assert.equal(input.value,'');
  await f.restart();const events=JSON.parse(readFileSync(f.logFile('home'),'utf8'));
  assert.equal(events.filter(event=>event.type==='user/message'&&event.data.id==='spoken').length,1);
  assert.ok(!JSON.stringify(events).includes('Late result must not be used'));
});
