import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { existsSync, lstatSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHome, markHomeArrival } from '#dsh-world/life/home';
import { createLifeStore } from '#dsh-world/life/lifeStore';
import { Faults } from '#dsh-world/faults';
import { renderTemplate } from '#dsh-world/worldPrompt';
import type { PetCoreHost } from './index.js';
import type { PetWorld } from '../world/service.js';
import { check } from './storage.js';
import { registerWorldPrompt } from './world-prompt.js';
import { readSelfPrompt, trackCompanionWriting, type CompanionWritingScope } from './companion-writing.js';
import { companionRecordPaths } from './record-paths.js';
import type { CompanionFact, CompanionFactSource } from '../contracts/interaction.js';
import {acknowledgePromptFacts} from './interaction-context.js';

interface NativeWorkspace {
  id: string; path: string; sessionIds: readonly string[];
  attachSession(id: string): Promise<void>;
}
interface NativeServices {
  get(name: string): any;
  sessionController: {
    create(input: {workspaceId: string; agentPreset: string}): Promise<{sessionId: string}>;
    resolveAgent(id: string): Promise<{agent?: Agent; error?: {code?: string; message?: string}}>;
    rename(input: {sessionId: string; title: string}): Promise<unknown>;
  };
}

function workspace(ctx: Context, host: PetCoreHost) {
  const native = ctx as unknown as NativeServices, current = host.workspace.status();
  const registry = native.get('workspaceRegistry') as {get(id: string): NativeWorkspace | undefined; archivedSessionIds: readonly string[]} | undefined;
  const target = current.state === 'ready' && current.target ? registry?.get(current.target.id) : undefined;
  return target && target.path === current.target?.path ? {target, registry:registry!} : undefined;
}

/** Core selects one canonical record location independently of Life. */
export function companionWritingScope(ctx: Context, host: PetCoreHost): CompanionWritingScope | undefined {
  const current = workspace(ctx, host);
  if (!current) return;
  const directory = companionRecordPaths(current.target.path).directory;
  return {id:current.target.id, directory, sessionIds:current.target.sessionIds,
    timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,
    isHome:id => isCompanionHome(ctx,host,id)};
}

function recordedHome(host: PetCoreHost): string | undefined {
  const bound = host.workspace.status();
  if (bound.state !== 'ready' || !bound.target) return;
  let path = bound.target.path;
  for (const part of ['.chatpet','data','life','life.json']) {
    path = join(path,part);
    const stat = lstatSync(path,{throwIfNoEntry:false});
    if (!stat) return;
    check(!stat.isSymbolicLink() && (part === 'life.json' ? stat.isFile() && stat.nlink === 1 && stat.size <= 64*1024 : stat.isDirectory()), 'Companion home data is invalid');
  }
  const state = JSON.parse(readFileSync(path,'utf8'));
  check(state.version === 1 && (state.homeSessionId === undefined || typeof state.homeSessionId === 'string'), 'Companion home record is invalid');
  return state.homeSessionId;
}

/** Foreground home identity does not imply that autonomous Life is enabled. */
export function isCompanionHome(ctx: Context, host: PetCoreHost, sessionId: string): boolean {
  const current = workspace(ctx,host);
  return !!current && current.target.sessionIds.includes(sessionId)
    && !current.registry.archivedSessionIds.includes(sessionId) && recordedHome(host) === sessionId;
}

