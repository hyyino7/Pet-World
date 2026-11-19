import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,readFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
import {fixture,until,value} from './fixture.mjs';
import {prepareMemory} from './policy-evidence.mjs';

import {qqTransport} from './qq-transport.mjs';

test('3C Bridge 整理保留路由拒绝和忙时排队，空闲后处理已完成轮次',async t=>{
  const calls=[];
  const f=await fixture(t,{channels:true,memory:true,economy:false,intervals:true,configure(services){
    services.set('compaction',{async compactNow(agent){calls.push(agent.id);return null;}});
  }});
  const old=f.host.workspace.companionConfiguration();
  value(await f.host.services.workspace.saveCompanion(f.host.operator.request('bridge-compaction'),{
    workspaceId:'world',expectedSettings:old,settings:{...old,memorySummaryTurns:200,memorySummaryIdleMinutes:60},
  }));
  const channel=f.service('petChannels');
  const route=f.route('/chatpet-connect/bridge/compact');
  const compact=async token=>{
    let status,body;
    await route.handler({method:'POST',headers:{host:'127.0.0.1','x-dsh-world-token':token}},
      {writeHead(code){status=code;},end(json){body=JSON.parse(json);}});
    return {status,body};
  };
  assert.equal((await compact()).status,503);
  const settings=(await channel.request('world','channelStatus',{})).bridge.preferences;
  await channel.request('world','bridgeSettings',{expected:settings,next:{enabled:true,outlets:[]}});
  const {discovery}=(await channel.request('world','channelStatus',{})).bridge;
  const {token}=JSON.parse(readFileSync(discovery,'utf8'));
  assert.equal((await compact()).status,403);
  assert.deepEqual(await compact(token),{status:409,body:{error:'生活会话或记忆整理未启用'}});
  await f.enable();
  const home=await f.home();
  await prepareMemory(f,home.id);
  assert.deepEqual(await compact(token),{status:409,body:{error:'当前没有待整理的已完成对话'}});
  await f.end(await f.begin(home.id));
  const busy=await f.begin(home.id);
  assert.deepEqual(await compact(token),{status:202,body:{accepted:true}});
  t.mock.timers.tick(1000);
  const batch=()=>f.host.workspace.runtime.store.get('memory-batch',home.id);
  assert.equal(batch().lastAttempt,0);
  assert.deepEqual(calls,[]);
  await f.end(busy);
  t.mock.timers.tick(1000);
  await until(()=>batch().turns===0,'Bridge 整理完成');
  assert.deepEqual(calls,[home.id]);
});

test('QQ 渠道入口收件后重启不丢失且不重复送达',async t=>{
  const transport=qqTransport(t),{sent}=transport;
  const f=await fixture(t,{channels:true,life:false,economy:false}),channels=()=>f.service('petChannels');
  const batchQuietMs=5000;
  // Date 是假时钟，batch 的 setTimeout 仍是真计时器；两者都推进同一窗口。
  const quietWindow=async()=>{t.mock.timers.tick(batchQuietMs);await pause(batchQuietMs);};
  const status=await channels().request('world','channelStatus',{});
  await channels().request('world','messagingSettings',{expected:status.messaging.config,next:{qq:{enabled:true,accountId:'100',ownerSpeakerId:'200',allowPrivate:['200'],batchQuietMs}}});
  assert.ok(transport.gateway,'假 SDK 已接入真实渠道');
  const input={kind:'private',selfId:'100',userId:'200',messageId:'original-platform-id',text:'Synthetic original input'};
  transport.gateway.onPrivateMessage(input);await pause(5);
  // 关闭前不让安静计时器触发，持久收件必须在下一进程恢复。
  assert.equal(f.sent.length,0);await f.restart();
  await quietWindow();
  await until(()=>f.agent('home').inbox.nextTurn.some(row=>row.source?.identity?.platformMessageId===input.messageId),'QQ 原始收件在重启后送入原生入口');
  const message=f.agent('home').inbox.nextTurn.find(row=>row.source?.identity?.platformMessageId===input.messageId);
  assert.match(message.content[0].text,/Synthetic original input/);
  await f.end(await f.begin('home',message));await until(()=>sent.length===1,'原生回复送回 QQ');
  const originalCount=f.sent.filter(row=>row.source?.identity?.platformMessageId===input.messageId).length;
  transport.gateway.onPrivateMessage(input);await quietWindow();assert.equal(f.sent.filter(row=>row.source?.identity?.platformMessageId===input.messageId).length,originalCount);
  await f.restart();await quietWindow();assert.equal(sent.length,1);
});

test('换目录使在途渠道请求失效且不写旧目录',async t=>{
  let release,entered;const waiting=new Promise(resolve=>{entered=resolve;});
  const f=await fixture(t,{channels:true,life:false,economy:false,search:()=>{entered();return new Promise(resolve=>{release=resolve;});}});
  const channels=f.service('petChannels'),status=await channels.request('world','channelStatus',{});
  await channels.request('world','messagingSettings',{expected:status.messaging.config,next:{qq:{accountId:'12345',allowGroups:['6789']}}});
  await channels.request('world','groupSlang',{groupId:'6789',content:'fixtureword',status:'candidate',meaning:'',usage:''});
  const pending=channels.request('world','groupResearch',{groupId:'6789',content:'fixtureword'});
  const rejected=assert.rejects(pending,error=>error.code==='STALE_BINDING');await waiting;
  const data=join(f.repo,'.chatpet/data/channels'),old=readFileSync(join(data,'preferences.json'),'utf8');
  const replacement=join(f.root,'replacement');mkdirSync(replacement);cpSync(join(f.repo,'.chatpet'),join(replacement,'.chatpet'),{recursive:true});
  await f.bind(replacement);release({sources:[{url:'https://fixture.invalid/source',title:'Synthetic result'}]});await rejected;
  assert.equal(readFileSync(join(data,'preferences.json'),'utf8'),old);
  const current=await channels.request('world','channelStatus',{});assert.equal(current.messaging.config.qq.accountId,'12345');
});
