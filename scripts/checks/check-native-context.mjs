// Actual installed DSH loop/persistence; only a scripted, in-process model.
// Every companion/workspace/session is created beneath a disposable directory.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,realpathSync,rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {mountFixtureServices} from '../lib/native-fixture-mount.mjs';
import {mountInstalledStandard} from './lib/native-standard-preset.mjs';
import {say} from './lib/native-conversation-scenarios.mjs';

const app='/Applications/DeepSeek Harness.app/Contents';
if(!process.versions.electron) {
  const child=spawnSync(join(app,'MacOS/DeepSeek Harness'),['--expose-internals',fileURLToPath(import.meta.url)],
    {env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},stdio:'inherit',timeout:60000});
  if(child.error)throw child.error;process.exit(child.status??1);
}
const root=realpathSync(mkdtempSync(join(tmpdir(),'pet-native-context-')));
const require=createRequire(join(app,'Resources/app.asar/dsh/package.json'));
const load=name=>import(require.resolve('@deepseek-ai/'+name));
const {Context}=await load('cordis'),{LlmAdapter,createUserMessage}=await load('dsh-llm');
const ctx=new Context();ctx.baseUrl=pathToFileURL(join(app,'Resources/app.asar/dsh/index.js')).href;
const calls=[];
class Fixture extends LlmAdapter {
  async resolveModel(provider,id){return {provider,id,name:id,systemPromptUpdate:'in-history'};}
  async *stream(options){calls.push(options);yield* say('I noticed the actual interaction and continue my existing rest.');}
}
const unwrap=result=>{assert.ok(result.ok,JSON.stringify(result.error));return result.value;};
try {
  const mount=await mountFixtureServices(ctx,load,root);await mountInstalledStandard(ctx,require);
  await mount('dsh-agent-default-model',{provider:'context-fixture',model:'local'});
  ctx.llm.registerAdapter(['context-fixture'],new Fixture());
  await ctx.plugin(await import('../../dist/src/core/plugin.js'),{dataDir:join(root,'.chatpet/data/core'),cwd:root,
    companionId:'fish',scopeId:'fixture',ownerActorId:'owner',displayName:'Context fixture',character:'Continuous companion'});
  const host=ctx.petCore,workspace=await ctx.workspaceRegistry.create(root,'Disposable context');
  const request=id=>host.operator.request('context-check-'+id);
  const prefs=unwrap(await host.services.preferences.read(request('read'),{}));
  const saved=unwrap(await host.services.preferences.save(request('bind'),{expectedRevision:prefs.revision,conversation:prefs.conversation,
    workspace:{id:workspace.id,path:workspace.path,title:workspace.title}}));
  unwrap(await host.services.workspace.initialize(request('init'),{expectedPreferencesRevision:saved.revision}));
  await ctx.plugin(await import('../../dist/src/living/body/plugin.js'));
  await ctx.plugin(await import('../../dist/src/living/plan/plugin.js'));
  const {PersistentLifePlan}=await import('../../dist/src/living/plan/plan.js');
  const plan=new PersistentLifePlan(join(root,'.chatpet/data/life'),'fish',host.workspace.storageId(),'UTC');
  await plan.commit(0,{goal:'Keep resting',reason:'My continuing choice',steps:[{id:'rest',kind:'hold',activity:'Rest quietly'}],nextConsiderAt:null});
  const originalPlan=plan.read();
  const handle=await ctx.agents.create({sessionId:'context-fixture',meta:{cwd:root,agentPreset:'standard'},
    agentOptions:{provider:'context-fixture',model:'local',maxTokens:1024},setup:async scope=>{await ctx.agentPresets.mount(scope,'standard');}});
  await workspace.attachSession(handle.agent.id);
  const send=async text=>{
    handle.agent.followup(createUserMessage({source:{kind:'user'},content:[{type:'text',text}]}));
    await handle.agent.whenIdle();await ctx.sessions.flush(handle.agent.session);
    const end=handle.agent.session.snapshotEvents().filter(event=>event.type==='turn/end').at(-1);
    assert.equal(end.data.reason.kind,'completed',JSON.stringify(end.data.reason));
    for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));
  };
  await send('Continue resting.');
  const originalEvents=structuredClone(handle.agent.session.snapshotEvents());
  const factIds=[];
  for(let i=0;i<6;i++) {
    await ctx.petBehavior.act(workspace.id,i%2?'pet':'water','interaction-'+i,'desktop');
    const facts=await ctx.petBehavior.pendingFacts(workspace.id);assert.ok(facts.length);
    factIds.push(...facts.map(fact=>fact.id));
    await send('I am here.');
    assert.deepEqual(await ctx.petBehavior.pendingFacts(workspace.id),[],'Durable successful perception acknowledges each exact fact');
    const session=handle.agent.session;
    const snapshots=session.surface.nodes.map(seq=>session.eventAt(seq)).filter(event=>event.type==='user/message'&&event.data.source.kind==='runtime-context');
    assert.equal(snapshots.filter(event=>event.data.source.sections.some(section=>section.name==='chatpet.environment')).length,1);
    assert.deepEqual(plan.read(),originalPlan,'Ordinary interaction must not replace or restart an accepted Life plan');
  }
  const systems=calls.map(call=>JSON.stringify(call.messages.filter(message=>message.role==='system')));
  assert.ok(systems.every(system=>system===systems[0]),'All body/fact changes retain the exact leading system prompt');
  assert.deepEqual(handle.agent.session.snapshotEvents().slice(0,originalEvents.length),originalEvents,'Projection preserves original native history');
  const originalFacts=await ctx.petBehavior.readFacts(workspace.id,factIds);
  assert.equal(originalFacts.length,6);assert.ok(originalFacts.every(fact=>fact.actor.channel==='desktop'&&fact.result.before&&fact.result.after));
  assert.ok(host.workspace.runtime.store.all('source').filter(source=>source.locator?.startsWith('companion-fact:')).length>=6);
  console.log(JSON.stringify({ok:true,scriptedCalls:calls.length,paidCalls:0,stableSystem:true,currentEnvironmentSnapshots:1,
    originalFacts:originalFacts.length,originalHistoryRetained:true,acceptedPlanUnchanged:true,installed:false}));
  await handle.dispose();
} finally {await ctx.fiber.dispose();rmSync(root,{recursive:true,force:true});}
