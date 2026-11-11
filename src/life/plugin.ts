import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { existsSync, lstatSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createLifeRuntime } from '#dsh-world/life/runtime';
import { createLifeStore, durableWrite } from '#dsh-world/life/lifeStore';
import { buildHomePromptLine } from '#feiyu-home';
import { registerWorldPrompt } from '../core/world-prompt.js';
import type { PetCoreHost } from '../core/index.js';
import { defaultLifePreferences, LifeLibrary, parseLifePreferences, type LifePreferences } from './library.js';
import {registerAlbumTools} from './album-tools.js';
import { installLifeReview, readLifeWriting, REVIEW_ALARM_FILE } from './review.js';
import { CompanionRoom } from './room.js';

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
interface Bound { id: string; path: string; directory: string; library: LifeLibrary; room: CompanionRoom }
const actions = ['feed', 'water', 'play', 'pet', 'sleep', 'wake'] as const;

/** The upstream fact layer is the only state writer. World owns scheduling,
 * journal and native home recovery; Core owns every model step and Memory. */
export class CompanionLife {
  private binding?: Bound;
  private runtime?: Runtime;
  private get state() { return this.binding?.room.state; }
  private enabled = false;
  private preferences: LifePreferences = {...defaultLifePreferences};
  private closed = false;
  private fault?: string;
  private serial: Promise<unknown> = Promise.resolve();
  private timer: NodeJS.Timeout;
  readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  constructor(private ctx: Context, private host: PetCoreHost, private preset: string) {
    host.native.lifeAdmission = (id, message) => this.running() && this.runtime?.isHome(id) === true && message.source.kind === 'dsh-world-life';
    registerAlbumTools(ctx,host,agent=>{
      const bound=this.binding;
      if (this.closed || !bound || this.isHome(agent.id) || this.current()?.id !== bound.id ||
        agent.session.header.agentPreset === 'chatpet-channel-guest' || this.ctx.get('petRoom')?.watching(agent.id)) return;
      return this.ctx.get('petWorld')?.sessionStatus(agent.session)?.state === 'ready' ? bound.library : undefined;
    });
    installLifeReview(ctx, host, () => {
      const workspace = this.current();
      if (!this.closed && workspace && this.binding?.id===workspace.id && this.binding.path===workspace.path) return {
        id: workspace.id, directory: this.binding.directory, sessionIds: workspace.sessionIds,
        isHome: (id: string) => this.isHome(id), timeZone: this.timeZone, running:this.running(),
      };
    });
    registerWorldPrompt(ctx, 'chatpet.life', 34, agent => {
      if (!this.running() || ctx.petWorld.sessionStatus(agent.session)?.state !== 'ready') return '';
      const body = buildHomePromptLine(this.state, {now: Date.now(), allowActivity: true});
      return [body, this.runtime?.isHome(agent.id) ?
        '这是你自己的生活会话。生活状态是虚拟生活的事实记录。使用 plan_next 安排下一次醒来，check_alarm 查看计划。需要主动找伙伴时使用 reach_out；不必每轮都主动发言。保持已有角色与记忆；不要把生活事件当成用户说过的话。' : ''].filter(Boolean).join('\n');
    });
    this.timer = setInterval(() => { void this.enqueue(() => this.tick()).catch(error => { this.fault = String(error); }); }, 1000);
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
  isHome(id: string) { return this.running() && this.runtime?.isHome(id) === true; }
  homeSessionId() { return this.running() ? this.runtime?.snapshot().homeSessionId : undefined; }
  /** Presentation reads the original body's two distinct states: walking to bed
   * can be cancelled, but the sleeping animation starts only after arrival. */
  restState(workspaceId: string) {
    if (this.closed || !this.enabled || this.binding?.id !== workspaceId ||
        this.current()?.path !== this.binding.path || !this.state) return;
    return {sleeping: this.state.asleep === true, pending: this.state.sleepPending === true};
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
    this.binding?.room.flush();
    this.binding?.library.close();
    this.binding = undefined; this.enabled = false; this.fault = undefined;
    const current = this.current();
    if (!current || this.closed) return;
    const directory = this.directory(current.path);
    for (const name of ['home.json', 'control.json', 'life.json']) this.safe(join(directory, name));
    const control = join(directory, 'control.json');
    const settings = existsSync(control) ? JSON.parse(readFileSync(control, 'utf8')) : {version: 1, enabled: false};
    if (settings.version !== 1 || typeof settings.enabled !== 'boolean') throw Error('生活开关文件无效，已保留原文件');
    this.enabled = settings.enabled;
    this.preferences = settings.preferences === undefined ? {...defaultLifePreferences} : parseLifePreferences(settings.preferences);
    this.binding = {id: current.id, path: current.path, directory, library: new LifeLibrary(directory, this.timeZone),
      room: new CompanionRoom(directory, () => this.ctx.get('petEmotion')?.roomSnapshot(current.id))};
  }
  private async startRuntime(resumed = false) {
    if (this.runtime || !this.binding || !this.enabled || this.closed) return;
    const bound = this.binding, native = this.native();
    this.ctx.get('petDesktop')?.features?.pause();
    await this.ctx.get('petTranscripts')?.restore();
    const selected = this.current();
    if (selected?.id !== bound.id || selected.path !== bound.path || this.closed || !this.enabled) return;
    const store = createLifeStore(bound.directory, this.timeZone);
    const runtime = createLifeRuntime({
      ctx: this.ctx, store,
      config: {worldId: this.host.workspace.storageId(), agentPreset: this.preset, timeZone: this.timeZone, companionName: this.host.workspace.runtime.identity().displayName},
      options: {worldDir: bound.directory, roomDir: bound.path, diaryDir: join(bound.directory, 'diary'), selfFile: join(bound.directory, 'self.md'), timeZone: this.timeZone,
        schedule: () => this.preferences, alarmFile: REVIEW_ALARM_FILE},
      dailyBudget: () => this.preferences.dailyBudget ?? undefined,
      photos: () => bound.library.album(),
      afterReview: () => {
        const id = store.read().homeSessionId;
        if (id && this.preferences.compactAfterReview && this.running()) this.ctx.emit('pet/life.review', id);
      },
      inWorkspace: id => this.current()?.id === bound.id && this.current()?.sessionIds.includes(id) === true && store.read().homeSessionId === id,
      alarmContext: () => buildHomePromptLine(this.state, {now: Date.now(), allowActivity: true}),
      host: {
        workspace: async () => {
          const current = this.current();
          if (current?.id !== bound.id || current.path !== bound.path) throw Error('生活工作区已切换');
          return current;
        },
        createSession: async (_cwd, agentPreset, workspaceId) => {
          if (this.current()?.id !== workspaceId || this.closed) throw Error('生活工作区已切换');
          return (await native.get('sessionController').create({workspaceId: bound.id, agentPreset})).sessionId;
        },
        resolveAgent: async id => {
          const result = await native.get('sessionController').resolveAgent(id);
          if (result.error) throw Error(result.error.message);
          return result.agent;
        },
        isArchived: id => native.get('workspaceRegistry')?.archivedSessionIds.includes(id) ?? false,
        rename: async (sessionId, title) => { await native.get('sessionController').rename({sessionId, title}); },
        origin: () => native.get('webServer')?.getOrigin() ?? '',
      },
      notifier: {outlets: [{name: '大肥鱼', kinds: ['reach'], send: async push => {
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
    try { await runtime.start({resumed}); } catch (error) { runtime.stop(); this.runtime = undefined; throw error; }
    this.ctx.emit('pet/life.changed');
  }
  private async stopRuntime() {
    const runtime = this.runtime;
    if (!runtime) return;
    this.runtime = undefined;
    this.ctx.emit('pet/life.changed');
    const id = runtime.snapshot().homeSessionId;
    runtime.stop();
    if (id) this.native().get('sessionController').cancel({sessionId: id});
    await runtime.settled();
  }
  private async tick() {
    if (this.closed) return;
    await this.synchronize();
    if (!this.enabled || !this.binding) return;
    this.binding.room.tick();
    this.publishRest();
    await this.startRuntime();
  }
  snapshot(workspaceId: string) {
    return this.enqueue(async () => {
      await this.synchronize();
      if (this.binding?.id !== workspaceId) throw Error('生活工作区已切换');
      const store = createLifeStore(this.binding.directory, this.timeZone);
      return {workspaceId, enabled: this.enabled, running: this.running(), timeZone: this.timeZone, preferences: {...this.preferences},
        home: this.binding.room.view(this.enabled ? Date.now() : this.state.lastTickAt), life: this.runtime?.snapshot() ?? store.read(),
        activity: store.activityDays().slice(0, 2).reverse().flatMap(day => store.activity(day)).slice(-20),
        fault: this.fault ?? null};
    });
  }
  control(workspaceId: string, enabled: boolean) {
    return this.enqueue(async () => {
      await this.synchronize();
      if (this.binding?.id !== workspaceId) throw Error('生活工作区已切换');
      const file = join(this.binding.directory, 'control.json'); this.safe(file);
      if (!enabled) this.binding.room.flush();
      durableWrite(file, JSON.stringify({version: 1, enabled, preferences: this.preferences}, null, 2));
      this.enabled = enabled; this.fault = undefined;
      if (enabled) { this.binding.room.tick(); this.publishRest(); await this.startRuntime(true); }
      else { this.publishRest(); await this.stopRuntime(); }
      return {enabled, running: this.running()};
    });
  }
  act(workspaceId: string, action: string) {
    if (!actions.includes(action as typeof actions[number])) return Promise.reject(Error('未知的生活动作'));
    return this.roomAction(workspaceId, {action});
  }
  /** Disabled Life leaves the optional Desktop component available on its own. */
  desktopRest(workspaceId: string, action: 'sleep' | 'wake') {
    return this.enqueue(async () => {
      const bound = await this.checkedBinding(workspaceId);
      if (this.enabled) return this.applyAction(bound, {action}, '伙伴');
    });
  }
  private async checkedBinding(workspaceId: string) {
    await this.synchronize();
    if (this.closed || this.binding?.id !== workspaceId || this.current()?.path !== this.binding.path) throw Error('生活工作区已切换');
    return this.binding;
  }
  private applyAction(bound: Bound, input: unknown, by: string) {
    if (!this.enabled) throw Error('请先开启当前工作区的生活');
    const now = Date.now();
    bound.room.tick(now);
    const result = bound.room.act(input, by, now);
    this.publishRest();
    return result;
  }
  roomAction(workspaceId: string, input: unknown, by = '伙伴') {
    return this.enqueue(async () => this.applyAction(await this.checkedBinding(workspaceId), input, by));
  }
  roomState(workspaceId: string) {
    return this.enqueue(async () => {
      const {room} = await this.checkedBinding(workspaceId);
      return {...room.view(this.enabled ? Date.now() : room.state.lastTickAt), lifeEnabled:this.enabled};
    });
  }
  garden(workspaceId: string, operation: 'state' | 'act' | 'control', input?: unknown) {
    return this.enqueue(async () => {
      const bound = await this.checkedBinding(workspaceId);
      const result = bound.room.garden(operation, input, this.enabled);
      this.publishRest();
      return result;
    });
  }
  settings(workspaceId: string, expected: unknown, next: unknown) {
    return this.enqueue(async () => {
      await this.synchronize();
      const bound = this.binding;
      if (!bound || bound.id !== workspaceId) throw {code: 'STALE_BINDING'};
      const before = parseLifePreferences(expected), preferences = parseLifePreferences(next);
      if (JSON.stringify(before) !== JSON.stringify(this.preferences)) throw {code: 'STALE_REVISION'};
      const file = join(bound.directory, 'control.json');
      this.safe(file);
      durableWrite(file, JSON.stringify({version: 1, enabled: this.enabled, preferences}, null, 2));
      this.preferences = preferences;
      if (before.wake !== preferences.wake || before.review !== preferences.review) this.runtime?.reschedule();
      return {preferences};
    });
  }
  library(workspaceId: string, operation: 'dates' | 'journal' | 'album' | 'photo' | 'forgetPhoto' | 'search', input?: unknown) {
    return this.enqueue(async () => {
      await this.synchronize();
      if (!this.binding || this.binding.id !== workspaceId) throw {code: 'STALE_BINDING'};
      const library = this.binding.library;
      const current = this.current();
      if (!current || current.id !== workspaceId) throw {code: 'STALE_BINDING'};
      const homeId = this.runtime?.snapshot().homeSessionId ?? createLifeStore(this.binding.directory, this.timeZone).read().homeSessionId;
      const scope = {id:workspaceId, directory:this.binding.directory, timeZone:this.timeZone, sessionIds:current.sessionIds,
        isHome:(id: string) => id === homeId};
      if (operation === 'dates') return library.dates();
      if (operation === 'journal' && typeof input === 'string') {
        const entry = library.journal(input);
        const diary = await readLifeWriting(this.host, scope, 'diary/' + input + '.md');
        return {...entry, diary:diary ?? null};
      }
      if (operation === 'search') {
        const {query, offset} = input as {query: string; offset: number};
        if (typeof query !== 'string' || !query.trim() || query.length > 256 || !Number.isSafeInteger(offset) || offset < 0) throw {code:'INVALID_ARGUMENT'};
        const dialogue = await this.host.native.memory?.dialogueForDay(workspaceId, current.sessionIds, {query, offset, timeZone:this.timeZone});
        const diaries = [];
        if (offset === 0) for (const date of library.dates()) {
          const content = await readLifeWriting(this.host, scope, 'diary/' + date + '.md');
          const at = content?.toLocaleLowerCase().indexOf(query.trim().toLocaleLowerCase()) ?? -1;
          if (content && at >= 0) diaries.push({date, excerpt:content.slice(Math.max(0, at - 50), at + 150)});
        }
        return {dialogue, diaries};
      }
      if (operation === 'album' && Number.isSafeInteger(input)) return library.album().list(12, input as number);
      if (typeof input !== 'string' || !/^photo-[a-z0-9-]{1,80}$/i.test(input)) throw {code: 'INVALID_ARGUMENT'};
      if (operation === 'forgetPhoto') { library.album().forget(input); return {removed: true}; }
      if (operation !== 'photo') throw {code: 'INVALID_ARGUMENT'};
      const image = library.album().image(input);
      if (!image) throw {code: 'NOT_FOUND'};
      return {mediaType: image.ref.mediaType, data: Buffer.from(image.data).toString('base64')};
    });
  }
  async close() {
    this.closed = true; clearInterval(this.timer);
    this.publishRest();
    this.host.native.lifeAdmission = undefined;
    await this.enqueue(async () => {
      try { await this.stopRuntime(); this.binding?.room.flush(); }
      finally { this.binding?.library.close(); }
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
  const life = new CompanionLife(ctx, ctx.petCore, config.agentPreset ?? 'standard');
  ctx.provide('petLife', life);
  ctx.effect(() => () => life.close());
}
