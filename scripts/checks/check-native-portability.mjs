// Two isolated native profiles and two Repo locations. No personal data or remote model.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync,mkdirSync,realpathSync,readFileSync,writeFileSync,cpSync,renameSync,rmSync,existsSync,readdirSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { mountFixtureServices } from '../lib/native-fixture-mount.mjs';
import { mountInstalledStandard } from './lib/native-standard-preset.mjs';
import { loadPortableRepo } from '../lib/portable-repo.mjs';
import { say,call } from './lib/native-conversation-scenarios.mjs';
const app='/Applications/DeepSeek Harness.app/Contents';
if(!process.versions.electron) {
  const child=spawnSync(join(app,'MacOS/DeepSeek Harness'),['--expose-internals',fileURLToPath(import.meta.url)],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},stdio:'inherit',timeout:60000});
  if(child.error) throw child.error;process.exit(child.status ?? 1);
}
const require=createRequire(join(app,'Resources/app.asar/dsh/package.json'));
const load=name=>import(require.resolve('@deepseek-ai/'+name));
const {Context}=await load('cordis'),{LlmAdapter}=await load('dsh-llm');
const root=realpathSync(mkdtempSync(join(tmpdir(),'pet-portability-')));
let ctx,host,workspace,calls=0,program;
class Fixture extends LlmAdapter {async *stream(options) {calls++;yield* program(options);}}
const ok=result=>{assert.ok(result.ok,JSON.stringify(result.error));return result.value;};
const text=options=>options.messages.flatMap(m=>m.content.filter(b=>b.type==='text').map(b=>b.text)).join('\n');
async function until(probe) {for(let i=0;i<400;i++){if(probe()) return;await delay(20);}throw Error('Portable native turn did not settle');}
async function boot(repo,device,identity={companionId:'portable-fish',scopeId:'portable-owner',ownerActorId:'owner'}) {
  if(!existsSync(join(repo,'.chatpet/manifest.json'))) {
    const {createCore}=await import('../../dist/src/core/index.js');
    const initial=createCore({...identity,dataDir:join(device,'bootstrap-core'),displayName:'Fish',character:'Fixture'});
    try {
      const prefs=ok(await initial.services.preferences.read(initial.operator.request('seed-read'),{}));
      const saved=ok(await initial.services.preferences.save(initial.operator.request('seed-bind'),{expectedRevision:prefs.revision,conversation:prefs.conversation,workspace:{id:'bootstrap-repo',path:repo,title:'Repo'}}));
      ok(await initial.services.workspace.initialize(initial.operator.request('seed-init'),{expectedPreferencesRevision:saved.revision}));
    } finally {await initial.close();}
    cpSync(join(device,'bootstrap-core'),join(repo,'.chatpet/data/core'),{recursive:true});
  }
  ctx=new Context();ctx.baseUrl=pathToFileURL(join(app,'Resources/app.asar/dsh/index.js')).href;
  const mount=await mountFixtureServices(ctx,load,device);
  await mountInstalledStandard(ctx,require);
  for(const name of ['dsh-typert-registry','dsh-api-remote-access','dsh-api-gateway','dsh-session-query']) await mount(name);
  await mount('dsh-attachment-local',{dshHome:device});
  await ctx.plugin({apply(scope){scope.provide('fileUploads',{registerAgentResolver:()=>()=>{}});}});
  await mount('dsh-agent-default-model',{provider:'portable-fixture',model:'local'});
  await mount('dsh-api-session-controller',{nativeOpen:false});
  ctx.llm.registerAdapter(['portable-fixture'],new Fixture());
  await ctx.plugin(await import('../../dist/src/core/plugin.js'),{...identity,dataDir:join(repo,'.chatpet/data/core'),cwd:repo,displayName:'Fish',character:'Fixture',
    memory:{dataDir:join(repo,'.chatpet/data/memory'),python:resolve('.venv/bin/python')}});
  host=ctx.petCore;
  for(const part of ['memory','emotion','desktop']) await ctx.plugin(await import(`../dist/src/${part}/plugin.js`));
  workspace=await ctx.workspaceRegistry.create(repo,'Portable Repo');
  const prefs=ok(await host.services.preferences.read(host.operator.request('read-'+calls),{}));
  if(prefs.workspace && prefs.workspace.path!==repo) {
    const {settingsHandler}=await import('../../dist/src/console/settings.js');
    const response=await settingsHandler(()=>host,()=>ctx.workspaceRegistry,()=>ctx.petDesktop)('snapshot',{requestId:'rebind-snapshot',input:{}},new AbortController().signal,{principal:{kind:'owner'},signal:new AbortController().signal});
    assert.ok(response.ok,'Settings must remain usable while the old device path is absent: '+JSON.stringify(response));
    assert.equal(response.value.workspace.state,'unavailable');
  }
  const saved=ok(await host.services.preferences.save(host.operator.request('bind-'+calls),{expectedRevision:prefs.revision,conversation:prefs.conversation,
    workspace:{id:workspace.id,path:repo,title:'Portable Repo'}}));
  ok(await host.services.workspace.initialize(host.operator.request('init-'+calls),{expectedPreferencesRevision:saved.revision}));
  await ctx.petTranscripts.restore();
}
let success=false;
try {
  const original=join(root,'original-repo');mkdirSync(original);
  await boot(original,join(root,'device-a'));
  writeFileSync(join(original,'.chatpet/SOUL.md'),'# Portable Fish\n\nThe companion role carries portable-role-marker.');
  const oldWorkspace=workspace.id,stable=host.workspace.storageId();
  const previous=host.workspace.companionSettings();
  ok(await host.services.workspace.saveCompanion(host.operator.request('portable-settings'),{workspaceId:workspace.id,expectedSettings:previous,settings:{...previous,memorySummaryTurns:23}}));
  const chat=ctx.petDesktop.chat,opened=await chat.run('open',{}),address={workspaceId:workspace.id,sessionId:opened.sessionId};
  let step=0;
  const preference='Owner prefers the violet sketch.';
  program=async function*(options){
    assert.ok(text(options).includes('portable-role-marker'));
    if(step++===0) {yield* call('pet_memory_remember',{content:preference,evidence_quotes:['prefer the violet sketch']});return;}
    yield* say('Next time we will compare the sketch delivery dates.\n<pet-expression>{"mood":"轻快","reason":"一起选了草图"}');
  };
  await chat.run('send',{...address,text:'I prefer the violet sketch.',requestId:'preference'});await until(()=>!chat.snapshot().generating);
  const complete='Full original dialogue. '.repeat(100)+'portable-tail-marker';
  program=async function*(){yield* say(complete);};
  await chat.run('send',{...address,text:'Preserve the complete original reply.',requestId:'original'});await until(()=>!chat.snapshot().generating);
  await ctx.petTranscripts.flush();
  const originalEvents=ctx.agents.get(opened.sessionId).session.snapshotEvents();
  const {NativeTranscripts}=await import('../../dist/src/core/native/transcripts.js');
  const logDir=join(original,'.chatpet/data/core/native-sessions');
  const logPath=join(logDir,readdirSync(logDir).find(name=>/^[a-f0-9]{64}\.json$/.test(name)));
  const exact=readFileSync(logPath);const conflicting=JSON.parse(exact);
  conflicting.events.find(event=>event.type==='user/message' && event.data.source.kind==='user').data.content[0].text+=' conflicting copy';
  writeFileSync(logPath,JSON.stringify(conflicting));
  await assert.rejects(new NativeTranscripts(ctx,host).restore(),/conflicts/);
  assert.deepEqual(ctx.agents.get(opened.sessionId).session.snapshotEvents(),originalEvents);
  writeFileSync(logPath,exact);
  console.log(JSON.stringify({check:'native-portable-conflict',status:'passed',existingLogUnchanged:true}));
  const originalMessages=chat.snapshot().messages;
  const identity=JSON.parse(readFileSync(join(original,'.chatpet/data/core/native-sessions/identity.json'),'utf8'));
  assert.equal(identity.storageId,stable);
  await ctx.fiber.dispose();ctx=undefined;
  const retained=join(root,'retained-original');renameSync(original,retained);
  const moved=join(root,'new-device-repo');cpSync(retained,moved,{recursive:true});
  const callsBefore=calls,setup=loadPortableRepo(moved);
  assert.equal(setup.companionId,identity.companionId);assert.equal(setup.scopeId,identity.scopeId);
  await boot(moved,join(root,'device-b'),{companionId:setup.companionId,scopeId:setup.scopeId,ownerActorId:setup.ownerActorId});
  assert.notEqual(workspace.id,oldWorkspace);
  assert.equal(host.workspace.storageId(),stable);
  assert.equal(host.workspace.companionSettings().memorySummaryTurns,23);
  const resumed=ctx.petDesktop.chat,restored=await resumed.run('open',{});
  assert.equal(restored.sessionId,opened.sessionId);
  assert.deepEqual(restored.messages,originalMessages);
  const reader=await ctx.sessionPersistence.open(opened.sessionId,'read');
  try {assert.equal(reader.header.cwd,moved);const events=(await reader.read()).events;
    assert.deepEqual(events.slice(0,originalEvents.length),originalEvents);
    assert.ok(events.slice(originalEvents.length).every(event=>event.type==='session/end-seed'),'Only native resume lifecycle markers may be added during restore');}finally{await reader.close();}
  assert.equal(calls,callsBefore,'Restore must not replay or submit a model turn');
  assert.equal(ctx.petEmotion.current(workspace.id).mood,'轻快');
  program=async function*(options){
    const input=text(options);
    assert.ok(input.includes('portable-role-marker') && input.includes('portable-tail-marker'));
    assert.ok(input.includes(preference));yield* say('We can continue with the violet sketch and its delivery dates.');
  };
  await resumed.run('send',{workspaceId:workspace.id,sessionId:restored.sessionId,text:'Continue on this device.',requestId:'new-device'});
  await until(()=>!resumed.snapshot().generating);
  assert.ok(resumed.snapshot().messages.at(-1).text.includes('violet sketch'));
  const memory=await host.native.memory.connection.call('recall',{query:'violet',limit:8});
  assert.ok(memory.records.some(r=>r.memory.content===preference));
  await ctx.petTranscripts.flush();
  console.log(JSON.stringify({check:'native-cross-device-portability',status:'passed',originalEvents:originalEvents.length,originalMessages:originalMessages.length,
    restoredSameSession:true,identityAndSettings:true,memoryAndEmotion:true,restoreModelCalls:0,externalModels:0}));
  success=true;
} finally {
  await ctx?.fiber.dispose();
  if(success) rmSync(root,{recursive:true,force:true});else console.error('Preserved portability failure evidence: '+root);
}
