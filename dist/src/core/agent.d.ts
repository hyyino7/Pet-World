import type { Context } from '@deepseek-ai/cordis';
import type { PetCoreHost } from './index.js';
import type { PetWorld } from '../world/service.js';
export declare const name = "chatpet-agent";
export declare const inject: string[];
/** DSH owns ordinary turn execution and permissions. Core supplies scoped services. */
export declare function apply(ctx: Context, host?: PetCoreHost, world?: PetWorld): () => Promise<void>;
