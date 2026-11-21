import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
import {confirmBodyFact,recallBodyFactAcrossRestart} from './native-facts.mjs';

test('原生日志持久化先于事实确认且重启不重放',async t=>{
  const f=await fixture(t,{life:false});
  await f.body.act('world','water','owner-water','desktop');
  const [fact]=await f.body.pendingFacts('world');assert.ok(fact);
  f.flushAllowed=false;await f.end(await f.begin());
  assert.equal((await f.body.pendingFacts('world')).length,1,'日志落盘失败不得确认');
  f.flushAllowed=true;await confirmBodyFact(f,fact);
  await f.restart();assert.deepEqual(await f.body.pendingFacts('world'),[]);
  await f.body.act('world','water','owner-water','desktop');assert.deepEqual(await f.body.pendingFacts('world'),[]);
  assert.deepEqual(await f.body.readFacts('world',[fact.id]),[fact]);
});

test('送达确认后另一个会话经真实 Memory 召回原事实',{timeout:30_000},async t=>{
  const f=await fixture(t,{memory:true,life:false});
  const memory=f.service('petMemory');assert.ok(memory);
  // 显式准备以便把回环端口等进程错误作为真实失败报告，不用聊天的降级掩盖。
  await memory.prepare('home',f.host.native.nativeScopeFor('home'));
  await f.body.act('world','water','cross-chat','desktop');const [fact]=await f.body.pendingFacts('world');
  await confirmBodyFact(f,fact);
  assert.equal(memory.connection.lifecycle,'ready');
  await recallBodyFactAcrossRestart(f,fact);
});
