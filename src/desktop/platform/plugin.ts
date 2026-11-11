import type { Context } from '@deepseek-ai/cordis';
import {randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync, mkdtempSync, renameSync, rmSync} from 'node:fs';
import type {IncomingMessage, ServerResponse} from 'node:http';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname, join, relative, sep} from 'node:path';
import {setTimeout as wait} from 'node:timers/promises';
import type {NativeSession} from '../conversation.js';
import type {} from '../plugin.js';

const load = createRequire(import.meta.url);
const root = dirname(load.resolve('dsh-Chatpet/package.json'));
const vendor = join(root, 'vendor', 'dsh-pet', 'platform');
const assets = join(root,'src','desktop','assets');
const catalog = JSON.parse(readFileSync(join(assets,'catalog.json'),'utf8')) as {actions: Asset[]; stickers: Asset[]};
interface Asset {id:string; label:string; file:string}
const route = '/chatpet-presentation';
const json = (obj: unknown, status = 200) => ({kind:'json', obj, status});
const controls = new Set(['anim','position','throw','pose','playback','lock','lock/release','broadcast','bubble/clear','menu/item','pose/report','menu/click','menu/events']);
const upstream = load(join(vendor,'runtime.mjs'));
type Clean = () => void;
declare module '@deepseek-ai/cordis' { interface Context {petPlatform: PetPlatform} }
export const name = '35-PetPlatform';
export const inject = ['petCore','petDesktop','webServer','connection'];

function inside(dir: string, file: string) {
  const path = relative(realpathSync(dir),realpathSync(file));
  return path !== '..' && !path.startsWith('..'+sep) && !path.startsWith(sep);
}

function dataFolder(bound: string) {
  let directory = realpathSync(bound);
  for (const part of ['.chatpet','data','pet-platform']) {
    directory = join(directory,part);
    if (!existsSync(directory)) mkdirSync(directory,{mode:0o700});
    if (!lstatSync(directory).isDirectory()) throw Error('桌宠平台资料目录无效');
  }
  return directory;
}

