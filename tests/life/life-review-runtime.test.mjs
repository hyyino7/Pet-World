import {closedDiaryRefusal} from '../../vendor/dsh-world/lib/life/diary.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLifeRuntime} from '../../vendor/dsh-world/lib/life/runtime.js';
import {createLifeStore} from '../../vendor/dsh-world/lib/life/lifeStore.js';
import {reviewDiaryStatus} from '../../dist/src/life/review-completion.js';

async function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'life-review-runtime-')),records=join(root,'.chatpet'),directory=join(records,'data/life');
  mkdirSync(join(records,'diary'),{recursive:true});mkdirSync(directory,{recursive:true});
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const store=createLifeStore(directory,'UTC');
  store.update(state=>Object.assign(state,{homeSessionId:'home',planRevision:1,currentPlan:{id:'retained'},review:{day:'2026-11-15',at:'2026-11-15T23:00:00Z'}}));
  let reviewTime='23:00',unknown=false;
  let now=Date.parse('2026-11-15T23:00:00Z'),serial=0,turn=0,runtime,completed=0;
  const handles=new Map(),handlers=new Map(),events=[],sent=[],guards=[];
  const session={id:'home',header:{agentPreset:'standard',cwd:root},get seq(){return events.length;},eventAt:seq=>events[seq],snapshotEvents:()=>events};
  const agent={id:'home',session,status:'idle',inbox:{nextStep:[],nextTurn:[]},ctx:{tools:{register:()=>()=>{},guard(fn){guards.push(fn);return()=>{const index=guards.indexOf(fn);if(index>=0)guards.splice(index,1);};}}},
    steer(message){sent.push(message);this.inbox.nextStep.push(message);}};
  const ctx={logger:{error(){}},on(name,handler){const set=handlers.get(name)??new Set();handlers.set(name,set);set.add(handler);return()=>set.delete(handler);},
    get:()=>undefined,agents:{list:()=>[agent],get:()=>agent},sessions:{flush:async()=>true}};
  const host={workspace:{status:()=>({state:'ready',target:{id:'world',path:root}})}};
  const scope={id:'world',directory:records,timeZone:'UTC',sessionIds:['home'],isHome:id=>id==='home'};
  const emit=async(type,data)=>{const event={type,data,seq:events.length,time:now};events.push(event);for(const handler of handlers.get('session/event')??[])await handler(session,event);};
  const start=async()=>{
    runtime=createLifeRuntime({ctx,store,config:{agentPreset:'standard',worldId:'world'},
      options:{worldDir:directory,roomDir:root,diaryDir:join(records,'diary'),selfFile:join(records,'self.md'),timeZone:'UTC',schedule:()=>({wake:'',review:reviewTime})},
      clock:()=>new Date(now),timers:{set(fn,ms){const id=++serial;handles.set(id,{at:now+ms,fn});return id;},clear:id=>handles.delete(id)},
      hasCurrentPlan:()=>true,requirePlanningDecision:true,planningRepairAttempts:()=>1,inWorkspace:id=>id==='home',notifier:{outlets:[]},
      host:{workspace:async()=>({id:'world',sessionIds:['home']}),resolveAgent:async()=>agent,isArchived:()=>false,rename:async()=>{},origin:()=>''},
      reviewDiaryStatus:(day,session,id)=>{if(unknown)throw Error('Unreadable native record');return reviewDiaryStatus(host,scope,day,session,id);},afterReview:()=>{completed++;}});
    await runtime.start();return runtime;
  };
  const advance=async ms=>{
    const until=now+ms;let count=0;
    for(;;){const due=[...handles].filter(([,h])=>h.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;
      assert.ok(++count<100,'No busy retry loop');now=due[1].at;handles.delete(due[0]);due[1].fn();await Promise.resolve();await runtime.settled();await Promise.resolve();}
    now=until;
  };
  const admit=async()=>{const message=agent.inbox.nextStep.shift();assert.ok(message);agent.status='running';await emit('turn/start',{turn:++turn});await emit('user/message',message);return message;};
  const end=async(kind='completed')=>{agent.status='idle';await emit('turn/end',{turn,reason:{kind}});};
  const write=async(day,{error=false,content='A first-person diary.'}={})=>{
    const file=join(records,'diary',day+'.md'),callId='write-'+events.length;
    await emit('tool/call',{turn,name:'write',callId,arguments:JSON.stringify({file_path:file,content})});
    const denial=guards.map(guard=>guard({name:'write',arguments:{file_path:file,content},agent})).find(Boolean);
    error ||= Boolean(denial);
    if(!error)writeFileSync(file,content);
    await emit('tool/result',{turn,message:{role:'tool',toolCallId:callId,isError:error,content:[{type:'text',text:error?'Write denied':'Written'}]}});
  };
  await start();t.after(()=>runtime.stop());
  return{store,sent,records,agent,emit,advance,admit,end,write,start,owner:async()=>{agent.status='running';await emit('turn/start',{turn:++turn});await emit('user/message',{id:'owner-'+turn,role:'user',source:{kind:'user'},content:[{type:'text',text:'Backfill the missed diary.'}]});},status:day=>reviewDiaryStatus(host,scope,day,session,sent.at(-1)?.id??''),get runtime(){return runtime;},get completed(){return completed;},
    set reviewTime(value){reviewTime=value;runtime.reschedule();},set unknown(value){unknown=value;},
    set now(value){now=value;},get now(){return now;}};
}

