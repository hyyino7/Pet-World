import { desktopFor, registerDesktop } from './index.js';
export const name = '30-Desktop';
export const inject = ['petCore', 'agents', 'sessions'];
export function apply(ctx) {
    registerDesktop(ctx, ctx.petCore);
    ctx.provide('petDesktop', desktopFor(ctx.petCore));
}
//# sourceMappingURL=plugin.js.map