import type {Context} from '@deepseek-ai/cordis';
import type {Agent} from '@deepseek-ai/dsh-agent';
import {isDeepStrictEqual} from 'node:util';
import {bridgeRoute, compactRoute} from '#dsh-world/ecosystem/bridge/route';
import type {Push} from '#dsh-world/ecosystem/shared/outlets';
import {digest} from '../core/storage.js';
import type {PetCoreHost} from '../core/index.js';
import {bridgePrefix, LocalBridge, privateDeviceDirectory} from './bridge.js';
import {createMessaging} from './messaging.js';
import {isCompanionHome, resolveCompanionHome} from '../core/companion-foundation.js';

interface Services {
  webServer: {getOrigin(): string; register(route: ReturnType<typeof bridgeRoute>): () => void};
  profileContext?: {dir: string};
  sessionController: {resolveAgent(id: string): Promise<{agent?: Agent}>};
}
type Binding = {id:string; storageId:string; bridge:LocalBridge; messaging:Awaited<ReturnType<typeof createMessaging>>};
export class CompanionChannels {
  private bound?: Binding;
  private closed = false;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private ctx: Context, private host: PetCoreHost, private services: Services, private profileDir: string) {}
  private serial<T>(work: () => Promise<T>) {
    const next = this.queue.then(work);
    this.queue = next.catch(() => {});
    return next;
  }
  private target() {
    const status = this.host.workspace.status();
    return !this.closed && status.state === 'ready' ? status.target : undefined;
  }
  private async reconcile() {
    const current = this.target(), storageId = current ? this.host.workspace.storageId() : undefined;
    if (this.bound && (this.bound.id !== current?.id || this.bound.storageId !== storageId)) {
      const previous = this.bound; this.bound = undefined;
      previous.bridge.stop(); await previous.messaging.close();
    }
    if (!current || !storageId || !this.profileDir) return;
    if (!this.bound) {
      const id = current.id, deviceDirectory = privateDeviceDirectory(privateDeviceDirectory(this.profileDir, 'chatpet-channels'), digest(storageId));
      const active = () => this.target()?.id === id && this.host.workspace.storageId() === storageId;
      const isHome = (sessionId: string) => active() && isCompanionHome(this.ctx,this.host,sessionId);
      const ownerHome = async () => {
        if (!active()) throw Error('主人会话工作区已切换');
        const agent = await resolveCompanionHome(this.ctx,this.host);
        if (!active() || !isHome(agent.id)) throw Error('主人会话已切换');
        return agent;
      };
      const bridge = new LocalBridge(this.ctx, deviceDirectory, () => this.services.webServer.getOrigin(), ownerHome, isHome,
        () => this.host.workspace.runtime.policy().quiet, () => this.host.workspace.runtime.identity().displayName,
        this.host.workspace.runtime.store,storageId);
      const messaging = await createMessaging(this.ctx, this.host, {deviceDirectory, workspaceId:id, storageId, active, ownerHome});
      if (!active()) { bridge.stop(); await messaging.close(); return; }
      this.bound = {id, storageId, messaging, bridge};
    }
    this.bound.bridge.sync(true);
    return this.bound;
  }
  refresh() { return this.serial(() => this.reconcile()); }
  get local() { return this.bound?.id === this.target()?.id ? this.bound?.bridge.current : undefined; }
  qqConnection(): 'off'|'online'|'unavailable' {
    const bound=this.bound;
    if(!bound || this.target()?.id!==bound.id || this.host.workspace.storageId()!==bound.storageId)return 'off';
    const state=bound.messaging.qqConnection();
    return state;
  }
  compact() {
    const home = this.ctx.get('petLife')?.homeSessionId();
    if (!home || !this.local || !this.host.native.memoryFor(home)) return '生活会话或记忆整理未启用';
    if (!this.host.workspace.runtime.store.get<{turns:number}>('memory-batch', home)?.turns)
      return '当前没有待整理的已完成对话';
    this.ctx.emit('pet/life.review', home);
    return undefined;
  }
  async reach(workspaceId: string, push: Push) {
    const bound = this.bound;
    if (!bound || bound.id !== workspaceId || this.target()?.id !== workspaceId || this.host.workspace.runtime.policy().quiet) return [];
    const home = this.ctx.get('petLife')?.homeSessionId();
    if (!home) return [];
    const deliveries = await Promise.allSettled([bound.bridge.reach(push,home),bound.messaging.reach(push,home)]);
    return deliveries.flatMap(result => result.status === 'fulfilled' ? result.value : [result]);
  }
  request(id: string, operation: string, input: Record<string, unknown>) {
    return this.serial(async () => {
      const bound = await this.reconcile();
      if (!bound || bound.id !== id) throw {code:'STALE_BINDING'};
      if (['groupState','groupSettings','groupSlang','groupResearch','qzoneState','qzoneSettings','qzoneDraft','qzoneRemove'].includes(operation)) {
        const response = await bound.messaging.group(operation, input);
        if (this.target()?.id !== id || this.host.workspace.storageId() !== bound.storageId) throw {code:'STALE_BINDING'};
        return response;
      }
      if (operation === 'bridgeSettings') {
        if (!isDeepStrictEqual(input.expected,bound.bridge.status().preferences)) throw {code:'STALE_REVISION'};
        bound.bridge.configure(input.next);
        bound.bridge.sync(true);
      } else if (operation === 'messagingSettings') {
        if (!isDeepStrictEqual(input.expected, bound.messaging.status().config)) throw {code:'STALE_REVISION'};
        await bound.messaging.configure(input.next as Parameters<typeof bound.messaging.configure>[0]);
      } else if (operation !== 'channelStatus') throw {code:'INVALID_ARGUMENT'};
      if (this.target()?.id !== id) throw {code:'STALE_BINDING'};
      return {bridge:bound.bridge.status(), messaging:bound.messaging.status()};
    });
  }
  close() { this.closed = true; return this.refresh(); }
}

export const name = '60-Channels';
export const inject = ['petCore','webServer','sessionController','agents','sessions','sessionPersistence','agentPresets','workspaceRegistry'];
export function apply(ctx: Context, config: {deviceDirectory?:string} = {}) {
  const services = ctx as unknown as Services;
  const profile = (ctx as unknown as {get(key: string): Services['profileContext']}).get('profileContext');
  const channels = new CompanionChannels(ctx, ctx.petCore, services, config.deviceDirectory ?? profile?.dir ?? '');
  ctx.provide('petChannels', channels);
  ctx.effect(() => services.webServer.register(bridgeRoute(bridgePrefix, () => channels.local)));
  ctx.effect(() => services.webServer.register(compactRoute(bridgePrefix, () => channels.local, () => channels.compact())));
  const refresh = () => { void channels.refresh().catch(error => ctx.logger.warn('Channel refresh failed', error)); };
  ctx.on('pet/core.changed', refresh);
  ctx.on('pet/life.changed', refresh);
  refresh();
  ctx.effect(() => async () => { await channels.close(); });
}
declare module '@deepseek-ai/cordis' {interface Context {petChannels: CompanionChannels}}
