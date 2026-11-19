import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { Context } from '@deepseek-ai/cordis';
import { SystemPrompt } from '@deepseek-ai/dsh-system-prompt';
import { ToolsService } from '@deepseek-ai/dsh-tools';
import { Session } from '@deepseek-ai/dsh-session';
import { emotionFor, installEmotion } from '../../dist/src/emotion/plugin.js';
import { createCore } from '../../dist/src/core/index.js';

const value = result => { assert.ok(result.ok, JSON.stringify(result.error)); return result.value; };
const message = (id, text) => ({ id, role:'user', source:{kind:'user'}, content:[{type:'text',text}] });
const completed = text => ({ state:'completed', text, hostTurnIds:[] });

async function fixture(t, { withdrawalFault = false } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(),'native-memory-gate-')));
  const fault = join(root,'withdrawal-fault'), target = {id:'fixture-workspace',path:root,title:'Fixture'};
  const config = {companionId:'fixture-fish',scopeId:'fixture-scope',ownerActorId:'fixture-owner',
    displayName:'Fish',character:'Synthetic identity',dataDir:join(root,'.chatpet/data/core'),
    memory:{dataDir:join(root,'.chatpet/data/memory'),python:resolve('.venv/bin/python')}};
  if (withdrawalFault) {
    process.env.CHATPET_MEMORY_FAULT_FILE = fault;
    config.memory.serviceEntry = resolve('tests/memory/memory-service-fixture.py');
  }
  let host, sequence = 0;
  function boot() {
    host = createCore(config);
    host.native.resolveNativeScope = id => id === 'other-workspace' ? undefined
      : ({workspaceId:target.id,path:root,storageId:host.workspace.storageId(),guest:false});
  }
  t.after(async () => {
    try { await host?.close(); }
    finally {
      if (withdrawalFault) delete process.env.CHATPET_MEMORY_FAULT_FILE;
      rmSync(root,{recursive:true,force:true});
    }
  });
  boot();
  const request = () => host.operator.request('native-memory-gate-' + ++sequence);
  const prefs = value(await host.services.preferences.read(request(),{}));
  const saved = value(await host.services.preferences.save(request(),{expectedRevision:prefs.revision,workspace:target,conversation:prefs.conversation}));
  assert.equal(value(await host.services.workspace.initialize(request(),{expectedPreferencesRevision:saved.revision})).state,'ready');
  return { fault, target, request, get host() { return host; }, get native() { return host.native; },
    get memory() { return host.native.memory; }, get port() { return host.native.memory.connection; },
    input(session, turn, text) { return host.native.observeInputs(session,turn,[message(session + '-' + turn,text)])[0]; },
    tool(session, name, args) {
      const tool = host.native.tools(session).find(row => row.name === 'pet_memory_' + name);
      assert.ok(tool);
      return tool.execute(args,{callId:'fixture-tool-' + ++sequence});
    },
    async restart() { await host.close(); boot(); },
  };
}