test('wrong tool refusal does not complete review; exact day survives midnight and restart until native write',async t=>{
  const f=await fixture(t);await f.advance(0);const first=await f.admit();
  assert.equal(first.source.reviewDay,'2026-11-15');
  await f.emit('tool/call',{turn:1,name:'bash',callId:'wrong-tool',arguments:'{}'});
  await f.emit('tool/result',{turn:1,message:{toolCallId:'wrong-tool',isError:true,content:[]}});
  await f.end();assert.equal(f.completed,0);
  assert.match(f.store.read().pendingReviews[0].failure,/尚无成功写入/);
  assert.equal(f.store.read().planningRecovery,undefined,'A diary-only turn need not replace the life plan');
  f.runtime.stop();f.now=Date.parse('2026-11-16T00:02:00Z');await f.start();await f.advance(0);
  const retry=await f.admit();assert.equal(retry.source.reviewDay,'2026-11-15');
  await f.write('2026-11-15');assert.equal(f.status('2026-11-15'),'written');await f.end();assert.equal(f.completed,1);assert.deepEqual(f.store.read().pendingReviews,[]);
  assert.equal(f.store.read().review.day,'2026-11-16','Backfill does not consume the next daily review');
  f.runtime.stop();await f.start();await f.advance(60_000);assert.equal(f.sent.length,2,'Completed diary is never replayed');
});

test('failed and empty writes retain review; automatic retry is bounded and original plan clock is retained',async t=>{
  const f=await fixture(t);f.store.update(s=>{s.alarm={at:'2026-11-16T07:00:00Z',setAt:'2026-11-15T23:00:00Z',note:'Existing plan',source:'plan'};});
  await f.advance(0);await f.admit();await f.write('2026-11-15',{error:true});await f.end();
  await f.advance(60_000);await f.admit();await f.write('2026-11-15',{content:''});await f.end();
  const state=f.store.read();assert.equal(state.pendingReviews.length,1);assert.equal(state.pendingReviews[0].retryAt,undefined);
  assert.equal(state.alarm.at,'2026-11-16T07:00:00Z');assert.equal(f.completed,0);
  await f.advance(60_000);assert.equal(f.sent.length,2);
});

test('owner cancellation waits for next daily opportunity; backlog dates run separately and existing history is preserved',async t=>{
  const f=await fixture(t);await f.advance(0);await f.admit();await f.end('aborted');
  await f.advance(60_000);assert.equal(f.sent.length,1);
  f.runtime.stop();f.now=Date.parse('2026-11-16T23:00:00Z');await f.start();await f.advance(0);
  const retry=await f.admit();assert.equal(retry.source.reviewDay,'2026-11-15');
  const old=join(f.records,'diary/2026-11-15.md');writeFileSync(old,'Written by the companion in another owner turn.');
  await f.end();assert.equal(readFileSync(old,'utf8'),'Written by the companion in another owner turn.');
  await f.advance(60_000);const today=await f.admit();assert.equal(today.source.reviewDay,'2026-11-16');
  await f.write('2026-11-16');await f.end();assert.deepEqual(f.store.read().pendingReviews,[]);
});

test('crash after file/receipt but before turn end reconciles without another model turn',async t=>{
  const f=await fixture(t);await f.advance(0);await f.admit();await f.write('2026-11-15');
  f.runtime.stop();f.agent.status='idle';await f.start();
  assert.deepEqual(f.store.read().pendingReviews,[]);assert.equal(f.completed,1);
  await f.advance(60_000);assert.equal(f.sent.length,1);
});

