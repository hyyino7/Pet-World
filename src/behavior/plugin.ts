import type { Context } from '@deepseek-ai/cordis';
import { existsSync, lstatSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { buildHomePromptLine } from '#feiyu-home';
import { digest } from '../core/storage.js';
import type { PetCoreHost } from '../core/index.js';
import type { BehaviorActivity, BehaviorChange, BehaviorSnapshot, CompanionExpression } from '../contracts/behavior.js';
import { CompanionRoom } from './room.js';
import { behaviorPresentation } from './presentation.js';

interface Binding {id: string; path: string; storageId: string; room: CompanionRoom; fingerprint?: string}
const actions = ['feed', 'water', 'play', 'pet', 'sleep', 'wake'] as const;
const owners = new WeakMap<PetCoreHost, CompanionBehavior>();

/** The only home/garden runtime writer. It does not create agents or model turns. */
export class CompanionBehavior {
  private binding?: Binding;
  private serial: Promise<unknown> = Promise.resolve();
  private closed = false;
  private autonomous = false;
  private fault?: string;
  private revision = 0;
  private expression?: CompanionExpression;
  private subscriptions: (() => void)[] = [];
  readonly bootId = randomUUID();
  private timer: NodeJS.Timeout;
  constructor(private ctx: Context, private host: PetCoreHost) {
    if (owners.has(host)) throw Error('共享身体已由另一个组件实例管理');
    owners.set(host,this);
    this.timer = setInterval(() => {void this.enqueue(async () => {
      this.synchronize(); const bound=this.binding;
      if (bound) {
        await this.refreshEmotion(bound.id);
        if(this.currentBound(bound.id)!==bound)return;
        bound.room.tick(); this.publish();
      }
    }).catch(error => {this.fault = String(error);});}, 1000);
    this.timer.unref();
    const refresh = (workspaceId: string) => {void this.enqueue(async () => {
      this.synchronize(); const bound=this.currentBound(workspaceId); if(!bound)return;
      await this.refreshEmotion(workspaceId);
      if(this.currentBound(workspaceId)===bound)this.publish();
    }).catch(error=>{this.fault=String(error);});};
    this.subscriptions.push(ctx.on('pet/emotion.changed',workspaceId=>refresh(workspaceId)));
    this.subscriptions.push(ctx.on('pet/emotion.expression',event=>{
      this.synchronize(); if(!this.currentBound(event.workspaceId))return;
      this.expression={sessionId:event.sessionId,turn:event.turn,
        ...(event.action ? {action:event.action} : {}),...('actionLabel' in event && typeof event.actionLabel==='string' ? {actionLabel:event.actionLabel} : {}),
        ...(event.sticker ? {sticker:event.sticker} : {}),
        ...(event.feelings ? {feelings:[...event.feelings]} : {})};
      refresh(event.workspaceId);
    }));
    // Native optional-service lifecycle: reloading Behavior while Life already
    // runs must recover its current admission instead of staying paused.
    if(typeof ctx.inject==='function')ctx.inject(['petLife'],scope=>{
      const life=scope.petLife;
      const synchronize=()=>{void this.enqueue(async()=>{
        if(this.closed||this.ctx.get('petLife')!==life)return;
        this.synchronize();const bound=this.binding;if(!bound)return;
        await this.refreshEmotion(bound.id);
        if(this.currentBound(bound.id)!==bound)return;
        this.autonomous=life.running();bound.room.setAutonomy(this.autonomous);this.publish();
      }).catch(error=>{this.fault=String(error);});};
      scope.on('pet/life.changed',synchronize);synchronize();
      scope.effect(()=>()=>{void this.enqueue(()=>{
        if(this.closed||this.ctx.get('petLife')?.running())return;
        this.binding?.room.setAutonomy(false);this.autonomous=false;this.publish();
      }).catch(error=>{this.fault=String(error);});});
    });
  }
  private enqueue<T>(work: () => T | Promise<T>): Promise<T> {
    const next = this.serial.then(work); this.serial = next.catch(() => {}); return next;
  }
  private synchronize() {
    const status = this.host.workspace.status(), target = status.state === 'ready' ? status.target : null;
    const storageId = target ? this.host.workspace.storageId() : undefined;
    if (this.binding?.id === target?.id && this.binding?.path === target?.path && this.binding?.storageId === storageId) return;
    this.binding?.room.flush(); this.binding = undefined; this.autonomous = false; this.fault = undefined;this.expression=undefined;
    if (this.closed || !target || !storageId) return;
    let directory = target.path;
    for (const part of ['.chatpet','data','life']) {
      directory = join(directory, part);
      if (!existsSync(directory)) mkdirSync(directory, {mode:0o700});
      const stat = lstatSync(directory);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('身体数据目录无效');
    }
    const id = target.id;
    this.binding = {id, path:target.path, storageId,
      room:new CompanionRoom(directory, () => this.ctx.get('petEmotion')?.roomSnapshot(id))};
  }
  private checked(workspaceId: string) {
    this.synchronize();
    if (this.closed || !this.binding || this.binding.id !== workspaceId) throw Error('身体工作区已切换或组件已停止');
    return this.binding;
  }
  private activity(): BehaviorActivity {
    const state = this.binding?.room.state;
    if (!state) return {activityId:null, kind:'idle', phase:'idle'};
    const task = state.companionAction;
    const requested=task&&(!task.completedAt||(state.asleep&&task.action==='sleep'))?task.id:undefined;
    const automatic=state.route ? 'body:'+digest([state.route.departAt,state.route.arriveAt,state.route.target]) :
      state.dwell ? 'body:'+digest([state.dwell.until,state.dwell.target]) : state.asleep ? 'sleep:'+String(state.lastEventAt?.sleep??state.createdAt) : null;
    return {activityId:state.route?.target?.gardenJobId ?? state.dwell?.target?.gardenJobId ?? requested ?? automatic,
      kind:state.kind,
      phase:state.route ? 'moving' : state.asleep ? 'sleeping' : state.sleepPending || state.freeTarget || state.command ? 'pending' :
        state.dwell || state.reactionUntil > Date.now() ? 'working' : task?.completedAt ? 'completed' : 'idle'};
  }
  private publish() {
    const bound = this.binding; if (!bound) return;
    const {updatedAt:_updated,lastTickAt:_tick,...semantic} = bound.room.state;
    const fingerprint = digest([semantic,this.autonomous,bound.room.view().emotion,this.expression ?? null]);
    if (fingerprint === bound.fingerprint) return;
    bound.fingerprint = fingerprint; this.revision++;
    this.ctx.emit('pet/behavior.changed', {workspaceId:bound.id,bootId:this.bootId,revision:this.revision});
    this.ctx.get('petDesktop')?.features?.restore(false);
  }
  private currentBound(workspaceId: string) {
    const status = this.host.workspace.status(), bound = this.binding;
    return !this.closed && bound?.id === workspaceId && status.state === 'ready' && status.target?.id === workspaceId &&
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
    return buildHomePromptLine(bound.room.state,{now:Date.now(),allowActivity:true});
  }
  restState(workspaceId: string) {
    const bound = this.currentBound(workspaceId); if (!bound) return;
    return {sleeping:bound.room.state.asleep === true,pending:bound.room.state.sleepPending === true};
  }
  snapshot(workspaceId: string): Promise<BehaviorSnapshot> {
    return this.enqueue(async () => {
      const before=this.checked(workspaceId);await this.refreshEmotion(workspaceId);
      const bound=this.checked(workspaceId);if(bound!==before)throw Error('身体工作区已切换');this.publish();
      const home=bound.room.view();
      return {workspaceId,storageId:bound.storageId,bootId:this.bootId,revision:this.revision,
        autonomyEnabled:this.autonomous,behavior:this.activity(),home,presentation:behaviorPresentation(home,this.expression),fault:this.fault ?? null};
    });
  }
  roomState(workspaceId: string) {
    return this.snapshot(workspaceId).then(value => ({...value.home,lifeEnabled:value.autonomyEnabled,
      autonomyEnabled:value.autonomyEnabled,presentation:value.presentation,
      behavior:{...value.behavior,revision:value.revision,bootId:value.bootId}}));
  }
  roomAction(workspaceId: string, input: unknown, by = '伙伴') {
    return this.enqueue(async () => {
      const before=this.checked(workspaceId);await this.refreshEmotion(workspaceId);
      const bound=this.checked(workspaceId);if(bound!==before)throw Error('身体工作区已切换');this.expression=undefined;bound.room.tick();
      const result = bound.room.act(input,by); this.publish();
      const behavior={...this.activity(),revision:this.revision,bootId:this.bootId};
      return {...result,home:{...result.home,behavior,presentation:behaviorPresentation(result.home,this.expression)},behavior};
    });
  }
  act(workspaceId: string, action: string) {
    if (!actions.includes(action as typeof actions[number])) return Promise.reject(Error('未知的身体动作'));
    return this.roomAction(workspaceId,{action});
  }
  garden(workspaceId: string, operation: 'state'|'act'|'control', input?: unknown) {
    return this.enqueue(async () => {
      const before=this.checked(workspaceId);await this.refreshEmotion(workspaceId);
      const bound=this.checked(workspaceId);if(bound!==before)throw Error('身体工作区已切换');
      const result = bound.room.garden(operation,input); this.publish(); return result;
    });
  }
  setAutonomy(workspaceId: string, enabled: boolean) {
    return this.enqueue(async () => {
      const before=this.checked(workspaceId);await this.refreshEmotion(workspaceId);
      const bound=this.checked(workspaceId);if(bound!==before)throw Error('身体工作区已切换');
      bound.room.setAutonomy(enabled); this.autonomous = enabled; this.publish();
    });
  }
  async close() {
    this.closed = true; clearInterval(this.timer);
    for(const stop of this.subscriptions.splice(0))stop();
    try {await this.enqueue(() => {this.binding?.room.setAutonomy(false); this.binding?.room.flush(); this.binding = undefined;});}
    finally {if (owners.get(this.host) === this) owners.delete(this.host);}
  }
}
export const name = '25-Behavior';
export const inject = ['petCore'];
declare module '@deepseek-ai/cordis' {
  interface Context {petBehavior: CompanionBehavior}
  interface Events {'pet/behavior.changed'(value: BehaviorChange): void}
}
export function apply(ctx: Context) {
  const behavior = new CompanionBehavior(ctx,ctx.petCore); ctx.provide('petBehavior',behavior);
  ctx.effect(() => () => behavior.close());
}
