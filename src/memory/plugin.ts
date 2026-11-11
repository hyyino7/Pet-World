import type { Context } from '@deepseek-ai/cordis';
import type {} from '../core/plugin.js';
import type { NativeMemory } from '../core/native-memory.js';

export const name = '10-Memory';
export const inject = ['petCore'];
declare module '@deepseek-ai/cordis' { interface Context { petMemory: NativeMemory } }
/** Enrollment follows the plugin lifecycle. Existing conversations retain their
 * original Memory mode and provider through Core's native-session lifetime. */
export function apply(ctx: Context): void {
  const native = ctx.petCore.native;
  if (!native.memory) return;
  native.memoryEnabledForNewSessions = true;
  ctx.provide('petMemory', native.memory);
  ctx.effect(() => () => { native.memoryEnabledForNewSessions = false; });
}
