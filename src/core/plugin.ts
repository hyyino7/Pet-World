import type { Context } from '@deepseek-ai/cordis';
import { DshDriver } from './dsh-driver.js';
import { createCore, type CoreConfig, type PetCoreHost } from './index.js';
import { apply as installNativeAdapter } from './agent.js';

export const name = '00-Core';
export const inject = ['agents', 'agentLoop', 'sessions', 'sessionPersistence', 'systemPrompt', 'tools'];
export interface Config extends CoreConfig { cwd: string; provider?: string; model?: string; maxOutputTokens?: number }
declare module '@deepseek-ai/cordis' {
  interface Context { petCore: PetCoreHost }
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
    installNativeAdapter(ctx, host);
    return () => host.close();
  });
}
