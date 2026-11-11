import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createCore } from '../src/core/index.js';
import { emotionFor } from '../src/emotion/plugin.js';
import type { Result } from '../src/contracts/common.js';

test('companion emotion survives neutral replies, ledger expiry and restart; withdrawn causes are retired', async () => {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'pet-emotion-'))), repo=join(root,'repo'); mkdirSync(repo);
  const config={dataDir:join(root,'core'),companionId:'fish',scopeId:'owner',ownerActorId:'owner',displayName:'Fish',character:'Fixture'};
  let host=createCore(config);
  const ok=<T>(r:Result<T>)=>{if(!r.ok) throw Error(r.error.message);return r.value;};
  try {
    const prefs=ok(await host.services.preferences.read(host.operator.request('prefs'),{}));
    const saved=ok(await host.services.preferences.save(host.operator.request('bind'),{expectedRevision:prefs.revision,workspace:{id:'repo',path:repo,title:'Repo'},conversation:prefs.conversation}));
    ok(await host.services.workspace.initialize(host.operator.request('init'),{expectedPreferencesRevision:saved.revision}));
    const emotion=emotionFor(host), events:unknown[]=[]; emotion.onExpression(e=>events.push(e));
    const turn={turn:1,workspaceId:'repo',path:repo,memoryIds:['cause'],memoryCalls:new Map()};
    emotion.complete('session',{...turn,intent:{mood:'平常'}});
    assert.equal(emotion.roomSnapshot('repo'), undefined, 'Earlier textual moods do not receive invented scores');
    emotion.complete('session',{...turn,intent:{mood:'愉快',reason:'共同完成了一次比较',roomMood:{mood:78,dims:{happy:40}},action:'spin'}});
    emotion.complete('session',{...turn,turn:2,intent:{action:'wave'}});
    assert.equal(emotion.current('repo')?.mood,'愉快');
    assert.equal((events.at(-1) as {mood:string}).mood,'愉快');
    assert.equal(emotion.roomSnapshot('repo')?.dims.happy,40);
    const settings=host.workspace.companionSettings();
    ok(await host.services.workspace.saveCompanion(host.operator.request('retention'),{workspaceId:'repo',expectedSettings:settings,settings:{...settings,recentMoodHours:0}}));
    assert.deepEqual(emotion.ledger('repo')!.read().moods,[]);
    assert.equal(emotion.current('repo')?.mood,'愉快','Current emotional state is separate from retained changes');
    await host.close();host=createCore(config);
    assert.equal(emotionFor(host).current('repo')?.reason,'共同完成了一次比较');
    assert.equal(emotionFor(host).roomSnapshot('repo')?.mood,78);
    emotionFor(host).retire('repo','unrelated'); assert.ok(emotionFor(host).current('repo'));
    emotionFor(host).retire('repo','cause'); assert.equal(emotionFor(host).current('repo'),undefined);
    assert.equal(emotionFor(host).roomSnapshot('repo'),undefined);
  } finally {await host.close();rmSync(root,{recursive:true,force:true});}
});
