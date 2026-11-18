import assert from 'node:assert/strict';
import test from 'node:test';
import {Context} from '@deepseek-ai/cordis';
import {createUserMessage} from '@deepseek-ai/dsh-llm';
import {Session,SessionId} from '@deepseek-ai/dsh-session';
import SystemPrompt from '@deepseek-ai/dsh-system-prompt';
import Tools, {defineTool} from '@deepseek-ai/dsh-tools';
import {emptyHomeState,homeView} from '#feiyu-home';
import {CoreNative,OWNER_LIFE_TOOL_SOURCES} from '../../dist/src/core/native/conversation.js';
import {historicalStateOverview} from '../../dist/src/core/native/history-maintenance.js';
import {CompanionToolTable} from '../../dist/src/core/tables/tools.js';
import {apply as applyRoom} from '../../dist/src/room/plugin.js';
import {registerPlanTool} from '../../dist/src/life/plan-tools.js';
import {createLifeSourceAdapter} from '../../dist/src/life/tool-policy.js';
import {fixture,signal} from '../behavior-list/fixture.mjs';
import {policyHost} from '../behavior-list/policy-host.mjs';

// Captured from lifeToolAllowed before the tool declaration migration.
const ordinary = [
  'cancel_alarm', 'check_alarm', 'forget_photo', 'keep_photo', 'life_activity_control',
  'life_plan_keep', 'life_plan_read', 'life_plan_update', 'life_read_confirm', 'life_read_segment',
  'list_photos', 'pet_economy_state', 'pet_emotion_update', 'pet_memory_read', 'pet_memory_recall',
  'pet_memory_remember', 'plan_next', 'reach_out', 'read_review_dialogue', 'room_garden', 'room_state',
];
const review = [...ordinary, 'read', 'write'].sort();

test('module registrations derive exactly the original ordinary Life and review allowlists', async t => {
  const {host} = await fixture(t, {policy:true, memory:true, room:true, emotion:true});
  const {toolTable} = host.native;
  const {branches} = createLifeSourceAdapter({}, host, () => false);
  const allNames = new Set(['bash', 'edit', ...ordinary, ...review,
    ...['owner', 'life', 'review', 'guest', 'tv'].flatMap(source => toolTable.list(source).map(tool => tool.name))]);
  for (const [source, expected] of [['life', ordinary], ['review', review]]) {
    assert.deepEqual(toolTable.list(source).map(tool => tool.name).sort(), expected);
    assert.deepEqual([...allNames].filter(name => branches[source].toolPolicy.allows({name})).sort(), expected);
  }
});

test('the four module declarations produce byte-identical historical JSON', async t => {
  const {host} = await fixture(t, {room:true});
  const {toolTable} = host.native;
  // Expected JSON captured from the old Core switch using these synthetic tool results.
  const cases = [
    ['room_state', {}, {layout:{rooms:[{id:'living',name:'客厅',bounds:[1,2]}],spots:{living:{sofa:{label:'沙发',pos:[2,3]}}}},
      her:{pos:[2,3],action:'hold'},body:{asleep:false},events:[1],room:{events:[1],light:true}},
    '{"body":{"asleep":false},"view":"overview","layout":{"rooms":[{"id":"living","name":"客厅"}],"spots":{"living":{"sofa":{"label":"沙发"}}}},"her":{"action":"hold"},"room":{"light":true},"details":{"tool":"room_state","view":"full"}}'],
    ['room_garden', {type:'state'}, {garden:{plots:[{id:'empty',progress:0},{id:'crop',cropId:'mint',progress:0}],
      care:{nextId:7,receipts:[{status:'failed',fingerprint:'fixture',id:'a'},{status:'completed',id:'b'}]},log:[1]}},
    '{"garden":{"emptyPlotDefaults":{"progress":0,"moisture":0,"fertilized":false,"plantedAt":null,"mature":false,"stage":0,"remainingMs":0,"waterRemainingMs":0,"needsWater":false,"expectedYield":0},"plots":[{"id":"empty"},{"id":"crop","cropId":"mint","progress":0}],"care":{"failures":[{"status":"failed","id":"a"}],"lastReceipt":{"status":"completed","id":"b"}}},"view":"overview","details":{"tool":"room_garden","type":"state","view":"full"}}'],
    ['pet_economy_state', {}, {configuration:{revision:3},inventory:[{id:'empty',quantity:0,reserved:0,available:0},
      {id:'held',quantity:2,reserved:0,available:2}],ledger:[{id:'1'}],catalog:[{id:'held'}],revision:9},
    '{"catalog":[{"id":"held"}],"revision":9,"view":"overview","configurationRevision":3,"inventory":[{"id":"held","quantity":2,"reserved":0,"available":2}],"stockNote":"Unlisted catalog items have zero stock. Read view=full for the complete original snapshot.","ledgerCount":1,"details":{"tool":"pet_economy_state","view":"full"}}'],
    ['life_plan_read', {}, {revision:2,plan:{storageId:'sample',goal:'阅读',steps:[{id:'one',kind:'read'}],execution:{status:'waiting'}}},
    '{"revision":2,"plan":{"goal":"阅读","steps":[{"id":"one","kind":"read"}],"execution":{"status":"waiting"}},"view":"overview","details":{"tool":"life_plan_read","view":"full"}}'],
  ];
  for (const [name, args, value, expected] of cases) {
    const project = (input, result) => historicalStateOverview(toolTable, name, input, result);
    assert.deepEqual(Buffer.from(JSON.stringify(project(args, value))), Buffer.from(expected), name);
    for (const excluded of [{view:'full'}, {factIds:[]}, {section:'ledger'}]) {
      assert.equal(project({...args, ...excluded}, value), undefined, name);
    }
    assert.equal(project(args, {...value, view:'overview'}), undefined, name);
    assert.equal(project(args, {...value, ok:false}), undefined, name);
  }
});

