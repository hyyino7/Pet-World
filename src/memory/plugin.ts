import type { Context } from '@deepseek-ai/cordis';
import type {} from '../core/plugin.js';
import type { NativeMemory } from '../core/native/memory.js';

export const name = '10-Memory';
export const inject = ['petCore'];
declare module '@deepseek-ai/cordis' { interface Context { petMemory: NativeMemory } }
/** The component lifecycle controls Memory on the next native turn.
 * Native conversations and their full original logs remain owned by DSH. */
export function apply(ctx: Context): void {
  const native = ctx.petCore.native;
  if (!native.memory) return;
  native.memoryEnabledForNewSessions = true;
  ctx.provide('petMemory', native.memory);
  ctx.effect(() => () => { native.memoryEnabledForNewSessions = false; });
}
