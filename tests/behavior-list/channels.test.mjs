import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {cpSync,readFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
import {fixture,until} from './fixture.mjs';

// 只替换原生 QQ SDK 传输边界。渠道入口、持久 inbox、Core 和原生准入全部保持真实。
const sdk='data:text/javascript,'+encodeURIComponent('export const createBridge = options => globalThis.__behaviorQQTransport(options);');
const hook=registerHooks({resolve(specifier,context,next){return specifier==='#dsh-world/adapters/qq-sdk'?{url:sdk,shortCircuit:true}:next(specifier,context);}});
test.after(()=>{hook.deregister();delete globalThis.__behaviorQQTransport;});

test('QQ 渠道入口收件后重启不丢失且不重复送达',async t=>{
  let gateway;const sent=[];
  globalThis.__behaviorQQTransport=options=>{gateway=options;return {start:async()=>{},stop:async()=>{},getState:()=> 'online',
    async sendPrivate(id,text){sent.push({id,text});return {messageId:'reply-'+sent.length};},async sendGroup(){throw Error('Unexpected group send');}};};
  const f=await fixture(t,{channels:true,life:false,economy:false}),channels=()=>f.service('petChannels');
  const batchQuietMs=5000;
  // Date 是假时钟，batch 的 setTimeout 仍是真计时器；两者都推进同一窗口。
  const quietWindow=async()=>{t.mock.timers.tick(batchQuietMs);await pause(batchQuietMs);};
  const status=await channels().request('world','channelStatus',{});
  await channels().request('world','messagingSettings',{expected:status.messaging.config,next:{qq:{enabled:true,accountId:'100',ownerSpeakerId:'200',allowPrivate:['200'],batchQuietMs}}});
  assert.ok(gateway,'假 SDK 已接入真实渠道');
  const input={kind:'private',selfId:'100',userId:'200',messageId:'original-platform-id',text:'Synthetic original input'};
  gateway.onPrivateMessage(input);await pause(5);
  // 关闭前不让安静计时器触发，持久收件必须在下一进程恢复。
  assert.equal(f.sent.length,0);await f.restart();
  await quietWindow();
  await until(()=>f.agent('home').inbox.nextTurn.some(row=>row.source?.identity?.platformMessageId===input.messageId),'QQ 原始收件在重启后送入原生入口');
  const message=f.agent('home').inbox.nextTurn.find(row=>row.source?.identity?.platformMessageId===input.messageId);
  assert.match(message.content[0].text,/Synthetic original input/);
  await f.end(await f.begin('home',message));await until(()=>sent.length===1,'原生回复送回 QQ');
  const originalCount=f.sent.filter(row=>row.source?.identity?.platformMessageId===input.messageId).length;
  gateway.onPrivateMessage(input);await quietWindow();assert.equal(f.sent.filter(row=>row.source?.identity?.platformMessageId===input.messageId).length,originalCount);
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
