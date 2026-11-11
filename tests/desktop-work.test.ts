import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setImmediate } from 'node:timers/promises';
import type { Context } from '@deepseek-ai/cordis';
import type { Result } from '../src/contracts/common.js';
import { createCore } from '../src/core/index.js';
import { registerDesktop, desktopFor } from '../src/desktop/index.js';
import type { NativeEvent, NativeSession } from '../src/desktop/conversation.js';

test('the bound Desktop starts the work chain only after its saved threshold and clears it on stop', async t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'chatpet-work-clock-')));
  const repo = join(root, 'workspace'), renderer = join(root, 'record-frames'), output = join(root, 'frames.jsonl');
  mkdirSync(repo);
  // This renderer exercises Desktop's real child stdin/stdout protocol without opening a GUI.
  writeFileSync(renderer, `#!/usr/bin/env node
const fs = require('node:fs');
require('node:readline').createInterface({input:process.stdin}).on('line', line => {
  fs.appendFileSync(${JSON.stringify(output)}, line + '\\n');
});
console.log(JSON.stringify({type:'ready'}));
`, { mode: 0o700 });
  const original = process.env.DSH_CHATBOT_ELECTRON_PATH;
  process.env.DSH_CHATBOT_ELECTRON_PATH = renderer;
  const host = createCore({ dataDir: join(root, 'core'), companionId:'fish', scopeId:'test', ownerActorId:'owner',
    displayName:'Fish', character:'A test companion.' });
  const ok = <T>(r: Result<T>) => { if (!r.ok) assert.fail(r.error.message); return r.value; };
  const request = (id: string) => host.operator.request(id);
  const session: NativeSession = { id:'chat', header:{cwd:repo}, snapshotEvents:()=>[] };
  let publish!: (s: NativeSession, e: NativeEvent) => void;
  let notify!: (operation: string) => void;
  let dispose!: () => void;
  const ctx = {
    get(key: string) {
      if (key === 'workspaceRegistry') return { get: () => ({ path:repo, sessionIds:[session.id] }) };
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
    const desk = desktopFor(host);
    await desk.start();
    t.mock.timers.enable({ apis:['Date','setTimeout'], now:Date.now() });
    let turn = 0, seq = 0, flushes = 0, offset = 0;
    const event = (type: string, reason?: string) => {
      if(type === 'turn/start') turn++;
      publish(session, { type, time:Date.now(), seq:++seq, data:{turn, ...(reason ? {reason:{kind:reason}} : {})} });
    };
    const capture = async () => {
      await desk.start(); // On a ready helper this sends a FIFO 'show' message after all pending frames.
      flushes++;
      for(let i=0;i<10000;i++) {
        const lines = existsSync(output) ? readFileSync(output,'utf8').trim().split('\n').filter(Boolean) : [];
        const frames = lines.map(line=>JSON.parse(line) as {type:string;value:{stage:string}|null});
        if(frames.filter(frame=>frame.type==='show').length >= flushes) {
          const next = frames.slice(offset); offset = frames.length;
          return next.filter(frame=>frame.type==='work').map(frame=>frame.value?.stage ?? null);
        }
        await setImmediate();
      }
      throw Error('Timed out waiting for recorder acknowledgement');
    };

    event('turn/start'); t.mock.timers.tick(2500); event('tool/call');
    t.mock.timers.tick(2500); event('turn/end','completed');
    event('turn/start'); t.mock.timers.tick(4999); event('turn/end','error');
    assert.deepEqual((await capture()).filter(Boolean), []);

    event('turn/start'); t.mock.timers.tick(3000); event('tool/call'); t.mock.timers.tick(2000);
    assert.deepEqual((await capture()).filter(Boolean), []);
    t.mock.timers.tick(1); assert.deepEqual(await capture(), ['working']);
    event('tool/result'); event('turn/end','aborted');
    assert.deepEqual(await capture(), ['result', null]);

    const previous = host.workspace.companionSettings();
    ok(await host.services.workspace.saveCompanion(request('delay-ten'), {
      workspaceId:'bound',expectedSettings:previous,settings:{...previous,workAnimationDelaySeconds:10} }));
    event('turn/start'); t.mock.timers.tick(7000); event('turn/end','completed');
    assert.deepEqual((await capture()).filter(Boolean), []);
    event('turn/start'); t.mock.timers.tick(10001); event('turn/end','completed');
    assert.deepEqual((await capture()).filter(Boolean), ['thinking','success']);
  } finally {
    t.mock.timers.reset();
    dispose?.();
    if(original===undefined) delete process.env.DSH_CHATBOT_ELECTRON_PATH; else process.env.DSH_CHATBOT_ELECTRON_PATH=original;
    await host.close(); rmSync(root,{recursive:true,force:true});
  }
});
