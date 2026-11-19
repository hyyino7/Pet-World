import type { Context } from '@deepseek-ai/cordis';
import { existsSync, lstatSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { buildHomePromptLine } from '#feiyu-home';
import { digest } from '../../core/storage.js';
import type { PetCoreHost } from '../../core/index.js';
import type { BehaviorActivity, BehaviorChange, BehaviorSnapshot, CompanionExpression, PlannedActivity, PlannedExecution } from '../../contracts/behavior.js';
import { CompanionRoom } from './room.js';
import { behaviorPresentation } from './presentation.js';
import { resolveActivityPlayback } from './playback.js';
import type { CompanionFactActor } from '../../contracts/interaction.js';
import type { RoomInteractionContext } from './room.js';
import {gardenHomeProjection} from './garden-receipt.js';
import { LifeControlFileError, readLifeControl } from '../plan/control-file.js';
import { LivingView, livingCaller, mountLivingArea, settleCleanup, type LivingPorts } from '../index.js';
export type { PlannedActivity, PlannedExecution } from '../../contracts/behavior.js';

interface Binding {id: string; path: string; storageId: string; room: CompanionRoom; fingerprint?: string; presentationFingerprint?: string}
const actions = ['feed', 'water', 'play', 'pet', 'sleep', 'wake'] as const;
const owners = new WeakMap<PetCoreHost, CompanionBehavior>();

/** The only home/garden runtime writer. It does not create agents or model turns. */
export class CompanionBehavior {
  private binding?: Binding;
  private serial: Promise<unknown> = Promise.resolve();
  private closed = false;
  private closing?: Promise<void>;
  private readonly living: LivingView;
  private autonomous = false;
  private fault?: string;
  private publicationFault?: string;
  private revision = 0;
  private expression?: CompanionExpression;
  private subscriptions: (() => void)[] = [];
  readonly bootId = randomUUID();
  private timer?: NodeJS.Timeout;
  private deadlineAt?:number;
  private awaitingRecovery=false;
  private conditions:readonly {metric:string;comparison:string;value:number}[]=[];
  constructor(private ctx: Context, private host: PetCoreHost, ports: LivingPorts | LivingView = {}) {
    this.living = ports instanceof LivingView ? ports : new LivingView(ports);
    if (!(ports instanceof LivingView)) this.activate();
  }
  activate() {
    const {ctx, host, living} = this;
    if (owners.has(host)) throw Error('共享身体已由另一个组件实例管理');
    owners.set(host,this);
    const refreshBinding=(isObserved=()=>true)=>{void this.enqueue(async validate=>{
      if(!isObserved())return;
      this.synchronize();const bound=this.binding;if(!bound)return;
      await this.refreshEmotion(bound.id);validate();
      if(!isObserved()||this.currentBound(bound.id)!==bound)return;
      if(!living.get('plan') && !this.autonomous) {this.publish('observation');return;}
      this.advanceRoom(bound);this.publish();
    },isObserved).catch(error=>{this.fault=String(error);});};
    this.subscriptions.push(ctx.on('pet/core.changed',()=>refreshBinding()));
    this.subscriptions.push(living.watch(ctx,'economy',(economy,observed)=>{
      refreshBinding(()=>observed() && (!economy || economy.isCurrent()));
    }));
    const refresh = (workspaceId: string) => {void this.enqueue(async validate => {
      if (!this.binding) return;
      this.synchronize(); const bound=this.currentBound(workspaceId); if(!bound)return;
      await this.refreshEmotion(workspaceId);validate();
      if(this.currentBound(workspaceId)===bound)this.publish();
    }).catch(error=>{this.fault=String(error);});};
    this.subscriptions.push(ctx.on('pet/emotion.changed',workspaceId=>refresh(workspaceId)));
    this.subscriptions.push(ctx.on('pet/emotion.expression',event=>{
      if (this.closed || !living.isCurrent() || !this.binding) return;
      this.synchronize(); if(!this.currentBound(event.workspaceId))return;
      this.expression={sessionId:event.sessionId,turn:event.turn,
        ...(event.action ? {action:event.action} : {}),...('actionLabel' in event && typeof event.actionLabel==='string' ? {actionLabel:event.actionLabel} : {}),
        ...(event.sticker ? {sticker:event.sticker} : {}),
        ...(event.feelings ? {feelings:[...event.feelings]} : {})};
      refresh(event.workspaceId);
    }));
    let stopLife: (()=>void) | undefined;
    this.subscriptions.push(()=>stopLife?.());
    this.subscriptions.push(living.watch(ctx,'plan',(plan,observed)=>{
      if(!plan) {
        stopLife?.();stopLife=undefined;
        void this.enqueue(()=>{
          if(!observed()||living.get('plan'))return;
          this.binding?.room.suspendAutonomy();this.autonomous=false;this.publish();
        },observed).catch(error=>{this.fault=String(error);});
        return;
      }
      const {value:life}=plan;
      const current=()=>observed() && plan.isCurrent();
      const synchronize=()=>{
        if(!current())return;
        void this.enqueue(async validate=>{
          if(!current())return;
          const status=this.host.workspace.status(),admission=status.target?life.bodyClockState?.(status.target.id):undefined;
          if(!this.binding && !life.running() && !admission?.enabled)return;
          this.synchronize();const bound=this.binding;if(!bound)return;
          await this.refreshEmotion(bound.id);validate();
          if(!current()||this.currentBound(bound.id)!==bound)return;
          this.autonomous=admission?.enabled ?? life.running();
          if(admission || this.autonomous)bound.room.setAutonomy(this.autonomous,Date.now(),admission?.restoreElapsed);
          else bound.room.suspendAutonomy();
          this.publish();
        },current).catch(error=>{this.fault=String(error);});
      };
      stopLife=ctx.on('pet/life.changed',synchronize);synchronize();
    }));
  }
  private enqueue<T>(work: (validate:()=>void) => T | Promise<T>, observed=()=>true): Promise<T> {
    const caller=livingCaller();
    let admitted=true;
    const validate=()=>{
      try {
        if(this.closed || !this.living.isCurrent())throw Error('身体工作区已切换或组件已停止');
        caller?.();
      } catch(error) {admitted=false;throw error;}
    };
    try {validate();} catch(error) {return Promise.reject(error);}
    const next = this.serial.then(()=>{validate();return work(validate);});
    const arm=()=>{if(admitted && observed())this.arm();};
    this.serial = next.then(arm,arm).catch(error=>{this.fault=String(error);});return next;
  }
  private arm() {
    clearTimeout(this.timer);this.timer=undefined;
    if(this.closed || !this.living.isCurrent() || !this.binding) {this.deadlineAt=undefined;return;}
    if(this.awaitingRecovery)return;
    const bound=this.binding,now=Date.now();
    // A queue operation that did not advance physics cannot consume an overdue
    // boundary by rearming from stale needs at a later observation time.
    const at=this.deadlineAt!==undefined && this.deadlineAt<=now?this.deadlineAt:bound.room.nextWakeAt(now,this.conditions);
    if(at===null) {this.deadlineAt=undefined;return;}
    this.deadlineAt=at;
    // Bound physical deadlines, never an activity-planning interval. Long waits
    // recheck the wall clock using the same segment as the native alarm timer.
    this.timer=setTimeout(()=>{this.timer=undefined;void this.enqueue(async validate=>{
      this.synchronize();if(this.binding!==bound)return;
      await this.refreshEmotion(bound.id);validate();if(this.binding!==bound)return;
      this.advanceRoom(bound);this.deadlineAt=undefined;this.publish();
    }).catch(error=>{this.fault=String(error);});},Math.min(5*60_000,Math.max(1,at-Date.now())));
    this.timer.unref();
  }
  private advanceRoom(bound:Binding) {
    try {const result=bound.room.tick();this.awaitingRecovery=false;this.fault=undefined;return result;}
    catch(error) {
      // Retain the overdue boundary, but do not spin a 1ms disk retry. A real
      // domain/lifecycle change or explicit state request can reconcile it.
      this.awaitingRecovery=true;this.fault=String(error);clearTimeout(this.timer);this.timer=undefined;throw error;
    }
  }
  setReconsiderConditions(workspaceId:string,conditions:readonly {metric:string;comparison:string;value:number}[]) {
    return this.enqueue(()=>{this.checked(workspaceId);this.conditions=structuredClone(conditions);});
  }
  nextWakeAt(workspaceId:string,conditions:readonly {metric:string;comparison:string;value:number}[]=[]) {
    return this.enqueue(()=>this.checked(workspaceId).room.nextWakeAt(Date.now(),conditions));
  }
  private synchronize() {
    const status = this.host.workspace.status(), target = status.state === 'ready' ? status.target : null;
    const storageId = target ? this.host.workspace.storageId() : undefined;
    if (this.binding?.id === target?.id && this.binding?.path === target?.path && this.binding?.storageId === storageId) return;
    this.binding?.room.flush(); this.binding = undefined; this.conditions=[];this.awaitingRecovery=false;this.autonomous = false; this.fault = undefined;this.publicationFault=undefined;this.expression=undefined;
    if (this.closed || !target || !storageId) return;
    const legacy = join(target.path, '.chatpet', 'data', 'life');
    const owner = ['home.json','garden.json'].some(name => existsSync(join(legacy,name))) ? 'life' : 'behavior';
    let directory = target.path;
    for (const part of ['.chatpet','data',owner]) {
      directory = join(directory, part);
      if (!existsSync(directory)) mkdirSync(directory, {mode:0o700});
      const stat = lstatSync(directory);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('身体数据目录无效');
    }
    const id = target.id;
    this.binding = {id, path:target.path, storageId,
      room:new CompanionRoom(directory, () => this.ctx.get('petEmotion')?.roomSnapshot(id),legacyFile=>{
        const economy=this.living.get('economy');
        if(!economy && (this.host.workspace.runtime.store.meta(`economy.initialized:${storageId}`) || existsSync(join(target.path,'.chatpet','data','economy','economy.sqlite'))))
          throw Error('权威经济组件暂不可用；原钱包、库存与菜园已保留，等待恢复');
        return economy?.gardenPort(id,legacyFile);
      },()=>{const settings=this.host.workspace.companionSettings?.();return {
        hours:settings?.offlineBodyHours ?? 4,needCeiling:(settings?.offlineNeedCeilingPercent ?? 70)/100,
        energyFloor:(settings?.offlineEnergyFloorPercent ?? 35)/100};},
      ()=>this.living.get('plan')?.bodyClockState?.(id) ?? readLifeControl(target.path))};
    let admission;
    try { admission=this.living.get('plan')?.bodyClockState?.(id); }
    catch (error) {
      if (!(error instanceof LifeControlFileError)) throw error;
      // Room reports an invalid clock at the garden boundary.
    }
    if(admission) {
      this.autonomous=admission.enabled;this.binding.room.setAutonomy(admission.enabled,Date.now(),admission.restoreElapsed);
    }
  }
  private checked(workspaceId: string) {
    this.synchronize();
    if (this.closed || !this.binding || this.binding.id !== workspaceId) throw Error('身体工作区已切换或组件已停止');
    return this.binding;
  }
  private activity(): BehaviorActivity {
    const state = this.binding?.room.state;
    if (!state) return {activityId:null, kind:'idle', phase:'idle'};
    const planned = this.binding?.room.plannedState();
    const task = state.companionAction;
    const animation=this.binding?.room.presentationActivity() ?? {};
    const onset = state.route?.departAt ?? (state.asleep ? state.sleepStartedAt :
      state.dwell && !state.dwell.target?.plannedOperationId && Number(state.dwell.target?.dwellMs)>0
        ? state.dwell.until-state.dwell.target.dwellMs :
      task && !task.completedAt && !state.dwell ? task.startedAt :
      state.kind?.startsWith('react_') && state.reactionUntil>0 ? state.lastInteractionAt : 0);
    const startedAt=Number.isFinite(onset) && onset>0 ? onset : 0;
    if (planned?.status==='running') return {activityId:planned.operationId,kind:state.kind,startedAt,...animation,
      phase:planned.phase==='moving'?'moving':planned.phase==='working'?'working':'pending'};
    const requested=task&&(!task.completedAt||(state.asleep&&task.action==='sleep'))?task.id:undefined;
    const automatic=state.route ? 'body:'+digest([state.route.departAt,state.route.arriveAt,state.route.target]) :
      state.dwell ? 'body:'+digest([state.dwell.until,state.dwell.target]) : state.asleep ? 'sleep:'+String(state.sleepStartedAt||'unknown') : null;
    return {activityId:state.route?.target?.gardenJobId ?? state.dwell?.target?.gardenJobId ?? requested ?? automatic,
      kind:state.kind,startedAt,...animation,
      phase:state.route ? 'moving' : state.asleep ? 'sleeping' : state.sleepPending || state.freeTarget || state.command ? 'pending' :
        state.dwell || state.reactionUntil > Date.now() ? 'working' : task?.completedAt ? 'completed' : 'idle'};
  }
  private presentHome(home:any,activity=this.activity()) {
    const projected={...home,behavior:{...activity,revision:this.revision,bootId:this.bootId}};
    return {...projected,playback:resolveActivityPlayback(projected)};
  }
  private publish(reason:'observation'|'transition'='transition') {
    const bound = this.binding; if (!bound || this.closed || !this.living.isCurrent()) return;
    if(reason==='observation' && this.deadlineAt!==undefined && Date.now()>=this.deadlineAt) {reason='transition';this.deadlineAt=undefined;}
    try {
      const {updatedAt:_updated,lastTickAt:_tick,...semantic} = bound.room.state;
      // This is an internal projection of the existing JSON save, not an
      // admission path. Keep Core's strict validation of incoming data intact.
      // Domain history may exceed the incoming Core payload budget. Hash the
      // program-owned JSON save directly without admitting it as a new request
      // or deleting operation/fact receipts needed for replay protection.
      const home=bound.room.view(),activity=this.activity();
      const persisted=JSON.stringify([semantic,activity,this.autonomous,home.emotion ?? null,this.expression ?? null]);
      // Reuse the existing public Body projection; saved metrics stay full precision.
      const presentationFingerprint=createHash('sha256').update(JSON.stringify([{...semantic,needs:home.body},activity,this.autonomous,home.emotion ?? null,this.expression ?? null])).digest('hex');
      const fingerprint='sha256:'+createHash('sha256').update(persisted).digest('hex');
      const changed=fingerprint!==bound.fingerprint;
      const visibleChanged=presentationFingerprint!==bound.presentationFingerprint;
      if(changed) {bound.fingerprint=fingerprint;this.revision++;}
      bound.presentationFingerprint=presentationFingerprint;
      if(!this.publicationFault && (!changed || reason==='observation' && !visibleChanged))return;
      this.ctx.emit('pet/behavior.changed', {workspaceId:bound.id,bootId:this.bootId,revision:this.revision,reason});
      this.publicationFault=undefined;
    } catch(error) {
      // Body work and its durable receipt have already committed. A failed
      // observer must be visible without turning that result into a retry.
      const message=String(error);
      const changed=message!==this.publicationFault;
      this.publicationFault=message;
      if(changed) {
        try {this.ctx.logger?.warn?.('Body presentation update failed; execution receipt retained',error);}
        catch { /* Snapshot still exposes the fault if logging is unavailable. */ }
      }
    }
  }
  private currentBound(workspaceId: string) {
    const status = this.host.workspace.status(), bound = this.binding;
    return !this.closed && this.living.isCurrent() && bound?.id === workspaceId && status.state === 'ready' && status.target?.id === workspaceId &&
      status.target.path === bound.path && this.host.workspace.storageId() === bound.storageId ? bound : undefined;
  }
  private async refreshEmotion(workspaceId:string) {
    // The synchronous room projection only exposes the exact version validated
    // by read(). Refresh before decisions/disclosure, including after reload and
    // corrections while no Emotion listener was mounted.
    await this.ctx.get('petEmotion')?.read?.(workspaceId);
  }
  promptLine(workspaceId: string) {
    const bound = this.currentBound(workspaceId); if (!bound) return '';
    const rest=this.restState(workspaceId)!;
    return buildHomePromptLine(gardenHomeProjection(bound.room.state),{now:Date.now(),allowActivity:true})
      + `\n【身体睡眠回执】${rest.sleeping?'已入睡':rest.pending?'尚未入睡，正在执行睡觉安排':'未入睡，且没有待执行的睡觉安排'}。睡觉须实际提交 body/sleep；hold 和闹钟都不会自动入睡。`;
  }
  restState(workspaceId: string) {
    const bound = this.currentBound(workspaceId); if (!bound) return;
    return {sleeping:bound.room.state.asleep === true,pending:bound.room.state.sleepPending === true};
  }
  snapshot(workspaceId: string): Promise<BehaviorSnapshot> {
    return this.enqueue(async validate => {
      const before=this.checked(workspaceId);await this.refreshEmotion(workspaceId);validate();
      const bound=this.checked(workspaceId);if(bound!==before)throw Error('身体工作区已切换');
      const execution=JSON.stringify(bound.room.plannedState());this.advanceRoom(bound);
      this.publish(execution===JSON.stringify(bound.room.plannedState())?'observation':'transition');
      const home=this.presentHome(bound.room.view());
      return {workspaceId,storageId:bound.storageId,bootId:this.bootId,revision:this.revision,
        autonomyEnabled:this.autonomous,behavior:this.activity(),home,needs:structuredClone(bound.room.state.needs),presentation:behaviorPresentation(home,this.expression),fault:this.fault ?? this.publicationFault ?? null,
        ...(bound.room.plannedState() ? {planned:bound.room.plannedState()} : {})};
    });
  }
  roomState(workspaceId: string) {
    return this.snapshot(workspaceId).then(value => ({...value.home,lifeEnabled:value.autonomyEnabled,
      identity:{displayName:this.host.workspace.runtime.identity().displayName},
      autonomyEnabled:value.autonomyEnabled,presentation:value.presentation,
      behavior:{...value.behavior,revision:value.revision,bootId:value.bootId}}));
  }
  roomAction(workspaceId: string, input: unknown, by = '伙伴', interaction?: RoomInteractionContext) {
    return this.enqueue(async validate => {
      const before=this.checked(workspaceId);await this.refreshEmotion(workspaceId);validate();
      const bound=this.checked(workspaceId);if(bound!==before)throw Error('身体工作区已切换');this.expression=undefined;this.advanceRoom(bound);
      const config=this.host.workspace.runtime?.config;
      const source=interaction ?? {requestId:randomUUID(),actor:{kind:by==='大肥鱼'?'companion':'owner',
        id:by==='大肥鱼'?(config?.companionId ?? 'companion'):(config?.ownerActorId ?? 'owner'),channel:'room'} as CompanionFactActor};
      const result = bound.room.act(input,by,Date.now(),source); this.publish();
      const behavior={...this.activity(),revision:this.revision,bootId:this.bootId};
      return {...result,home:{...this.presentHome(result.home),presentation:behaviorPresentation(result.home,this.expression)},behavior};
    });
  }
  act(workspaceId: string, action: string, requestId:string = randomUUID(), channel = 'desktop') {
    if (!actions.includes(action as typeof actions[number])) return Promise.reject(Error('未知的身体动作'));
    return this.roomAction(workspaceId,{action},'主人',{requestId,actor:{kind:'owner',id:this.host.workspace.runtime?.config?.ownerActorId ?? 'owner',channel}});
  }
  pendingFacts(workspaceId: string) {return this.enqueue(()=>this.checked(workspaceId).room.pendingFacts());}
  readFacts(workspaceId:string,ids:readonly string[]) {return this.enqueue(()=>this.checked(workspaceId).room.readFacts(ids));}
  acknowledgeFacts(workspaceId: string, ids: readonly string[]) {
    return this.enqueue(()=>{this.checked(workspaceId).room.acknowledgeFacts(ids);});
  }
  garden(workspaceId: string, operation: 'state'|'act'|'control', input?: unknown): Promise<ReturnType<CompanionRoom['garden']> & {home?: any}> {
    return this.enqueue(async validate => {
      const before=this.checked(workspaceId);await this.refreshEmotion(workspaceId);validate();
      const bound=this.checked(workspaceId);if(bound!==before)throw Error('身体工作区已切换');
      const execution=JSON.stringify(bound.room.plannedState());
      const result = bound.room.garden(operation,input);
      this.publish(operation==='state' && execution===JSON.stringify(bound.room.plannedState())?'observation':'transition');
      const behavior={...this.activity(),revision:this.revision,bootId:this.bootId};
      return {...result,behavior,...('home' in result && result.home ? {home:this.presentHome(result.home)} : {})};
    });
  }
  setAutonomy(workspaceId: string, enabled: boolean) {
    return this.enqueue(async validate => {
      const before=this.checked(workspaceId);await this.refreshEmotion(workspaceId);validate();
      const bound=this.checked(workspaceId);if(bound!==before)throw Error('身体工作区已切换');
      const admission=enabled?this.living.get('plan')?.bodyClockState?.(workspaceId):undefined;
      bound.room.setAutonomy(enabled,Date.now(),admission?.restoreElapsed); this.autonomous = enabled; this.publish();
    });
  }
  gardenClockState(workspaceId:string):boolean|undefined {
    return this.currentBound(workspaceId)?.room.gardenClockState();
  }
  private plannedCall<T>(workspaceId: string, work: (room: CompanionRoom) => T, validate:()=>void=()=>{},observation=false): Promise<T> {
    return this.enqueue(async admit => {
      const before=this.checked(workspaceId);await this.refreshEmotion(workspaceId);admit();
      const bound=this.checked(workspaceId);if(bound!==before)throw Error('身体工作区已切换');
      validate();const execution=JSON.stringify(bound.room.plannedState()),result=work(bound.room);this.awaitingRecovery=false;
      this.publish(observation && execution===JSON.stringify(bound.room.plannedState())?'observation':'transition');return result;
    });
  }
  consumeFood(workspaceId: string, input: {operationId: string; itemId: string; interaction?: RoomInteractionContext}, validate:()=>void=()=>{}): Promise<PlannedExecution> {
    return this.plannedCall(workspaceId,room=>room.consumeFood(input),validate);
  }
  readPlannedSegment(workspaceId: string, operationId: string, validate:()=>void=()=>{}) {
    return this.plannedCall(workspaceId,room=>room.readPlannedSegment(operationId),validate);
  }
  confirmPlannedReading(workspaceId: string, operationId: string, receiptToken: string, validate:()=>void=()=>{}) {
    return this.plannedCall(workspaceId,room=>room.confirmPlannedReading(operationId,receiptToken),validate);
  }
  startPlanned(workspaceId: string, input: PlannedActivity): Promise<PlannedExecution> {
    return this.plannedCall(workspaceId,room=>room.startPlanned(input));
  }
  inspectPlanned(workspaceId: string, operationId: string): Promise<PlannedExecution | undefined> {
    return this.plannedCall(workspaceId,room=>room.inspectPlanned(operationId),()=>{},true);
  }
  pausePlanned(workspaceId: string, operationId: string): Promise<PlannedExecution> {
    return this.plannedCall(workspaceId,room=>room.pausePlanned(operationId));
  }
  resumePlanned(workspaceId: string, operationId: string): Promise<PlannedExecution> {
    return this.plannedCall(workspaceId,room=>room.resumePlanned(operationId));
  }
  cancelPlanned(workspaceId: string, operationId: string): Promise<PlannedExecution> {
    return this.plannedCall(workspaceId,room=>room.cancelPlanned(operationId));
  }
  close(): Promise<void> {
    if(this.closing)return this.closing;
    this.closed = true; clearTimeout(this.timer);this.timer=undefined;this.deadlineAt=undefined;
    return this.closing=settleCleanup(...this.subscriptions.splice(0),async()=>{
      await this.serial;
      try {this.binding?.room.suspendAutonomy();}
      finally {
        try {this.binding?.room.flush();}
        finally {
          this.binding=undefined;
          if (owners.get(this.host) === this) owners.delete(this.host);
        }
      }
    });
  }
}
export const name = '25-Behavior';
export const inject = ['petCore'];
declare module '@deepseek-ai/cordis' {
  interface Context {petBehavior: CompanionBehavior}
  interface Events {'pet/behavior.changed'(value: BehaviorChange): void}
}
export function apply(ctx: Context) {
  const host=ctx.petCore;
  return mountLivingArea(ctx,host,'body',view=>new CompanionBehavior(ctx,host,view),(behavior,view)=>{
    behavior.activate();
    ctx.provide('petBehavior',behavior);
    const ports = host.native?.companionPorts;
    if (ports?.scopeFor(ctx, 'petBehavior'))
      return ports.register('bodyAvailable', () => view.lookup('body')?.value === behavior).revoke;
  });
}