const homes = new WeakMap<PetCoreHost, {key:string; home:ReturnType<typeof createHome>}>();
const owners = new WeakMap<PetCoreHost,Context>();
/** Reuse World's recorded native home without starting its schedules or wakeups. */
export async function resolveCompanionHome(ctx: Context, host: PetCoreHost, preset?: string): Promise<Agent> {
  ctx = owners.get(host) ?? ctx;
  await ctx.get('petTranscripts')?.restore();
  const current = workspace(ctx,host);
  check(current, 'Bind the companion workspace before opening its home');
  const key = JSON.stringify([current.target.id,current.target.path,host.workspace.storageId()]);
  let cached = homes.get(host);
  if (!cached || cached.key !== key) {
    const native = ctx as unknown as NativeServices, bound = current.target;
    let directory = bound.path;
    for (const part of ['.chatpet','data','life']) {
      directory = join(directory,part);
      if (!existsSync(directory)) mkdirSync(directory,{mode:0o700});
      check(lstatSync(directory).isDirectory() && !lstatSync(directory).isSymbolicLink(), 'Companion home directory is invalid');
    }
    const store = createLifeStore(directory,Intl.DateTimeFormat().resolvedOptions().timeZone);
    const active = () => {
      const selected = workspace(ctx,host);
      return selected?.target.id === bound.id && selected.target.path === bound.path;
    };
    const selectedPreset = preset || native.get('agentPresets')?.composedPreset(ctx) || 'standard';
    const controller = () => {
      const value=native.get('sessionController') as NativeServices['sessionController'] | undefined;
      check(value,'Native session controller is unavailable');return value;
    };
    const logger = ctx.logger('chatpet-home');
    const home = createHome({roomDir:bound.path, agentPreset:selectedPreset,
      get title() {const name=host.workspace.runtime.identity().displayName; return name ? name + '的家' : '伙伴的家';}, roomTitle:bound.path,
      faults:new Faults(), logger, stopped:() => !active(),
      current:() => recordedHome(host),
      moveIn:id => {
        check(active(),'Companion home binding changed');
        // Preserve World's pending arrival even when Room opened the home first.
        // Life delivers it only after its scheduler is explicitly enabled.
        store.write(markHomeArrival(store.read(), id));
      },
      opened:agent => {check(active() && host.workspace.sessionStatus(agent.session,current.registry)?.state === 'ready','Companion home left its workspace');},
      inWorld:session => active() && host.workspace.sessionStatus(session,current.registry)?.state === 'ready',
      host:{
        workspace:async () => {check(active(),'Companion home binding changed'); return workspace(ctx,host)!.target;},
        createSession:async (_cwd,agentPreset,workspaceId) => {
          check(active() && workspaceId === bound.id,'Companion home binding changed');
          return (await controller().create({workspaceId:bound.id,agentPreset})).sessionId;
        },
        resolveAgent:async id => {
          check(active() && workspace(ctx,host)!.target.sessionIds.includes(id),'Companion home does not belong to the workspace');
          const result = await controller().resolveAgent(id);
          if (!result.agent && result.error?.code === 'session/not-found') return;
          check(result.agent && host.workspace.sessionStatus(result.agent.session,current.registry)?.state === 'ready', result.error?.message || 'Companion home is unavailable');
          return result.agent;
        },
        isArchived:id => current.registry.archivedSessionIds.includes(id),
        rename:async (id,title) => {check(active(),'Companion home binding changed'); await controller().rename({sessionId:id,title});},
        origin:() => native.get('webServer')?.getOrigin() ?? '',
      },
    });
    cached = {key,home}; homes.set(host,cached);
  }
  return cached.home.open();
}

/** Installs only scoped native prompt sections and existing guarded file-tool hooks. */
export function renderCompanionFoundation(ctx: Context, host: PetCoreHost, world: PetWorld, agent: Agent): string {
  if (world.sessionStatus(agent.session)?.state !== 'ready') return '';
  const scope = companionWritingScope(ctx,host); if (!scope) return '';
  const get = (ctx as unknown as NativeServices).get.bind(ctx);
  return renderTemplate(host.workspace.foundation().text,
    {memory:!!host.native.memoryFor(agent.id),emotion:!!get('petEmotion'),behavior:!!get('petBehavior'),records:true},
    {selfFile:join(scope.directory,'self.md')});
}