const lifeInput = () => createUserMessage({
  source:{kind:'dsh-world-life'}, content:[{type:'text',text:'Synthetic Life input'}],
});

test('a plan tool without sources executes for the owner and is excluded from Life and review', async t => {
  const effects = [];
  const {ctx, makeScope} = await policyHost('', effects);
  t.after(async () => { for (const dispose of effects.reverse()) await dispose(); });
  const toolTable = new CompanionToolTable();
  const agent = {id:'synthetic-owner'};
  agent.ctx = makeScope(agent);
  const echo = name => defineTool({
    name, description:'Synthetic echo', parameters:{text:{type:'string',required:true}},
    output:{schema:{type:'string'},render:(_args,text)=>[{type:'text',text}]},
    execute:({text})=>text,
  });
  const ownerOnly = echo('life_plan_fixture');
  const shared = {...echo('life_plan_shared_fixture'),sources:OWNER_LIFE_TOOL_SOURCES};
  const when = ({agent:current}) => current === agent;
  registerPlanTool(ctx,toolTable,ownerOnly,when);
  registerPlanTool(ctx,toolTable,shared,when);

  const {branches} = createLifeSourceAdapter(ctx,{native:{toolTable}},()=>false);
  for (const branch of ['owner','life','review']) {
    const release = branches[branch]?.toolPolicy.install(agent);
    const exec = {agent,signal:signal()};
    const step = await ctx.tools.resolve(exec);
    try {
      const names = ctx.tools.schemas(agent,step).map(tool=>tool.name);
      const executable = ctx.tools.executable(ownerOnly.name,agent,step);
      assert.ok(names.includes(shared.name), branch);
      assert.equal(names.includes(ownerOnly.name), branch === 'owner', branch);
      if (branch === 'owner') {
        assert.equal(await executable.execute({text:'Synthetic plan input'},exec),'Synthetic plan input');
      } else {
        assert.equal(executable,undefined,branch);
        assert.equal(branches[branch].toolPolicy.allows({name:ownerOnly.name}),false,branch);
      }
    } finally { step.dispose(); release?.(); }
  }
});

test('renaming a memory tool preserves schema and execution admission in Life and review', async t => {
  const renamed = 'pet_memory_fixture_recall';
  const tools = CoreNative.prototype.tools;
  t.mock.method(CoreNative.prototype,'tools',function (...args) {
    return tools.apply(this,args).map(tool=>tool.name === 'pet_memory_recall' ? {...tool,name:renamed} : tool);
  });
  const f = await fixture(t,{policy:true,memory:true,economy:false});
  await f.enable();
  const agent = await f.home();
  const reviewInput = createUserMessage({
    source:{kind:'dsh-world-life',purpose:'review',reviewDay:'2026-11-14'},
    content:[{type:'text',text:'Synthetic review input'}],
  });
  for (const [branch, message] of [['owner',null],['life',lifeInput()],['review',reviewInput]]) {
    if (message) await f.emit('agent/inbox/inserted',{agent,message});
    const step = await agent.ctx.tools.resolve({agent,signal:signal()});
    try {
      const names = f.schemas({agent,toolSet:step});
      assert.ok(names.includes(renamed), branch);
      assert.ok(agent.ctx.tools.executable(renamed,agent,step), branch);
      assert.equal(names.includes('pet_memory_correct'),branch === 'owner',branch);
      assert.equal(names.includes('write'),branch !== 'life',branch);
    } finally { step.dispose(); }
  }
});

