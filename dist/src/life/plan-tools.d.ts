import type { Context } from '@deepseek-ai/cordis';
import type { PetCoreHost } from '../core/index.js';
import type { CompanionLife } from './plugin.js';
/** Normal owner conversations use the same Life authority, never a per-chat plan. */
export declare function registerPlanTools(ctx: Context, host: PetCoreHost, life: CompanionLife): (() => void)[];
