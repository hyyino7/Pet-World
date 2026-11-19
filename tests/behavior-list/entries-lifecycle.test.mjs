import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {agentCarrier, agentEvents} from '@deepseek-ai/dsh-agent';
import {createAssistantMessage, createToolResultMessage, createUserMessage} from '@deepseek-ai/dsh-llm';
import Sessions from '@deepseek-ai/dsh-session';
import {renderContextSections, renderPrompt} from '@deepseek-ai/dsh-system-prompt';
import {emptyHomeState} from '#feiyu-home';
import {createGarden} from '#feiyu-garden';
import {createLifeStore} from '#dsh-world/life/lifeStore';
import {behaviorPlugin, corePlugin, economyPlugin, lifePlugin} from '../../dist/tests/behavior-list/entries.js';
import {policyHost} from './policy-host.mjs';

const entries = {economy:economyPlugin, body:behaviorPlugin, life:lifePlugin};
const services = ['petBehavior', 'petLife', 'petEconomy'];
export const meal = 'food:improved-meal';
export const signal = () => new AbortController().signal;
export async function eventually(check, label) {
  for (let attempt = 0; attempt < 400; attempt++) {
    const result = await check();
    if (result) return result;
    await delay(5);
  }
  assert.fail(label);
}

// Cordis owns every plugin and subscription. The host supplies a scripted loop,
// workspace registry, and disk-backed session persistence in a disposable directory.
export async function cordisFixture(t, {crop = false, now = new Date(2026,10,15,22,59), legacyGarden = false} = {}) {
  t.mock.timers.enable({apis:['Date'], now:Number(now)});
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'her-world-entries-')));
  const repo = join(root, 'workspace'), id = 'world';
  const directory = join(repo, '.chatpet/data/life');
  mkdirSync(directory, {recursive:true});
  const home = Object.assign(emptyHomeState(Date.now()), {
    room:'living', spot:'sofa', asleep:false, sleepPending:false, route:null, dwell:null, command:null,
    freeTarget:null, reactionUntil:0, lastInteractionAt:0, eventLog:[],
    needs:{hunger:.8, thirst:.2, energy:.8, bladder:.1, pain:0},
  });
  const garden = createGarden(Date.now());
  garden.care.autoEnabled = false;
  if (crop) Object.assign(garden.plots[0], {tilled:true, cropId:'radish', progress:0, moisture:.8, plantedAt:Date.now(),
    cropProfile:{growMs:12 * 3_600_000, yield:3, waterDurationFactor:1.25, fertilizerGrowth:1.2, fertilizerYield:2}});
  writeFileSync(join(directory,'home.json'), JSON.stringify(home));
  writeFileSync(join(directory,'garden.json'), JSON.stringify(garden));
  const registryFile = join(root,'workspaces.json');
  let workspaces, registry;
  function openRegistry() {
    const saved = existsSync(registryFile) ? JSON.parse(readFileSync(registryFile,'utf8')) : {workspaces:[],archived:[]};
    workspaces = new Map();
    const persist = ()=>writeFileSync(registryFile,JSON.stringify({workspaces:[...workspaces.values()],archived:registry.archivedSessionIds}));
    function workspace(workspaceId,path,sessionIds=[]) {
      const entry = {id:workspaceId,path,title:'Synthetic workspace',sessionIds,
        async attachSession(sessionId) { if (!sessionIds.includes(sessionId)) { sessionIds.push(sessionId);persist(); } }};
      workspaces.set(workspaceId,entry);
      return entry;
    }
    for (const row of saved.workspaces) workspace(row.id,row.path,row.sessionIds);
    if (!workspaces.has(id)) workspace(id,repo);
    registry = {get:key=>workspaces.get(key),archivedSessionIds:saved.archived,
      async create(path) {
        const previous = [...workspaces.values()].find(row=>row.path===path);
        if (previous) return previous;
        const entry = workspace('external-'+workspaces.size,path);
        persist();
        return entry;
      }};
  }
  const logFile = sessionId => join(root, sessionId+'.json');
  const saved = sessionId => JSON.parse(readFileSync(logFile(sessionId),'utf8'));
  const calls = [], cancellations = [], sessionCreateCalls = [];
  let ctx, native, components, effects = [], snapshot = sections=>sections, model = async call => {
    if (call.messages.some(message=>message.source.kind==='dsh-world-life' && message.source.purpose!=='review' && !('facts' in message.source)))
      await submitPlan(call,[]);
    return 'Synthetic reply';
  }, sequence = 0;
  let agents;
  const make = async (sessionId, cwd, agentPreset) => {
    const session = native.sessions.create(sessionId,{meta:{cwd,agentPreset},seed:existsSync(logFile(sessionId))?saved(sessionId).events:[]});
    let running, controller, failure, turn = session.snapshotEvents().filter(event=>event.type==='turn/start').at(-1)?.data.turn ?? 0;
    const inbox = {nextTurn:[], nextStep:[], remove(messageId) {
      for (const queue of [this.nextTurn,this.nextStep]) {
        const index = queue.findIndex(message=>message.id===messageId);
        if (index>=0) queue.splice(index,1);
      }
    }};
    const agent = {id:sessionId, session, inbox, status:'idle', whenIdle:async()=>{await running;if (failure) throw failure;},
      steer(message) { enqueue(message,inbox.nextStep); }, followup(message) { enqueue(message,inbox.nextTurn); },
      cancel(reason) { cancellations.push({sessionId,reason}); controller?.abort(reason); }};
    agent.ctx = native.makeScope(agent);
    const events = agentEvents(ctx,agent), carrier = agentCarrier(agent);
    function enqueue(message, queue) {
      queue.push(message);
      events.emit('agent/inbox/inserted',{message});
      running ??= drain().finally(()=>{running=undefined;});
      running.catch(error=>{failure=error;});
    }
    async function drain() {
      await Promise.resolve();
      while (inbox.nextStep.length || inbox.nextTurn.length) {
        agent.status = 'running';
        const messages = [...inbox.nextStep.splice(0),...inbox.nextTurn.splice(0)];
        controller = new AbortController();
        const {signal} = controller, step = 1;
        const toolSet = await ctx.tools.resolve({agent,signal});
        try {
          const schemas = ctx.tools.schemas(agent,toolSet).map(schema=>schema.name);
          const prompt = await ctx.systemPrompt.assemble({agent,scope:agent,signal,toolSet});
          session.append('turn/start',{turn:++turn});
          const dispatch = (name,payload,next) => ctx.waterfall(carrier,name,{agent,turn,step,signal,...payload},next);
          const admission = await dispatch('agent/pre-step',{messages},async()=>({kind:'enter',messages:[]}));
          assert.equal(admission.kind,'enter');
          session.append('step/start',{turn,step});
          for (const message of [...admission.messages,...messages]) session.append('user/message',message,{surfaceOp:'append'});
          await dispatch('agent/request',{},async()=>({}));
          const sections = renderContextSections(prompt), logged = snapshot(sections);
          if (logged.length) session.append('user/message',createUserMessage({source:{kind:'runtime-context',form:'snapshot',sections:logged},
            content:[{type:'text',text:logged.map(row=>row.text).join('\n\n')}]}),{surfaceOp:'append'});
          const tool = async (name,args,executionSignal=signal) => {
            const exec = {agent,name,arguments:args,signal:executionSignal,token:Symbol(name),callId:'call-'+(++sequence)};
            session.append('tool/call',{turn,step,callId:exec.callId,name,arguments:JSON.stringify(args)});
            try {
              const gate = await ctx.waterfall(carrier,'tools/pre-execute',exec,async()=>({kind:'allow'}));
              assert.equal(gate.kind,'allow',`执行 ${name} 前必须取得工具准入`);
              const denial = ctx.tools.checkGuards(exec);
              if (denial) throw Error(denial);
              const definition = ctx.tools.executable(name,agent,toolSet);
              assert.ok(definition,'Declared tool is executable: '+name);
              executionSignal.throwIfAborted();
              const result = await definition.execute(args,exec);
              session.append('tool/result',{turn,step,message:createToolResultMessage({callId:exec.callId,isError:false,
                content:[{type:'text',text:typeof result==='string'?result:JSON.stringify(result)}]})},{surfaceOp:'append'});
              return result;
            } finally { ctx.emit(carrier,'tools/result',exec); }
          };
          const call = {agent,messages,schemas,sections,system:renderPrompt(prompt),tool,signal};
          calls.push(call);
          const text = await model(call);
          if (!signal.aborted) session.append('assistant/message',{turn,step,stream:[],message:createAssistantMessage({source:{provider:'fixture',model:'scripted'},content:[{type:'text',text}]})},{surfaceOp:'append'});
          const reason = signal.aborted ? {kind:'aborted',cause:signal.reason} : {kind:'completed'};
          session.append('step/end',{turn,step,reason});
          session.append('turn/end',{turn,reason});
          await ctx.sessions.flush(session);
        } finally { agent.status='idle'; toolSet.dispose(); }
      }
    }
    agents.set(sessionId,agent);
    return agent;
  };

  async function start() {
    openRegistry();
    const host = await policyHost(repo,effects);
    ctx = host.ctx.root;
    agents = new Map();
    components = new Map();
    const controller = {
      async create({workspaceId,sessionId=randomUUID(),agentPreset='standard'}) {
        sessionCreateCalls.push(sessionId);
        const selected = registry.get(workspaceId);
        await selected.attachSession(sessionId);
        if (!agents.has(sessionId)) await make(sessionId,selected.path,agentPreset);
        return {sessionId};
      },
      async resolveAgent(sessionId) {
        const stored = existsSync(logFile(sessionId)) && saved(sessionId);
        const agent = agents.get(sessionId) ?? (stored && await make(sessionId,stored.header.cwd,stored.header.agentPreset));
        return agent ? {agent} : {error:{code:'session/not-found'}};
      },
      async rename() {},
      cancel({sessionId}) { agents.get(sessionId)?.cancel({kind:'user'}); },
    };
    const persisted = header => ({header,inheritedEventCount:0,
      async read() { return {events:existsSync(logFile(header.id))?saved(header.id).events:[]}; },
      async append(events) {
        const before = existsSync(logFile(header.id)) ? saved(header.id).events : [];
        writeFileSync(logFile(header.id),JSON.stringify({header,events:[...before,...events]}));
      },
      async flush() {}, async close() {}});
    await ctx.plugin(Sessions);
    native = {...host,sessions:ctx.sessions};
    await ctx.plugin({apply(scope) {
      scope.provide('agents',{get:key=>agents.get(key),list:()=>[...agents.values()]});
      scope.provide('agentLoop',{});
      scope.provide('workspaceRegistry',registry);
      scope.provide('sessionController',controller);
      scope.provide('agentPresets',{composedPreset:carrier=>[...agents.values()].find(agent=>agent.ctx===carrier)?.session.header.agentPreset});
      scope.provide('workingDirectory',{ensure:async agent=>agent.session.header.cwd});
      scope.provide('fs',{resolve:async (path,{cwd})=>resolve(cwd,path),processPath:path=>path});
      scope.provide('sessionPersistence',{
        async open(sessionId) {
          if (!existsSync(logFile(sessionId))) throw Object.assign(Error('Missing synthetic session'),{name:'SessionNotFound'});
          return persisted(saved(sessionId).header);
        },
        async create(header) { return persisted(header); },
      });
      scope.on('session/flush',session=>writeFileSync(logFile(session.id),JSON.stringify({header:session.header,events:session.snapshotEvents()})));
    }});
    const config = {dataDir:join(root,'core'),companionId:'fish',scopeId:'owner',ownerActorId:'owner',
      displayName:'Fixture',character:'Synthetic companion'};
    await ctx.plugin(corePlugin,config);
    const core = ctx.petCore, request = label=>core.operator.request(label);
    if (core.workspace.status().state!=='ready') {
      const prefs = await core.services.preferences.read(request('read'),{});
      assert.ok(prefs.ok);
      const result = await core.services.preferences.save(request('bind'),{expectedRevision:prefs.value.revision,
        conversation:prefs.value.conversation,workspace:{id,path:repo,title:registry.get(id).title}});
      assert.ok(result.ok,JSON.stringify(result));
      const initialized = await core.services.workspace.initialize(request('initialize'),{expectedPreferencesRevision:result.value.revision});
      assert.ok(initialized.ok,JSON.stringify(initialized));
    }
    for (const key of Object.keys(entries)) if (key!=='economy' || !legacyGarden) await load(key);
  }
  async function stop() {
    if (!ctx) return;
    for (const key of ['life','body','economy']) if (components.has(key)) await unload(key);
    await Promise.all([...agents.values()].map(agent=>agent.whenIdle()));
    for (const dispose of effects.splice(0).reverse()) await dispose();
    await ctx.fiber.dispose();
    ctx = undefined;
  }
  async function load(key) { components.set(key,await ctx.plugin(entries[key])); }
  async function unload(key) { await components.get(key).dispose();components.delete(key); }
  t.after(async()=>{try { await stop(); } finally { rmSync(root,{recursive:true,force:true}); }});
  await start();
  return {
    id, repo, directory, calls, cancellations, sessionCreateCalls, saved, logFile, load, unload,
    get registry() { return registry; }, get bound() { return registry.get(id); },
    get ctx() { return ctx; }, get core() { return ctx.petCore; },
    get body() { return ctx.petBehavior; }, get life() { return ctx.petLife; }, get economy() { return ctx.petEconomy; },
    set model(value) { model=value; },
    set snapshot(value) { snapshot=value; },
    async restart(between = ()=>{}) { await stop(); await between(); await start(); },
    async agent(sessionId='home') {
      const result = await ctx.sessionController.resolveAgent(sessionId);
      if (result.agent) return result.agent;
      await ctx.sessionController.create({workspaceId:id,sessionId});
      return agents.get(sessionId);
    },
    async input(text,sessionId='home') {
      const agent = await this.agent(sessionId);
      agent.followup(createUserMessage({source:{kind:'user'},content:[{type:'text',text}]}));
      await agent.whenIdle();
      return calls.at(-1);
    },
    states(expected) { assert.deepEqual(services.map(name=>Boolean(ctx.get(name))),expected); },
    async enable(review='') {
      const {preferences} = await this.life.snapshot(id);
      await this.life.settings(id,preferences,{...preferences,wake:'',review});
      assert.deepEqual(await this.life.control(id,true),{enabled:true,running:true});
    },
    ownerAction(action,requestId) { return this.economy.ownerAction(id,action,requestId,signal()); },
    async progress() { return (await this.body.garden(id,'state')).garden.plots[0].progress; },
  };
}

