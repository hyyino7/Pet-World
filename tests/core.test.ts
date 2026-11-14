import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,realpathSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCore,type CoreConfig} from '../src/core/index.js';
import type {Result} from '../src/contracts/common.js';

const value=<T>(result:Result<T>):T=>{if(!result.ok)throw Error(JSON.stringify(result.error));return result.value;};
function fixture(t:TestContext) {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'thin-core-code-'))),repo=join(root,'workspace');mkdirSync(repo);
  const config:CoreConfig={dataDir:join(repo,'.chatpet/data/core'),companionId:'fish',scopeId:'owner',ownerActorId:'human',displayName:'Xiaoxi',character:'A continuing companion.'};
  let host=createCore(config);
  t.after(async()=>{await host.close();rmSync(root,{recursive:true,force:true});});
  async function bind(id='workspace',path=repo) {
    const before=value(await host.services.preferences.read(host.operator.request('preferences:'+id),{}));
    const saved=value(await host.services.preferences.save(host.operator.request('bind:'+id),{expectedRevision:before.revision,
      workspace:{id,path,title:'Disposable workspace'},conversation:before.conversation}));
    return value(await host.services.workspace.initialize(host.operator.request('initialize:'+id),{expectedPreferencesRevision:saved.revision}));
  }
  return {root,repo,config,bind,get host(){return host;},async reopen(){await host.close();host=createCore(config);}};
}

test('Core exposes configuration and native services without the retired scheduler or business ports',async t=>{
  const f=fixture(t);
  assert.deepEqual(Object.keys(f.host.services).sort(),['core','preferences','workspace']);
  assert.deepEqual(Object.keys(f.host.services.core).sort(),['getIdentity','getPolicy','listCapabilities','reviseIdentity']);
  for(const removed of ['chat','drain','idle','connectModule','setHistoryGuard'])assert.equal(removed in f.host,false);
  assert.ok(f.host.native);assert.ok(f.host.records);
  const capabilities=value(await f.host.services.core.listCapabilities(f.host.operator.request('capabilities'),{}));
  for(const row of capabilities)assert.ok(!['core.activities','core.commitments','core.delivery','core.resources','core.maintenance','execution.native'].includes(row.id));
  for(const kind of ['activity','execution','contact','conversation','commitment'])assert.deepEqual(f.host.workspace.runtime.store.all(kind),[]);
});

test('identity CAS, immutable request replay and persisted identity remain owned by Core',async t=>{
  const f=fixture(t),context=f.host.operator.request('rename'),input={expectedScope:f.host.workspace.editScope(),expectedRevision:1,displayName:'Fish',character:'Persistent identity.'};
  assert.equal(value(await f.host.services.core.reviseIdentity(context,input)).revision,2);
  assert.equal(value(await f.host.services.core.reviseIdentity(context,input)).revision,2);
  const conflict=await f.host.services.core.reviseIdentity(context,{...input,displayName:'Other'});assert.ok(!conflict.ok);assert.equal(conflict.error.code,'CONFLICT');
  const stale=await f.host.services.core.reviseIdentity(f.host.operator.request('stale'),input);assert.ok(!stale.ok);assert.equal(stale.error.code,'STALE_REVISION');
  await f.reopen();assert.equal(value(await f.host.services.core.getIdentity(f.host.operator.request('read'),{})).displayName,'Fish');
  assert.throws(()=>createCore(f.config),/live owner/);
});

test('forged, serialized and foreign owner contexts cannot read or change Core settings',async t=>{
  const f=fixture(t),issued=f.host.operator.request('issued');
  for(const context of [{...issued},JSON.parse(JSON.stringify(issued)),{...issued,scopeId:'foreign'},{}]) {
    const result=await f.host.services.core.getIdentity(context as never,{});assert.ok(!result.ok);assert.equal(result.error.code,'UNAUTHORIZED');
  }
  const changed=await f.host.services.core.reviseIdentity({...issued,actor:{kind:'owner',id:'human'}},{expectedScope:f.host.workspace.editScope(),expectedRevision:1,displayName:'Forged',character:'Forged'});
  assert.ok(!changed.ok);assert.equal(changed.error.code,'UNAUTHORIZED');
  assert.equal(value(await f.host.services.core.getIdentity(issued,{})).displayName,'Xiaoxi');
});

test('public workspace initialization, persona edits and quiet settings survive a Core reopen',async t=>{
  const f=fixture(t);assert.equal((await f.bind()).state,'ready');
  const identity=value(await f.host.services.core.getIdentity(f.host.operator.request('identity'),{}));
  value(await f.host.services.core.reviseIdentity(f.host.operator.request('persona'),{expectedScope:f.host.workspace.editScope(),expectedRevision:identity.revision,displayName:'小汐',character:'One shared companion.'}));
  const policy=value(await f.host.services.core.getPolicy(f.host.operator.request('policy'),{}));
  value(await f.host.services.preferences.setQuiet(f.host.operator.request('quiet'),{expectedRevision:policy.revision,quiet:true}));
  assert.equal(readFileSync(join(f.repo,'.chatpet/SOUL.md'),'utf8'),'# 小汐\n\nOne shared companion.');
  await f.reopen();assert.equal(f.host.workspace.status().state,'ready');
  assert.equal(value(await f.host.services.core.getIdentity(f.host.operator.request('identity-read'),{})).displayName,'小汐');
  assert.equal(value(await f.host.services.core.getPolicy(f.host.operator.request('policy-read'),{})).quiet,true);
});

