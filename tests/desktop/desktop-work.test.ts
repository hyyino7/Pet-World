import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Context } from '@deepseek-ai/cordis';
import type { Result } from '../../src/contracts/common.js';
import { createCore } from '../../src/core/index.js';
import { registerDesktop, desktopFor } from '../../src/desktop/index.js';
import type { NativeEvent, NativeSession } from '../../src/desktop/conversation.js';

test('the bound Desktop starts the work chain only after its saved threshold and clears it on stop', async t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'chatpet-work-clock-')));
  const repo = join(root, 'workspace');mkdirSync(repo);
  let running=false,shows=0,hides=0;
  const presentation={
    async show(){shows++;running=true;},
    async hide(){hides++;running=false;},
    bodyStatus:()=>({running}),
  };
  const host = createCore({ dataDir: join(repo, '.chatpet/data/core'), companionId:'fish', scopeId:'test', ownerActorId:'owner',
    displayName:'Fish', character:'A test companion.' });
  const ok = <T>(r: Result<T>) => { if (!r.ok) assert.fail(r.error.message); return r.value; };
  const request = (id: string) => host.operator.request(id);
  const session: NativeSession = { id:'chat', header:{cwd:repo}, snapshotEvents:()=>[] };
  let publish!: (s: NativeSession, e: NativeEvent) => void;
  let notify!: (operation: string) => void;
  let dispose!: () => void;
  let unsubscribe:(()=>void)|undefined;
  const ctx = {
    get(key: string) {
      if (key === 'workspaceRegistry') return { get: () => ({ path:repo, sessionIds:[session.id] }) };
      if (key === 'petPlatform') return presentation;
    },
    on(name: string, handler: typeof publish | typeof notify) {
      if (name === 'session/event') publish = handler as typeof publish;
      if (name === 'pet/core.changed') notify = handler as typeof notify;
      return () => {};
    },
    effect(fn: () => () => void) { dispose = fn(); },
  };
  try {
    const prefs = ok(await host.services.preferences.read(request('prefs'), {}));
    const saved = ok(await host.services.preferences.save(request('bind'), { expectedRevision:prefs.revision,
      workspace:{id:'bound',path:repo,title:'test'}, conversation:prefs.conversation }));
    ok(await host.services.workspace.initialize(request('init'), {expectedPreferencesRevision:saved.revision}));
    registerDesktop(ctx as unknown as Context, host);
    host.observe(operation => notify(operation));
    const desk = desktopFor(host),workFrames:(string|null)[]=[];
    // Normal bodies consume this public presentation boundary. Real host
    // consumption, media decoding and playback are covered by platform cases.
    unsubscribe=desk.onPresentation((type,value)=>{
      if(type==='work')workFrames.push((value as {stage:string}|null)?.stage ?? null);
    },()=>running);
    await desk.start();
    assert.equal(running,true);assert.equal(shows,1);workFrames.length=0;
    t.mock.timers.enable({ apis:['Date','setTimeout'], now:Date.now() });
    let turn = 0, seq = 0;
    const event = (type: string, reason?: string) => {
      if(type === 'turn/start') turn++;
      publish(session, { type, time:Date.now(), seq:++seq, data:{turn, ...(reason ? {reason:{kind:reason}} : {})} });
    };
    const capture = () => workFrames.splice(0);

    event('turn/start'); t.mock.timers.tick(2500); event('tool/call');
    t.mock.timers.tick(2500); event('turn/end','completed');
    event('turn/start'); t.mock.timers.tick(4999); event('turn/end','error');
    assert.deepEqual(capture().filter(Boolean), []);

    event('turn/start'); t.mock.timers.tick(3000); event('tool/call'); t.mock.timers.tick(2000);
    assert.deepEqual(capture().filter(Boolean), []);
    t.mock.timers.tick(1); assert.deepEqual(capture(), ['working']);
    event('tool/result'); event('turn/end','aborted');
    assert.deepEqual(capture(), ['result', null]);

    const previous = host.workspace.companionConfiguration();
    ok(await host.services.workspace.saveCompanion(request('delay-ten'), {
      workspaceId:'bound',expectedSettings:previous,settings:{...previous,workAnimationDelaySeconds:10} }));
    event('turn/start'); t.mock.timers.tick(7000); event('turn/end','completed');
    assert.deepEqual(capture().filter(Boolean), []);
    event('turn/start'); t.mock.timers.tick(10001); event('turn/end','completed');
    assert.deepEqual(capture().filter(Boolean), ['thinking','success']);

    event('turn/start');t.mock.timers.tick(10_001);
    assert.deepEqual(capture().filter(Boolean),['thinking']);
    await desk.closeWindow();assert.equal(running,false);assert.equal(hides,1);
    await desk.start();assert.equal(running,true);assert.equal(shows,2);
    assert.deepEqual(capture().filter(Boolean),['thinking'],'show resumes the same native work');
    event('turn/end','aborted');assert.deepEqual(capture(),[null]);
  } finally {
    t.mock.timers.reset();unsubscribe?.();dispose?.();
    await host.close(); rmSync(root,{recursive:true,force:true});
  }
});
