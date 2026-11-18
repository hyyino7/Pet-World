import { CONTRACT_VERSION } from '../contracts/version.js';
import { desktopFor, registerDesktop } from './index.js';
export const name = '30-Desktop';
export const inject = ['petCore', 'agents', 'sessions'];
export function apply(ctx) {
    const host = ctx.petCore;
    registerDesktop(ctx, host);
    const desktop = desktopFor(host);
    ctx.provide('petDesktop', desktop);
    for (const [order, id, supportedOperations] of [
        [4, 'desktop.presentation', ['send', 'stop', 'fold', 'reopen']],
        [5, 'desktop.body', ['open', 'close', 'drag', 'play']],
    ]) {
        ctx.effect(() => host.workspace.runtime.capabilityTable.register({
            id, owner: 'desktop', contractVersion: CONTRACT_VERSION, order,
            status: () => {
                const bound = host.workspace.status().state === 'ready';
                const running = desktop.status().running;
                return { state: running ? 'ready' : bound ? 'disabled' : 'unavailable',
                    reason: running ? null : bound ? 'Desktop window is closed' : 'Bind a workspace to open the desktop',
                    supportedOperations: [...supportedOperations] };
            },
        }).revoke);
    }
}
//# sourceMappingURL=plugin.js.map