test('native tools commit correction and a separate save in the same turn; later turns recall only current facts', {timeout:25000}, async t => {
  const f = await fixture(t,{withdrawalFault:true});
  f.native.setMemoryEnabledForNewSessions(false);
  const oldInput = f.input('enrolled-later',1,'Unobserved fixture dialogue.');
  await f.native.finishTurn('enrolled-later',1,completed('The old turn stays in the conversation.'));
  f.native.setMemoryEnabledForNewSessions(true);

  const oldFact = 'Owner prefers tea.', separateFact = 'Owner lives in Hue.';
  const source = f.input('enrolled-later',2,oldFact + ' ' + separateFact);
  const remember = content => f.tool('enrolled-later','remember',{content,evidence_quotes:[content]});
  const [tea] = await Promise.all([remember(oldFact),remember(separateFact)]).then(rows => rows.map(JSON.parse));
  assert.equal(await f.port.validate({sources:[{id:oldInput,revision:'1'}],memories:[]}),'unknown');
  const capability = value(await f.host.services.core.listCapabilities(f.request(),{})).find(row => row.id === 'memory.lifecycle');
  assert.equal(capability.state,'ready');

  await f.restart();
  const correction = 'Owner now prefers coffee.', newFact = 'Owner compares quotes in VND.';
  f.input('correction',1,correction + ' ' + newFact);
  assert.match(await f.tool('correction','recall',{query:'tea'}),/Owner prefers tea/);
  const [corrected, saved] = (await Promise.all([
    f.tool('correction','correct',{memory_id:tea.memoryId,expected_version:tea.revision,content:correction,evidence_quotes:[correction]}),
    f.tool('correction','remember',{content:newFact,evidence_quotes:[newFact]}),
  ])).map(JSON.parse);
  assert.equal(corrected.memoryId,tea.memoryId);
  assert.equal(corrected.revision,tea.revision + 1);
  const committed = (await f.port.call('recall',{query:'',limit:8})).records.map(row => row.memory);
  assert.equal(committed.filter(row => row.content === correction && row.id === corrected.memoryId).length,1);
  assert.equal(committed.filter(row => row.content === newFact && row.id === saved.memoryId).length,1);
  const rejectOldExtraction = () => f.port.call('propose',{operation_id:'late-tea-extraction',content:oldFact,
    sources:[{id:source,revision:'1'}],evidence_quotes:[oldFact]});
  await assert.rejects(rejectOldExtraction(),{status:409});

  let recalled = await f.tool('later','recall',{query:'Hue coffee'});
  assert.ok(recalled.includes(correction) && recalled.includes(separateFact));
  assert.ok(!recalled.includes(oldFact));

  writeFileSync(f.fault,'tombstone');
  f.input('later',1,'Forget my drink preference.');
  const withdrawal = JSON.parse(await f.tool('later','forget',{memory_id:corrected.memoryId,expected_version:corrected.revision}));
  assert.equal(withdrawal.state,'pending');
  assert.equal(f.memory.context('later'),recalled,'A withdrawal leaves the already selected context intact');
  await f.restart();
  recalled = await f.tool('during-withdrawal','recall',{query:'Hue'});
  assert.ok(recalled.includes(separateFact) && !recalled.includes(correction) && !recalled.includes(oldFact));
  rmSync(f.fault);
  const settled = await f.port.call('recover',{});
  assert.ok(settled.some(row => row.withdrawal_id === withdrawal.withdrawalId && row.withdrawal_state === 'settled'));
  await assert.rejects(rejectOldExtraction(),{status:409});
  assert.equal(f.native.runtime.store.require('source',source).text,oldFact + ' ' + separateFact);
  await assert.rejects(f.tool('other-workspace','recall',{query:'Hue'}),/bound workspace/);
});

test('a later native request can read the full prior reply and recover a lost observation acknowledgement', {timeout:25000}, async t => {
  const f = await fixture(t);
  const conclusion = 'Background for the supplied documents. '.repeat(24) + 'Cedar costs 3 USD less than Willow.';
  const owner = message('analysis-1','Compare Cedar and Willow documents.');
  f.native.observeInputs('analysis',1,[owner]);
  await f.native.finishTurn('analysis',1,completed(conclusion));
  const session = Session.create('analysis');
  session.append('turn/start',{turn:1});
  session.append('user/message',owner,{surfaceOp:'append'});
  session.append('assistant/message',{turn:1,step:1,message:{id:'analysis-reply',role:'assistant',source:{kind:'model'},
    content:[{type:'text',text:conclusion}]},stream:[]},{surfaceOp:'append'});
  session.append('turn/end',{turn:1,reason:{kind:'completed'}});
  const original = session.snapshotEvents();
  await f.memory.archive(session.id,f.target.id,f.target.path,original);
  await f.memory.archive(session.id,f.target.id,f.target.path,original);
  assert.equal(f.native.runtime.store.require('memory-session',session.id).archived,true);
  assert.deepEqual(session.snapshotEvents(),original);
  const hello = await f.memory.prepare('greeting');
  await f.memory.recall('greeting','Hello.',true,hello);
  assert.match(f.memory.context('greeting'),/Compare Cedar and Willow/);
  let binding = await f.memory.prepare('follow-up');
  f.input('follow-up',1,'Carry on from there.');
  await f.memory.recall('follow-up','Carry on from there.',true,binding);
  const preview = f.memory.context('follow-up');
  assert.match(preview,/pet_memory_read/);
  assert.ok(!preview.includes(conclusion));
  const records = await f.port.call('context',{query:'Carry on from there.',include_recent:true,block_chars:600,max_chars:24000});
  const detail = records.records.find(row => row.conversation?.some(part => part.text === conclusion));
  assert.ok(detail);
  assert.ok((await f.tool('follow-up','read',{memory_id:detail.memory.id})).includes(conclusion));

  const source = f.input('lost-ack',1,'Owner uses metric units.');
  const call = f.port.call.bind(f.port);
  let accepted;
  f.port.call = async (operation,args,bank) => {
    const result = await call(operation,args,bank);
    if (operation === 'observe' && args.source_id === source) {
      accepted = result.observationId;
      throw Error('Injected lost acknowledgement after provider acceptance');
    }
    return result;
  };
  await assert.rejects(f.native.finishTurn('lost-ack',1,completed('Acknowledged.')),/lost acknowledgement/);
  assert.ok(accepted);
  assert.equal(f.native.runtime.store.require('memory-source-work',source).state,'queued');
  await f.restart();
  binding = await f.memory.prepare('after-restart');
  const acknowledged = f.native.runtime.store.require('memory-source-work',source);
  assert.equal(acknowledged.state,'acknowledged');
  assert.equal(acknowledged.observationId,accepted);
  assert.equal(await f.port.validate({sources:[{id:source,revision:'1'}],memories:[]},binding.storageId),'eligible');
});

