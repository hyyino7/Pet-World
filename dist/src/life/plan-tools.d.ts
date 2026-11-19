import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { type ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { PetCoreHost } from '../core/index.js';
import type { CompanionLife } from './plugin.js';
import type { CompanionToolDeclaration } from '../contracts/tables.js';
import type { CompanionToolTable } from '../core/tables/tools.js';
type PlanTool = ToolDefinition & Partial<Omit<CompanionToolDeclaration, 'name'>>;
export declare const lifePlanReadToolDeclaration: {
    name: string;
    sources: readonly ("life" | "owner" | "review")[];
    historyOverview(_args: unknown, value: unknown): ({
        plan: object | null;
    } & {
        view: string;
    }) | undefined;
};
/** Normal owner conversations use the same Life authority, never a per-chat plan. */
export declare function registerPlanTools(ctx: Context, host: PetCoreHost, life: CompanionLife): (() => void)[];
export declare function registerPlanTool(ctx: Context, table: CompanionToolTable, tool: PlanTool, when: (context: {
    agent?: Agent;
}) => boolean): () => void;
export {};
