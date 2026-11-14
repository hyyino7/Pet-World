import type { Context } from '@deepseek-ai/cordis';
import type { NativeMemory } from '../core/native/memory.js';
export declare const name = "10-Memory";
export declare const inject: string[];
declare module '@deepseek-ai/cordis' {
    interface Context {
        petMemory: NativeMemory;
    }
}
/** The component lifecycle controls Memory on the next native turn.
 * Native conversations and their full original logs remain owned by DSH. */
export declare function apply(ctx: Context): void;