export async function submitPlan(call, steps, nextConsiderAt = null) {
  const {revision} = JSON.parse(await call.tool('life_plan_read',{view:'full'}));
  return JSON.parse(await call.tool('life_plan_update',{expectedRevision:revision,
    plan:{goal:'Continue living',reason:'Scripted decision',steps,nextConsiderAt}}));
}

const lifeInput = call=>call.messages.some(message=>message.source.kind==='dsh-world-life');
const readControl = f=>readFileSync(join(f.directory,'control.json'),'utf8');
const hour = 3_600_000;
const pauses = f=>JSON.parse(readControl(f)).pauses;
const committedGarden = f=>{
  const database = join(f.repo,'.chatpet/data/economy/economy.sqlite');
  if (!existsSync(database)) return JSON.parse(readFileSync(join(f.directory,'garden.json'),'utf8'));
  using db = new DatabaseSync(database,{readOnly:true});
  return JSON.parse(db.prepare("SELECT value FROM meta WHERE key='garden'").get().value);
};
function assertCrop(garden, hours, updatedAt) {
  assert.ok(Math.abs(garden.plots[0].progress-hours/12)<1e-10,`作物进度为 ${garden.plots[0].progress}，应计 ${hours} 小时`);
  assert.ok(Math.abs(garden.plots[0].moisture-(.8-hours/15))<1e-10);
  assert.equal(garden.updatedAt,updatedAt);
}
async function clockFixture(t, options) {
  const f = await cordisFixture(t,{crop:true,...options});
  await f.enable();
  await f.progress();
  return f;
}
function till(f, plotId=1) {
  return f.body.garden(f.id,'act',{type:'till',plotId,requestId:'till-'+plotId});
}
async function settleCrop(f, hours, at=Date.now(), plotId=1) {
  const view = await f.body.garden(f.id,'state');
  assert.equal(view.ok,true);
  assertCrop(view.garden,hours,at);
  assert.equal((await till(f,plotId)).ok,true);
  assertCrop(committedGarden(f),hours,at);
}
const hold = (id, durationMinutes)=>({id,kind:'hold',activity:'Resting',durationMinutes});
const reviewTime = new Date(2026,10,15,22,59,59,500);

