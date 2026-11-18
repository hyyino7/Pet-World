export const name = '10-Memory';
export const inject = ['petCore'];
/** The component lifecycle controls Memory on the next native turn.
 * Native conversations and their full original logs remain owned by DSH. */
export function apply(ctx) {
    const native = ctx.petCore.native;
    if (!native.memory)
        return;
    native.setMemoryEnabledForNewSessions(true);
    ctx.provide('petMemory', native.memory);
    ctx.effect(() => () => { native.setMemoryEnabledForNewSessions(false); });
}
//# sourceMappingURL=plugin.js.map