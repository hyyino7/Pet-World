import type { Context } from '@deepseek-ai/cordis';
import type { Agent, PreStepDecision } from '@deepseek-ai/dsh-agent';
import type { SessionEvent, SessionId, UserMessage } from '@deepseek-ai/dsh-session';
import type {} from '../plugin.js';
import type {} from '@deepseek-ai/dsh-system-prompt';
import type {} from '@deepseek-ai/dsh-tools';
import type { LlmCallConfig } from '@deepseek-ai/dsh-llm';
import { nativeResult } from './result.js';
import type { PetCoreHost } from '../index.js';
import { registerWorldPrompt, retireLegacyPrompt } from './prompt.js';
import { WorldRecall } from './recall.js';
import type { PetWorld } from '../../world/service.js';
import type { NativeScope } from './conversation.js';
import { installCompanionFoundation,companionWritingScope } from '../companion-foundation.js';
import { lifeToolAllowed, restrictLifeTools } from '../life-tool-policy.js';
import {installLifeReviewFileGuard} from '../life-review-files.js';

export const name = 'chatpet-agent';
export const inject = ['petCore', 'petWorld', 'agents', 'systemPrompt', 'tools'];
interface WorkspaceView { id: string; path: string; sessionIds: readonly string[] }
interface LifeTurnToolPolicy {review:boolean;reviewDay?:string}
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
  const turns = new Map<string, {turn:number;scope:NativeScope;background:boolean;lifePolicy?:LifeTurnToolPolicy}>();
  const lifePolicies = new Map<Agent,{release:()=>void;review:boolean;reviewDay?:string}>();
  // A native interruption ends a turn, not its unfinished review capability.
  const interruptedReviews = new Map<string,{scope:NativeScope;reviewDay:string}>();
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
  const releaseLifePolicy=(agent:Agent)=>{
    const policy=lifePolicies.get(agent);lifePolicies.delete(agent);policy?.release();
  };
  const constrainLife=(agent:Agent,message:UserMessage)=>{
    if(message.source.kind!=='dsh-world-life' || !host.native.acceptsInput(agent.id,message))return;
    // New inbox facts do not replace capabilities already admitted for the
    // running native turn. Owner input lifts its mask before the next assembly.
    if(turns.get(agent.id)?.lifePolicy&&agent.status==='running')return;
    const interrupted=interruptedReviews.get(agent.id);
    if(interrupted&&!sameScope(agent.id,interrupted.scope))interruptedReviews.delete(agent.id);
    const resumed=interruptedReviews.get(agent.id);
    const review=('purpose' in message.source && message.source.purpose==='review')||!!resumed;
    const reviewDay='purpose' in message.source&&message.source.purpose==='review'
      &&'reviewDay' in message.source&&typeof message.source.reviewDay==='string'?message.source.reviewDay:resumed?.reviewDay;
    if(lifePolicies.get(agent)?.review===review&&lifePolicies.get(agent)?.reviewDay===reviewDay)return;
    releaseLifePolicy(agent);
    const globalNames=ctx.tools.definitions().map(tool=>tool.name);
    lifePolicies.set(agent,{review,reviewDay,release:restrictLifeTools(agent.ctx.tools,globalNames,review)});
  };
  // A capability-admitted QQ retry continues an actual conversation; its
  // internal source remains a system observation, not autonomous owner work.
  const interactiveInput=(message:UserMessage)=>message.source.kind==='user' || message.source.kind==='dsh-world-reply-nudge';
  // DSH resolves schemas before pre-step. Install the native mask while its
  // trusted inbox input is queued, and recheck at step admission below.
  const stopLifeInbox=ctx.on('agent/inbox/inserted',({agent,message})=>{
    if(!scopeFor(agent.id))return;
    if(interactiveInput(message) && host.native.acceptsInput(agent.id,message)) {
      interruptedReviews.delete(agent.id);releaseLifePolicy(agent);
    }
    else if(turns.get(agent.id)?.background!==false)constrainLife(agent,message);
  });
  const stopReviewFiles=installLifeReviewFileGuard(ctx,host,agent=>{
    const turn=turns.get(agent.id),policy=turn?.lifePolicy;
    if(!turn?.background||!policy?.review)return;
    return {workspaceId:turn.scope.workspaceId,root:turn.scope.path,storageId:turn.scope.storageId,
      sessionId:agent.id,guest:turn.scope.guest,reviewDay:policy.reviewDay,writing:companionWritingScope(ctx,host)};
  });
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
    if(saved.background && saved.lifePolicy && !lifeToolAllowed(exec.name,saved.lifePolicy.review))
      return '自主生活仅使用当前生活能力；普通主人对话仍沿用原生工具权限';
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
      if(payload.messages.some(message=>interactiveInput(message) && !host.native.acceptsInput(payload.agent.id,message)))return {kind:'reject'};
      const accepted=payload.messages.filter(message=>host.native.acceptsInput(payload.agent.id,message));
      const user=accepted.some(interactiveInput);
      if(!accepted.length)return {kind:'reject'};
      saved={turn:payload.turn,scope,background:!user};turns.set(payload.agent.id,saved);
      if(user){interruptedReviews.delete(payload.agent.id);releaseLifePolicy(payload.agent);}else for(const message of accepted)constrainLife(payload.agent,message);
      const policy=lifePolicies.get(payload.agent);
      if(!user&&policy)saved.lifePolicy={review:policy.review,reviewDay:policy.reviewDay};
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
      if(payload.messages.some(message=>interactiveInput(message) && !host.native.acceptsInput(payload.agent.id,message)))return {kind:'reject'};
      const admitted=payload.messages.filter(message=>host.native.acceptsInput(payload.agent.id,message));
      if(admitted.length)host.native.observeInputs(payload.agent.id,payload.turn,admitted,saved!.scope);
      if(saved!.background && admitted.some(interactiveInput)) {
        // A real owner input takes over this native turn; autonomous limits do
        // not become a hidden cap on the owner's subsequent tool work.
        host.native.finish(payload.agent.id);
        saved!.background=false;
        interruptedReviews.delete(payload.agent.id);
        releaseLifePolicy(payload.agent);
      }
    }
    if(saved!.background)await host.native.begin(payload.agent.id,payload.turn,payload.messages,payload.signal,{
      cancel:()=>payload.agent.cancel({kind:'user'}),
    });
    let text='';
    let checkMemory: (()=>void)|undefined;
    if(first) {
      const memory=host.native.memoryFor(payload.agent.id);
      if(memory)try {
        const binding=await memory.prepare(payload.agent.id,saved!.scope);
        await syncArchives();
        if(!sameScope(payload.agent.id,saved!.scope))return {kind:'reject'};
        host.native.useTranscript(payload.agent.id,[...payload.agent.session.surface.nodes],payload.agent.session.snapshotEvents());
        const query=payload.messages.flatMap(message=>message.content.flatMap(part=>part.type==='text'?[part.text]:[])).join('\n');
        await memory.recall(payload.agent.id,query,true,binding);
        if(!sameScope(payload.agent.id,saved!.scope))return {kind:'reject'};
        text=memory.context(payload.agent.id);
        checkMemory=()=>memory.assertBinding(binding);
      }catch(error){memory.clear(payload.agent.id);memory.unavailable(error);ctx.logger('chatpet-memory').warn('Memory unavailable; native chat continues',error);}
      else host.native.memory?.clear(payload.agent.id);
    }
    const decision=await next();
    if(decision.kind!=='enter' || !sameScope(payload.agent.id,saved!.scope))return decision.kind==='enter'?{kind:'reject'}:decision;
    if(!first)return decision;
    if(checkMemory)try{checkMemory();}catch(error){
      text='';host.native.memory?.clear(payload.agent.id);host.native.memory?.unavailable(error);
    }
    // An empty replacement explicitly retires the prior recall after toggle or failure.
    recall.refresh(payload.agent.session,saved!.scope.storageId,true);
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
    if(saved.background&&saved.lifePolicy?.review&&saved.lifePolicy.reviewDay&&result.state!=='completed')
      interruptedReviews.set(session.id,{scope:saved.scope,reviewDay:saved.lifePolicy.reviewDay});
    else interruptedReviews.delete(session.id);
    if(saved.background)host.native.finish(session.id);
    const agent=agents.get(session.id);if(agent)releaseLifePolicy(agent);
    const done=host.native.finishTurn(session.id,saved.turn,result).catch(error=>{
      host.native.memory?.unavailable(error);ctx.logger('chatpet-memory').warn('Conversation retained; Memory write pending',error);
    }).finally(()=>{if(turns.get(session.id)===saved){turns.delete(session.id);inputs.delete(session.id);}if(native.get('workspaceRegistry')?.archivedSessionIds?.includes(session.id))void syncArchives([session.id]).catch(()=>{});});
    return watch(done);
  },{global:true});
  ctx.on('agent/disposed',({agent})=>{
    void host.native.end(agent.id).catch(()=>{});
    host.native.memory?.clear(agent.id);
    agents.delete(agent.id);turns.delete(agent.id);inputs.delete(agent.id);
    interruptedReviews.delete(agent.id);
    releaseLifePolicy(agent);
  },{global:true});
  let stopped:Promise<void>|undefined;
  const stop=()=>stopped ??= (async()=>{
    await Promise.allSettled([...pending]);await archiveTail;
    disposePrompt();disposeFoundation();
    stopLifeInbox();stopReviewFiles();for(const agent of [...lifePolicies.keys()])releaseLifePolicy(agent);
    if(host.native.resolveScope===scopeFor){host.native.resolveScope=undefined;host.native.attachGuest=undefined;}
    agents.clear();turns.clear();inputs.clear();interruptedReviews.clear();
  })();
  ctx.effect(()=>stop);return stop;
}
