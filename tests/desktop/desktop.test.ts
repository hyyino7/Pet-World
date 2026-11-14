import assert from 'node:assert/strict';
import test from 'node:test';
import { Conversation, type NativeEvent, type NativeDesktopHost } from '../../src/desktop/conversation.js';

function fixture() {
  let binding = { id: 'bound', path: '/workspace' }, cancellations = 0, followups = 0;
  const events: NativeEvent[] = [], ids: string[] = [], archived: string[] = [], saved = new Map<string,string>();
  const session = { id: '', header: { cwd:'/workspace' }, snapshotEvents: () => events };
  const add = (type: string, data: NativeEvent['data']) => {
    const entry = {type, data, seq:events.length,time:Date.now()};
    events.push(entry); chat.event(session,entry);
  };
  const agent = {status:'idle', session, followup(message: NativeEvent['data']) {
    followups++; add('turn/start',{turn:followups}); add('user/message',message);
  }};
  const native: NativeDesktopHost = {
    workspaceRegistry: { get:id=>id===binding.id?{path:binding.path,sessionIds:ids}:undefined,archivedSessionIds:archived,
      archiveSession:async id=>{archived.push(id);} },
    sessions:{flush:async()=>{}},agents:{get:()=>agent},
    sessionController:{create:async({sessionId})=>{session.id=sessionId; ids.push(sessionId); events.length=0;return {sessionId};},
      resolveAgent:async()=>({agent}),cancel:()=>{cancellations++;return {accepted:true};}},
  };
  const chat = new Conversation(native, ()=>binding, key=>saved.get(key), (k,v)=>saved.set(k,v),()=>{});
  return {chat,session,add,archived,saved, stats:()=>({cancellations,followups}), change:()=>{binding={id:'other',path:'/other'};}};
}
test('native receipt, text-only streaming, safe stop, reopen and archive', async()=>{
  const {chat,session,add,stats,archived}=fixture();
  const view=await chat.run('open',{}), scope={sessionId:view.sessionId!,workspaceId:view.workspaceId};
  await chat.run('send',{...scope,text:'大肥鱼你好',requestId:'one'});
  chat.frame(session,{type:'start',turn:1,step:1,attemptId:'a'});
  chat.frame(session,{type:'chunk',attemptId:'a',index:0,chunk:{type:'reasoning-delta',text:'hidden'}});
  chat.frame(session,{type:'chunk',attemptId:'a',index:1,chunk:{type:'text-delta',text:'早'}});
  chat.frame(session,{type:'chunk',attemptId:'a',index:1,chunk:{type:'text-delta',text:'duplicate'}});
  assert.equal((await chat.run('open',scope)).live,'早');
  await chat.run('send',{...scope,text:'大肥鱼你好',requestId:'one'});assert.equal(stats().followups,1);
  await assert.rejects(chat.run('new',scope));
  await chat.run('stop',{...scope,turn:1});assert.equal(stats().cancellations,1);
  // This native stop abandoned the attempt without a final assistant message.
  add('turn/end',{turn:1,reason:{kind:'aborted'}});
  assert.deepEqual(chat.snapshot().messages.map(m=>m.text),['大肥鱼你好','早']);
  const answer='鱼'.repeat(1600);
  await chat.run('send',{...scope,text:'继续',requestId:'two'});
  await assert.rejects(chat.run('stop',{...scope,turn:1}));assert.equal(stats().cancellations,1);
  add('assistant/message',{turn:2,message:{role:'assistant',content:[{type:'text',text:answer}]}});
  add('turn/end',{turn:2,reason:{kind:'completed'}});
  assert.equal((await chat.run('open',scope)).messages.at(-1)?.text,answer);
  const fresh=await chat.run('new',scope);assert.notEqual(fresh.sessionId,scope.sessionId);assert.deepEqual(archived,[scope.sessionId]);
});
test('stale workspace cannot show messages or target a previous session',async()=>{
  const {chat,change}=fixture(),view=await chat.run('open',{});
  await chat.run('send',{sessionId:view.sessionId!,text:'private',requestId:'one'});
  change(); assert.deepEqual(chat.snapshot().messages,[]);
  await assert.rejects(chat.run('stop',{sessionId:view.sessionId!,workspaceId:view.workspaceId,turn:1}));
});

