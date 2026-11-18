import type { Context } from '@deepseek-ai/cordis';
import type { PetCoreHost } from '../core/index.js';
import type { CompanionLife } from './plugin.js';
export declare const lifePlanReadToolDeclaration: {
    name: string;
    sources: readonly ("owner" | "life" | "review")[];
    historyOverview(_args: unknown, value: unknown): ({
        plan: object | null;
    } & {
        view: string;
    }) | undefined;
};
/** Normal owner conversations use the same Life authority, never a per-chat plan. */
export declare function registerPlanTools(ctx: Context, host: PetCoreHost, life: CompanionLife): (() => void)[];
