import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { existsSync, lstatSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHome } from '#dsh-world/life/home';
import { createLifeStore } from '#dsh-world/life/lifeStore';
import { Faults } from '#dsh-world/faults';
import { renderTemplate } from '#dsh-world/worldPrompt';
import type { PetCoreHost } from './index.js';
import type { PetWorld } from '../world/service.js';
import { check } from './storage.js';
import { registerWorldPrompt } from './world-prompt.js';
import { readSelfPrompt, trackCompanionWriting, type CompanionWritingScope } from './companion-writing.js';

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

/** The legacy location is retained; Core guards the identity resource independently of Life. */
export function companionWritingScope(ctx: Context, host: PetCoreHost): CompanionWritingScope | undefined {
  const current = workspace(ctx, host);
  if (!current) return;
  const directory = join(current.target.path, '.chatpet', 'data', 'life');
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
      title:host.workspace.runtime.identity().displayName + '的家', roomTitle:bound.path,
      faults:new Faults(), logger, stopped:() => !active(),
      current:() => recordedHome(host),
      moveIn:id => {check(active(),'Companion home binding changed'); store.write({...store.read(),homeSessionId:id});},
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
    {memory:!!host.native.memoryFor(agent.id),emotion:!!get('petEmotion'),behavior:!!get('petBehavior'),records:!!get('petLife')},
    {selfFile:join(scope.directory,'self.md')});
}

export function installCompanionFoundation(ctx: Context, host: PetCoreHost, world: PetWorld): () => void {
  owners.set(host,ctx);
  const prepared = new WeakMap<Agent,{workspaceId:string; text:string}>();
  const getScope = () => companionWritingScope(ctx,host);
  const stopWriting = trackCompanionWriting(ctx,host,getScope);
  const stopHomeEvents = ctx.on('session/event',(session,event) => {
    if (event.type === 'turn/end') homes.get(host)?.home.turnEnded(session.id);
  });
  const foundation = registerWorldPrompt(ctx,'chatpet.foundation',12,agent => renderCompanionFoundation(ctx,host,world,agent));
  const self = registerWorldPrompt(ctx,'chatpet.self',35,agent => {
    const saved = prepared.get(agent), scope = getScope();
    return scope && saved?.workspaceId === scope.id && world.sessionStatus(agent.session)?.state === 'ready' ? saved.text : '';
  },async agent => {
    prepared.delete(agent);
    const scope = getScope();
    if (!scope || world.sessionStatus(agent.session)?.state !== 'ready') return;
    const text = await readSelfPrompt(host,scope,agent.id,false);
    if (text && getScope()?.id === scope.id) prepared.set(agent,{workspaceId:scope.id,text});
  });
  return () => {
    foundation(); self(); stopWriting(); stopHomeEvents();
    homes.delete(host); if (owners.get(host) === ctx) owners.delete(host);
  };
}