function safeConfig(directory: string) {
  for (const file of ['main-config.jsonc','main-config.json','logs.txt']) {
    const path = join(directory,file);
    try { if (!lstatSync(path).isFile()) throw Error('桌宠配置文件无效'); }
    catch(error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  const packs = join(directory,'pet');
  if (!existsSync(packs)) mkdirSync(packs,{mode:0o700});
  if (!lstatSync(packs).isDirectory() || readdirSync(packs,{withFileTypes:true}).some(item=>item.isSymbolicLink())) throw Error('桌宠素材包路径无效');
}

function matches(value: string, token: string) {
  const a = Buffer.from(value), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a,b);
}

export class PetPlatform {
  private bound?: {id:string; path:string};
  private directory = '';
  private ownerToken = '';
  private toolToken = '';
  private mediaToken = '';
  private scope = new AbortController();
  private cleanup: Clean[] = [];
  private setup: any;
  private lookup: any;
  private router?: (url:string, method:string, body?:string, signal?:AbortSignal)=>Promise<any>;
  private providers: any;
  private privateDirectory?: string;

  constructor(private ctx: Context) {}
  private selected() {
    const state = this.ctx.petCore.workspace.status();
    return state.state === 'ready' ? state.target : undefined;
  }
  close() {
    this.scope.abort();
    if (this.privateDirectory) { rmSync(this.privateDirectory,{recursive:true,force:true}); this.privateDirectory=undefined; }
    for (const dispose of this.cleanup.splice(0).reverse()) dispose();
    this.setup?.playback.cancelAll();
    this.setup?.state.cancelAll();
    this.bound=undefined; this.router=undefined; this.lookup=undefined; this.setup=undefined;
    this.ownerToken=''; this.toolToken=''; this.mediaToken=''; this.providers=undefined;
  }
  sync() {
    const target=this.selected();
    if (this.bound && (target?.id!==this.bound.id || target?.path!==this.bound.path)) this.close();
  }
  private ensure() {
    this.sync();
    const target=this.selected();
    if (!target) throw Error('请先绑定并初始化工作区');
    if (this.bound) return;
    this.directory=dataFolder(target.path);
    safeConfig(this.directory);
    const config=join(this.directory,'main-config.jsonc');
    if (!existsSync(config) && !existsSync(join(this.directory,'main-config.json'))) {
      const prefs=this.ctx.petCore.workspace.companionSettings();
      const main={name:'大肥鱼',id:'main',size:prefs.desktopSize,display:'web',position:{corner:'bottom-right',marginX:50,marginY:70},
        balanceEnabled:false,whisperEnabled:false,fixedEnabled:prefs.desktopFixed,workStatusEnabled:prefs.desktopWorkStatusEnabled};
      writeFileSync(config,JSON.stringify({pets:[main]},null,2),{mode:0o600,flag:'wx'});
    }
    this.scope=new AbortController();
    this.bound={id:target.id,path:target.path};
    this.ownerToken=randomBytes(32).toString('hex'); this.toolToken=randomBytes(32).toString('hex'); this.mediaToken=randomBytes(32).toString('hex');
    const scope = this.scope;
    try {
      const host = this.ctx as any;
      const bridge = {
        logger: host.logger, connection: host.connection, webServer:host.webServer, get: (n:string)=>host.get(n,false),
        provide: (_n:string,value:any)=>{this.providers=value;},
        effect: (setup:()=>Clean|void)=>{ const stop=setup(); if(stop)this.cleanup.push(stop); },
        on: (event:string, receive:(session:any, data:any)=>void)=>host.on(event,(item:any,data:any)=>{
          const session=item?.session ?? item;
          if (!scope.signal.aborted && session?.header?.cwd===target.path &&
            host.petCore.workspace.sessionStatus(session,host.get('workspaceRegistry',false))?.target?.id===target.id) receive(item,data);
        }, {global:true}),
      };
      const setup=this.setup=upstream.createHostSetup(bridge,this.directory);
      const lookup=this.lookup=upstream.createPetLookup(setup);
      const work=upstream.createWorkStatusBridge(setup);
      const notify=upstream.createSessionNotify({...setup,...work,ctx:bridge});
      upstream.registerSessionWatch({...setup,...work,...notify,ctx:bridge});
      this.cleanup.push(()=> {
        lookup.lock.releaseAll(); work.stopWorkStatusFlush();
        for(const timers of [notify.terminalTimers,notify.notifyActivityTimers]) for(const timer of timers.values())clearTimeout(timer);
      });
      if (this.ctx.petDesktop.onPresentation) this.cleanup.push(this.ctx.petDesktop.onPresentation((type,value)=>{
        if (scope.signal.aborted || this.selected()?.id!==target.id) return;
        setup.state.writeSection('nativeBody/'+type,value);
        const frame = value as {text?:string;sticker?:string;whisper?:boolean;dream?:boolean;sleeping?:boolean;pending?:boolean};
        if(type==='balance') { setup.state.writeSection('balance',value); return; }
        if(type!=='say' && type!=='sleep')return;
        const cfg = upstream.readAllConfig(setup.configPaths);
        for(const entry of Object.values(cfg) as any[]) for(const pet of entry.pets ?? []) {
          if(type==='sleep') {
            if(frame.sleeping) {
              const names=upstream.pickSleepNames(entry.animations);
              if(names)lookup.sleep.enter(pet.id,names);
            } else lookup.sleep.wake(pet.id);
          } else if(type==='say' && frame.text) {
            const image=catalog.stickers.find(sticker=>sticker.id===frame.sticker || sticker.label===frame.sticker)?.label;
            setup.state.writePet(pet.id,'say',{text:frame.text,image,anim:frame.whisper === true && !frame.dream});
          }
        }
      },()=>!scope.signal.aborted && this.selected()?.id===target.id && setup.state.waiterCount()>0));
      this.ctx.petDesktop.features?.restore(true);
      const emotion = host.get('petEmotion',false);
      if (emotion) this.cleanup.push(emotion.onExpression((event:any)=>{
        if(event.workspaceId!==target.id || scope.signal.aborted)return;
        const action=catalog.actions.find(asset=>asset.id===event.action);
        const sticker=catalog.stickers.find(asset=>asset.id===event.sticker);
        for (const pet of this.pets()) {
          if(action) setup.state.writePet(pet.id,'anim',{name:action.label,playbackId:setup.playback.create(pet.id,action.label).playbackId});
          if(sticker && event.sessionId===this.ctx.petDesktop.chat.id) {
            const text=this.ctx.petDesktop.chat.snapshot().messages.filter(m=>m.role==='assistant' && m.turn===event.turn).at(-1)?.text;
            if(text)setup.state.writePet(pet.id,'say',{text,image:sticker.label,anim:false});
          }
        }
      }));
      const desktops=upstream.createDesktopHelper({
        ...setup, ctx:bridge, effectivePetList:()=>upstream.flattenPetList(upstream.readAllConfig(setup.configPaths)),
        reportDownload:()=>{},
        getHandlePetRoute:()=> async (raw:string,method:string,body?:string,signal?:AbortSignal)=>{
          const url=new URL(raw,'http://localhost');
          if(url.pathname.startsWith('/dsh-pet-7340/'))url.pathname=route+url.pathname.slice('/dsh-pet-7340'.length);
          if(scope.signal.aborted)return json({ok:false},409);
          return this.handle(url,method,body,signal ?? scope.signal);
        },
      });
      this.cleanup.push(()=>{desktops.markDisposed();desktops.stopHelper('dsh-host-stop');});
      this.router=upstream.createHttpRoute({...setup,...lookup,...work,...notify,ctx:bridge,
        assetRootFor:(ext:string)=>join(vendor,'assets',ext==='.mov'?'mov':'webm'),
        userRootFor:(ext:string)=>join(this.directory,'main-animation',ext==='.mov'?'mov':'webm'),
        requestRestart:desktops.requestRestart, canQuit:()=>false,
        publishWhisper:async(petId:string, image?:string)=>{
          const result=await this.ctx.petDesktop.features?.whisper(image);
          if(!result?.ok)throw Error(result?.message || '碎碎念暂不可用');
          return result;
        },
        refreshBalance:async()=>this.ctx.petDesktop.features?.balance(),
      }).handlePetRoute;
      desktops.startHelper();
    } catch (error) { this.close(); throw error; }
  }
  private pets(): any[] {
    return Object.values(upstream.readAllConfig(this.setup.configPaths)).flatMap((cfg:any)=>cfg.pets ?? []);
  }
  ownerAccess(expected?:string) {
    this.ensure();
    if(expected && expected!==this.bound!.id)throw Error('已切换工作区');
    return {path:route,token:this.ownerToken,mediaToken:this.mediaToken};
  }
  private baseUrl() {
    const origin=new URL((this.ctx as any).webServer.getOrigin());
    if (!['http:','https:'].includes(origin.protocol)) throw Error('桌宠宿主地址不可用');
    return new URL(route,origin).href;
  }
  standaloneAccess(expected?:string) {
    const {token}=this.ownerAccess(expected);
    const baseUrl=this.baseUrl();
    this.privateDirectory ??= mkdtempSync(join(tmpdir(),'chatpet-standalone-'));
    const file=join(this.privateDirectory,'standalone.json');
    const draft=join(this.privateDirectory,randomUUID()+'.tmp');
    try {
      writeFileSync(draft,JSON.stringify({baseUrl,token}),{mode:0o600,flag:'wx'});
      renameSync(draft,file);
    } finally { rmSync(draft,{force:true}); }
    return {file};
  }
  controlAccess(expected:string) {
    this.ownerAccess(expected);
    return {baseUrl:this.baseUrl(),path:route,token:this.toolToken};
  }
  status() {
    this.ensure();
    return {path:route,pets:this.pets().map(({id,name,display,position,assetRoot})=>({id,name,display,position,assetRoot})),packsDirectory:join(this.directory,'pet')};
  }
  private async nativeChat(pet: string, method: string, raw: string|undefined, signal:AbortSignal) {
    const who=this.lookup.requirePet(new URLSearchParams({pet}),()=>upstream.readAllConfig(this.setup.configPaths));
    if(!who.ok)return who.res;
    const chat=this.ctx.petDesktop.chat;
    const current=await chat.run('open',{});
    signal.throwIfAborted();
    if (!current.sessionId) return json({ok:false,message:'原生会话暂不可用'});
    if (method==='GET') return json({ok:true,messages:current.messages.map(m=>({role:m.role,content:m.text,ts:m.id})),sessionId:current.sessionId});
    if (method!=='POST') return json({ok:false,message:'在原生会话中管理历史记录'},405);
    const blocked=this.lookup.sleepBlocked(pet,new URLSearchParams());
    if (blocked) return blocked;
    const input=JSON.parse(raw || '{}');
    const image=input.attachment;
    const last=current.messages.at(-1)?.id ?? -1;
    const sent=await chat.run('send',{sessionId:current.sessionId,workspaceId:current.workspaceId,text:input.text,
      ...(image ? {image:{data:image.base64,mediaType:image.mediaType}} : {}),requestId:input.requestId || randomUUID()});
    const binding=this.bound;
    const combined = AbortSignal.any([signal,this.scope.signal,AbortSignal.timeout(5*60_000)]);
    // Admission and retention belong to Core. Wait for the same native turn's final rendered assistant text.
    while (!combined.aborted && this.bound===binding) {
      const result=chat.snapshot();
      if (result.sessionId!==sent.sessionId)break;
      if (!result.generating) {
        const reply=result.messages.filter(m=>m.role==='assistant' && m.id>last).at(-1);
        if (!reply || ('reason' in result && result.reason && result.reason!=='completed')) return json({ok:false,message:'原生会话未完成回复'});
        return json({ok:true,text:reply.text,sessionId:result.sessionId});
      }
      await wait(90,undefined,{signal:combined});
    }
    return json({ok:false,message:'原生会话已关闭'});
  }
  private builtinMedia(rest:string) {
    const parts=rest.split('/');
    if (parts.some(x=>x==='.' || x==='..' || x.includes('\\'))) return;
    const file=parts.at(-1) ?? '';
    const resolveAsset=(entries:Asset[], ext:string)=>entries.find(asset=>asset.label+ext===file)?.file;
    if(parts[0]==='thumb' && parts.length===3 && !existsSync(join(this.directory,'pet',parts[1]+'-animation'))) {
      const name=resolveAsset(catalog.actions,'.webm');
      if(name)return {kind:'file',status:200,file:join(assets,name),contentType:'video/webm'};
    }
    if(parts[0]==='pic' && parts[1]==='memes' && parts.length===4 && !existsSync(join(this.directory,'pet',parts[2]+'-memes'))) {
      const name=resolveAsset(catalog.stickers,'.png');
      if(name)return {kind:'file',status:200,file:join(assets,name),contentType:'image/png'};
    }
    if(rest==='font/上首软糖体.ttf') return {kind:'file',status:200,file:join(assets,'fonts','soft-candy.ttf'),contentType:'font/ttf'};
    if(rest==='sound/click-duck.wav')return {kind:'file',status:200,file:join(assets,'sound/click-duck.wav'),contentType:'audio/wav'};
  }
  async handle(url:URL,method:string,raw:string|undefined,signal:AbortSignal) {
    this.ensure();
    const rest=decodeURIComponent(url.pathname.slice(route.length+1)), pet=url.searchParams.get('pet') || 'main';
    if(rest==='native-preferences') {
      if(method==='GET')return json(this.ctx.petCore.workspace.companionSettings());
      if(method==='POST')return json(await this.ctx.petDesktop.savePreference(JSON.parse(raw || '{}')));
      return json({ok:false},405);
    }
    if(rest==='native-playback') {
      if(method!=='POST')return json({ok:false},405);
      this.ctx.petDesktop.recordPlayback(JSON.parse(raw || '{}'));
      return json({ok:true});
    }
    if(rest==='native-feature') {
      if(method!=='POST')return json({ok:false},405);
      const input=JSON.parse(raw || '{}');
      if(!/^\/(?:sleep|wake|whisper|balance)(?:\?|$)/.test(input.path))return json({ok:false},400);
      const features=this.ctx.petDesktop.features;
      if(!features)return json({ok:false},503);
      return json(await features.request(input));
    }
    if (rest==='native-chat') {
      if (method==='GET') return json(this.ctx.petDesktop.chat.snapshot());
      const data=JSON.parse(raw || '{}');
      if (method!=='POST' || !['open','new','send','stop'].includes(data.action)) return json({ok:false},400);
      return json(await this.ctx.petDesktop.chat.run(data.action,data.input ?? {}));
    }
    if (rest==='chat') return this.nativeChat(pet,method,raw,signal);
    if (rest==='chat/memory') return json({ok:true,orphans:[]},method==='GET'?200:405);
    if (rest.startsWith('voice/')) {
      const voice=(this.ctx as any).get('petVoice',false);
      return voice ? voice.handle({rest,method,body:raw,signal}) : json({ok:false,message:'语音组件未启用'},503);
    }
    if (rest==='sleep' || rest==='wake') {
      if(method!=='POST')return json({ok:false},405);
      const who=this.lookup.requirePet(new URLSearchParams({pet}),()=>upstream.readAllConfig(this.setup.configPaths));
      if(!who.ok)return who.res;
      const features=this.ctx.petDesktop.features;
      if(!features)return json({ok:false,message:'桌宠生活状态不可用'},503);
      return json(await features.request({path:'/'+rest,method}));
    }
    if (rest==='todos' || rest.startsWith('todos/')) {
      const feature=this.ctx.petDesktop.features;
      if(!feature)return json({ok:false,message:'桌宠待办不可用'},503);
      return json(await feature.request({path:'/'+rest+url.search,method,body:raw}));
    }
    safeConfig(this.directory);
    const requestScope=this.scope;
    const result=await this.router!(url.pathname+url.search,method,raw,AbortSignal.any([signal,requestScope.signal]));
    if (requestScope.signal.aborted) return json({ok:false,message:'工作区已切换'},409);
    const data=result.status===404 ? this.builtinMedia(rest) ?? result : result;
    if (data.kind==='file' && ![this.directory,vendor,assets].some(base=>inside(base,data.file))) return json({ok:false},403);
    return data;
  }
  async http(req:IncomingMessage,res:ServerResponse) {
    const abort=new AbortController(), stop=()=>abort.abort();
    res.on('close',stop);
    try {
      this.sync();
      const url=new URL(req.url ?? '/', 'http://localhost');
      const mediaPath=url.pathname.match(/^\/chatpet-presentation\/m\/([a-f0-9]{64})(\/.*)$/);
      if(mediaPath) {
        if(!this.mediaToken || !matches(mediaPath[1],this.mediaToken))return upstream.sendJson(res,401,{ok:false});
        url.pathname=route+mediaPath[2];
      }
      const rest=decodeURIComponent(url.pathname.slice(route.length+1));
      const media=!!mediaPath && ['GET','HEAD'].includes(req.method ?? '') &&
        /^(thumb\/|pic\/|font\/|sound\/|logo$|character$|pet-avatar$)/.test(rest);
      const bearer=String(req.headers.authorization ?? '').replace(/^Bearer /,'');
      const owner=!!this.ownerToken && matches(bearer,this.ownerToken);
      const tool=!!this.toolToken && matches(bearer,this.toolToken) && controls.has(rest);
      if(!owner && !tool && !media)return upstream.sendJson(res,401,{ok:false});
      const authorizedScope=this.scope;
      const method=req.method || 'GET';
      const origin=req.headers.origin;
      if (origin && origin!=='dsh-app://app' && new URL(origin).host!==req.headers.host) return upstream.sendJson(res,403,{ok:false});
      const raw=['POST','PATCH','PUT'].includes(method)? await upstream.readBody(req):undefined;
      this.sync();
      if(authorizedScope.signal.aborted)return upstream.sendJson(res,401,{ok:false});
      const result=await this.handle(url,method,raw,AbortSignal.any([abort.signal,authorizedScope.signal]));
      if (abort.signal.aborted)return;
      if(authorizedScope.signal.aborted)return upstream.sendJson(res,401,{ok:false});
      if(result.kind==='file') return upstream.sendFile(req,res,result.file,result.contentType);
      if(result.kind==='json') return upstream.sendJson(res,result.status,result.obj,{...result.headers,'cache-control':'no-store'});
      if(result.kind==='text') return upstream.sendText(res,result.status,result.body);
    } catch (error) {
      if(!res.headersSent && !res.destroyed) upstream.sendJson(res,400,{ok:false,message:error instanceof Error?error.message:'请求失败'});
    } finally {res.off('close',stop);}
  }
}
export function apply(ctx:Context) {
  const platform=new PetPlatform(ctx);
  ctx.provide('petPlatform',platform);
  const web=(ctx as any).webServer;
  ctx.effect(()=>web.register({kind:'prefix',path:route,handler:(req:IncomingMessage,res:ServerResponse)=>platform.http(req,res)}));
  const off=ctx.on('pet/core.changed',()=>platform.sync());
  ctx.effect(()=>()=>{off();platform.close();});
}
