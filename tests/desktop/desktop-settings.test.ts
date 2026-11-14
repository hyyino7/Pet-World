import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,realpathSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createCore} from '../../src/core/index.js';
import {Desktop} from '../../src/desktop/index.js';
import type {Result} from '../../src/contracts/common.js';

const value=<T>(result:Result<T>):T=>{if(!result.ok)throw Error(result.error.message);return result.value;};

/** Exercise the real Desktop preference entry and portable Core configuration;
 * only the external PetPlatform presentation is a fake. No windows are opened. */
async function fixture(t:TestContext) {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'desktop-settings-code-'))),repo=join(root,'workspace');mkdirSync(repo);
  const config={dataDir:join(repo,'.chatpet/data/core'),companionId:'fish',scopeId:'owner',ownerActorId:'owner',displayName:'Fixture',character:'Fixture'};
  let host=createCore(config);
  t.after(async()=>{await host.close();rmSync(root,{recursive:true,force:true});});
  const original=value(await host.services.preferences.read(host.operator.request('read'),{}));
  const saved=value(await host.services.preferences.save(host.operator.request('bind'),{expectedRevision:original.revision,
    workspace:{id:'world',path:repo,title:'Fixture workspace'},conversation:original.conversation}));
  value(await host.services.workspace.initialize(host.operator.request('initialize'),{expectedPreferencesRevision:saved.revision}));
  const requests:{key:string;value:boolean}[]=[];
  const presentation={async savePreference(key:string,value:boolean){requests.push({key,value});return {...host.workspace.companionSettings(),[key]:value};}};
  const native={getPresentation:()=>presentation} as unknown as ConstructorParameters<typeof Desktop>[0];
  return {get host(){return host;},desktop:new Desktop(native,host),requests,
    async reopen(){await host.close();host=createCore(config);return new Desktop(native,host);}};
}

test('Desktop reply bubble saves a raw configuration CAS without persisting unrelated fallback defaults',async t=>{
  const f=await fixture(t),before=f.host.workspace.companionConfiguration();
  assert.ok(Object.values(before).every(value=>value===null));
  await f.desktop.savePreference({key:'desktopReplyBubble',value:true});
  assert.deepEqual(f.host.workspace.companionConfiguration(),{...before,desktopReplyBubble:true});
  assert.equal(f.host.workspace.companionSettings().desktopReplyBubble,true);
  assert.deepEqual(f.requests,[],'Core-owned reply bubbles do not change platform appearance');
});

test('Desktop reply bubble retries and reverse toggles survive Core reopen with other saved choices intact',async t=>{
  const f=await fixture(t),before=f.host.workspace.companionConfiguration();
  value(await f.host.services.workspace.saveCompanion(f.host.operator.request('other-setting'),{
    workspaceId:'world',expectedSettings:before,settings:{...before,memorySummaryIdleMinutes:12}}));
  const preserved=f.host.workspace.companionConfiguration();
  await f.desktop.savePreference({key:'desktopReplyBubble',value:true});
  await f.desktop.savePreference({key:'desktopReplyBubble',value:true});
  assert.deepEqual(f.host.workspace.companionConfiguration(),{...preserved,desktopReplyBubble:true});
  const reopened=await f.reopen();
  assert.equal(f.host.workspace.companionSettings().desktopReplyBubble,true);
  await reopened.savePreference({key:'desktopReplyBubble',value:false});
  assert.deepEqual(f.host.workspace.companionConfiguration(),{...preserved,desktopReplyBubble:false});
});

test('Desktop appearance preferences still delegate to PetPlatform and reject invalid input',async t=>{
  const f=await fixture(t),before=f.host.workspace.companionConfiguration();
  for(const key of ['desktopClickSound','desktopWhisperEnabled','desktopBalanceEnabled','desktopFixed','desktopConfineToScreen'])
    await f.desktop.savePreference({key,value:true});
  assert.deepEqual(f.requests.map(row=>row.key),['desktopClickSound','desktopWhisperEnabled','desktopBalanceEnabled','desktopFixed','desktopConfineToScreen']);
  assert.deepEqual(f.host.workspace.companionConfiguration(),before,'The platform remains the appearance writer');
  await assert.rejects(f.desktop.savePreference({key:'unknown',value:true}),/无效/);
  await assert.rejects(f.desktop.savePreference({key:'desktopReplyBubble',value:'true'}),/无效/);
  assert.equal(f.requests.length,5);
});