async function reviewFixture(t, runReview) {
  const f = await cordisFixture(t,{now:reviewTime});
  f.model = async call=>{
    const input = call.messages.find(message=>message.source.kind==='dsh-world-life');
    if (input?.source.purpose==='review') {
      const path = join(f.repo,'.chatpet','diary',input.source.reviewDay+'.md');
      await runReview(f,call,path);
    } else if (input && !('facts' in input.source)) {
      await submitPlan(call,[]);
    }
    return 'Synthetic review reply';
  };
  await f.enable('23:00');
  // Wait for the startup planning turn before moving the clock to the review.
  await eventually(async()=> (await f.life.readPlan(f.id)).plan,'启动计划已保存');
  return f;
}

// The behavior runner identifies a test by its source file and name.
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  test('卸载 Life 取消原生轮次并以原编号恢复在途身体计划',async t=>{
    const f = await cordisFixture(t);
    let entered;
    f.model = async call=>{
      if (!lifeInput(call)) return 'Owner reply';
      const nextConsiderAt = new Date(Date.now()+60*60_000).toISOString();
      await submitPlan(call,[hold('rest',10)],nextConsiderAt);
      entered=call;
      await new Promise(resolve=>call.signal.addEventListener('abort',resolve,{once:true}));
      return 'Cancelled reply';
    };
    await f.enable();
    const call = await eventually(()=>entered,'Life 输入到达模型并提交计划');
    const plan = await eventually(async()=> (await f.life.readPlan(f.id)).plan?.operationId && (await f.life.readPlan(f.id)).plan,'在途计划取得执行编号');
    const receipt = await f.body.inspectPlanned(f.id,plan.operationId), control = readControl(f);
    assert.equal(receipt.status,'running');
    f.states([true,true,true]);
    await f.unload('life');
    f.states([true,false,true]);
    await call.agent.whenIdle();
    assert.equal(call.signal.aborted,true);
    assert.deepEqual(f.cancellations.map(row=>row.sessionId),[call.agent.id]);
    assert.equal(f.saved(call.agent.id).events.filter(event=>event.type==='turn/end').at(-1).data.reason.kind,'aborted');
    assert.equal(readControl(f),control);
    assert.deepEqual(await f.body.inspectPlanned(f.id,plan.operationId),receipt);
    await f.load('life');
    await eventually(()=>f.life.running(),'Life 重新启用');
    f.states([true,true,true]);
    assert.equal(f.life.homeSessionId(),call.agent.id);
    assert.deepEqual(f.sessionCreateCalls,[call.agent.id]);
    assert.equal((await f.life.readPlan(f.id)).plan.operationId,plan.operationId);
    assert.equal((await f.body.inspectPlanned(f.id,plan.operationId)).status,'running');
    assert.equal(plan.cursor,0);
    assert.ok(receipt.until);
    t.mock.timers.setTime(Date.parse(receipt.until)+1);
    const completedReceipt = await f.body.inspectPlanned(f.id,plan.operationId);
    assert.equal(completedReceipt.operationId,plan.operationId);
    assert.equal(completedReceipt.status,'completed');
    const resumed = await eventually(async()=>{
      const {plan:current} = await f.life.readPlan(f.id);
      return current?.cursor===1 && current;
    },'Life 消费原步骤的完成回执后推进游标');
    assert.equal(resumed.id,plan.id);
    assert.deepEqual(resumed.execution,completedReceipt);
  });

  for (const [key, states] of [
    ['body',[false,true,true]],
    ['economy',[true,true,false]],
  ]) test(`卸载 ${key} 跨暂停再启用时的作物结算`,async t=>{
    const f = await cordisFixture(t,{crop:true});
    await f.enable();
    f.states([true,true,true]);
    await f.progress(); // Establish the adopted Economy authority.
    t.mock.timers.tick(2*3_600_000);
    assert.ok(Math.abs(await f.progress()-1/6)<1e-10);
    await f.unload(key);
    f.states(states);
    if (key==='economy') {
      const view = await f.body.garden(f.id,'state');
      assert.equal(view.ok,false);
      assert.equal(view.garden.unavailable,true);
    }
    assert.deepEqual(await f.life.control(f.id,false),{enabled:false,running:false});
    f.states(states);
    t.mock.timers.tick(4*3_600_000);
    assert.deepEqual(await f.life.control(f.id,true),{enabled:true,running:true});
    f.states(states);
    await f.load(key);
    f.states([true,true,true]);
    await settleCrop(f,2);
  });

  for (const key of ['economy','body']) test(`暂停时卸载 ${key}，暂停中重新加载`,async t=>{
    const f = await clockFixture(t);
    t.mock.timers.tick(2*hour);
    await f.unload(key);
    await f.life.control(f.id,false);
    t.mock.timers.tick(2*hour);
    await f.load(key);
    await settleCrop(f,2);
    t.mock.timers.tick(2*hour);
    await f.life.control(f.id,true);
    await settleCrop(f,2,Date.now(),2);
  });

  test('两组件都缺席时暂停，恢复后继续生长',async t=>{
    const f = await clockFixture(t);
    await f.unload('body');
    await f.unload('economy');
    t.mock.timers.tick(2*hour);
    await f.life.control(f.id,false);
    t.mock.timers.tick(4*hour);
    await f.life.control(f.id,true);
    t.mock.timers.tick(hour);
    await f.load('economy');
    assertCrop(f.economy.gardenPort(f.id).loadGarden(Date.now()),3,Date.now());
    const {configurationVersion} = await f.economy.snapshot(f.id);
    await f.economy.settings(f.id,configurationVersion,{},'settings-after-pause',signal());
    assertCrop(committedGarden(f),3,Date.now());
    await f.load('body');
    await settleCrop(f,3);
  });

  test('同一次卸载期间跨过两次暂停',async t=>{
    const f = await clockFixture(t);
    await f.unload('economy');
    for (const duration of [hour,2*hour]) {
      t.mock.timers.tick(hour);
      await f.life.control(f.id,false);
      t.mock.timers.tick(duration);
      await f.life.control(f.id,true);
    }
    t.mock.timers.tick(hour);
    await f.load('economy');
    await settleCrop(f,3);
  });

  test('暂停中整体重启后恢复作物时钟',async t=>{
    const f = await clockFixture(t);
    t.mock.timers.tick(2*hour);
    await f.unload('economy');
    await f.life.control(f.id,false);
    t.mock.timers.tick(2*hour);
    await f.restart();
    t.mock.timers.tick(2*hour);
    await f.life.control(f.id,true);
    await settleCrop(f,2);
  });

  test('暂停已落盘时 Body 队首动作按新区间提交',async t=>{
    const f = await clockFixture(t);
    t.mock.timers.tick(2*hour);
    let published = false;
    const dispose = f.ctx.on('pet/life.changed',()=>{
      if (!published && JSON.parse(readControl(f)).enabled===false) {
        published = true;
        t.mock.timers.tick(hour);
      }
    });
    try {
      const stop = f.life.control(f.id,false);
      const write = till(f);
      assert.equal((await write).ok,true);
      assert.equal(published,true);
      assertCrop(committedGarden(f),2,Date.now());
      await stop;
    } finally { dispose(); }
  });

  test('暂停中的手工动作提交菜园时钟',async t=>{
    const f = await clockFixture(t);
    t.mock.timers.tick(2*hour);
    await f.unload('body');
    await f.life.control(f.id,false);
    t.mock.timers.tick(4*hour);
    await f.load('body');
    await settleCrop(f,2);
  });

  test('未采用 Economy 的菜园读写和首次接管扣除暂停',async t=>{
    const f = await clockFixture(t,{legacyGarden:true});
    t.mock.timers.tick(2*hour);
    await f.unload('body');
    await f.life.control(f.id,false);
    t.mock.timers.tick(4*hour);
    await f.load('body');
    await settleCrop(f,2);
    await f.life.control(f.id,true);
    t.mock.timers.tick(hour);
    await f.load('economy');
    await settleCrop(f,3,Date.now(),2);
  });

  test('Life 卸载后重载 Economy 从 control.json 恢复暂停',async t=>{
    const f = await clockFixture(t);
    t.mock.timers.tick(2*hour);
    await f.unload('economy');
    await f.life.control(f.id,false);
    t.mock.timers.tick(4*hour);
    await f.life.control(f.id,true);
    await f.unload('life');
    await f.unload('body');
    t.mock.timers.tick(hour);
    await f.load('economy');
    assertCrop(f.economy.gardenPort(f.id).loadGarden(Date.now()),3,Date.now());
    await f.load('body');
    await settleCrop(f,3);
  });

  test('Body 错过整段暂停且 Life 已卸载时手工动作扣除暂停',async t=>{
    const f = await clockFixture(t);
    t.mock.timers.tick(2*hour);
    await f.unload('body');
    await f.life.control(f.id,false);
    t.mock.timers.tick(4*hour);
    await f.life.control(f.id,true);
    await f.unload('life');
    await f.load('body');
    f.states([true,false,true]);
    const result = await till(f);
    assert.equal(result.ok,true);
    assertCrop(result.garden,2,Date.now());
    assertCrop(committedGarden(f),2,Date.now());
  });

  test('Life 卸载后损坏的暂停区间只阻挡菜园，身体照常',async t=>{
    const f = await clockFixture(t);
    await f.unload('life');
    f.states([true,false,true]);
    const file = join(f.directory,'control.json');
    const committed = committedGarden(f);
    const invalidPauses = '{"version":1,"enabled":true,"pauses":[{"from":10,"to":null}]}\n';
    writeFileSync(file,invalidPauses);
    t.mock.timers.tick(3*hour);
    const meal = await f.body.roomAction(f.id,{action:'feed'},'主人');
    assert.equal(meal.ok,true);
    assert.equal(meal.changed,true);
    assert.equal(meal.fact.result.status,'completed');
    assert.ok(meal.fact.result.after.hunger < meal.fact.result.before.hunger);
    for (const result of [await f.body.garden(f.id,'state'),await till(f),
      await f.body.garden(f.id,'control',{type:'auto',enabled:true})]) {
      assert.equal(result.ok,false);
      assert.equal(result.garden.unavailable,true);
      assert.match(result.garden.message,/生活开关文件无效/);
    }
    assert.throws(()=>f.economy.gardenPort(f.id).loadGarden(Date.now()),/生活开关文件无效/);
    assert.deepEqual(committedGarden(f),committed);
    assert.equal(readControl(f),invalidPauses);
  });

  test('缺少 Life 和 Body 时 Economy 改配置仍按区间结算',async t=>{
    const f = await clockFixture(t);
    await f.unload('body');
    t.mock.timers.tick(2*hour);
    const from = Date.now();
    await f.life.control(f.id,false);
    t.mock.timers.tick(4*hour);
    await f.life.control(f.id,true);
    await f.unload('life');
    f.states([false,false,true]);
    assertCrop(committedGarden(f),0,from-2*hour);
    assertCrop(f.economy.gardenPort(f.id).loadGarden(Date.now()),2,Date.now());
    assertCrop(committedGarden(f),0,from-2*hour);
    const {configuration,configurationVersion} = await f.economy.snapshot(f.id);
    const articlePrice=configuration.articlePrice+1;
    const result=await f.economy.settings(f.id,configurationVersion,{articlePrice},'settings-no-life',signal());
    const revision=configuration.revision+1;
    assert.deepEqual(result.configuration,{...configuration,articlePrice,revision});
    assert.deepEqual((await f.economy.snapshot(f.id)).configuration,result.configuration);
    assertCrop(committedGarden(f),2,Date.now());
  });

  test('缺少 control.json 和 Life 时沿用原菜园开关',async t=>{
    const f = await clockFixture(t);
    await f.unload('life');
    // 旧版清单允许工作区在没有 control.json 时仍然就绪。
    const manifest=join(f.repo,'.chatpet','manifest.json');
    const saved=JSON.parse(readFileSync(manifest,'utf8'));
    writeFileSync(manifest,JSON.stringify({...saved,schemaVersion:2,files:['README.md','manifest.json','SOUL.md','USER.md','core.json']}));
    const control=join(f.directory,'control.json');
    rmSync(control);
    assert.equal(f.core.workspace.status().state,'ready');
    t.mock.timers.tick(2*hour);
    await settleCrop(f,2);
    await f.body.setAutonomy(f.id,false);
    t.mock.timers.tick(hour);
    await settleCrop(f,2,Date.now(),2);
    await f.unload('body');
    t.mock.timers.tick(hour);
    const {configurationVersion} = await f.economy.snapshot(f.id);
    await f.economy.settings(f.id,configurationVersion,{},'settings-no-control',signal());
    assertCrop(committedGarden(f),3,Date.now());
    assert.equal(existsSync(control),false);
  });

  test('重试开关和修改偏好保留原有暂停区间',async t=>{
    const f = await clockFixture(t);
    await f.unload('economy');
    t.mock.timers.tick(2*hour);
    const from=Date.now();
    await f.life.control(f.id,false);
    t.mock.timers.tick(hour);
    await f.life.control(f.id,false);
    const {preferences} = await f.life.snapshot(f.id);
    await f.life.settings(f.id,preferences,{...preferences,review:'09:00'});
    assert.deepEqual(pauses(f),[{from,to:null}]);
    t.mock.timers.tick(hour);
    const to=Date.now();
    await f.life.control(f.id,true);
    t.mock.timers.tick(hour);
    await f.life.control(f.id,true);
    assert.deepEqual(pauses(f),[{from,to}]);
    await f.load('economy');
    await settleCrop(f,3);
  });

  test('旧暂停存档先按旧规则恢复，再记录下一次暂停',async t=>{
    const f = await clockFixture(t);
    await f.unload('life');
    writeFileSync(join(f.directory,'control.json'),JSON.stringify({version:1,enabled:false}));
    await f.load('life');
    await f.progress();
    t.mock.timers.tick(4*hour);
    await f.life.control(f.id,true);
    assert.equal(pauses(f),undefined);
    t.mock.timers.tick(2*hour);
    await settleCrop(f,2);
    await f.unload('economy');
    await f.life.control(f.id,false);
    t.mock.timers.tick(2*hour);
    await f.life.control(f.id,true);
    await f.load('economy');
    await settleCrop(f,2,Date.now(),2);
  });

  test('时间倒退时暂停区间不重叠且已提交菜园时钟不倒退',async t=>{
    const f = await clockFixture(t);
    await f.unload('economy');
    t.mock.timers.tick(2*hour);
    const from = Date.now();
    await f.life.control(f.id,false);
    t.mock.timers.tick(2*hour);
    const to = Date.now();
    await f.life.control(f.id,true);
    t.mock.timers.setTime(from+hour);
    await f.life.control(f.id,false);
    assert.deepEqual(pauses(f),[{from,to},{from:to,to:null}]);
    await f.life.control(f.id,true);
    assert.deepEqual(pauses(f),[{from,to}]);
    t.mock.timers.setTime(to);
    await f.load('economy');
    await settleCrop(f,2);
    t.mock.timers.setTime(from);
    await settleCrop(f,2,to,2);
  });

  test('只按 Economy 已提交的菜园时钟清理暂停区间',async t=>{
    const f = await clockFixture(t);
    await f.unload('body');
    t.mock.timers.tick(2*hour);
    const from=Date.now();
    await f.life.control(f.id,false);
    t.mock.timers.tick(2*hour);
    const to=Date.now();
    await f.life.control(f.id,true);
    f.economy.gardenPort(f.id).loadGarden(Date.now());
    const {preferences} = await f.life.snapshot(f.id);
    await f.life.settings(f.id,preferences,{...preferences,review:'09:00'});
    assert.deepEqual(pauses(f),[{from,to}]);
    await f.load('body');
    await settleCrop(f,2);
    t.mock.timers.tick(hour);
    await f.life.control(f.id,false);
    assert.deepEqual(pauses(f),[{from:Date.now(),to:null}]);
    assertCrop(committedGarden(f),3,Date.now());
  });

  for (const [key,states] of [['body',[false,true,true]],['economy',[true,true,false]]]) {
    test(`卸载 ${key} 后 Life 回顾仍调度并写入原日期日记`,async t=>{
      const written = [];
      const f = await reviewFixture(t,async (_f,call,path)=>{
        await call.tool('write',{file_path:path,content:'Scripted diary.'});
        written.push({call,path});
      });
      await f.unload(key);
      f.states(states);
      if (key==='body') {
        const before = await f.economy.snapshot(f.id);
        const price = before.catalog.find(row=>row.id===meal).purchasePrice;
        await f.ownerAction({kind:'grant',amount:price},'grant');
        await f.ownerAction({kind:'gift',itemId:meal},'gift');
        const bought = await f.ownerAction({kind:'buy',itemId:meal},'purchase');
        assert.equal(bought.balance,0);
        assert.equal(bought.inventory.find(row=>row.itemId===meal).quantity,2);
        await assert.rejects(f.ownerAction({kind:'feed',itemId:meal},'feed'),/shared Body is unavailable/);
      } else {
        await f.body.act(f.id,'water','free-water');
        assert.equal((await f.body.pendingFacts(f.id)).at(-1).requestId,'free-water');
      }
      t.mock.timers.tick(1000);
      const call = await eventually(()=>f.calls.find(call=>call.messages.some(message=>message.source.purpose==='review')),'Life 回顾已调度');
      await call.agent.whenIdle();
      const [{path}] = written;
      assert.equal(path,join(f.repo,'.chatpet','diary','2026-11-15.md'));
      assert.equal(readFileSync(path,'utf8'),'Scripted diary.');
      assert.ok(!(await f.life.snapshot(f.id)).life.pendingReviews?.some(row=>row.day==='2026-11-15'));
      assert.equal(f.saved(call.agent.id).events.filter(event=>event.type==='turn/end').at(-1).data.reason.kind,'completed');
      f.states(states);
    });
  }

  test('暂停 Life 取消回顾轮次但同一回顾的文件授权仍可复核',async t=>{
    const entered = Promise.withResolvers(), release = Promise.withResolvers();
    const f = await reviewFixture(t,async (_f,call,path)=>{
      entered.resolve({call,path});
      await release.promise;
    });
    t.mock.timers.tick(1000);
    await eventually(()=>f.calls.some(call=>call.messages.some(message=>message.source.purpose==='review')),'回顾已准入');
    const {call,path} = await entered.promise;
    try {
      await f.life.control(f.id,false);
      f.states([true,true,true]);
      assert.equal(call.signal.aborted,true);
      assert.equal(f.life.running(),false);
      assert.equal(f.core.native.sourceTable.admit({sessionId:call.agent.id,message:call.messages[0]}).kind,'rejected');
      // Native cancellation blocks dispatch. A separate signal isolates the
      // already admitted review's file grant from that cancellation.
      await assert.rejects(call.tool('write',{file_path:path,content:'Cancelled write'}),error=>error===call.signal.reason);
      await assert.rejects(call.tool('read',{file_path:path}),error=>error===call.signal.reason);
      assert.equal(existsSync(path),false);
      await call.tool('write',{file_path:path,content:'Still authorized'},signal());
      assert.equal(await call.tool('read',{file_path:path},signal()),'Still authorized');
    } finally { release.resolve(); }
    await call.agent.whenIdle();
  });

  test('三入口全卸载后普通聊天、无身体环境段、相册和历史活动仍可用',async t=>{
    const f = await cordisFixture(t);
    const store = createLifeStore(f.directory,Intl.DateTimeFormat().resolvedOptions().timeZone);
    f.core.records.getLibrary(f.id).album().keep({ref:{attachmentId:'fixture-image',mediaType:'image/png',bytes:3,width:1,height:1},
      data:Uint8Array.of(1,2,3)},'Synthetic drawing');
    for (const day of ['2026-11-12','2026-11-13']) {
      const at = new Date(Number(day.slice(0,4)),10,Number(day.slice(-2)),12).toISOString();
      assert.ok(store.appendActivity({time:at,sessionId:'home',callId:day,tool:'read',summary:'Saved activity '+day,outside:false}));
    }
    writeFileSync(join(f.repo,'.chatpet','diary','2026-11-13.md'),'Saved diary.');
    for (const key of ['life','body','economy']) await f.unload(key);
    f.states([false,false,false]);
    f.model = async call=>{
      assert.ok(call.schemas.includes('pet_list_photos'));
      const album = JSON.parse(await call.tool('pet_list_photos',{}));
      assert.equal(album.total,1);
      assert.deepEqual(album.photos.map(photo=>photo.description),['Synthetic drawing']);
      return 'Ordinary reply after unload';
    };
    const call = await f.input('Are you there?');
    assert.match(call.sections.find(row=>row.name==='chatpet.environment').text,/没有共享身体执行服务/);
    assert.ok(!call.sections.some(row=>row.name==='chatpet.interactions'));
    const events = f.saved(call.agent.id).events;
    assert.equal(events.find(event=>event.type==='assistant/message').data.message.content[0].text,'Ordinary reply after unload');
    assert.deepEqual(await f.core.records.library(f.id,'dates'),['2026-11-13','2026-11-12']);
    const journal = await f.core.records.library(f.id,'journal','2026-11-13');
    assert.equal(journal.diary,'Saved diary.');
    assert.deepEqual(journal.activity.map(row=>row.summary),['Saved activity 2026-11-13']);
  });
}
