import {reviewDiaryStatus} from './review-completion.js';
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type {SessionId} from '@deepseek-ai/dsh-session';
import { existsSync, lstatSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {createHash} from 'node:crypto';
import { createLifeRuntime } from '#dsh-world/life/runtime';
import { createLifeStore, durableWrite } from '#dsh-world/life/lifeStore';
import { registerWorldPrompt } from '../core/native/prompt.js';
import type { PetCoreHost } from '../core/index.js';
import { resolveCompanionHome } from '../core/companion-foundation.js';
import { defaultLifePreferences, parseLifePreferences, type LifePreferences } from './library.js';
import type { CompanionRecordLibrary, RecordOperation } from '../core/records.js';
import { companionRecordPaths } from '../core/record-paths.js';
import { installLifeReview, REVIEW_ALARM_FILE } from './review.js';
import type {} from '../behavior/plugin.js';
import { PersistentLifePlan, parsePlanDraft } from './plan.js';
import { registerPlanTools } from './plan-tools.js';
import {presentFacts} from '../core/interaction-presentation.js';
import type { CompanionFact, CompanionFactSource } from '../contracts/interaction.js';
import { CONTRACT_VERSION } from '../contracts/version.js';
import {readFactReferences} from './facts.js';
import {createLifeSourceAdapter} from '../core/life-tool-policy.js';
import type {TableRegistration} from '../contracts/tables.js';

type Runtime = ReturnType<typeof createLifeRuntime>;
interface Workspace { id: string; path: string; sessionIds: readonly string[]; attachSession(id: string): Promise<void> }
interface Native {
  get(name: string): any;
  sessionController: {
    create(input: {workspaceId: string; agentPreset: string}): Promise<{sessionId: string}>;
    resolveAgent(id: string): Promise<{agent?: Agent; error?: {message: string}}>;
    rename(input: {sessionId: string; title: string}): Promise<unknown>;
    cancel(input: {sessionId: string}): unknown;
  };
}
interface Bound { id: string; path: string; directory: string; library: CompanionRecordLibrary; plan: PersistentLifePlan }
const actions = ['feed', 'water', 'play', 'pet', 'sleep', 'wake'] as const;

/** The upstream fact layer is the only state writer. World owns scheduling,
 * journal and native home recovery; Core owns every model step and Memory. */
export class CompanionLife {
  private binding?: Bound;
  private runtime?: Runtime;
  private enabled = false;
  private restoredClock = false;
  private preferences: LifePreferences = {...defaultLifePreferences};
  private closed = false;
  private fault?: string;
  private serial: Promise<unknown> = Promise.resolve();
  private timer?: NodeJS.Timeout;
  private subscriptions: (()=>void)[] = [];
  private sourceRegistration?: TableRegistration;
  readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  constructor(private ctx: Context, private host: PetCoreHost, private preset: string) {
    for(const dispose of registerPlanTools(ctx,host,this))ctx.effect(()=>dispose);
    installLifeReview(ctx, host, () => {
      const workspace = this.current();
      if (!this.closed && workspace && this.binding?.id===workspace.id && this.binding.path===workspace.path) return {
        id: workspace.id, directory: companionRecordPaths(workspace.path).directory, sessionIds: workspace.sessionIds,
        isHome: (id: string) => this.isHome(id), timeZone: this.timeZone, running:this.running(),
      };
    });
    registerWorldPrompt(ctx, 'chatpet.life', 34, agent => {
      if (!this.running() || ctx.petWorld.sessionStatus(agent.session)?.state !== 'ready') return '';
      return this.runtime?.isHome(agent.id) ?
        '这是你当前的自主规划投递会话，不是生活状态的存储位置。收到生活唤醒时先用 life_plan_read 读取持久计划及版本，然后实际保存本次考虑结果：需要改变意图用 life_plan_update；决定继续原活动或保持等待用 life_plan_keep，不重建活动；需要暂停或取消用 life_activity_control。没有计划时也由你决定，不必等主人逐项安排；想安静等待可保存有原因的空步骤计划并将 nextConsiderAt 设为 null。口头描述、读取状态或只设闹钟都不能代替保存生活意图。经济活动先用 pet_economy_state 查看真实目录、余额与库存；收菜、出售、补种和库存餐食都由你明确选择并写入计划，成熟不会自动处理。阅读步骤先取得该步原 operationId，再用 life_read_segment 接收实际文字，读到内容后用 life_read_confirm 确认原片段，动画或购买不能冒充阅读或读懂。根据兴趣和真实状态安排有原因的完整活动，不用密集动作清单替代生活。由程序持续执行已接受活动，模型回复结束或动画结束不代表活动结束。不必为了每个小动作再唤醒。允许长时间继续、休息或没有下一安排。hold、躺在床上和下次考虑时间都不会让身体入睡；决定睡觉时用 life_plan_update 明确安排 kind=body、action=sleep，再按需要接 hold 等待。入睡要以身体回执及 asleep 状态为准；失败时查看真实原因并修订或恢复原计划，不能用“睡了”的文字代替。有限活动全部完成后若未选下次考虑时间，会给你一次接续机会；你仍可明确选择等待，不会被反复催促。plan_next 设置同一计划下次考虑时间，check_alarm 查看。需要主动联系时用 reach_out，不必每轮发言；生活事件不是用户发言。普通主人聊天无需每轮重写计划。保持现有人设、自述和记忆。' : '';
    });
    const changed=()=>this.scheduleTick();
    this.subscriptions.push(ctx.on('pet/core.changed',changed),ctx.on('pet/behavior.changed',event=>{if(event.reason!=='observation')changed();}),
      ctx.on('pet/economy.fact',changed),ctx.on('pet/life.changed',changed));
    this.scheduleTick();
  }
  registerSource() {
    this.sourceRegistration = this.host.native.sourceTable.register(createLifeSourceAdapter(this.ctx,this.host,(id,message)=>
      this.running() && this.runtime?.isHome(id) === true && message.source.kind === 'dsh-world-life'
        && (!('facts' in message.source) || this.runtime.acceptsFactMessage(id,message))));
  }
  /** Domain changes and native alarms wake Life; an idle world needs no pump. */
  private scheduleTick() {
    if(this.closed || this.timer)return;
    this.timer=setTimeout(()=>{
      this.timer=undefined;
      void this.enqueue(()=>this.tick()).catch(error=>{this.fault=String(error);});
    },0);
    this.timer.unref();
  }
  private native() { return this.ctx as unknown as Native; }
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const next = this.serial.then(work); this.serial = next.catch(() => {}); return next;
  }
  private current() {
    const status = this.host.workspace.status();
    if (status.state !== 'ready' || !status.target) return;
    const workspace = this.native().get('workspaceRegistry')?.get(status.target.id) as Workspace | undefined;
    return workspace?.path === status.target.path ? workspace : undefined;
  }
  running() {
    const current = this.current();
    return !this.closed && this.enabled && !!this.runtime && current?.id === this.binding?.id && current?.path === this.binding?.path;
  }
  /** Saved clock intent is independent of native planner readiness. This read
   * never waits on Life's queue or initializes a missing control directory. */
  bodyClockState(workspaceId:string):{enabled:boolean;restoreElapsed:boolean}|undefined {
    if(this.closed)return;
    const current=this.current();if(!current||current.id!==workspaceId)return;
    if(this.binding?.id===current.id&&this.binding.path===current.path
      &&this.binding.plan.storageId===this.host.workspace.storageId())
      return {enabled:this.enabled,restoreElapsed:this.enabled&&this.restoredClock};
    let directory=current.path;
    for(const part of ['.chatpet','data','life']) {
      directory=join(directory,part);const stat=lstatSync(directory,{throwIfNoEntry:false});
      if(!stat)return {enabled:false,restoreElapsed:false};
      if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('生活时钟控制目录无效，原数据已保留');
    }
    const file=join(directory,'control.json');this.safe(file);
    if(!existsSync(file))return {enabled:false,restoreElapsed:false};
    const settings=JSON.parse(readFileSync(file,'utf8'));
    if(settings.version!==1||typeof settings.enabled!=='boolean')throw Error('生活开关文件无效，已保留原文件');
    if(settings.preferences!==undefined)parseLifePreferences(settings.preferences);
    return {enabled:settings.enabled,restoreElapsed:settings.enabled};
  }
  isHome(id: string) { return this.running() && this.runtime?.isHome(id) === true; }
  homeSessionId() { return this.running() ? this.runtime?.snapshot().homeSessionId : undefined; }
  /** Presentation reads the original body's two distinct states: walking to bed
   * can be cancelled, but the sleeping animation starts only after arrival. */
  restState(workspaceId: string) {
    return this.ctx.get('petBehavior')?.restState(workspaceId);
  }
  private publishRest() { this.ctx.get('petDesktop')?.features?.restore(false); }
  private safe(file: string) {
    if (existsSync(file)) {
      const stat = lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw Error('生活数据文件无效，已保留原文件');
    }
  }
  private directory(root: string) {
    let dir = root;
    for (const part of ['.chatpet', 'data', 'life']) {
      dir = join(dir, part);
      if (!existsSync(dir)) mkdirSync(dir, {mode: 0o700});
      const stat = lstatSync(dir);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('生活数据目录无效');
    }
    return dir;
  }
  private async synchronize() {
    const selected = this.current();
    if (selected?.id === this.binding?.id && selected?.path === this.binding?.path) return;
    await this.stopRuntime();
    this.binding = undefined; this.enabled = false; this.restoredClock=false;this.fault = undefined;
    const current = this.current();
    if (!current || this.closed) return;
    const directory = this.directory(current.path);
    for (const name of ['home.json', 'control.json', 'life.json']) this.safe(join(directory, name));
    const control = join(directory, 'control.json');
    const settings = existsSync(control) ? JSON.parse(readFileSync(control, 'utf8')) : {version: 1, enabled: false};
    if (settings.version !== 1 || typeof settings.enabled !== 'boolean') throw Error('生活开关文件无效，已保留原文件');
    this.enabled = settings.enabled;
    this.restoredClock=settings.enabled;
    this.preferences = settings.preferences === undefined ? {...defaultLifePreferences} : parseLifePreferences(settings.preferences);
    const storageId=this.host.workspace.storageId();
    this.binding = {id: current.id, path: current.path, directory, library: this.host.records.getLibrary(current.id),
      plan:new PersistentLifePlan(directory,this.host.workspace.runtime.identity().companionId,storageId,this.timeZone,()=>{
        const selected=this.current();
        return selected?.id===current.id && selected.path===current.path && this.host.workspace.storageId()===storageId;
      })};
  }
  private async startRuntime(resumed = false) {
    if (this.runtime || !this.binding || !this.enabled || this.closed) return;
    const bound = this.binding, native = this.native(), host = this.host;
    const active=()=>{
      const current=this.current();
      return !this.closed && this.enabled && current?.id===bound.id && current.path===bound.path && this.binding===bound
        && host.workspace.storageId()===bound.plan.storageId && host.workspace.runtime.identity().companionId===bound.plan.companionId;
    };
    const member=(id:string)=>active() && this.current()?.sessionIds.includes(id)===true
      && !native.get('workspaceRegistry')?.archivedSessionIds.includes(id) && !host.native.channelBoundary?.guest(id);
    this.ctx.get('petDesktop')?.features?.pause();
    await this.ctx.get('petTranscripts')?.restore();
    const selected = this.current();
    if (selected?.id !== bound.id || selected.path !== bound.path || this.closed || !this.enabled) return;
    // Foreground Room and Life share Core's single-flight opener. Its moveIn
    // records World's pending arrival, so reusing this home does not skip it.
    await resolveCompanionHome(this.ctx, this.host, this.preset);
    const store = createLifeStore(bound.directory, this.timeZone);
    const runtime = createLifeRuntime({
      ctx: this.ctx, store,
      config: {worldId: this.host.workspace.storageId(), agentPreset: this.preset, timeZone: this.timeZone, companionName: this.host.workspace.runtime.identity().displayName},
      names: {get companion() {return host.workspace.runtime.identity().displayName;}, partner:'伙伴'},
      options: {worldDir: bound.directory, roomDir: bound.path, diaryDir: bound.library.paths.diaryDir, selfFile: bound.library.paths.selfFile, timeZone: this.timeZone,
        schedule: () => this.preferences, alarmFile: REVIEW_ALARM_FILE},
      dailyBudget: () => this.preferences.dailyBudget ?? undefined,
      photos: () => bound.library.album(),
      reviewDiaryStatus: (day,session,messageId) => {
        if(!active() || !member(session.id))throw Error('Review workspace or home changed');
        return reviewDiaryStatus(host,{id:bound.id,directory:bound.library.paths.directory,timeZone:this.timeZone,
          sessionIds:this.current()!.sessionIds,isHome:id=>this.isHome(id)},day,session,messageId);
      },
      afterReview: () => {
        const id = store.read().homeSessionId;
        if (id && this.preferences.compactAfterReview && this.running()) this.ctx.emit('pet/life.review', id);
      },
      inWorkspace: id => this.current()?.id === bound.id && this.current()?.path===bound.path
        && this.current()?.sessionIds.includes(id) === true && !host.native.channelBoundary?.guest(id),
      alarmContext: () => [this.ctx.get('petBehavior')?.promptLine(bound.id),bound.plan.summary()].filter(Boolean).join('\n'),
      hasCurrentPlan: () => !!bound.plan.read().plan,
      requirePlanningDecision: true,
      planningRepairAttempts: () => this.preferences.planningRepairAttempts ?? 1,
      // Native alarm tools and failure retries must share the same intent
      // queue as plan replacement, body controls and the execution tick.
      // Keep the hooks below synchronous: the runtime queues the whole change.
      serializePlanChange: work => this.enqueue(async () => {
        if(!active() || this.runtime!==runtime)throw Error('生活工作区或执行通道已变化，请刷新当前计划');
        return work();
      }),
      setNextConsideration: (at,note,reason) => bound.plan.setNextConsideration(at,note,reason),
      onPlanningFailure: (at,reason) => bound.plan.retryAt(at,reason),
      facts: {
        pending:async()=> (await this.pendingFacts(bound,active)).map(fact=>({domain:fact.domain,id:fact.id})),
        read:async refs=>{
          const facts=await readFactReferences(bound.id,refs,domain=>this.factSource(domain),()=>{
            if(!active())throw Error('互动事实工作区已切换');
          });
          return {facts,text:presentFacts(facts)};
        },
        confirmAdmission:async(sessionId,messageId,sourceDigest)=>{
          if(!active() || !this.current()?.sessionIds.includes(sessionId))throw Error('原互动事实会话已离开绑定工作区');
          const matches=(events:readonly any[])=>events.some(event=>event.type==='user/message' && event.data.id===messageId
            && createHash('sha256').update(JSON.stringify(event.data.source)).digest('hex')===sourceDigest);
          const session=this.ctx.sessions.get(sessionId as SessionId);
          if(session) {
            if(!await this.ctx.sessions.flush(session))throw Error('原互动事实的原生记录尚未持久化');
            if(!active())throw Error('原互动事实工作区已切换');
            return matches(session.snapshotEvents());
          }
          // An archived/disposed home need not be reactivated merely to finish
          // acknowledgement. Read its original native log without another agent.
          const reader=await native.get('sessionPersistence').open(sessionId,'read');
          try {
            const events=(await reader.read()).events;
            if(!active())throw Error('原互动事实工作区已切换');
            return matches(events);
          }
          finally {await reader.close();}
        },
        acknowledge:async refs=>{
          for(const domain of ['body','economy'] as const) {
            const ids=refs.filter(ref=>ref.domain===domain).map(ref=>ref.id);if(!ids.length)continue;
            if(!active())throw Error('互动事实工作区已切换');
            const source=this.factSource(domain);if(!source)throw Error('互动事实所属组件暂不可用');
            await source.acknowledgeFacts(bound.id,ids);
            if(!active() || this.factSource(domain)!==source)throw Error('互动事实所属组件已变化');
          }
        },
      },
      host: {
        workspace: async () => {
          const current = this.current();
          if (current?.id !== bound.id || current.path !== bound.path) throw Error('生活工作区已切换');
          return current;
        },
        createSession: async (_cwd, agentPreset, workspaceId) => {
          if (!active() || workspaceId!==bound.id) throw Error('生活工作区已切换');
          const created=await native.get('sessionController').create({workspaceId: bound.id, agentPreset});
          if(!member(created.sessionId))throw Error('生活会话不属于当前工作区');
          return created.sessionId;
        },
        resolveAgent: async id => {
          if(!member(id))throw Error('生活会话不属于当前工作区');
          const result = await native.get('sessionController').resolveAgent(id);
          if(!member(id))throw Error('生活工作区已切换');
          if (result.error) throw Error(result.error.message);
          return result.agent;
        },
        isArchived: id => native.get('workspaceRegistry')?.archivedSessionIds.includes(id) ?? false,
        rename: async (sessionId, title) => {
          if(!member(sessionId))throw Error('生活会话不属于当前工作区');
          await native.get('sessionController').rename({sessionId, title});
          if(!active())throw Error('生活工作区已切换');
        },
        origin: () => native.get('webServer')?.getOrigin() ?? '',
      },
      notifier: {outlets: [{get name() {return host.workspace.runtime.identity().displayName || '伙伴';}, kinds: ['reach'], send: async push => {
        if (!this.running()) throw Error('生活已停止');
        if (this.host.workspace.runtime.policy().quiet) throw Error('安静模式中，主动消息未发送');
        const desktop = this.ctx.get('petDesktop');
        let delivered = false;
        if (desktop && (desktop.presentationAvailable?.() ?? desktop.status().running)) {
          try { desktop.presentLife(push.text,push.image); delivered = true; }
          catch (error) { this.ctx.logger.warn('Life presentation delivery failed',error); }
        }
        const results = await this.ctx.get('petChannels')?.reach(bound.id, push) ?? [];
        if (!delivered && !results.some(result => result.status === 'fulfilled')) throw Error('当前没有送达主动消息的渠道');
      }}]},
    });
    this.runtime = runtime;
    try {
      await runtime.start({resumed});
    } catch (error) {
      runtime.stop(); this.runtime = undefined;
      throw error;
    }
    this.ctx.emit('pet/life.changed');
  }
  private async stopRuntime(pauseIntent=false) {
    const runtime = this.runtime;
    let bodyError:unknown;
    try {
      const current=this.current();
      if(pauseIntent&&this.binding&&current?.id===this.binding.id&&current.path===this.binding.path) {
        const saved=this.binding.plan.read();
        if(saved.plan && ['active','waiting'].includes(saved.plan.status)) {
          await this.binding.plan.control(saved.revision,'pause','Autonomous life paused',this.ctx.get('petBehavior'),current.id);
          this.binding.plan.markAutoResume(true);
        }
        await this.ctx.get('petBehavior')?.setAutonomy(this.binding.id,false);
      }
    }catch(error){bodyError=error;}
    this.runtime = undefined;
    // A stale or unavailable optional body must never prevent cancellation of
    // the old native home after rebinding or during component disposal.
    if(runtime){
      this.ctx.emit('pet/life.changed');
      const id=runtime.snapshot().homeSessionId;runtime.stop();
      if(id)this.native().get('sessionController').cancel({sessionId:id});
      await runtime.settled();
    }
    if(bodyError)throw bodyError;
  }
  private async tick() {
    if (this.closed) return;
    await this.synchronize();
    if (!this.enabled || !this.binding) return;
    const bound=this.binding;
    const behavior=this.ctx.get('petBehavior');
    let advanced=false;
    let continueAccepted=false;
    if(bound && behavior) {
      await this.resumeAcceptedPlan(bound);
      const before=bound.plan.read().plan;
      advanced=await bound.plan.advance(bound.id,behavior);
      const after=bound.plan.read().plan;
      // A consumed completion transition must schedule the next accepted step
      // itself. No new model consideration or unrelated domain event is needed.
      continueAccepted=!!before && after?.id===before.id && after.cursor>before.cursor
        && after.status==='active' && after.cursor<after.steps.length && !after.replanReason;
      // Body work already committed. Optional native startup/observer failures
      // must not consume the only continuation of this accepted queue.
      if(continueAccepted)this.scheduleTick();
      await behavior.setReconsiderConditions(bound.id,bound.plan.read().plan?.reconsiderWhen ?? []);
    }
    await this.startRuntime();
    if(advanced)this.runtime?.reschedulePlan();
    this.runtime?.notifyFacts();
  }
  private async resumeAcceptedPlan(bound:Bound) {
    const current=this.current();
    if(!this.enabled||this.closed||this.binding!==bound||current?.id!==bound.id||current.path!==bound.path)return;
    const saved=bound.plan.read();
    if(saved.plan?.resumeOnEnable&&saved.plan.status==='paused') {
      await bound.plan.control(saved.revision,'resume','Autonomous life resumed',this.ctx.get('petBehavior'),bound.id);
      bound.plan.markAutoResume(false);
    }
  }
  private factSource(domain:'body'|'economy'): CompanionFactSource|undefined {
    return this.ctx.get(domain==='body'?'petBehavior':'petEconomy') as CompanionFactSource|undefined;
  }
  private async pendingFacts(bound:Bound,active:()=>boolean):Promise<CompanionFact[]> {
    if(!active())throw Error('互动事实工作区已切换');
    const sources=(['body','economy'] as const).map(domain=>({domain,source:this.factSource(domain)}));
    const results=await Promise.all(sources.map(async({domain,source})=>{
      if(!source?.pendingFacts)return [];
      const facts=await source.pendingFacts(bound.id);
      if(!active() || this.factSource(domain)!==source)throw Error('互动事实所属组件已变化');
      return facts;
    }));
    return results.flat().sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt)||a.id.localeCompare(b.id));
  }
  snapshot(workspaceId: string) {
    return this.enqueue(async () => {
      await this.synchronize();
      if (this.binding?.id !== workspaceId) throw Error('生活工作区已切换');
      const store = createLifeStore(this.binding.directory, this.timeZone);
      return {workspaceId, enabled: this.enabled, running: this.running(), timeZone: this.timeZone, preferences: {...this.preferences},
        home: await this.ctx.get('petBehavior')?.roomState(workspaceId) ?? null, life: this.runtime?.snapshot() ?? store.read(),
        activity: store.activityDays().slice(0, 2).reverse().flatMap(day => store.activity(day)).slice(-20),
        fault: this.fault ?? null};
    });
  }
  /** Synchronous, read-only prompt projection; no implicit scheduling or model calls. */
  currentPlanSummary(workspaceId:string) {
    const current=this.current(),bound=this.binding;
    if(current?.id!==workspaceId)return '';
    let summary:string;
    if(bound?.id===workspaceId && bound.path===current.path)summary=bound.plan.summary();
    else {
      // Prompt assembly may occur inside native Life startup. Do not enqueue
      // behind startup or create files: read the already persisted record only.
      const file=join(current.path,'.chatpet','data','life','life.json');this.safe(file);
      if(!existsSync(file))summary=JSON.stringify({revision:0,plan:null});
      else {
        if(lstatSync(file).size>64*1024)throw Error('生活状态超出可读取范围，原文件已保留');
        const state=JSON.parse(readFileSync(file,'utf8'));
        summary=PersistentLifePlan.describe(PersistentLifePlan.decode(state,this.host.workspace.runtime.identity().companionId,this.host.workspace.storageId()));
      }
    }
    return `【当前生活计划】自主生活${this.running()?'运行中':'未运行'}。以下是持久计划与实际执行回执；意图不等于完成。\n${summary}`;
  }
  private async checkedPlan(workspaceId:string) {
    await this.synchronize();
    if(!this.binding || this.binding.id!==workspaceId)throw Error('生活工作区已切换');
    return this.binding;
  }
  readPlan(workspaceId:string,validate:()=>void=()=>{}) {
    return this.enqueue(async()=>{
      const bound=await this.checkedPlan(workspaceId);validate();
      return {enabled:this.enabled,running:this.running(),...bound.plan.read()};
    });
  }
  updatePlan(workspaceId:string,expectedRevision:number,raw:unknown,validate:()=>void=()=>{}) {
    const draft=parsePlanDraft(raw);
    return this.enqueue(async()=>{
      const bound=await this.checkedPlan(workspaceId);validate();
      const result=await bound.plan.commit(expectedRevision,draft,this.ctx.get('petBehavior'),workspaceId,validate);
      this.runtime?.reschedulePlan();this.ctx.emit('pet/life.changed');
      return {enabled:this.enabled,running:this.running(),...result};
    });
  }
  keepPlan(workspaceId:string,expectedRevision:number,reason:string,nextConsiderAt:string|null,validate:()=>void=()=>{}) {
    return this.enqueue(async()=>{
      const bound=await this.checkedPlan(workspaceId);validate();
      const result=bound.plan.keep(expectedRevision,reason,nextConsiderAt);
      this.runtime?.reschedulePlan();this.ctx.emit('pet/life.changed');return result;
    });
  }
  private checkReadingPlan(bound:Bound,expectedRevision:number,operationId:string,allowCompleted=false) {
    const current=bound.plan.read(),plan=current.plan;
    const active=plan?.operationId===operationId && plan.steps[plan.cursor]?.kind==='read';
    const completed=allowCompleted && plan?.steps.slice(0,plan.cursor).some(step=>step.kind==='read' && operationId===`life:${plan.id}:${step.id}`);
    if(current.revision!==expectedRevision || !plan || !(active || completed)
      || !['active','waiting'].includes(plan.status))throw Error('Reading requires the current plan revision and its active original reading operation');
    if(!this.running())throw Error('Resume autonomous Life before progressing a planned reading activity');
    return plan;
  }
  readPlannedSegment(workspaceId:string,expectedRevision:number,operationId:string,validate:()=>void=()=>{}) {
    return this.enqueue(async()=>{
      const bound=await this.checkedPlan(workspaceId);
      const guard=()=>{validate();this.checkReadingPlan(bound,expectedRevision,operationId);};guard();
      const segment=await this.behavior().readPlannedSegment(workspaceId,operationId,guard);guard();
      return {...segment,operationId,confirmation:'Read this actual text before calling life_read_confirm with the returned receiptToken. Receiving an animation or owning the item does not advance the bookmark or establish understanding.'};
    });
  }
  confirmPlannedReading(workspaceId:string,expectedRevision:number,operationId:string,receiptToken:string,validate:()=>void=()=>{}) {
    return this.enqueue(async()=>{
      const bound=await this.checkedPlan(workspaceId);
      const guard=()=>{validate();this.checkReadingPlan(bound,expectedRevision,operationId,true);};guard();
      const execution=await this.behavior().confirmPlannedReading(workspaceId,operationId,receiptToken,guard);guard();
      // Completion is still accounted by the same persistent-plan executor.
      // The tool's confirmation records actual text receipt, never comprehension.
      await bound.plan.advance(workspaceId,this.behavior());validate();
      this.runtime?.reschedulePlan();this.ctx.emit('pet/life.changed');return {execution,...bound.plan.read()};
    });
  }
  controlPlan(workspaceId:string,expectedRevision:number,action:'pause'|'resume'|'cancel',reason:string,validate:()=>void=()=>{}) {
    if(!['pause','resume','cancel'].includes(action) || typeof reason!=='string' || !reason.trim())throw Error('Invalid life activity control');
    return this.enqueue(async()=>{
      const bound=await this.checkedPlan(workspaceId);validate();
      if(action==='resume' && !this.running())throw Error('Enable autonomous Life before resuming; this tool does not change that setting');
      const result=await bound.plan.control(expectedRevision,action,reason,this.ctx.get('petBehavior'),workspaceId,validate);
      this.runtime?.reschedulePlan();this.ctx.emit('pet/life.changed');return result;
    });
  }
  control(workspaceId: string, enabled: boolean) {
    return this.enqueue(async () => {
      await this.synchronize();
      if (this.binding?.id !== workspaceId) throw Error('生活工作区已切换');
      const file = join(this.binding.directory, 'control.json'); this.safe(file);
      durableWrite(file, JSON.stringify({version: 1, enabled, preferences: this.preferences}, null, 2));
      this.enabled = enabled;this.restoredClock=false;this.fault = undefined;
      // Body observes committed intent now, before native home/model startup.
      this.ctx.emit('pet/life.changed');
      if (enabled) {
        await this.resumeAcceptedPlan(this.binding);
        await this.startRuntime(true);
      }
      else { this.publishRest(); await this.stopRuntime(true); }
      return {enabled, running: this.running()};
    });
  }
  act(workspaceId: string, action: string, requestId?:string, channel='settings') {
    if (!actions.includes(action as typeof actions[number])) return Promise.reject(Error('未知的生活动作'));
    return this.behavior().act(workspaceId,action,requestId,channel);
  }
  /** Compatibility methods delegate; Behavior remains available after Life unload. */
  desktopRest(workspaceId: string, action: 'sleep' | 'wake') {
    return this.behavior().act(workspaceId, action);
  }
  private behavior() {
    const behavior = this.ctx.get('petBehavior');
    if (!behavior) throw Error('共享身体组件尚未启用');
    return behavior;
  }
  roomAction(workspaceId: string, input: unknown, by = '伙伴') {
    return this.behavior().roomAction(workspaceId, input, by);
  }
  roomState(workspaceId: string) { return this.behavior().roomState(workspaceId); }
  garden(workspaceId: string, operation: 'state' | 'act' | 'control', input?: unknown) {
    return this.behavior().garden(workspaceId, operation, input);
  }
  settings(workspaceId: string, expected: unknown, next: unknown) {
    return this.enqueue(async () => {
      await this.synchronize();
      const bound = this.binding;
      if (!bound || bound.id !== workspaceId) throw {code: 'STALE_BINDING'};
      const preferences = parseLifePreferences(next);
      if (JSON.stringify(parseLifePreferences(expected)) !== JSON.stringify(this.preferences)) throw {code: 'STALE_REVISION'};
      const before = this.preferences;
      const file = join(bound.directory, 'control.json');
      this.safe(file);
      durableWrite(file, JSON.stringify({version: 1, enabled: this.enabled, preferences}, null, 2));
      this.preferences = preferences;
      if (before.wake !== preferences.wake || before.review !== preferences.review) this.runtime?.reschedule();
      return {preferences};
    });
  }
  library(workspaceId: string, operation: RecordOperation, input?: unknown) {
    return this.host.records.library(workspaceId, operation, input);
  }
  async close() {
    this.closed = true; clearTimeout(this.timer);this.timer=undefined;
    const revoked=this.sourceRegistration?.revoke();
    for(const stop of this.subscriptions.splice(0))stop();
    this.publishRest();
    await revoked;
    await this.enqueue(async () => {
      try { await this.stopRuntime(); }
      finally { this.binding = undefined; }
    });
  }
}

export const name = '40-Life';
export const inject = ['petCore', 'petWorld', 'agents', 'sessions', 'tools', 'systemPrompt'];
export interface Config { agentPreset?: string }
declare module '@deepseek-ai/cordis' {
  interface Context { petLife: CompanionLife }
  interface Events { 'pet/life.review'(sessionId: string): void; 'pet/life.changed'(): void }
}
export function apply(ctx: Context, config: Config = {}) {
  const host = ctx.petCore;
  const life = new CompanionLife(ctx, host, config.agentPreset ?? 'standard');
  ctx.provide('petLife', life);
  ctx.effect(() => () => life.close());
  life.registerSource();
  ctx.effect(() => host.workspace.runtime.capabilityTable.register({
    id: 'life.pursuits', owner: 'life', contractVersion: CONTRACT_VERSION, order: 3,
    status: () => {
      const bound = host.workspace.status().state === 'ready';
      const running = bound && life.running();
      return {
        state: bound ? running ? 'ready' : 'disabled' : 'unavailable',
        reason: bound ? running ? null : 'Life is paused' : 'Bind a workspace to start Life',
        supportedOperations: ['start', 'stop', 'inspect', 'interact'],
      };
    },
  }).revoke);
}
