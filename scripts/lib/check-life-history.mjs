import assert from 'node:assert/strict';
import {roomStateDeclaration} from '../../dist/src/room/plugin.js';
import {call,say} from '../checks/lib/native-conversation-scenarios.mjs';

/** Exercise an upgrade from old full default results in the actual native Life
 * home. The isolated producer returns real Body state in its legacy full shape. */
export async function checkLifeHistory({ctx,host,workspace,life,until,setProgram,load}) {
  let step=0;
  const fixture=await ctx.plugin({inject:['tools'],apply(scope){scope.tools.register({name:'room_state',description:'Legacy default state fixture',
    parameters:{type:'object',properties:{view:{type:'string',enum:['full','overview']}}},
    output:{schema:{type:'string'},render:(_ctx,value)=>[{type:'text',text:value}]},
    execute:async()=>JSON.stringify(await ctx.petBehavior.roomState(workspace.id))});
    scope.effect(() => host.native.toolTable.register(roomStateDeclaration).revoke);
  }});
  try {
    setProgram(async function*(options){
      if(step%3)assert.ok(!options.messages.filter(message=>message.role==='tool').at(-1)?.isError);
      if(step++%3===0)yield* call('room_state',{});
      else if(step%3===2)yield* call('room_state',{view:'full'});
      else yield* say('My continuing rest and original records remain.');
    });
    const readPlan=async()=>{const {enabled,running,...plan}=await life.readPlan(workspace.id);return plan;};
    await life.control(workspace.id,true);
    const homeId=(await life.snapshot(workspace.id)).life.homeSessionId;
    const agent=ctx.agents.get(homeId),session=agent.session;
    const plan=await readPlan(),{createUserMessage}=await load('dsh-llm');
    const deliver=()=>agent.followup(createUserMessage({source:{kind:'dsh-world-life'},content:[{type:'text',text:'Isolated Life history fixture; keep the existing plan.'}]}));
    const initial=session.snapshotEvents().length;
    deliver();
    await until(()=>step>=3&&agent.status==='idle','first legacy state turn');
    const original=structuredClone(session.snapshotEvents());
    deliver();
    await until(()=>step>=6&&agent.status==='idle','second legacy state turn');
    for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));
    deliver();
    await until(()=>step>=9&&agent.status==='idle'&&session.snapshotEvents().slice(initial).some(event=>String(event.type)==='compaction/prune'),'prepared projection lands in the next native turn');
    const events=session.snapshotEvents(),calls=events.filter(event=>event.type==='tool/call'&&event.seq>=initial&&event.data.name==='room_state');
    const first=calls[0],full=calls[1];
    const source=events.find(event=>event.type==='tool/result'&&event.data.message.toolCallId===first.data.callId);
    const explicit=events.find(event=>event.type==='tool/result'&&event.data.message.toolCallId===full.data.callId);
    const replacement=session.surface.nodes.map(seq=>session.eventAt(seq)).find(event=>event?.sourceEventSeqs?.includes(source.seq));
    assert.equal(replacement?.type,'tool/result');
    const view=JSON.parse(replacement.data.message.content[0].text),raw=JSON.parse(source.data.message.content[0].text);
    assert.equal(view.view,'overview');assert.deepEqual(view.body,raw.body);
    assert.ok(session.surface.nodes.includes(explicit.seq),'Explicit full detail remains visible');
    assert.deepEqual(events.slice(0,original.length),original,'Every original native record remains unchanged');
    assert.deepEqual(await readPlan(),plan);
    assert.equal(events.slice(initial).filter(event=>String(event.type)==='compaction/summary').length,0,'No extra summarization calls');
    await ctx.sessions.flush(session);
    const reader=await ctx.sessionPersistence.open(homeId,'read');
    try {
      const persisted=await reader.read(),{Session,SessionId}=await load('dsh-session');
      const restored=Session.create(SessionId('history-replay'),persisted.events);
      assert.deepEqual(restored.surface.nodes,session.surface.nodes,'Persisted native restoration retains the exact projection');
    } finally {await reader.close();}
    // Keep DSH's real semantic compaction and subsequent live-state refresh
    // working alongside the deterministic history projection. This one
    // explicitly invoked test summary is served by the local scripted model.
    let summaryCalls=0,continuations=0;
    setProgram(async function*(options){
      if(options.purpose==='compaction')summaryCalls++;
      else continuations++;
      yield* say('The original Life interactions completed. The accepted plan and its pending state remain authoritative in the current domain snapshot.');
    });
    const engine=ctx.agentPresets.serviceFor(agent,'compaction')??ctx.get('compaction');
    assert.ok(engine,'Use the existing native preset compaction provider');
    const checkpoint=await engine.compactNow(agent,new AbortController().signal);
    assert.ok(checkpoint);assert.equal(summaryCalls,1);
    deliver();
    await until(()=>continuations===1&&agent.status==='idle','continuation after native compaction');
    assert.deepEqual(await readPlan(),plan);
    assert.deepEqual(session.snapshotEvents().slice(0,original.length),original);
    const contexts=session.surface.nodes.map(seq=>session.eventAt(seq)).filter(event=>event?.type==='user/message'&&event.data.source.kind==='runtime-context');
    assert.equal(contexts.filter(event=>event.data.source.sections.some(section=>section.name==='chatpet.environment')).length,1,
      'Current required Body/plan context is restored after native compaction');
    await ctx.sessions.flush(session);
    const compactReader=await ctx.sessionPersistence.open(homeId,'read');
    try {await compactReader.read();}finally{await compactReader.close();}
    await life.control(workspace.id,false);
    console.log(JSON.stringify({ok:true,history:'native-idle-maintenance',originalsRetained:true,explicitFullRetained:true,
      planUnchanged:true,restartProjection:true,nativeCompactionCompatible:true,scriptedNativeCompactionCalls:summaryCalls,summaryCallsAdded:0,paidCalls:0,
      resultCharsBefore:source.data.message.content[0].text.length,resultCharsAfter:replacement.data.message.content[0].text.length}));
  } finally {await fixture.dispose();}
}
