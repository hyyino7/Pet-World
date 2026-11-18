import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {say} from '../../scripts/checks/lib/native-conversation-scenarios.mjs';
import {fixture} from './fixture.mjs';
import {footer,assertEmotion,assertObservation,prepareMemory} from './policy-evidence.mjs';

test('Desktop 聊天复用 owner 权限、组装和 Memory，新建前先保存旧会话',async t=>{
  const f=await fixture(t,{policy:true,desktop:true,emotion:true,memory:true,life:false});
  await prepareMemory(f);
  const chat=f.service('petDesktop').chat;
  const {sessionId,workspaceId}=await chat.run('open',{sessionId:'owner-b'});
  const scope={sessionId,workspaceId};
  const owner=await f.begin();
  const ownerSections=owner.prompt.sections,ownerContexts=owner.prompt.contexts.map(row=>row.name);
  const ownerTools=f.schemas(owner);
  await f.end(owner);
  await chat.run('send',{...scope,text:'Synthetic Desktop input',requestId:'desktop-request'});
  const message=f.agent(sessionId).inbox.nextTurn[0];
  assert.deepEqual(message.source,{kind:'user',rpcId:'desktop-request'});
  const active=await f.begin(sessionId,message);
  assert.equal(f.host.native.isAutonomous(sessionId),false);
  assert.deepEqual(active.prompt.sections,ownerSections);
  assert.deepEqual(active.prompt.contexts.map(row=>row.name),ownerContexts);
  assert.deepEqual(f.schemas(active),ownerTools);
  assert.ok(f.schemas(active).includes('pet_memory_recall'));
  assert.equal(await f.tool(active,'bash',{}),'bash');
  await f.end(active,'completed',footer('Desktop owner'));
  await assertEmotion(f,'Desktop owner');
  assertObservation(f,sessionId,message.id,'owner_statement','owner');
  f.flushAllowed=false;
  await assert.rejects(chat.run('new',scope),/会话记录暂未保存/);
  assert.deepEqual(f.archives,[]);
  f.flushAllowed=true;
  const fresh=await chat.run('new',scope);
  assert.notEqual(fresh.sessionId,sessionId);
  assert.deepEqual(f.archives,[{id:sessionId,flushed:sessionId}]);
});

test('普通主人会话可执行情绪工具并拒绝过期版本',async t=>{
  const f=await fixture(t,{policy:true,emotion:true,life:false,economy:false});
  const active=await f.begin();
  const emotion=f.service('petEmotion'),before=await emotion.read('world');
  const args={expected_revision:before.revision,expected_hash:before.contentHash,mood:'安静',reason:'Owner tool'};
  assert.ok(active.prompt.tools.some(tool=>tool.name==='pet_emotion_update'));
  await f.tool(active,'pet_emotion_update',args);
  await assertEmotion(f,'Owner tool');
  await assert.rejects(f.tool(active,'pet_emotion_update',{...args,reason:'Stale owner tool'}),/Emotion changed; refresh before saving/);
  await assertEmotion(f,'Owner tool');
  await f.end(active);
});

test('碎碎念和梦话只用伙伴身份，梦话带上游指令且不触发 Memory 或情绪',async t=>{
  const calls=[];
  const f=await fixture(t,{policy:true,desktop:true,emotion:true,memory:true,life:false,economy:false,configure(services){
    services.set('agentDefaultModel',{currentSelection:()=>({provider:'fixture',model:'local'})});
    services.set('llm',{stream(options){calls.push(options);return say(footer('Must not be stored'));}});
  }});
  const desk=f.service('petDesktop'),emotion=f.service('petEmotion'),frames=[];
  desk.onPresentation((type,value)=>frames.push({type,value}),()=>true);
  const memory=f.service('petMemory');
  const prepare=t.mock.method(memory,'prepare'),recall=t.mock.method(memory,'recall');
  const before=await emotion.read('world'),store=f.host.workspace.runtime.store;
  const initial=store.all('source'),ids=[...f.workspace.sessionIds];
  writeFileSync(join(f.repo,'.chatpet/USER.md'),'Synthetic private owner profile');
  assert.ok((await desk.features.whisper()).ok);
  assert.ok((await desk.features.whisper(undefined,true)).ok);
  assert.equal(calls.length,2);
  for(const call of calls){
    assert.equal(call.system,f.host.native.context().identity);
    assert.match(call.system,/Synthetic companion/);
    assert.deepEqual(call.messages.map(message=>message.role),['user']);
    assert.equal(call.tools,undefined);
  }
  assert.match(calls[0].messages[0].content[0].text,/日常碎碎念/);
  assert.match(calls[1].messages[0].content[0].text,/半梦半醒，不要清醒地回应任何人/);
  assert.deepEqual(frames.filter(frame=>frame.type==='say').map(frame=>frame.value.dream),[false,true]);
  assert.equal(prepare.mock.callCount()+recall.mock.callCount(),0);
  assert.deepEqual(store.all('source'),initial);
  assert.deepEqual(await emotion.read('world'),before);
  assert.deepEqual(f.workspace.sessionIds,ids);
  assert.equal(f.agent('home').session.seq,0);
});
