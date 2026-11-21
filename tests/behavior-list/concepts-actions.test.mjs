import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture, value} from './fixture.mjs';

test('照料在设置、Life、Body 和 World 保留准入及错误顺序', async t => {
  const f = await fixture(t, {console:true});
  const actions = ['feed','water','play','pet','sleep','wake'];
  const rpcError = {ok:false,error:{code:'INVALID_ARGUMENT',message:'设置值无效，请检查填写内容。',details:{}}};
  for (const action of actions) {
    const input = {workspaceId:'world',action};
    assert.equal(value(await f.settings('lifeAction', input, 'settings-'+action)).fact.type, action);
    assert.equal((await f.life.act('world', action, 'life-'+action)).fact.type, action);
    assert.equal((await f.body.act('world', action, 'body-'+action)).fact.type, action);
    const requestId = 'world-'+action;
    assert.equal(typeof value(await f.body.worldCommands.care({...input,requestId})).changed, 'boolean');
    const fact = (await f.body.pendingFacts('world')).find(row => row.requestId === requestId);
    assert.equal(fact?.type, action);
  }
  for (const action of ['poke','lamp','',0]) {
    assert.deepEqual(await f.settings('lifeAction', {workspaceId:'world',action}), rpcError);
    await assert.rejects(f.life.act('wrong-binding', action), {message:'未知的生活动作'});
    await assert.rejects(f.body.act('wrong-binding', action), {message:'未知的身体动作'});
    assert.deepEqual(await f.body.worldCommands.care({workspaceId:'world',requestId:'rejected',action}),
      {ok:false,error:{operationId:'rejected',code:'INVALID_ARGUMENT',message:'未知的身体动作',effect:'none',retry:'never'}});
  }
  assert.equal((await f.settings('lifeAction', {workspaceId:'wrong-binding',action:'poke'})).error.code, 'STALE_BINDING');
  assert.equal((await f.body.pendingFacts('world')).length, 24);
});

test('角色房间动作固定工具枚举、留言截断与角色操作拒绝', async t => {
  const f = await fixture(t, {room:true,policy:true});
  const active = await f.begin();
  const actions = ['command','pet','poke','feed','water','play','talk','sleep','wake','lamp'];
  assert.deepEqual(f.toolSchema(active,'room_action').parameters.properties.action.enum, actions);
  const text = '甲'.repeat(120);
  const result = await f.tool(active, 'room_action', {action:'talk',text:'  '+text+'乙  '});
  assert.deepEqual(result.event, {type:'talk',text:'你自己的留言已保存：'+text});
  await assert.rejects(f.tool(active, 'room_action', {action:'visit'}), {
    code:'INVALID_ARGS',message:'invalid arguments: "action" must be one of '+JSON.stringify(actions),
  });
  await assert.rejects(f.body.roomAction('world', {action:'visit'}, '大肥鱼'), {message:'角色不能执行这项房间操作'});
  await f.end(active);
});

test('主人 Room RPC 保留十五个动作、事实类型及请求重试', async t => {
  const f = await fixture(t, {room:true,console:true});
  const actions = [
    ['visit'],['pet'],['poke'],['feed'],['water'],['play'],['talk',{text:'合成留言'}],
    ['sleep'],['wake'],['lamp',{on:true}],['command',{room:'living',spot:'sofa'}],
    ['go',{pos:[-1,1]}],['place',{pos:[1,6]}],['sick'],['heal'],
  ];
  for (const [action, fields] of actions) {
    const input = {workspaceId:'world',data:{action,...fields}};
    const result = value(await f.settings('roomAction', input, action));
    assert.equal(result.fact.type, action);
    assert.equal(result.fact.actor.kind, 'owner');
    assert.equal(result.fact.actor.channel, 'room');
    if (action === 'talk') {
      assert.deepEqual(value(await f.settings('roomAction', input, action)).fact, result.fact);
      await f.restart();
      assert.deepEqual(value(await f.settings('roomAction', input, action)).fact, result.fact);
    }
  }
  const facts = await f.body.pendingFacts('world');
  assert.deepEqual(facts.map(fact => fact.type).sort(), actions.map(([action]) => action).sort());
});