test('review preference disables dispatch without deleting a failed date',async t=>{
  const f=await fixture(t);await f.advance(0);await f.admit();await f.end();
  f.reviewTime='';await f.advance(120_000);assert.equal(f.sent.length,1);assert.equal(f.store.read().pendingReviews.length,1);
  f.reviewTime='23:00';await f.advance(0);await f.admit();await f.write('2026-11-15');await f.end();assert.deepEqual(f.store.read().pendingReviews,[]);
});

test('an unverifiable diary retains its task without blocking ordinary scheduling',async t=>{
  const f=await fixture(t);await f.advance(0);await f.admit();f.unknown=true;await f.end();
  assert.equal(f.store.read().reviewWake,undefined);assert.match(f.store.read().pendingReviews[0].failure,/无法核对/);
  assert.equal(f.store.read().pendingReviews[0].retryAt,undefined);assert.equal(f.completed,0);
});

test('legacy delivered review with no diary becomes a dated pending task after restart',async t=>{
  const f=await fixture(t);f.runtime.stop();
  f.store.appendWake({source:'review',scheduledAt:'2026-11-14T23:00:00Z',deliveredAt:'2026-11-14T23:00:00Z',lateMs:0});
  await f.start();assert.equal(f.store.read().pendingReviews[0].day,'2026-11-14');
  await f.advance(0);const message=await f.admit();assert.equal(message.source.reviewDay,'2026-11-14');
  await f.write('2026-11-14');await f.end();assert.equal(f.store.read().pendingReviews[0].day,'2026-11-15');
});

test('a refusal with a preexisting record is reconciled as existing, never a verified new write',async t=>{
  const f=await fixture(t);await f.advance(0);await f.admit();
  writeFileSync(join(f.records,'diary/2026-11-15.md'),'Original old diary');
  await f.write('2026-11-15',{error:true});assert.equal(f.status('2026-11-15'),'existing');await f.end();
  assert.equal(readFileSync(join(f.records,'diary/2026-11-15.md'),'utf8'),'Original old diary');
});

test('owner input ends autonomous review access without immediately reviving the unfinished task',async t=>{
  const f=await fixture(t);await f.advance(0);await f.admit();
  await f.emit('user/message',{id:'owner-input',role:'user',source:{kind:'user'},content:[{type:'text',text:'Talk with me first.'}]});
  await f.end();assert.equal(f.store.read().pendingReviews[0].retryAt,undefined);
  assert.match(f.store.read().pendingReviews[0].failure,/owner-interrupted/);
  await f.advance(60_000);assert.equal(f.sent.length,1);
});

test('ordinary owner turn can create a pending historical diary through the actual World guard, then cannot overwrite it',async t=>{
  const f=await fixture(t);f.runtime.stop();f.now=Date.parse('2026-11-16T01:00:00Z');
  f.store.update(state=>{state.review={day:'2026-11-16',at:'2026-11-16T23:00:00Z'};state.pendingReviews=[{day:'2026-11-15',at:'2026-11-15T23:00:00Z',attempts:0}];});
  await f.start();await f.owner();
  await f.write('2026-11-15',{content:'Backfilled on 2026-11-16. My original diary.'});
  assert.equal(f.status('2026-11-15'),'existing','Owner write is not attributed to a nonexistent autonomous wake');
  const path=join(f.records,'diary/2026-11-15.md');assert.match(readFileSync(path,'utf8'),/Backfilled/);
  await f.write('2026-11-15',{content:'Forbidden replacement'});assert.match(readFileSync(path,'utf8'),/My original diary/);
  await f.end();assert.deepEqual(f.store.read().pendingReviews,[],'The successful owner receipt clears the exact pending date');
  assert.equal(f.sent.length,0,'Backfill needs no extra autonomous model turn');
});

test('pending-date permission permits only missing past-file creation and rejects aliases, edits and replacements',async t=>{
  const f=await fixture(t),day='2026-11-14',file=join(f.records,'diary',day+'.md'),today='2026-11-16';
  const open=new Set([today]),pending=new Set([day]);
  const check=(tool,path=file,days=pending,opened=open)=>closedDiaryRefusal(tool,{file_path:path},join(f.records,'diary'),join(f.records,'..'),opened,today,days);
  assert.equal(check('write','.chatpet/diary/'+day+'.md'),undefined);
  assert.match(check('write',file,new Set()),/已经合上/);
  assert.match(check('edit'),/已经合上/);
  assert.match(check('write',join(f.records,'diary/2026-11-17.md'),new Set(['2026-11-17'])),/已经合上/);
  writeFileSync(file,'Historical record');assert.match(check('write',file,pending,new Set([today,day])),/已经合上/);
  unlinkSync(file);symlinkSync(join(f.records,'missing-target'),file);assert.match(check('write'),/已经合上/);
});
