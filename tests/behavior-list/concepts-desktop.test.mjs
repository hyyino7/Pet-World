import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fixture, signal} from './fixture.mjs';

test('Desktop 动画入口按共享身体状态准入吃饭和睡醒素材', async t => {
  const f = await fixture(t, {platform:true,life:false});
  const platform = f.service('petPlatform');
  platform.ownerAccess('world');
  const request = (path, method = 'GET', body) => platform.handle(
    new URL('http://fixture.invalid/chatpet-presentation/'+path),method,JSON.stringify(body),signal());
  const {main:{bodyTemplate,animations}} = (await request('config')).obj;
  const configured = await request('config','PUT',{pets:[{...bodyTemplate,display:'web'}]});
  assert.equal(configured.status,200);
  const anim = (name,id) => request('anim?pet=main&surface=web','POST',{name,requestId:id});
  const state = () => f.body.roomState('world');
  const feeds = async () => (await f.body.pendingFacts('world')).filter(fact => fact.type === 'feed');
  const assertBusy = async id => {
    const {status,obj} = await anim('吃饭团',id);
    assert.equal(status,409);
    assert.deepEqual(obj,{ok:false,reason:'activity-busy',message:'当前活动进行中，请先完成或结束该活动'});
    assert.ok(!(await feeds()).some(fact => fact.requestId === id));
  };
  const settle = async () => { t.mock.timers.tick(13_000); await state(); };

  assert.equal((await state()).her.kind,'idle');
  assert.equal((await anim('吃饭团','idle-feed')).obj.ok,true);
  assert.equal((await state()).her.kind,'eat');
  const [first] = await feeds();
  assert.equal(first.requestId,'idle-feed');
  assert.equal((await anim('吃白饭','eating-feed')).obj.ok,true);
  assert.deepEqual(await feeds(),[first]);
  await settle();
  const physical = await anim('晨间刷牙','brush');
  assert.equal(physical.status,409);
  assert.deepEqual(physical.obj,{ok:false,reason:'activity-required',message:'请通过共享行为操作执行这项活动'});
  await f.body.act('world','water','drink');
  assert.equal((await state()).her.kind,'drink');
  await assertBusy('drinking-feed');
  await settle();

  for (const [action,kind] of [['pet','react_shy'],['poke','react_scare']]) {
    await f.body.roomAction('world',{action},'主人');
    const before = await state();
    assert.equal(before.her.kind,kind);
    assert.equal(before.presentation.action,'activity');
    assert.equal((await anim('吃饭团',kind)).obj.ok,true);
    assert.equal((await feeds()).at(-1).requestId,kind);
    await settle();
  }
  await f.body.roomAction('world',{action:'command',room:'her_room',spot:'bed'},'主人');
  const {her} = await state();
  assert.equal(her.walking,true);
  await assertBusy('walking-feed');
  t.mock.timers.tick(Math.ceil(her.etaMs)+1);
  assert.equal((await state()).her.walking,false);
  assert.equal((await anim('原地小憩沉眠','sleep-clip')).obj.accepted,true);
  assert.equal((await state()).her.asleep,true);
  await assertBusy('sleeping-feed');

  assert.equal((await anim('睡觉-起来','unlisted-wake')).obj.reason,'unknown-animation');
  assert.equal((await state()).her.asleep,true);
  const path = join(f.repo,'.chatpet/data/pet-platform/main-config.jsonc');
  const stored = JSON.parse(readFileSync(path,'utf8'));
  writeFileSync(path,JSON.stringify({...stored,animations:{...animations,idle:[...animations.idle,'睡觉-起来']}}));
  assert.equal((await anim('睡觉-起来','wake-clip')).obj.accepted,true);
  assert.equal((await state()).her.asleep,false);
  const facts = await f.body.pendingFacts('world');
  assert.deepEqual(facts.filter(fact => ['sleep','wake'].includes(fact.type)).map(fact => [fact.requestId,fact.type]),
    [['sleep-clip','sleep'],['wake-clip','wake']]);
});
