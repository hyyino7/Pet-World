import { DesktopImages } from './images.js';
import { existsSync, lstatSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Context } from '@deepseek-ai/cordis';
import type { PetCoreHost } from '../core/index.js';

// All feature algorithms live in the pinned upstream modules. This adapter
// binds them to native services and the single companion Repo, without HTTP
// listeners, a second conversation history or another Memory writer.
const upstream = (file: string): Promise<any> => import('./upstream/host/' + file + '.js');
export class DesktopFeatures {
  private todosByRoot = new Map<string, any>();
  private standaloneSleep = new Set<string>();
  private shownRest?: {path: string; sleeping: boolean; pending: boolean};
  readonly images: DesktopImages;
  private whispering?: Promise<any>;
  private lastWhisper = Date.now();
  private lastDream = Date.now();
  private lastBalance = Date.now();
  private checking = false;
  private closed = false;
  private timer: NodeJS.Timeout;
  private maintenance?: Promise<void>;
  private generation?: AbortController;
  constructor(private ctx: Context, private host: PetCoreHost,
    private publish: (type: string, value: unknown) => void, private available: () => boolean,
    private busy: () => boolean) {
    this.images = new DesktopImages(host, () => this.get('attachments'));
    this.timer = setInterval(() => {if(!this.maintenance)this.maintenance=this.tick().finally(()=>{this.maintenance=undefined;});}, 1000); this.timer.unref();
  }
  private get(name: string): any { return this.ctx.get(name as never); }
  private target() {
    const state = this.host.workspace.status();
    if (state.state !== 'ready' || !state.target) throw Error('请先绑定并初始化工作区');
    return state.target;
  }
  private same(path: string) { return !this.closed && this.available() && this.host.workspace.status().target?.path === path; }
  private async todos() {
    const root = this.target().path;
    let dir = root;
    for (const part of ['.chatpet', 'data', 'desktop']) {
      dir = join(dir, part);
      if (!existsSync(dir)) mkdirSync(dir, {mode:0o700});
      if (!lstatSync(dir).isDirectory() || lstatSync(dir).isSymbolicLink()) throw Error('桌宠数据路径无效');
    }
    const file = join(dir, 'todos.json');
    const types = await upstream('todo/types');
    for (const candidate of [file,file+'.tmp']) {
      if (existsSync(candidate)) {const stat=lstatSync(candidate);if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)throw Error('待办文件无效');}
    }
    if (existsSync(file)) {
      const stat = lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw Error('待办文件无效');
      const raw = JSON.parse(readFileSync(file, 'utf8'));
      if (raw.version !== 1 || !Array.isArray(raw.todos) || types.parseTodoFile(raw).length !== raw.todos.length) throw Error('待办文件损坏，已保留原文');
    }
    let store = this.todosByRoot.get(root);
    if (!store) {
      const {TodoStore} = await upstream('todo/store');
      store = new TodoStore({file,log:this.ctx.logger('chatpet-desktop')}); this.todosByRoot.set(root,store);
    }
    return store;
  }
  restoreImages() {return this.images.restore();}
  private rest(target: {id: string; path: string}) {
    return this.ctx.get('petLife')?.restState?.(target.id) ??
      {sleeping: this.standaloneSleep.has(target.path), pending: false};
  }
  restore(force = true) {
    const target = this.host.workspace.status().target;
    if (this.closed || !target) return;
    const {sleeping, pending} = this.rest(target);
    const old = this.shownRest;
    if (!force && old?.path === target.path && old.sleeping === sleeping && old.pending === pending) return;
    this.shownRest = {path: target.path, sleeping, pending};
    if (old?.path !== target.path || old.sleeping !== sleeping) this.lastDream = Date.now();
    this.publish('sleep', sleeping ? {sleeping, pending, start:'sleep-start',loop:'sleep-loop',end:'sleep-end'} : {sleeping, pending});
  }
  async request(input: {path?: unknown; method?: unknown; body?: unknown}) {
    if(this.closed)throw Error('桌宠组件正在关闭');
    const target = this.target();
    const path = String(input.path ?? ''), method = String(input.method ?? 'GET');
    const url = new URL(path, 'https://pet.local/');
    const rest = url.pathname.replace(/^\//, '');
    if (['voice/hear','voice/speak','voice/voices'].includes(rest)) {
      const service = this.ctx.get('petVoice');
      if (!service) throw Error('语音组件尚未启用');
      const result = await service.handle({rest,method,body:typeof input.body === 'string' ? input.body : undefined});
      if (!this.same(target.path)) throw Error('桌宠工作区已切换');
      return result.kind === 'file' ? {audio:readFileSync(result.file).toString('base64'), mediaType:result.contentType} : result.obj;
    }
    if (rest === 'todos' || /^todos\/[A-Za-z0-9_-]+$/.test(rest)) {
      const {handleTodoRoutes} = await upstream('routes/todos');
      const result = await handleTodoRoutes({todos:await this.todos(),log:this.ctx.logger('chatpet-desktop')},
        {rest,method,body:typeof input.body === 'string' ? input.body : undefined});
      return result?.obj ?? {ok:false,message:'不支持的待办请求'};
    }
    if (method !== 'POST') throw Error('不支持的操作');
    if (rest === 'whisper') return this.whisper(url.searchParams.get('image') ?? undefined);
    if (rest === 'balance') return this.balance();
    if (rest === 'sleep' || rest === 'wake') {
      const result = await this.ctx.get('petLife')?.desktopRest?.(target.id, rest);
      if (this.closed || this.host.workspace.status().target?.path !== target.path) throw Error('桌宠工作区已切换');
      if (!result) {
        if (rest === 'sleep') this.standaloneSleep.add(target.path);
        else this.standaloneSleep.delete(target.path);
      }
      this.restore(false);
      if (!result || result.changed) {
        if (this.rest(target).pending) this.publish('notice', {text: result?.home.her.activity});
        else this.publish('sleep-text', {sleeping: this.rest(target).sleeping});
      }
      return {ok:true};
    }
    throw Error('此功能尚未接入：' + rest);
  }
  async balance() {
    const root = this.target().path;
    const model = this.get('agentDefaultModel')?.currentSelection();
    if (!model?.provider) throw Error('当前对话未配置服务商');
    const {queryBalance} = await upstream('balance/index');
    const result = await queryBalance(model.provider,
      async (ref: string) => (await this.get('credentials')?.resolve(ref))?.value,
      this.get('deepseekAccount') ? () => this.get('deepseekAccount').getBalance({version:'0.0.0',locale:'zh-CN',timezoneOffsetSeconds:-new Date().getTimezoneOffset()*60}) : undefined);
    if (this.same(root)) this.publish('balance', result);
    return result;
  }
  async whisper(image?: string, dream = false) {
    if (this.whispering) return this.whispering;
    const target = this.target();
    if (this.rest(target).sleeping && !dream) throw Error('大肥鱼正在睡觉，先叫醒再聊吧');
    if (this.busy()) throw Error('正在回复，等这一轮结束再碎碎念吧');
    const root = target.path;
    const catalog = JSON.parse(readFileSync(new URL('../../../src/desktop/assets/catalog.json', import.meta.url),'utf8'));
    const abort = new AbortController(); this.generation = abort;
    const run = async () => {
      const {generateWhisper, SLEEP_TALK_INSTRUCTION} = await upstream('whisper');
      const {pickMeme, matchMeme} = await upstream('memes');
      const pool = catalog.stickers.map((item: {id: string; description: string}) => ({name: item.id, desc: item.description}));
      const forced = image && matchMeme(pool, image);
      if (image && !forced) throw Error('没有这张贴图');
      const meme = forced || (!dream && this.host.workspace.companionSettings().desktopWhisperImageEnabled && pickMeme(pool));
      if (abort.signal.aborted || !this.same(root)) throw Error('碎碎念已取消');
      const llm = this.get('llm');
      const nativeLlm = llm && {resolveModelInfo:llm.resolveModelInfo?.bind(llm),stream:(options: any) => llm.stream({...options,signal:AbortSignal.any([options.signal,abort.signal])})};
      const result = await generateWhisper({llm:nativeLlm,agentDefaultModel:this.get('agentDefaultModel')}, {
        system:this.host.native.context().identity,
        ...(dream ? {instruction:SLEEP_TALK_INSTRUCTION} : {}),
        ...(meme ? {meme} : {}),
      });
      if (this.same(root) && !abort.signal.aborted) {
        if (result.ok) this.publish('say',{text:result.text,sticker:result.image,automatic:true,whisper:!dream,dream});
        else this.publish('notice',{text:result.message ?? '碎碎念生成失败'});
      }
      return result;
    };
    if (dream) this.lastDream = Date.now();
    else this.lastWhisper = Date.now();
    this.whispering = run().finally(() => {this.whispering=undefined;this.generation=undefined;});
    return this.whispering;
  }
  private async tick() {
    if (this.checking || this.closed || !this.available() || this.busy() || this.host.workspace.runtime.policy().quiet) return;
    this.checking = true;
    try {
      const target = this.target(), root = target.path, now = Date.now(), settings = this.host.workspace.companionSettings();
      const {sleeping} = this.rest(target);
      const todos = await this.todos(), policy = await upstream('todo/policy');
      for (const todo of sleeping ? [] : await todos.list()) {
        const due = policy.nextReminderAt(todo,now);
        if (due !== null && due <= now && this.same(root)) {
          this.publish('say',{text:policy.reminderText(todo,now),reminder:true});
          await todos.markReminded(todo.id,now); break;
        }
      }
      if (settings.desktopBalanceEnabled && !sleeping && now-this.lastBalance>=settings.desktopBalanceMinutes*60_000) {this.lastBalance=now;await this.balance();}
      const {automaticWhisperSchedule} = await upstream('whisper-policy');
      const period = sleeping ? settings.desktopSleepTalkSeconds : settings.desktopWhisperMinutes * 60;
      const schedule = automaticWhisperSchedule(undefined, settings.desktopWhisperEnabled, period);
      const previous = sleeping ? this.lastDream : this.lastWhisper;
      if (this.same(root) && !this.ctx.get('petLife')?.running() && schedule.enabled && now - previous >= schedule.periodSec * 1000) await this.whisper(undefined, sleeping);
    } catch (error) { this.ctx.logger('chatpet-desktop').warn('Desktop maintenance pending',error); }
    finally { this.checking=false; }
  }
  pause() {this.generation?.abort();this.lastWhisper=Date.now();}
  async close() { this.closed=true;clearInterval(this.timer);this.pause();await Promise.all([this.whispering?.catch(()=>{}),this.maintenance]); }
}
