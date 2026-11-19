import { installNativeTranscripts } from './native/transcripts.js';
import { createWorldService, type PetWorld } from '../world/service.js';
import type { Context } from '@deepseek-ai/cordis';
import { createCore, type CoreConfig, type PetCoreHost } from './index.js';
import { apply as installNativeAdapter } from './native/agent.js';
import { registerAlbumTools } from './album-tools.js';

export const name = '00-Core';
export const inject = ['agents', 'agentLoop', 'sessions', 'sessionPersistence', 'systemPrompt', 'tools'];
export type Config = CoreConfig;
declare module '@deepseek-ai/cordis' {
  interface Context { petCore: PetCoreHost; petWorld: PetWorld }
  interface Events {
    /** Advisory invalidation after commit; query the owner service for actual state. */
    'pet/core.changed'(operation: string, observation: unknown): void;
  }
}
export async function apply(ctx: Context, config: Config): Promise<void> {
  // No profile/account discovery or implicit installation. Paths and model route are host config.
  const host = createCore(config);
  host.native.setMemoryEnabledForNewSessions(false);
  // Startup only inspects the saved binding. Missing documents are prepared by
  // the owner's explicit initialization action, never restored by a restart.
  const prefs = await host.services.preferences.read(host.operator.request('startup.preferences'), {});
  if (prefs.ok && prefs.value.workspace) {
    const inspected = await host.services.workspace.inspect(host.operator.request('startup.workspace.inspect'), {});
    if (!inspected.ok || inspected.value.state !== 'ready')
      ctx.logger(name).warn('Managed workspace needs initialization; use the workspace settings to prepare it explicitly');
  }
  host.observe((operation, observation) => {
    ctx.emit('pet/core.changed', operation, observation);
  });
  ctx.effect(() => {
    ctx.provide('petCore', host);
    const registry = ctx as unknown as { get(name: 'workspaceRegistry'): Parameters<PetCoreHost['workspace']['sessionStatus']>[1] };
    const world = createWorldService(host, () => registry.get('workspaceRegistry'));
    ctx.provide('petWorld', world);
    host.records.connect(id => registry.get('workspaceRegistry')?.get(id));
    const ports = host.native.companionPorts;
    registerAlbumTools(ctx,host,agent => {
      const status = host.workspace.status();
      if (status.state !== 'ready' || !status.target ||
        agent.session.header.agentPreset === 'chatpet-channel-guest' || ports.get('watchingTelevision')?.(agent.id) ||
        world.sessionStatus(agent.session)?.state !== 'ready' || ports.get('lifeOwnsAlbum')?.(agent.id)) return;
      return host.records.getLibrary(status.target.id).photoTools;
    });
    const transcripts=installNativeTranscripts(ctx, host);
    const stopAdapter=installNativeAdapter(ctx, host, world);
    const stopBatch=world.modules.compaction.installMemoryBatch(ctx, host);
    const runtime = host.workspace.runtime;
    const isBound = () => host.workspace.status().state === 'ready';
    const statuses = runtime.capabilityStatuses;
    statuses['core.conversation'] = () => isBound()
      ? {state:'ready', reason:'Native DSH owns ordinary conversation execution', supportedOperations:['native-chat']}
      : {state:'unavailable', reason:'Bind a workspace to use the companion', supportedOperations:[]};
    const memoryStatus = statuses['memory.lifecycle'];
    if (memoryStatus) statuses['memory.lifecycle'] = () => {
      const status = memoryStatus();
      if (!status || ctx.get('petMemory')) return status;
      return {...status, state:'disabled', reason:'Memory is off for the next turn in every conversation; retained Bank and native logs remain'};
    };
    return async () => {
      try {
        await stopBatch(); await stopAdapter(); await host.native.close();
        await transcripts.flush();
      } finally { await host.close(); }
    };
  });
}