test('historical scheduler rows remain inert data and do not block current workspace binding',async t=>{
  const f=fixture(t);await f.bind();const store=f.host.workspace.runtime.store;
  const old={activityId:'legacy-activity',receipt:{state:'running',revision:7},inputMessageId:'old-input'};
  const contact={intent:{contactId:'legacy-contact'},outcome:{state:'attempting',attemptId:'old-attempt'},revision:4};
  store.put('activity','legacy-activity',old);store.put('contact','legacy-contact',contact);
  store.put('commitment','legacy-matter',{commitmentId:'legacy-matter',state:'in_progress'});
  store.put('execution','legacy-execution',{executionId:'legacy-execution',activityId:'legacy-activity',receipt:{state:'running'},binding:{hostSessionId:'old-session'}});
  store.put('execution-dependencies','legacy-execution',['old-source-that-must-not-be-admitted']);
  const quiescence={quiescenceId:'legacy-stop',module:'core',admissionClosed:true,stateRevision:null,unresolvedOperationIds:['legacy-activity']};
  store.setMeta('history.guardRequired',true);store.setMeta('quiescence',quiescence);
  const kinds=['activity','contact','commitment','execution','execution-dependencies'];
  const before=kinds.map(kind=>[kind,store.all(kind)]);
  await f.reopen();assert.deepEqual(kinds.map(kind=>[kind,f.host.workspace.runtime.store.all(kind)]),before);
  assert.equal(f.host.workspace.runtime.store.meta('history.guardRequired'),true);
  assert.deepEqual(f.host.workspace.runtime.store.meta('quiescence'),quiescence);
  assert.equal((await f.bind('rebound-native-id')).state,'ready');
  const policy=value(await f.host.services.core.getPolicy(f.host.operator.request('legacy.quiet.read'),{}));
  assert.equal(value(await f.host.services.preferences.setQuiet(f.host.operator.request('legacy.quiet.save'),{expectedRevision:policy.revision,quiet:true})).quiet,true);
  assert.deepEqual(f.host.workspace.runtime.store.get('activity','legacy-activity'),old);
  assert.deepEqual(f.host.workspace.runtime.store.get('contact','legacy-contact'),contact);
  assert.deepEqual(kinds.map(kind=>[kind,f.host.workspace.runtime.store.all(kind)]),before,'Configuration changes neither execute nor rewrite retired records');
  assert.deepEqual(f.host.workspace.runtime.store.meta('quiescence'),quiescence,'An obsolete stop marker is retained as data rather than reused as admission authority');
  assert.equal('drain' in f.host,false,'Old data does not restore an execution entry');
});

test('cancelled, malformed and expired configuration requests have no write effects',async t=>{
  const f=fixture(t),initial=value(await f.host.services.core.getIdentity(f.host.operator.request('initial'),{}));
  const input={expectedScope:f.host.workspace.editScope(),expectedRevision:initial.revision,displayName:'Changed',character:'Changed'};
  const cancelled=await f.host.services.core.reviseIdentity(f.host.operator.request('cancelled'),input,{signal:AbortSignal.abort()});
  assert.ok(!cancelled.ok);assert.equal(cancelled.error.code,'CANCELLED');
  const expired=await f.host.services.core.reviseIdentity(f.host.operator.request('expired'),input,{deadline:'2000-01-01T00:00:00Z'});
  assert.ok(!expired.ok);assert.equal(expired.error.code,'TIMED_OUT');
  const malformed=await f.host.services.core.reviseIdentity(f.host.operator.request('malformed'),{...input,displayName:123} as never);assert.ok(!malformed.ok);
  assert.deepEqual(value(await f.host.services.core.getIdentity(f.host.operator.request('after'),{})),initial);
});

test('retired portable history and cold-memory settings are read compatibly without returning or rewriting them as current choices',async t=>{
  const f=fixture(t);await f.bind();const file=join(f.repo,'.chatpet/core.json');
  const stored=JSON.parse(readFileSync(file,'utf8'));
  stored.conversation={...f.host.workspace.runtime.conversation,maxHistoryMessages:32};
  stored.companion={...f.host.workspace.companionConfiguration(),memoryColdHours:24};
  const legacy=JSON.stringify(stored);writeFileSync(file,legacy);
  await f.reopen();assert.equal(f.host.workspace.status().state,'ready');
  const preferences=value(await f.host.services.preferences.read(f.host.operator.request('compat.read'),{}));
  const companion=f.host.workspace.companionConfiguration();
  assert.equal('maxHistoryMessages' in preferences.conversation,false);assert.equal('memoryColdHours' in companion,false);
  assert.equal('memoryColdHours' in f.host.workspace.companionSettings(),false);
  assert.equal(readFileSync(file,'utf8'),legacy,'Compatibility reads do not rewrite original portable settings');
  const oldInput=await f.host.services.preferences.save(f.host.operator.request('compat.reject-old-control'),{
    workspace:preferences.workspace,expectedRevision:preferences.revision,conversation:{...preferences.conversation,maxHistoryMessages:32}} as never);
  assert.ok(!oldInput.ok,'The retired history control is not a current preference API option');
  value(await f.host.services.preferences.save(f.host.operator.request('compat.current-preferences'),{
    expectedRevision:preferences.revision,workspace:preferences.workspace,conversation:preferences.conversation}));
  value(await f.host.services.workspace.saveCompanion(f.host.operator.request('compat.current-companion'),{
    workspaceId:'workspace',expectedSettings:f.host.workspace.companionConfiguration(),settings:{...companion,desktopReplyBubble:true}}));
  const current=JSON.parse(readFileSync(file,'utf8'));
  assert.equal('maxHistoryMessages' in current.conversation,false);assert.equal('memoryColdHours' in current.companion,false);
  assert.equal(current.companion.desktopReplyBubble,true);
});
