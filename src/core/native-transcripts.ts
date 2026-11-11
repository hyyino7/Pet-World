import type { Context } from '@deepseek-ai/cordis';
import { constants, closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { PetCoreHost } from './index.js';

interface Header { id: string; cwd?: string; [key: string]: unknown }
interface Event { seq: number; type: string; [key: string]: unknown }
interface Handle { header: Header; inheritedEventCount?: number; read(): Promise<{events: Event[]}>; append(events: Event[]): Promise<void>; flush(): Promise<void>; close(): Promise<void> }
interface Native {
  get(key: string): unknown;
  sessions: { get(id: string): unknown; flush(session: unknown): Promise<boolean> };
  sessionPersistence: { open(id: string, access: 'read'|'write'): Promise<Handle>; create(header: Header, options?: unknown): Promise<Handle> };
}
interface Registry { get(id: string): {path:string;sessionIds:readonly string[];attachSession(id:string):Promise<void>} | undefined; archivedSessionIds: readonly string[]; archiveSession(id:string):Promise<unknown> }
interface Copy { schema: 1; companionId: string; scopeId: string; storageId: string; header: Header; inheritedEventCount: number; archived: boolean; events: Event[] }
const equal = isDeepStrictEqual;
const key = (id: string) => createHash('sha256').update(id).digest('hex')+'.json';

/** Complete native log copies, not model-facing context. DSH remains the sole
 * session writer and validates imports through create/append/flush. */
export class NativeTranscripts {
  private tail: Promise<unknown> = Promise.resolve();
  private pending = new Set<string>();
  private timer?: NodeJS.Timeout;
  private restored?: string;
  private last?: {target:{id:string;path:string;title:string};sessionIds:string[];archived:string[]};
  constructor(private ctx: Context, private host: PetCoreHost) {}
  private native() { return this.ctx as unknown as Native; }
  private target(allowShutdownSnapshot=false) {
    const status=this.host.workspace.status();
    if(status.state!=='ready' || !status.target) throw Error('Initialize the bound Repo before restoring conversations');
    const registry=this.native().get('workspaceRegistry') as Registry | undefined;
    let workspace=registry?.get(status.target.id);
    if(!workspace && allowShutdownSnapshot && this.last?.target.id===status.target.id && this.last.target.path===status.target.path) {
      // Membership was already checked on the native event. The optional
      // workspace service may unload before Core's final persistence barrier.
      const unavailable=async (_id:string):Promise<never>=>{throw Error('Native workspace mutations are unavailable during shutdown');};
      return {target:status.target,workspace:{path:status.target.path,sessionIds:this.last.sessionIds,attachSession:unavailable},
        registry:{get:()=>undefined,archivedSessionIds:this.last.archived,archiveSession:unavailable}};
    }
    if(!workspace || workspace.path!==status.target.path) throw Error('Native workspace binding changed');
    this.last={target:status.target,sessionIds:[...workspace.sessionIds],archived:[...registry!.archivedSessionIds]};
    return {target:status.target,workspace,registry:registry!};
  }
  private directory(root: string) {
    let directory=root;
    for(const part of ['.chatpet','data','core','native-sessions']) {
      directory=join(directory,part);
      if(!existsSync(directory)) mkdirSync(directory,{mode:0o700});
      const stat=lstatSync(directory);
      if(!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Portable conversation directory must remain inside the Repo');
    }
    return directory;
  }
  private read(path: string): Copy {
    const stat=lstatSync(path);
    if(!stat.isFile() || stat.isSymbolicLink() || stat.nlink!==1) throw Error('Unexpected portable conversation file');
    const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
    try {
      const value=JSON.parse(readFileSync(fd,'utf8')) as Copy;
      const config=this.host.workspace.runtime.config;
      if(value.schema!==1 || value.companionId!==config.companionId || value.scopeId!==config.scopeId
        || !value.header?.id || !Array.isArray(value.events) || value.events.some((e,i)=>e.seq!==i)) throw Error('Portable native log identity or sequence mismatch');
      return value;
    } finally {closeSync(fd);}
  }
  private write(path: string, value: unknown) {
    if(existsSync(path)) {const stat=lstatSync(path);if(!stat.isFile() || stat.isSymbolicLink() || stat.nlink!==1) throw Error('Refusing to replace portable data link');}
    const temp=path+'.'+randomUUID()+'.tmp',fd=openSync(temp,'wx',0o600);
    try {writeFileSync(fd,JSON.stringify(value)+'\n');fsyncSync(fd);} finally {closeSync(fd);}
    try {renameSync(temp,path);} finally {if(existsSync(temp)) unlinkSync(temp);}
  }
  private enqueue<T>(operation:()=>Promise<T>) {
    const result=this.tail.then(operation);this.tail=result.catch(()=>{});return result;
  }
  async restore(): Promise<void> {return this.enqueue(async()=>{
    const {target,workspace,registry}=this.target(),native=this.native();
    const binding=target.id+'\n'+target.path;
    if(this.restored===binding) return;
    const directory=this.directory(target.path);
    const config=this.host.workspace.runtime.config;
    this.write(join(directory,'identity.json'),{schema:1,companionId:config.companionId,scopeId:config.scopeId,ownerActorId:config.ownerActorId,storageId:this.host.workspace.storageId()});
    for(const name of readdirSync(directory).filter(name=>/^[a-f0-9]{64}\.json$/.test(name))) {
      const copy=this.read(join(directory,name)),id=copy.header.id;
      if(name!==key(id)) throw Error('Portable session filename mismatch');
      const wasAttached=workspace.sessionIds.includes(id);
      let existing: Handle | undefined;
      let missing: Event[]=[];
      try {existing=await native.sessionPersistence.open(id,'read');}
      catch(error) {if(!/not.?found/i.test(String((error as Error).name))) throw error;}
      if(existing) {
        try {
          const current=(await existing.read()).events;
          const {cwd:_old,...expectedHeader}=copy.header,{cwd:_current,...currentHeader}=existing.header;
          if(existing.header.cwd!==target.path || !equal(expectedHeader,currentHeader) || !equal(current.slice(0,Math.min(current.length,copy.events.length)),copy.events.slice(0,Math.min(current.length,copy.events.length))))
            throw Error('Native session conflicts with portable copy: '+id);
          missing=copy.events.slice(current.length);
        } finally {await existing.close();}
        if(missing.length) {
          const writer=await native.sessionPersistence.open(id,'write');
          try {
            const current=(await writer.read()).events;
            if(!equal(current,copy.events.slice(0,current.length))) throw Error('Native log changed during restore: '+id);
            await writer.append(copy.events.slice(current.length));await writer.flush();
          } finally {await writer.close();}
        }
      } else {
        const writer=await native.sessionPersistence.create({...copy.header,cwd:target.path},copy.inheritedEventCount?{inheritedEventCount:copy.inheritedEventCount}:undefined);
        try {await writer.append(copy.events);await writer.flush();} finally {await writer.close();}
      }
      if(!workspace.sessionIds.includes(id)) await workspace.attachSession(id);
      if(!wasAttached && copy.archived && !registry.archivedSessionIds.includes(id)) await registry.archiveSession(id);
    }
    this.restored=binding;
    // Also refresh copies when this device already owns a longer native log
    // (for example, recovery after an abrupt previous shutdown).
    for(const id of workspace.sessionIds) this.schedule(id);
  });}
  async save(sessionId: string): Promise<void> {return this.enqueue(async()=>{
    const {target,workspace,registry}=this.target(true);
    if(!workspace.sessionIds.includes(sessionId)) return;
    const native=this.native(),live=native.sessions.get(sessionId);
    if(live && await native.sessions.flush(live)===false) throw Error('Native conversation did not flush');
    const reader=await native.sessionPersistence.open(sessionId,'read');
    try {
      if(reader.header.cwd!==target.path || reader.header.parentSession) return;
      const events=(await reader.read()).events;
      if(this.target(true).target.path!==target.path) throw Error('Workspace changed while exporting native log');
      const file=join(this.directory(target.path),key(sessionId));
      if(existsSync(file)) {
        const previous=this.read(file);
        if(previous.events.length>events.length || !equal(previous.events,events.slice(0,previous.events.length))) throw Error('Refusing to shorten or rewrite the retained native transcript');
      }
      const config=this.host.workspace.runtime.config;
      this.write(file,{schema:1,companionId:config.companionId,scopeId:config.scopeId,storageId:this.host.workspace.storageId(),header:reader.header,
        inheritedEventCount:reader.inheritedEventCount ?? 0,archived:registry.archivedSessionIds.includes(sessionId),events} satisfies Copy);
    } finally {await reader.close();}
  });}
  schedule(sessionId: string) {
    this.target();
    this.pending.add(sessionId);
    if(this.timer) return;
    this.timer=setTimeout(()=>{this.timer=undefined;void this.flush().catch(error=>this.ctx.logger('chatpet-transcripts').warn('Portable transcript pending',error));},100);
    this.timer.unref();
  }
  async flush() {
    clearTimeout(this.timer);this.timer=undefined;
    const ids=[...this.pending];this.pending.clear();
    for(const id of ids) {try {await this.save(id);} catch(error) {this.pending.add(id);throw error;}}
    await this.tail;
  }
}

declare module '@deepseek-ai/cordis' {interface Context {petTranscripts:NativeTranscripts}}
export function installNativeTranscripts(ctx: Context,host: PetCoreHost): NativeTranscripts {
  const logs=new NativeTranscripts(ctx,host);ctx.provide('petTranscripts',logs);
  ctx.on('session/event',(session)=>{
    const registry=(ctx as unknown as Native).get('workspaceRegistry') as Registry | undefined;
    if(host.workspace.sessionStatus(session,registry)?.state==='ready') logs.schedule(session.id);
  },{global:true});
  ctx.on('pet/core.changed',operation=>{if((operation==='workspace.initialize' || operation==='preferences.save') && host.workspace.status().state==='ready') void logs.restore().catch(error=>ctx.logger('chatpet-transcripts').warn('Native log restore pending',error));});
  (ctx as unknown as {on(name:'domain/changed',handler:(change:{domain:string})=>void):unknown}).on('domain/changed',change=>{
    if(change.domain!=='workspace') return;
    const status=host.workspace.status(),registry=(ctx as unknown as Native).get('workspaceRegistry') as Registry | undefined;
    const workspace=status.target && registry?.get(status.target.id);
    if(status.state==='ready' && workspace && workspace.path===status.target?.path) for(const id of workspace.sessionIds) logs.schedule(id);
  });
  ctx.effect(()=>()=>logs.flush());
  return logs;
}
