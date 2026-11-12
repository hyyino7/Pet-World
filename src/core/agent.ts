import type { Context } from '@deepseek-ai/cordis';
import type { Agent, PreStepDecision } from '@deepseek-ai/dsh-agent';
import type { SessionEvent, SessionId, UserMessage } from '@deepseek-ai/dsh-session';
import type {} from './plugin.js';
import type {} from '@deepseek-ai/dsh-system-prompt';
import type {} from '@deepseek-ai/dsh-tools';
import type { LlmCallConfig } from '@deepseek-ai/dsh-llm';
import { nativeResult } from './dsh-driver.js';
import type { PetCoreHost } from './index.js';
import { registerWorldPrompt, retireLegacyPrompt } from './world-prompt.js';
import { WorldRecall } from './world-recall.js';
import type { PetWorld } from '../world/service.js';
import type { NativeScope } from './native.js';
import { installCompanionFoundation } from './companion-foundation.js';

export const name = 'chatpet-agent';
export const inject = ['petCore', 'petWorld', 'agents', 'systemPrompt', 'tools'];
interface WorkspaceView { id: string; path: string; sessionIds: readonly string[] }
interface NativeServices {
  get(name: 'workspaceRegistry'): { get(id: string): WorkspaceView | undefined; archivedSessionIds: readonly string[] } | undefined;
  sessionPersistence: { open(id: SessionId, access: 'read'): Promise<{read(): Promise<{events: readonly SessionEvent[]}>; close(): Promise<void>}> };
  on(name: 'domain/changed', handler: (change: {domain: string; table: string; value?: {archivedSessionIds?: readonly string[]}}) => void): unknown;
}
/** DSH owns ordinary turn execution and permissions. Core supplies scoped services. */
export function apply(ctx: Context, host: PetCoreHost = ctx.petCore, world: PetWorld = ctx.petWorld): () => Promise<void> {
  const native = ctx as unknown as NativeServices;
  const agents = new Map<string, Agent>();
  const inputs = new Map<string, string>();
  const turns = new Map<string, {turn:number;scope:NativeScope;background:boolean}>();
  const pending = new Set<Promise<unknown>>();
  const recall = new WorldRecall();
  const scopeFor = (id:string):NativeScope|undefined => {
    const status=host.workspace.status();
    if(status.state!=='ready' || !status.target)return;
    const agent=ctx.agents.get(id as SessionId) ?? agents.get(id);
    const guest=host.native.channelBoundary?.guest(id)===true;
    if(!guest && (!agent || world.sessionStatus(agent.session)?.state!=='ready'))return;
    return {workspaceId:status.target.id,path:status.target.path,storageId:host.workspace.storageId(),guest};
  };
  host.native.resolveScope=scopeFor;
  const sameScope=(id:string,expected:NativeScope)=>{const current=scopeFor(id);return !!current && current.workspaceId===expected.workspaceId && current.path===expected.path && current.storageId===expected.storageId && current.guest===expected.guest;};
  const watch=(work:Promise<unknown>)=>{
    pending.add(work);void work.finally(()=>pending.delete(work)).catch(()=>{});
    return work;
  };
  let archiveTail: Promise<void> = Promise.resolve();
  function syncArchives(publishedIds?: readonly string[]): Promise<void> {
    const memory=host.native.memoryFor('');if(!memory)return Promise.resolve();
    const run=archiveTail.then(async()=>{
      const status=host.workspace.status(),target=status.state==='ready'?status.target:undefined;
      const registry=native.get('workspaceRegistry'),view=target && registry?.get(target.id);
      if(!target || !view || view.path!==target.path)return;
      for(const id of publishedIds ?? registry?.archivedSessionIds ?? []) {
        if(!view.sessionIds.includes(id) || ctx.agents.get(id as SessionId)?.status==='running' || !memory.needsArchive(id,target.id,target.path))continue;
        const live=ctx.sessions.get(id as SessionId);
        if(live && !await ctx.sessions.flush(live))throw Error('Cannot archive an unflushed native session');
        const reader=await native.sessionPersistence.open(id as SessionId,'read');
        try {await memory.archive(id,target.id,target.path,(await reader.read()).events);}finally{await reader.close();}
      }
    });
    archiveTail=run.catch(error=>ctx.logger('chatpet-memory').warn('Native archive pending; will retry',error));
    return run;
  }
  native.on('domain/changed',change=>{
    if(change.domain==='workspace' && change.table==='' && change.value?.archivedSessionIds?.length)
      void syncArchives(change.value.archivedSessionIds).catch(()=>{});
  });
  const profiles=new WeakMap<Agent,{turn:number;text:string}>();
  const disposePrompt=registerWorldPrompt(ctx,'chatpet.profile',10,agent=>{
    const scope=scopeFor(agent.id);if(!scope)return '';
    const events=agent.session.snapshotEvents();
    const turn=[...events].reverse().find(event=>event.type==='turn/start')?.data.turn ?? -1;
    const saved=profiles.get(agent);if(saved?.turn===turn)return saved.text;
    const {identity,user}=host.native.context();const text=[identity,scope.guest?'':user].filter(Boolean).join('\n\n');
    profiles.set(agent,{turn,text});return text;
  });
  const disposeFoundation=installCompanionFoundation(ctx,host,world);
  const scanned=new WeakMap<Agent,boolean>();
  const onRequest = ({agent,turn,step}: {agent:Agent;turn:number;step:number},next:()=>Promise<LlmCallConfig>)=>{
    const bound=!!scopeFor(agent.id);
    if(scanned.get(agent)!==bound){retireLegacyPrompt(agent.session,turn,step,bound);scanned.set(agent,bound);}
    recall.request(agent.session,turn,step,bound && !!host.native.memoryFor(agent.id));
    return next();
  };
  ctx.on('agent/request',onRequest);
  const tools=ctx.tools;
  for(const tool of host.native.tools())tools.register(tool,{
    when:context=>{
      const scope=context.agent && scopeFor(context.agent.id);
      return Boolean(scope && !scope.guest && (!tool.name.startsWith('pet_memory_') || host.native.memoryFor(context.agent!.id)));
    },
  });
  // Background allowances stay on autonomous input only. DSH enforces native
  // permissions/cancellation for ordinary user work, without a second counter.
  ctx.tools.guard(exec=>{
    if(!exec.agent || !turns.has(exec.agent.id))return;
    const saved=turns.get(exec.agent.id)!;
    if(!sameScope(exec.agent.id,saved.scope))return '会话已离开原绑定工作区';
    if(saved.background)try{host.native.guardTool(exec.agent.id);}catch{return '自主轮次已结束或超过限额';}
  });
  const onStep=async(payload:{agent:Agent;turn:number;step:number;messages:UserMessage[];signal:AbortSignal},next:()=>Promise<PreStepDecision>):Promise<PreStepDecision>=>{
    const scope=scopeFor(payload.agent.id);
    if(!scope) {
      if(turns.has(payload.agent.id))return {kind:'reject'};
      return next();
    }
    agents.set(payload.agent.id,payload.agent);
    let saved=turns.get(payload.agent.id);
    const first=!saved || saved.turn!==payload.turn;
    if(first) {
      if(payload.messages.some(message=>message.source.kind==='user' && !host.native.acceptsInput(payload.agent.id,message)))return {kind:'reject'};
      const accepted=payload.messages.filter(message=>host.native.acceptsInput(payload.agent.id,message));
      const user=accepted.some(message=>message.source.kind==='user');
      if(!accepted.length)return {kind:'reject'};
      saved={turn:payload.turn,scope,background:!user};turns.set(payload.agent.id,saved);
      const input=accepted[0];if(input)inputs.set(payload.agent.id,input.id);
      if(!scope.guest) {
        await ctx.get('petDesktop')?.features?.restoreImages();
        await ctx.get('petTranscripts')?.restore();
        if(!sameScope(payload.agent.id,scope))return {kind:'reject'};
      }
      host.native.observeInputs(payload.agent.id,payload.turn,accepted,scope);
    }
    if(!sameScope(payload.agent.id,saved!.scope))return {kind:'reject'};
    if(!first) {
      if(payload.messages.some(message=>message.source.kind==='user' && !host.native.acceptsInput(payload.agent.id,message)))return {kind:'reject'};
      const admitted=payload.messages.filter(message=>host.native.acceptsInput(payload.agent.id,message));
      if(admitted.length)host.native.observeInputs(payload.agent.id,payload.turn,admitted,saved!.scope);
      if(saved!.background && admitted.some(message=>message.source.kind==='user')) {
        // A real owner input takes over this native turn; autonomous limits do
        // not become a hidden cap on the owner's subsequent tool work.
        host.native.finish(payload.agent.id,{state:'cancelled',text:'',hostTurnIds:[],reason:'Owner input took over the autonomous native turn'});
        saved!.background=false;
      }
    }
    if(saved!.background)await host.native.begin(payload.agent.id,payload.turn,payload.messages,payload.signal,{
      cancel:()=>payload.agent.cancel({kind:'user'}),inspect:async()=>{
        await payload.agent.whenIdle();await ctx.sessions.flush(payload.agent.session);
        return nativeResult(payload.agent.session.snapshotEvents(),inputs.get(payload.agent.id) ?? '');
      },
    },false);
    let text='';
    if(first) {
      const memory=host.native.memoryFor(payload.agent.id);
      if(memory)try {
        await memory.prepare(payload.agent.id,saved!.scope);
        await syncArchives();
        if(!sameScope(payload.agent.id,saved!.scope))return {kind:'reject'};
        host.native.useTranscript(payload.agent.id,[...payload.agent.session.surface.nodes],payload.agent.session.snapshotEvents());
        const query=payload.messages.flatMap(message=>message.content.flatMap(part=>part.type==='text'?[part.text]:[])).join('\n');
        await memory.recall(payload.agent.id,query,true);
        if(!sameScope(payload.agent.id,saved!.scope))return {kind:'reject'};
        text=memory.context(payload.agent.id);
      }catch(error){memory.clear(payload.agent.id);memory.unavailable(error);ctx.logger('chatpet-memory').warn('Memory unavailable; native chat continues',error);}
      else host.native.memory?.clear(payload.agent.id);
    }
    const decision=await next();
    if(decision.kind!=='enter' || !sameScope(payload.agent.id,saved!.scope))return decision.kind==='enter'?{kind:'reject'}:decision;
    if(!first)return decision;
    // An empty replacement explicitly retires the prior recall after toggle or failure.
    recall.refresh(payload.agent.session,saved!.scope.storageId,true,0);
    const message=recall.prepare(payload.agent.session,text);
    return {...decision,startsRequestSeries:true,messages:message?[message,...decision.messages]:decision.messages};
  };
  ctx.on('agent/pre-step',onStep);
  host.native.attachGuest=scope=>{disposePrompt.attach(scope);scope.on('agent/pre-step',onStep);scope.on('agent/request',onRequest);};
  ctx.on('session/event',(session,event)=>{
    if(String(event.type)==='compaction/end' && !(event.data as {error?:unknown}).error)recall.compacted(session);
    if(event.type!=='turn/end')return;
    const saved=turns.get(session.id);if(!saved)return;
    const result=nativeResult(session.snapshotEvents(),inputs.get(session.id) ?? '');
    if(saved.background)host.native.finish(session.id,result);
    const done=host.native.finishTurn(session.id,saved.turn,result).catch(error=>{
      host.native.memory?.unavailable(error);ctx.logger('chatpet-memory').warn('Conversation retained; Memory write pending',error);
    }).finally(()=>{if(turns.get(session.id)===saved){turns.delete(session.id);inputs.delete(session.id);}if(native.get('workspaceRegistry')?.archivedSessionIds?.includes(session.id))void syncArchives([session.id]).catch(()=>{});});
    return watch(done);
  },{global:true});
  ctx.on('agent/disposed',({agent})=>{
    void host.native.end(agent.id).catch(()=>{});
    host.native.memory?.clear(agent.id);
    agents.delete(agent.id);turns.delete(agent.id);inputs.delete(agent.id);
  },{global:true});
  let stopped:Promise<void>|undefined;
  const stop=()=>stopped ??= (async()=>{
    await Promise.allSettled([...pending]);await archiveTail;
    disposePrompt();disposeFoundation();
    if(host.native.resolveScope===scopeFor){host.native.resolveScope=undefined;host.native.attachGuest=undefined;}
    agents.clear();turns.clear();inputs.clear();
  })();
  ctx.effect(()=>stop);return stop;
}