test('native playback evidence reaches the prompt and preference correction retires associated feedback', {timeout:25000}, async t => {
  const f = await fixture(t), ctx = new Context(), session = Session.create('playback');
  await ctx.plugin(SystemPrompt);
  await ctx.plugin(ToolsService);
  ctx.tools.setExecutor({describe:() => ({schemas:[]}),execute() { throw Error('Fixture dispatches through the real Core tools'); }});
  const agent = {id:session.id,session,ctx};
  ctx.provide('agents',{get:id => id === session.id ? agent : undefined});
  installEmotion(ctx,f.host);
  t.after(() => ctx.fiber.dispose());
  const emit = (type,data) => ctx.parallel('session/event',session,{type,data});
  const emotion = emotionFor(f.host), workspace = f.target.id, playback = 'fixture-playback';
  const settings = f.host.workspace.companionConfiguration();
  value(await f.host.services.workspace.saveCompanion(f.request(),{workspaceId:workspace,expectedSettings:settings,
    settings:{...settings,recentActionCount:10,recentActionMinutes:30,recentMoodCount:10,recentMoodHours:24}}));
  emotion.registerCatalog('fixture',{actions:[{name:'spin',description:'Synthetic action'}],stickers:[]});
  emotion.recordPlayback({workspaceId:workspace,id:playback,name:'spin',status:'playing',kind:'random'});
  const quote = 'Please repeat the spin.';
  const begin = async (turn,text) => {
    await emit('turn/start',{turn});
    const input = message('playback-' + turn,text);
    f.native.observeInputs(session.id,turn,[input]);
    await emit('user/message',input);
  };
  await begin(1,quote);
  const prompt = await ctx.systemPrompt.assemble({agent,scope:agent});
  assert.ok(prompt.sections.some(section => section.name === 'chatpet.expression-guide' && section.text.includes(JSON.stringify({available:emotion.catalog}))));
  assert.ok(prompt.contexts.some(context => context.name === 'chatpet.expression-state' && context.text.includes(playback)));
  await emotion.complete(session.id,{turn:1,workspaceId:workspace,path:f.target.path,user:{id:'playback-1',text:quote},
    memoryIds:[],memoryCalls:new Map(),intent:{mood:'Happy',reason:'Playback feedback',feedback:{playbackId:playback,quote}}});
  const remembered = JSON.parse(await f.tool(session.id,'remember',{content:'Owner prefers spins.',evidence_quotes:[quote],playback_id:playback}));
  const [fact] = (await f.port.call('recall',{query:'spins',limit:8})).records.filter(row => row.memory.id === remembered.memoryId);
  assert.equal(fact.dependencies.sources.length,2);
  const recent = () => emotion.ledger(workspace).read();
  assert.deepEqual(recent().actions.find(row => row.id === playback).feedback[0].memories,[remembered.memoryId]);
  const correction = 'Only spin occasionally.';
  await begin(2,correction);
  const args = {memory_id:remembered.memoryId,expected_version:remembered.revision,content:correction,evidence_quotes:[correction]};
  await emit('tool/call',{name:'pet_memory_correct',callId:'correct',arguments:JSON.stringify(args)});
  const result = await f.tool(session.id,'correct',args);
  await emit('tool/result',{message:{toolCallId:'correct',content:[{type:'text',text:result}]}});
  assert.equal(recent().actions.find(row => row.id === playback).feedback.length,0);
  assert.ok(!recent().moods.some(row => row.reason === 'Playback feedback'));
  const revised = JSON.parse(result);
  await f.tool(session.id,'forget',{memory_id:revised.memoryId,expected_version:revised.revision});
  assert.ok(!(await f.port.call('recall',{query:'spins',limit:8})).records.some(row => row.memory.id === revised.memoryId));
});
