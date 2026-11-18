import type { Context } from '@deepseek-ai/cordis';
import { CONTRACT_VERSION } from '../contracts/version.js';
import { desktopFor, registerDesktop, type Desktop } from './index.js';

export const name = '30-Desktop';
export const inject = ['petCore', 'agents', 'sessions'];
declare module '@deepseek-ai/cordis' {
  interface Context { petDesktop: Desktop }
}
export function apply(ctx: Context): void {
  const host = ctx.petCore;
  registerDesktop(ctx, host);
  const desktop = desktopFor(host);
  ctx.provide('petDesktop', desktop);
  for (const [order, id, supportedOperations] of [
    [4, 'desktop.presentation', ['send', 'stop', 'fold', 'reopen']],
    [5, 'desktop.body', ['open', 'close', 'drag', 'play']],
  ] as const) {
    ctx.effect(() => host.workspace.runtime.capabilityTable.register({
      id, owner: 'desktop', contractVersion: CONTRACT_VERSION, order,
      status: () => {
        const bound = host.workspace.status().state === 'ready';
        const running = desktop.status().running;
        return {state: running ? 'ready' : bound ? 'disabled' : 'unavailable',
          reason: running ? null : bound ? 'Desktop window is closed' : 'Bind a workspace to open the desktop',
          supportedOperations: [...supportedOperations]};
      },
    }).revoke);
  }
}
