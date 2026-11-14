import { type PetWorld } from '../world/service.js';
import type { Context } from '@deepseek-ai/cordis';
import { type CoreConfig, type PetCoreHost } from './index.js';
export declare const name = "00-Core";
export declare const inject: string[];
export type Config = CoreConfig;
declare module '@deepseek-ai/cordis' {
    interface Context {
        petCore: PetCoreHost;
        petWorld: PetWorld;
    }
    interface Events {
        /** Advisory invalidation after commit; query the owner service for actual state. */
        'pet/core.changed'(operation: string, observation: unknown): void;
    }
}
export declare function apply(ctx: Context, config: Config): Promise<void>;
