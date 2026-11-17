import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture,until} from './fixture.mjs';

test('原生日志持久化先于事实确认且重启不重放',async t=>{
  const f=await fixture(t,{life:false});
  await f.body.act('world','water','owner-water','desktop');
  const [fact]=await f.body.pendingFacts('world');assert.ok(fact);
  f.flushAllowed=false;await f.end(await f.begin());
  assert.equal((await f.body.pendingFacts('world')).length,1,'日志落盘失败不得确认');
  f.flushAllowed=true;await f.end(await f.begin());
  const log=JSON.parse(readFileSync(f.logFile('home'),'utf8'));
  assert.ok(JSON.stringify(log).includes(fact.id),'真实原生日志包含被确认的原事实');
  await until(async()=>!(await f.body.pendingFacts('world')).length);
  await f.restart();assert.deepEqual(await f.body.pendingFacts('world'),[]);
  await f.body.act('world','water','owner-water','desktop');assert.deepEqual(await f.body.pendingFacts('world'),[]);
  assert.deepEqual(await f.body.readFacts('world',[fact.id]),[fact]);
});

test('送达确认后另一个会话经真实 Memory 召回原事实',{timeout:30_000},async t=>{
  const f=await fixture(t,{memory:true,life:false});
  const memory=f.service('petMemory');assert.ok(memory);
  // 显式准备以便把回环端口等进程错误作为真实失败报告，不用聊天的降级掩盖。
  await memory.prepare('home',f.host.native.scopeFor('home'));
  await f.body.act('world','water','cross-chat','desktop');const [fact]=await f.body.pendingFacts('world');
  await f.end(await f.begin());await until(async()=>!(await f.body.pendingFacts('world')).length);
  assert.equal(memory.connection.lifecycle,'ready');
  const ownerB=await f.begin('owner-b',{id:'recall-question',role:'user',source:{kind:'user'},content:[{type:'text',text:'What just happened?'}]});
  assert.ok(memory.context('owner-b').includes(fact.result.summary),'B 必须真实召回 A 已确认送达的事实');
  const events=f.agent('owner-b').session.snapshotEvents();
  assert.ok(!events.find(event=>event.type==='user/message'&&event.data.id==='recall-question').data.content[0].text.includes(fact.id));
  await f.end(ownerB);await f.restart();
  assert.deepEqual(await f.body.pendingFacts('world'),[]);
  await f.begin('owner-b',{id:'recall-after-restart',role:'user',source:{kind:'user'},content:[{type:'text',text:'What just happened?'}]});
  assert.ok(f.service('petMemory').context('owner-b').includes(fact.result.summary));
});
