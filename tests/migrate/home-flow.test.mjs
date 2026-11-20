import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileHashes} from '../../scripts/lib/repo-storage.mjs';
import {content} from '../../scripts/fixtures/synthetic-companion.mjs';
import {settingsHandler} from '../../dist/src/console/settings.js';
import {resolveCompanionHome} from '../../dist/src/core/companion-foundation.js';
import {cordisFixture} from '../behavior-list/entries-lifecycle.test.mjs';
import {cli, fixture, read} from './helpers.mjs';

test('旧存档只开普通 DSH 聊天，离线迁移后恢复原 home、聊天和 Bank', {timeout:60000}, async t => {
  const f = await fixture(t,'current');
  const registryFile = join(f.home,'storages/workspace.json'), native = read(registryFile);
  const registry = {workspaces:Object.entries(native.tables.workspaces).map(([id, row]) => ({id,...row})),
    archived:native.global.archivedSessionIds};
  const directory = join(f.config.dataDir,'native-sessions');
  const saved = readdirSync(directory).filter(name => /^[a-f0-9]{64}\.json$/.test(name));
  assert.equal(saved.length,1);
  const file = join(directory,saved[0]), transcript = read(file);
  writeFileSync(file,JSON.stringify({...transcript,header:{...transcript.header,agentPreset:'standard'},events:[]})+'\n');
  const logic = () => {
    using db = new DatabaseSync(join(f.config.dataDir,'core.sqlite'),{readOnly:true});
    return ['records','requests','meta'].map(table => db.prepare('SELECT * FROM '+table+' ORDER BY 1,2').all());
  };
  const managedFiles = () => Object.entries(fileHashes(f.managed)).filter(([path]) => !/^data\/core\/core\.(?:lock|sqlite(?:-(?:wal|shm|journal))?)$/.test(path)).sort();
  const original = logic(), files = managedFiles();
  const life = join(f.data,'life/life.json'), mirror = readFileSync(life);
  const running = await cordisFixture(t,{existing:{...f,registry},order:[]});
  const core = running.core, id = running.id;
  const request = label => core.operator.request(label);
  const signal = new AbortController().signal, peer = {principal:{kind:'owner'},signal};
  const target = {...f.target, status:async()=> 'ok'}, other = {...target,id:'other'};
  const call = settingsHandler(()=>core,()=>({list:()=>[target,other],get:key=>key===id ? target : other}));
  const settings = (endpoint,input) => call(endpoint,{requestId:endpoint,input},signal,peer);
  const refused = result => {
    assert.equal(result.ok,false);
    assert.equal(result.error.code,'migration-required');
  };
  try {
    const snapshot = await settings('snapshot',{});
    assert.ok(snapshot.ok);
    assert.equal(snapshot.value.workspace.state,'migration-required');
    assert.equal(snapshot.value.workspace.migrationReason,'storage-version-outdated');
    assert.equal(snapshot.value.nativeConversationReady,false);
    const {preferences, identity, policy, editorScope} = snapshot.value;
    refused(await settings('initialize',{expectedPreferencesRevision:preferences.revision}));
    refused(await settings('preferences',{expectedRevision:preferences.revision,workspaceId:other.id,conversation:preferences.conversation}));
    refused(await settings('quiet',{expectedRevision:policy.revision,quiet:true}));
    refused(await core.services.workspace.initialize(request('bypass-initialize'),{expectedPreferencesRevision:preferences.revision}));
    refused(await core.services.preferences.save(request('bypass-rebind'),{expectedRevision:preferences.revision,workspace:other,conversation:preferences.conversation}));
    refused(await core.services.core.reviseIdentity(request('bypass-identity'),{expectedScope:editorScope,expectedRevision:identity.revision,
      displayName:'Blocked',character:'Blocked'}));
    refused(await core.services.workspace.saveProfile(request('bypass-profile'),{expectedScope:editorScope,expectedRevision:1,text:'Blocked'}));
    refused(await core.services.workspace.saveCompanion(request('bypass-companion'),{workspaceId:id,expectedSettings:{},settings:{}}));
    refused(await core.services.workspace.saveFoundation(request('bypass-foundation'),{workspaceId:id,expectedRevision:'synthetic',text:'Blocked'}));
    refused(await core.services.preferences.setQuiet(request('bypass-policy'),{expectedRevision:policy.revision,quiet:true}));
    await assert.rejects(core.native.memory.findForOwner(id,content.memory));
    await assert.rejects(resolveCompanionHome(running.ctx,core));
    for (const key of ['economy','body','life']) await running.load(key);
    await assert.rejects(running.body.snapshot(id));
    await assert.rejects(running.economy.snapshot(id));
    await assert.rejects(running.life.control(id,true));
    const turn = await running.input('Ordinary synthetic DSH chat','dsh-chat');
    assert.ok(!turn.system.includes(content.character));
    const reply = turn.agent.session.snapshotEvents().findLast(event => event.type === 'assistant/message');
    assert.equal(reply.data.message.content[0].text,'Synthetic reply');
  } finally { await running.stop(); }
  assert.deepEqual(logic(),original);
  assert.deepEqual(managedFiles(),files);

  await running.restart(() => {
    const migrated = cli(f,['run','--installation',f.installation,'--backup',join(f.out,'upgrade-backup')]);
    assert.equal(migrated.status,0,migrated.stderr);
    assert.deepEqual(JSON.parse(migrated.stdout).steps.map(step => step.state),['complete','complete']);
    assert.deepEqual(readFileSync(life),mirror);
  });
  assert.equal(running.core.workspace.status().state,'ready');
  const home = await resolveCompanionHome(running.ctx,running.core);
  assert.equal(home.id,transcript.header.id);
  assert.deepEqual(running.sessionCreateCalls,['dsh-chat']);
  const turn = await running.input('Synthetic chat after migration',home.id);
  assert.ok(turn.system.includes(content.character));
  assert.equal(turn.agent.session.snapshotEvents().findLast(event => event.type === 'assistant/message').data.message.content[0].text,'Synthetic reply');
  const bank = running.core.native.memory;
  assert.ok((await bank.findForOwner(id,content.memory)).items.some(row => row.id === f.memoryId));
  assert.ok(!(await bank.findForOwner(id,content.withdrawn)).items.some(row => row.id === f.withdrawnId));
});
