import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Context } from '@deepseek-ai/cordis';
import { createCore } from '../src/core/index.js';
import { installMemoryBatch } from '../src/memory/batch.js';

test('idle batching retains a committed native summary for retry without a second inference', async t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'pet-batch-'))), repo = join(root, 'repo'); mkdirSync(repo);
  const host = createCore({dataDir:join(root,'core'),companionId:'fish',scopeId:'owner',ownerActorId:'owner',displayName:'Fish',character:'Fixture'});
  const unwrap = <T>(r: {ok:true;value:T}|{ok:false;error:unknown}) => { if(!r.ok) throw Error(JSON.stringify(r.error)); return r.value; };
  const prefs = unwrap(await host.services.preferences.read(host.operator.request('prefs'),{}));
  const saved = unwrap(await host.services.preferences.save(host.operator.request('bind'),{expectedRevision:prefs.revision,workspace:{id:'repo',path:repo,title:'Repo'},conversation:prefs.conversation}));
  unwrap(await host.services.workspace.initialize(host.operator.request('init'),{expectedPreferencesRevision:saved.revision}));
  const previous = host.workspace.companionSettings();
  unwrap(await host.services.workspace.saveCompanion(host.operator.request('settings'),{workspaceId:'repo',expectedSettings:previous,
    settings:{...previous,memorySummaryTurns:10,memorySummaryIdleMinutes:1,memorySummaryMinimumMinutes:0}}));
  let event!: (session: unknown, event: unknown) => void, dispose!: () => Promise<void>;
  let inferences = 0, writes = 0;
  const session = {id:'session',header:{cwd:repo},snapshotEvents:()=>[]};
  const engine = { async compactNow() { inferences++; return {summarySeq:42,summary:[{type:'text',text:'The unfinished plan remains pending.'}]}; } };
  const agent = {session,status:'idle'};
  const ctx = {get(name:string) {
    if(name==='workspaceRegistry') return {get:()=>({path:repo,sessionIds:['session']})};
    if(name==='agentPresets') return {serviceFor:()=>engine};
  }, agents:{get:()=>agent}, on(_name:string,fn:typeof event) {event=fn;},effect(fn:()=>typeof dispose) {dispose=fn();},logger:()=>({warn(){}})};
  host.native.memory = {prepare:async()=>{},capture:async()=>{},close:async()=>{},connection:{call:async()=>{
    if(++writes===1) throw Error('Temporary provider outage');
    return {};
  }}} as unknown as NonNullable<typeof host.native.memory>;
  try {
    t.mock.timers.enable({apis:['Date','setInterval'],now:1_800_000_000_000});
    host.workspace.runtime.store.put('native-session-sources','session',['owner-source']);
    installMemoryBatch(ctx as unknown as Context,host);
    event(session,{type:'turn/end',time:Date.now(),data:{turn:1,reason:{kind:'completed'}}});
    t.mock.timers.tick(59_000); await new Promise(resolve=>setImmediate(resolve));
    assert.equal(inferences,0);
    t.mock.timers.tick(1000); await new Promise(resolve=>setImmediate(resolve));
    assert.equal(inferences,1); assert.equal(writes,1);
    const pending = host.workspace.runtime.store.get<{summary:{seq:number};turns:number;error:string}>('memory-batch','session')!;
    assert.equal(pending.summary.seq,42); assert.equal(pending.turns,1); assert.match(pending.error,/outage/);
    t.mock.timers.tick(59_000); await new Promise(resolve=>setImmediate(resolve)); assert.equal(writes,1);
    t.mock.timers.tick(1000); await new Promise(resolve=>setImmediate(resolve));
    assert.equal(inferences,1,'Retry must reuse the successful native summary'); assert.equal(writes,2);
    assert.equal(host.workspace.runtime.store.get<{turns:number}>('memory-batch','session')!.turns,0);
  } finally { await dispose?.(); t.mock.timers.reset(); await host.close(); rmSync(root,{recursive:true,force:true}); }
});
