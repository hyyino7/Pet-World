import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createUserMessage} from '@deepseek-ai/dsh-llm';
import {Session,SessionId} from '@deepseek-ai/dsh-session';
import {emptyHomeState,homeView} from '#feiyu-home';
import {createLifeStore} from '#dsh-world/life/lifeStore';
import {applyLifeHistory,prepareLifeHistory} from '../../dist/src/core/native/history-maintenance.js';
import {fixture,signal} from '../behavior-list/fixture.mjs';

const lifeInput=source=>createUserMessage({source:{kind:'dsh-world-life',...source},content:[{type:'text',text:'Synthetic Life input'}]});

for(const kind of ['unclaimed','rejected','failed'])test(`Life ${kind} denies a native background turn`,async t=>{
  const f=await fixture(t,{life:kind==='rejected',economy:false});
  const {native}=f.host,agent=f.agent('home'),message=lifeInput();
  if(kind==='failed')native.sourceTable.register({
    id:'broken-life',sources:['dsh-world-life'],order:0,branches:{},
    admit(){throw Error('Synthetic adapter failure');},
  });
  assert.equal(native.sourceTable.admit({sessionId:agent.id,message}).kind,kind);
  assert.equal(native.acceptsInput(agent.id,message),false);
  await f.emit('agent/inbox/inserted',{agent,message});
  const result=await f.middleware('agent/pre-step',[{agent,turn:1,step:1,messages:[message],signal:signal()}],
    async()=>({kind:'enter',messages:[]}));
  assert.equal(result.kind,'reject');
  assert.equal(native.isAutonomous(agent.id),false);
});

test('a review file already resolving is denied if Life unloads before native dispatch',async t=>{
  const resolving=Promise.withResolvers(),resume=Promise.withResolvers();
  const f=await fixture(t,{policy:true,economy:false,configure(services){
    services.set('fs',{async resolve(path,{cwd}){
      resolving.resolve();
      await resume.promise;
      return resolve(cwd,path);
    },processPath:path=>path});
  }});
  await f.enable();
  const home=await f.home(),message=lifeInput({purpose:'review',reviewDay:'2026-11-14'});
  const active=await f.begin(home.id,message),path=join(f.repo,'.chatpet/self.md');
  const before=readFileSync(path,'utf8');
  const refused=assert.rejects(f.tool(active,'write',{file_path:path,content:'Late synthetic write'}),/自主回顾文件范围已变化/);
  try {
    await resolving.promise;
    await f.life.close();
    assert.equal(f.host.native.sourceTable.admit({sessionId:home.id,message}).kind,'unclaimed');
    await f.end(active,'aborted');
  } finally {resume.resolve();}
  await refused;
  assert.equal(readFileSync(path,'utf8'),before);
});

test('a saved Life fact batch that fails live admission still projects without changing the current grant',async t=>{
  const f=await fixture(t,{economy:false,room:true});
  await f.enable();
  const home=await f.home(),table=f.host.native.sourceTable;
  const fact={version:1,id:'synthetic-water',requestId:'synthetic-water',domain:'body',type:'water',
    occurredAt:'2026-11-15T10:00:00.000Z',actor:{kind:'owner',id:'owner',channel:'room'},
    result:{status:'completed',summary:'Synthetic water receipt'}};
  const old=lifeInput({facts:[fact]}),granted=lifeInput({facts:[{...fact,id:'synthetic-new-water'}]});
  const directory=join(f.repo,'.chatpet/data/life'),path=join(directory,'life.json');
  createLifeStore(directory,'UTC').update(state=>{
    state.lastFactAdmission={sessionId:home.id,messageId:granted.id,
      sourceDigest:createHash('sha256').update(JSON.stringify(granted.source)).digest('hex')};
  });
  assert.equal(table.admit({sessionId:home.id,message:old}).kind,'rejected');
  const before=readFileSync(path,'utf8');
  const session=Session.create(SessionId('history-old-facts'));
  session.append('turn/start',{turn:1});
  session.append('user/message',old,{surfaceOp:'append'});
  session.append('tool/call',{turn:1,step:1,callId:'old-state',name:'room_state',arguments:'{}'});
  const text=JSON.stringify(homeView(emptyHomeState(1000),1000));
  const original=session.append('tool/result',{turn:1,step:1,message:{
    id:'old-result',role:'tool',source:{kind:'tool',callId:'old-state'},toolCallId:'old-state',content:[{type:'text',text}],
  }},{surfaceOp:'append'});
  session.append('turn/end',{turn:1,reason:{kind:'completed'}});
  session.append('turn/start',{turn:2});
  session.append('turn/end',{turn:2,reason:{kind:'completed'}});
  const agent={session,status:'idle',inbox:{nextTurn:[],nextStep:[]},runMaintenance:job=>job(signal())};
  const classify=message=>table.classify(message);
  assert.equal(classify(granted)?.historyProjection?.participates,true);
  const prepared=await prepareLifeHistory(agent,()=>true,classify,f.host.native.toolTable);
  assert.deepEqual(prepared.map(change=>change.event.seq),[original.seq]);
  assert.equal(readFileSync(path,'utf8'),before);
  assert.equal(table.admit({sessionId:home.id,message:granted}).kind,'accepted');
  session.append('turn/start',{turn:3});
  session.append('step/start',{turn:3,step:1});
  assert.equal(applyLifeHistory(agent,prepared,{estimateMessage:()=>100}).replaced,1);
  assert.equal(session.eventAt(original.seq).data.message.content[0].text,text);
  await f.life.close();
  assert.equal(classify(old),undefined);
  assert.deepEqual(await prepareLifeHistory(agent,()=>true,classify,f.host.native.toolTable),[]);
});
