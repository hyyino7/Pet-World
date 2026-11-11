import { installNativeTranscripts } from './native-transcripts.js';
import { createWorldService, type PetWorld } from '../world/service.js';
import { CONTRACT_VERSION } from '../contracts/version.js';
import type { Context } from '@deepseek-ai/cordis';
import { DshDriver } from './dsh-driver.js';
import { createCore, type CoreConfig, type PetCoreHost } from './index.js';
import { apply as installNativeAdapter } from './agent.js';

export const name = '00-Core';
export const inject = ['agents', 'agentLoop', 'sessions', 'sessionPersistence', 'systemPrompt', 'tools'];
export interface Config extends CoreConfig { cwd: string; provider?: string; model?: string; maxOutputTokens?: number }
declare module '@deepseek-ai/cordis' {
  interface Context { petCore: PetCoreHost; petWorld: PetWorld }
  interface Events {
    /** Advisory invalidation after commit; query the owner service for actual state. */
    'pet/core.changed'(operation: string, observation: unknown): void;
    /** Fresh current-boot result only. History must use Core/Memory eligibility. */
    'pet/conversation.presented'(message: import('../contracts/core.js').ConversationMessage): void;
    'pet/matter.progress'(progress: import('../contracts/core.js').CommitmentProgress): void;
  }
}
export async function apply(ctx: Context, config: Config): Promise<void> {
  // No profile/account discovery or implicit installation. Paths and model route are host config.
  const host = createCore(config, new DshDriver(ctx, config));
  host.native.memoryEnabledForNewSessions = false;
  // Reconcile the saved target on trusted plugin startup. Library construction
  // alone never creates repository files. Invalid existing content is preserved.
  const prefs = await host.services.preferences.read(host.operator.request('startup.preferences'), {});
  if (prefs.ok && prefs.value.workspace) {
    const initialized = await host.services.workspace.initialize(host.operator.request(`startup.workspace.v2:${prefs.value.revision}`), {
      expectedPreferencesRevision: prefs.value.revision,
    });
    if (!initialized.ok) ctx.logger(name).warn('Managed workspace is unavailable; inspect the binding and repository files');
  }
  host.observeFreshReplies(message => ctx.emit('pet/conversation.presented', message));
  host.observeProgress(progress => ctx.emit('pet/matter.progress', progress));
  host.observe((operation, observation) => {
    ctx.emit('pet/core.changed', operation, observation);
    if (operation === 'receiveMessage' || operation === 'resumeFromQuiescence')
      void host.drain().catch(error => ctx.logger(name).warn('Core drain failed', error));
  });
  ctx.effect(() => {
    ctx.provide('petCore', host);
    const registry = ctx as unknown as { get(name: 'workspaceRegistry'): Parameters<PetCoreHost['workspace']['sessionStatus']>[1] };
    const world = createWorldService(host, () => registry.get('workspaceRegistry'));
    ctx.provide('petWorld', world);
    const transcripts=installNativeTranscripts(ctx, host);
    const stopAdapter=installNativeAdapter(ctx, host, world);
    const stopBatch=world.modules.compaction.installMemoryBatch(ctx, host);
    const runtime = host.workspace.runtime;
    const coreCapabilities = runtime.capabilities;
    runtime.capabilities = () => {
      const rows = coreCapabilities();
      const bound = host.workspace.status().state === 'ready';
      const running = ctx.get('petDesktop')?.status().running ?? false;
      for (const row of rows) {
        if (row.id !== 'desktop.presentation' && row.id !== 'desktop.body') continue;
        Object.assign(row, { state: running ? 'ready' : bound ? 'disabled' : 'unavailable',
          reason: running ? null : bound ? 'Desktop window is closed' : 'Bind a workspace to open the desktop',
          supportedOperations: row.id === 'desktop.body' ? ['open', 'close', 'drag', 'play'] : ['send', 'stop', 'fold', 'reopen'] });
      }
      const memory = rows.find(row=>row.id==='memory.lifecycle');
      const life = rows.find(row => row.id === 'life.pursuits');
      if (life && ctx.get('petLife')) Object.assign(life, {
        state: bound ? ctx.get('petLife')!.running() ? 'ready' : 'disabled' : 'unavailable',
        reason: bound ? ctx.get('petLife')!.running() ? null : 'Life is paused' : 'Bind a workspace to start Life',
        supportedOperations: ['start', 'stop', 'inspect', 'interact'],
      });
      const room = rows.find(row => row.id === 'desktop.room');
      if (room && ctx.get('petRoom')) Object.assign(room, {
        state: bound ? 'ready' : 'unavailable', reason: bound ? null : 'Bind a workspace to open the room',
        supportedOperations: bound ? ['view', 'garden', 'history'] : [],
      });
      const qq = rows.find(row => row.id === 'channel.qq');
      const channels = ctx.get('petChannels');
      if (qq && channels) {
        const state = channels.qqConnection();
        Object.assign(qq, {state: state === 'online' ? 'ready' : state === 'off' ? 'disabled' : 'unavailable',
          reason: state === 'online' ? null : state === 'off' ? 'QQ is off' : 'QQ is disconnected',
          supportedOperations: state === 'online' ? ['receive', 'reply'] : []});
      }
      const speech = rows.find(row => row.id === 'voice.speech');
      const voice = ctx.get('petVoice');
      if (speech && voice) {
        const hear = bound && voice.canTranscribe();
        Object.assign(speech, {state: !bound ? 'unavailable' : hear ? 'ready' : 'degraded',
          reason: !bound ? 'Bind a workspace to use speech' : hear ? null : 'Speech recognition provider is unavailable',
          supportedOperations: !bound ? [] : hear ? ['speak', 'hear'] : ['speak']});
      }
      if(memory && host.native.memory && !ctx.get('petMemory')) Object.assign(memory,{state:'disabled',reason:'Memory is off for new conversations; existing conversations retain their original mode'});
      const expression = bound && (ctx.get('petEmotion')?.catalog.actions.length ?? 0) > 0;
      rows.push({ id: 'emotion.expression', owner: 'emotion', contractVersion: CONTRACT_VERSION,
        state: expression ? 'ready' : 'unavailable', reason: expression ? null : 'Requires a bound workspace and expression assets',
        supportedOperations: expression ? ['express', 'recordPlayback'] : [] });
      return rows;
    };
    return async () => {
      try {
        await stopBatch(); await stopAdapter(); await host.native.close();
        await transcripts.flush();
      } finally { await host.close(); }
    };
  });
}