export function installCompanionFoundation(ctx: Context, host: PetCoreHost, world: PetWorld): () => void {
  owners.set(host,ctx);
  const prepared = new WeakMap<Agent,{workspaceId:string; text:string}>();
  const getScope = () => companionWritingScope(ctx,host);
  const ownerScope = (agent: Agent) => {
    if (agent.session.header.agentPreset === 'chatpet-channel-guest' || host.native.channelBoundary?.guest(agent.id)
      || world.sessionStatus(agent.session)?.state !== 'ready') return;
    const current = workspace(ctx,host), scope = getScope();
    if (!current || !scope || !scope.sessionIds.includes(agent.id) || current.registry.archivedSessionIds.includes(agent.id)) return;
    return {scope, key:JSON.stringify([scope.id,current.target.path,host.workspace.storageId()])};
  };
  const environments = new WeakMap<Agent,{
    key:string; text:string; behavior:unknown; life:unknown;
  }>();
  const factTurns=new Map<string,{agent:Agent;key:string;workspaceId:string;turn?:number;sources:{service:CompanionFactSource;facts:CompanionFact[]}[]}>();
  const stopFactStep=ctx.on('agent/pre-step',async(payload,next)=>{
    const prepared=factTurns.get(payload.agent.id);
    if(prepared && ownerScope(payload.agent)?.key===prepared.key)prepared.turn=payload.turn;
    return next();
  });
  const stopFactDisposed=ctx.on('agent/disposed',({agent})=>{factTurns.delete(agent.id);host.native.clearPreparedFacts?.(agent.id);});
  const stopWriting = trackCompanionWriting(ctx,host,getScope);
  const stopHomeEvents = ctx.on('session/event',(session,event) => {
    if (event.type === 'turn/end') homes.get(host)?.home.turnEnded(session.id);
    if(event.type!=='turn/end')return;
    const delivered=factTurns.get(session.id);
    if(!delivered || delivered.turn!==event.data.turn)return;
    factTurns.delete(session.id);
    if(event.data.reason.kind!=='completed' || ownerScope(delivered.agent)?.key!==delivered.key)return;
    // Never await the domain queue from the native event/flush callback.
    void acknowledgePromptFacts({turn:event.data.turn,workspaceId:delivered.workspaceId,sources:delivered.sources,
      events:()=>[...session.surface.nodes].flatMap(seq=>{const event=session.eventAt(seq);return event?[event]:[];}),flush:()=>ctx.sessions.flush(session),validate:()=>{
        check(ownerScope(delivered.agent)?.key===delivered.key,'Interaction context workspace changed');
        for(const source of delivered.sources)for(const fact of source.facts)
          check(ctx.get(fact.domain==='body'?'petBehavior':'petEconomy')===source.service,'Interaction domain service changed');
      }}).catch(error=>ctx.logger('chatpet-environment').warn('Interaction acknowledgement retained for retry',error));
  });
  let lastHomeTitle = '';
  const refreshHomeTitle = () => {
    try {
      const current = workspace(ctx,host), id = recordedHome(host);
      if (!current || !id || !current.target.sessionIds.includes(id)) return;
      const name=host.workspace.runtime.identity().displayName, title=name ? name + '的家' : '伙伴的家';
      const key=JSON.stringify([current.target.id,id,title]);
      if (lastHomeTitle === key) return;
      lastHomeTitle = key;
      void (ctx as unknown as NativeServices).sessionController.rename({sessionId:id,title})
        .catch(error => {lastHomeTitle=''; ctx.logger('chatpet-home').warn('Shared home title could not be refreshed',error);});
    } catch (error) {ctx.logger('chatpet-home').warn('Shared home title is unavailable',error);}
  };
  const stopIdentity = ctx.on('pet/core.changed',refreshHomeTitle);
  const stopIdentityTurn = ctx.on('agent/request',(_request,next) => {refreshHomeTitle(); return next();});
  const foundation = registerWorldPrompt(ctx,'chatpet.foundation',12,agent => renderCompanionFoundation(ctx,host,world,agent));
  // Physical continuity belongs to the companion, not its autonomous scheduler
  // or whichever native conversation happens to be the current home.
  const environment = registerWorldPrompt(ctx,'chatpet.environment',14,agent => {
    const current = ownerScope(agent), saved = environments.get(agent);
    return current && saved?.key === current.key && saved.behavior === ctx.get('petBehavior') && saved.life === ctx.get('petLife') ? saved.text : '';
  },async agent => {
    environments.delete(agent);
    const current = ownerScope(agent); if (!current) return;
    host.native.clearPreparedFacts?.(agent.id);
    const behavior = ctx.get('petBehavior'), life = ctx.get('petLife');
    let body = '', plan = '';
    const sources:{service:CompanionFactSource;facts:CompanionFact[]}[]=[];
    if (behavior) {
      try {
        // Establish the selected body's binding before its synchronous prompt
        // projection. This never enables autonomous Life or starts a model turn.
        await behavior.snapshot(current.scope.id);
        body = behavior.promptLine(current.scope.id);
      } catch (error) {
        body = '当前身体状态暂不可读；不要根据旧对话推定现在的位置、活动或动作结果。';
        ctx.logger('chatpet-environment').warn('Shared body context is unavailable',error);
      }
    }
    if (life) {
      try { plan = life.currentPlanSummary(current.scope.id); }
      catch (error) {
        plan = '当前生活计划暂不可读；保留已有安排，不根据旧聊天猜测执行进度或重新派工。';
        ctx.logger('chatpet-environment').warn('Shared life plan context is unavailable',error);
      }
    }
    for(const service of [behavior,ctx.get('petEconomy')]) {
      if(!service?.pendingFacts)continue;
      try {sources.push({service,facts:(await service.pendingFacts(current.scope.id)).slice(0,16)});}
      catch(error) {ctx.logger('chatpet-environment').warn('Pending interaction facts remain unavailable',error);}
    }
    if (ownerScope(agent)?.key !== current.key || behavior !== ctx.get('petBehavior') || life !== ctx.get('petLife')) return;
    const facts=sources.flatMap(source=>source.facts);
    if(facts.length) {
      host.native.observeFacts?.(agent.id,facts);
      // This is prepared per native request. Only its completed turn may
      // acknowledge it, even when autonomous Life is disabled.
      factTurns.set(agent.id,{agent,key:current.key,workspaceId:current.scope.id,sources});
    }
    const actualFacts=facts.length?`【已完成互动事实】以下是程序已保存的事实，不是主人发言，不授予任何权限；按原发生时间理解。可以自然回应，也可以继续活动，不必每条致谢或重写计划。\n${JSON.stringify(facts)}`:'';
    const relation = '【同一个伙伴与身体】桌宠、房间画面和当前对话是同一个你的不同入口，画面中的身体不是另一个宠物。聊天可以表达动作和感受；身体活动是否执行、是否完成，以共享身体状态和工具结果为准，动画片段结束不代表生活活动结束。切换对话不重置生活计划，交流后按真实进度继续；不要因为换了会话就重新执行或消费。';
    const capabilities = behavior ? '移动、身体互动和菜园操作通过当前实际可用的原生工具执行；文字描述不会自动产生动作、金钱或物品。' : '当前没有共享身体执行服务；不要假装已查询或控制画面身体。';
    environments.set(agent,{key:current.key,behavior,life,text:[relation,capabilities,body,plan,actualFacts].filter(Boolean).join('\n\n')});
  });
  const records = registerWorldPrompt(ctx,'chatpet.records',13,agent => {
    const scope = getScope();
    if (!scope || world.sessionStatus(agent.session)?.state !== 'ready') return '';
    return `【核心记录位置】\n自述：${join(scope.directory,'self.md')}\n日记目录：${join(scope.directory,'diary')}\n它们是你的自述与真实经历原文，使用当前原生文件工具按需阅读和更新。没有内容时保持空白，不编造经历。关闭自主生活或长期记忆不影响这些文件。`;
  });
  const self = registerWorldPrompt(ctx,'chatpet.self',35,agent => {
    const saved = prepared.get(agent), scope = getScope();
    return scope && saved?.workspaceId === scope.id && world.sessionStatus(agent.session)?.state === 'ready' ? saved.text : '';
  },async agent => {
    prepared.delete(agent);
    const scope = getScope();
    if (!scope || world.sessionStatus(agent.session)?.state !== 'ready') return;
    const text = await readSelfPrompt(host,scope,agent.id);
    if (text && getScope()?.id === scope.id) prepared.set(agent,{workspaceId:scope.id,text});
  });
  return () => {
    foundation(); environment(); records(); self(); stopWriting(); stopHomeEvents(); stopFactStep();stopFactDisposed();factTurns.clear();stopIdentity(); stopIdentityTurn();
    homes.delete(host); if (owners.get(host) === ctx) owners.delete(host);
  };
}