for (const roomState of ['loaded','unloaded','reloaded']) {
  test(`native request respects a ${roomState} Room projection registration`, {timeout:5000}, async t => {
    const f = await fixture(t, {economy:false, configure(services) {
      services.set('tokenMeter',{estimateMessage:() => 123});
    }});
    await f.enable();
    const root = new Context();
    root.provide('petCore', f.host);
    root.provide('petWorld', f.service('petWorld'));
    root.provide('petBehavior', f.body);
    const prompt = await root.plugin(SystemPrompt), tools = await root.plugin(Tools);
    const loadRoom = () => root.plugin({inject:['tools'], apply:applyRoom});
    let room = await loadRoom();
    t.after(async () => {await room.dispose();await tools.dispose();await prompt.dispose();});

    const agent = await f.home();
    const session = agent.session = Session.create(SessionId(agent.id), [], {
      ...agent.session.header, version:4, createdAt:Date.now(), isSeeded:false,
    });
    const staged = Promise.withResolvers();
    agent.runMaintenance = async job => {
      const changes = await job(signal());
      staged.resolve(changes);
      return changes;
    };
    const full = homeView(emptyHomeState(Date.now()), Date.now());
    const text = JSON.stringify(full), callId = 'stored-room-state';
    session.append('turn/start',{turn:1});
    session.append('user/message',lifeInput(),{surfaceOp:'append'});
    session.append('tool/call',{turn:1,step:1,callId,name:'room_state',arguments:'{}'});
    const original = session.append('tool/result',{turn:1,step:1,message:{
      id:'stored-result',role:'tool',source:{kind:'tool',callId},toolCallId:callId,content:[{type:'text',text}],
    }},{surfaceOp:'append'});
    session.append('turn/end',{turn:1,reason:{kind:'completed'}});
    const message = lifeInput();
    agent.status = 'running';
    await f.emit('agent/inbox/inserted', {agent,message});
    session.append('turn/start',{turn:2});
    session.append('step/start',{turn:2,step:1});
    const admission = await f.middleware('agent/pre-step', [{agent,turn:2,step:1,messages:[message],signal:signal()}],
      async () => ({kind:'enter',messages:[]}));
    assert.equal(admission.kind, 'enter');
    session.append('user/message',message,{surfaceOp:'append'});
    agent.status = 'idle';
    await f.emit('session/event',session,session.append('turn/end',{turn:2,reason:{kind:'completed'}}));
    assert.deepEqual((await staged.promise).map(change => change.event.seq), [original.seq]);
    assert.ok(session.surface.nodes.includes(original.seq), 'idle maintenance retains the original until a request');

    const {toolTable,sourceTable} = f.host.native;
    if (roomState !== 'loaded') {
      await room.dispose();
      assert.equal(toolTable.get('room_state'), undefined);
      assert.equal(historicalStateOverview(toolTable,'room_state',{},full), undefined);
      assert.equal(sourceTable.classify(lifeInput())?.historyProjection.participates, true);
      if (roomState === 'reloaded') room = await loadRoom();
    }
    const turn = 3, step = 1;
    session.append('turn/start',{turn});
    session.append('step/start',{turn,step});
    const result = await f.middleware('agent/request', [{agent,turn,step}], async () =>
      session.surface.nodes.map(seq => session.eventAt(seq)).filter(event => event.type === 'tool/result'));
    assert.equal(session.eventAt(original.seq).data.message.content[0].text, text);
    assert.equal(result.length, 1);
    if (roomState === 'loaded') {
      assert.deepEqual(result[0].sourceEventSeqs, [original.seq]);
      assert.equal(result[0].data.message.content[0].text, JSON.stringify(historicalStateOverview(toolTable,'room_state',{},full)));
      assert.ok(!session.surface.nodes.includes(original.seq));
    } else {
      assert.equal(result[0].seq, original.seq);
    }
  });
}
