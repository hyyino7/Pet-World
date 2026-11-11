import type { Context } from '@deepseek-ai/cordis';
import { desktopFor, registerDesktop, type Desktop } from './index.js';

export const name = '30-Desktop';
export const inject = ['petCore', 'agents', 'sessions'];
declare module '@deepseek-ai/cordis' {
  interface Context { petDesktop: Desktop }
}
export function apply(ctx: Context): void {
  registerDesktop(ctx, ctx.petCore);
  ctx.provide('petDesktop', desktopFor(ctx.petCore));
}
