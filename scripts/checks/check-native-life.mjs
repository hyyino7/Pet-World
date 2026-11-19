// Real installed DSH services and Mnemosyne, with a local scripted model only.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, realpathSync, readFileSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {mountFixtureServices} from '../lib/native-fixture-mount.mjs';
import {mountInstalledStandard} from './lib/native-standard-preset.mjs';
import {call, say} from './lib/native-conversation-scenarios.mjs';
import {checkLifeHistory} from '../lib/check-life-history.mjs';
import {checkLifeReview} from '../lib/check-life-review.mjs';
const app = '/Applications/DeepSeek Harness.app/Contents';
if (!process.versions.electron) {
  const child = spawnSync(join(app, 'MacOS/DeepSeek Harness'), ['--expose-internals', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {env:{...process.env, ELECTRON_RUN_AS_NODE:'1'}, stdio:'inherit', timeout:110000});
  if (child.error) throw child.error;
  process.exit(child.status ?? 1);
}
const root = realpathSync(mkdtempSync(join(tmpdir(), 'chatpet-native-life-')));
const require = createRequire(join(app, 'Resources/app.asar/dsh/package.json'));
const load = name => import(require.resolve('@deepseek-ai/' + name));
const {Context} = await load('cordis');
const {LlmAdapter} = await load('dsh-llm');
const ctx = new Context();
ctx.baseUrl = pathToFileURL(join(app, 'Resources/app.asar/dsh/index.js')).href;
const unwrap = r => { assert.ok(r.ok, JSON.stringify(r.error)); return r.value; };
async function until(read, label, timeout = 12000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {const value = await read(); if (value) return value; await delay(30);}
  console.error('Native Life failure', calls, JSON.stringify(ctx.agents.list().map(a=>({status:a.status,events:a.session.snapshotEvents().slice(-4)}))));throw Error('Timed out: ' + label);
}
let calls = 0, phase = 0, bodyObserved = false, stall = false, program;
class Fixture extends LlmAdapter {
  async *stream(options) {
    calls++;
    if (program) {yield* program(options); return;}
    if (stall) {await delay(10000, undefined, {signal:options.signal});yield* say('Must be cancelled');return;}
    const text = options.messages.flatMap(m=>m.content.filter(b=>b.type==='text').map(b=>b.text)).join('\n');
    bodyObserved ||= text.includes('"type":"water"');
    if (phase++ % 3 === 0) yield* call('plan_next', {after_minutes:2, note:'喝水后休息一会儿'});
    else if (phase % 3 === 2) yield* call('reach_out', {text:'我喝过水啦，正在休息。'});
    else yield* say('我先在家里歇一会儿。');
  }
}
let lifeComponent;
try {
  const mount = await mountFixtureServices(ctx, load, root);
  await mountInstalledStandard(ctx, require);
  for(const name of ['dsh-typert-registry','dsh-api-remote-access','dsh-api-gateway','dsh-session-query']) await mount(name);
  await mount('dsh-attachment-local', {dshHome:root});
  await ctx.plugin({apply(scope){scope.provide('fileUploads',{registerAgentResolver:()=>()=>{}});}});
  await mount('dsh-agent-default-model', {provider:'life-fixture', model:'local'});
  await mount('dsh-api-session-controller', {nativeOpen:false});
  ctx.llm.registerAdapter(['life-fixture'], new Fixture());
  await ctx.plugin(await import('../../dist/src/core/plugin.js'), {dataDir:join(root,'.chatpet/data/core'), cwd:root,
    companionId:'fish', scopeId:'fixture', ownerActorId:'owner', displayName:'大肥鱼', character:'生活测试',
    memory:{dataDir:join(root,'.chatpet/data/memory'), python:resolve('.venv/bin/python')}});
  await ctx.plugin(await import('../../dist/src/memory/plugin.js'));
  const host = ctx.petCore, request = id => host.operator.request('life-check-' + id);
  const workspace = await ctx.workspaceRegistry.create(root, 'Disposable Life');
  const prefs = unwrap(await host.services.preferences.read(request('read'), {}));
  const saved = unwrap(await host.services.preferences.save(request('bind'), {expectedRevision:prefs.revision, conversation:prefs.conversation,
    workspace:{id:workspace.id, path:workspace.path, title:workspace.title}}));
  unwrap(await host.services.workspace.initialize(request('init'), {expectedPreferencesRevision:saved.revision}));
  await ctx.plugin(await import('../../dist/src/living/body/plugin.js'));
  const bubbles = [];
  await ctx.plugin({apply(scope){scope.provide('petDesktop',{status:()=>({running:true}),presentLife:text=>bubbles.push(text)});}});
  const mountLife = async () => {lifeComponent = await ctx.plugin(await import('../../dist/src/living/plan/plugin.js'));return ctx.petLife;};
  let life = await mountLife();
  assert.deepEqual(host.native.sourceTable.policyRows().map(row=>row.row),[1,2,3,4]);
  if (!process.argv.includes('--review-only')) {
  assert.equal((await life.snapshot(workspace.id)).enabled, false);
  assert.equal(calls, 0);
  await life.control(workspace.id, true);
  const homeId = (await life.snapshot(workspace.id)).life.homeSessionId;
  assert.ok(workspace.sessionIds.includes(homeId), 'Home belongs to bound native workspace');
  await until(()=> calls >= 3 && ctx.agents.get(homeId)?.status === 'idle', 'first home turn');
  assert.equal(bubbles.length, 1);
  const result = await life.act(workspace.id, 'water');
  assert.equal(result.event.type, 'water');
  const homeFile = join(root,'.chatpet/data/behavior/home.json');
  const counts = JSON.parse(readFileSync(homeFile)).counts.water;
  assert.equal(counts, 1);
  const policy = unwrap(await host.services.core.getPolicy(request('quiet-read'), {}));
  unwrap(await host.services.preferences.setQuiet(request('quiet'), {expectedRevision:policy.revision, quiet:true}));
  // Exercise World's actual short alarm and its durable wake confirmation.
  life.runtime.planNext({at:new Date(Date.now()+1000).toISOString()}, '再喝水');
  await until(()=> calls >= 6 && ctx.agents.get(homeId)?.status === 'idle', 'timed home wake');
  assert.ok(bodyObserved, 'Native prompt reads the exact saved original activity');
  assert.equal(bubbles.length, 1, 'Quiet mode suppresses reach_out');
  const snap = await life.snapshot(workspace.id);
  assert.ok(snap.activity.some(row=>row.tool==='plan_next' && row.status==='ok'));
  assert.ok(snap.activity.some(row=>row.tool==='reach_out' && row.status==='error'));
  const sources = host.workspace.runtime.store.all('source');
  assert.ok(sources.some(s=>s.origin==='virtual_action'));
  assert.ok(!sources.some(s=>s.origin==='owner_statement'), 'Autonomous text is never attributed to the owner');
  await life.control(workspace.id, false);
  const before = calls;
  await delay(1400); assert.equal(calls, before);
  const paused = readFileSync(homeFile,'utf8');
  await lifeComponent.dispose();
  assert.deepEqual(host.native.sourceTable.policyRows().map(row=>row.row),[1,2]);
  life = await mountLife();
  assert.equal((await life.snapshot(workspace.id)).enabled, false);
  assert.equal(readFileSync(homeFile,'utf8'), paused, 'Paused state does not advance on reload');
  await life.control(workspace.id, true);
  assert.equal((await life.snapshot(workspace.id)).life.homeSessionId, homeId, 'Existing native home survives enable/restart');
  assert.equal(JSON.parse(readFileSync(homeFile)).counts.water, counts);
  // A pending plan is preserved; startup does not add an immediate return greeting.
  await delay(200); assert.equal(calls, before);
  await lifeComponent.dispose();
  life = await mountLife();
  await until(()=>life.running(), 'enabled state restored');
  assert.equal((await life.snapshot(workspace.id)).life.homeSessionId, homeId);
  assert.equal(calls, before);
  assert.equal(host.workspace.runtime.store.get('memory-batch', homeId).turns, 2, 'Life shares the existing native Memory batch');
  stall=true;void life.runtime.deliver();
  await until(()=>calls===before+1 && ctx.agents.get(homeId)?.status==='running', 'in-flight Life step');
  await life.control(workspace.id, false);
  await until(()=>ctx.agents.get(homeId)?.status==='idle', 'Life step cancellation');
  assert.equal(ctx.agents.get(homeId).session.snapshotEvents().filter(e=>e.type==='turn/end').at(-1).data.reason.kind, 'aborted');
  console.log(JSON.stringify({ok:true, calls, bubbles:bubbles.length, homeReused:true, persistedWaterCount:counts, quiet:true, backgroundOrigin:'virtual_action', activeStop:true, memoryBatchShared:true, paidCalls:0}));
  }
  if(!process.argv.includes('--review-only'))await checkLifeHistory({ctx,host,workspace,life,until,load,setProgram:fn=>{program=fn;}});
  await checkLifeReview({ctx, host, workspace, root, life, until, setProgram: fn => { program = fn; }});
} finally {await ctx.fiber.dispose();rmSync(root,{recursive:true,force:true});}
