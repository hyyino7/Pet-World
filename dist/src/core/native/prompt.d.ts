import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { type ContextFormed } from '@deepseek-ai/dsh-llm';
import type { Session } from '@deepseek-ai/dsh-session';
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        'runtime-context': {
            kind: 'runtime-context';
        } & ContextFormed;
    }
}
/** Retire only this adapter's superseded operational views, retaining every
 * original native event and all other producers' context sections. Keeping the
 * latest equal snapshot avoids needless prefix edits between unchanged steps.
 * This is positional native projection, not a summary or a memory deletion. */
export declare function retireDynamicContext(agent: Agent, turn: number, step: number): void;
/** Replace each surviving legacy snapshot at its original position, retaining
 * other producers' sections and the complete original event in the native log.
 * Like World's retireRecall, run in agent/request while a native step is open. */
export declare function retireLegacyPrompt(session: Session, turn: number, step: number, bound: boolean): void;
/**
 * Scoped prompt placement and request-series refresh adapted from dsh-world
 * 0.7.4 (promptSection.ts, worldScope.ts and runtime.ts, MIT). The caller's
 * reader supplies the bound Repo's content and returns '' outside its scope.
 */
export interface WorldPromptRegistration {
    (): void;
    /** Share the same per-Agent section map across native preset waterfalls. */
    attach(scope: Context): void;
}
export declare function registerWorldPrompt(ctx: Context, name: string, order: number, read: (agent: Agent) => string, prepare?: (agent: Agent) => Promise<void>, admit?: (agent: Agent) => Promise<void>, dynamic?: boolean): WorldPromptRegistration;
/** DSH owns durable tail snapshots and admission. Operational data is never
 * rendered into the leading system prompt. */
export declare function registerWorldContext(ctx: Context, name: string, order: number, read: (agent: Agent) => string, prepare?: (agent: Agent) => Promise<void>): WorldPromptRegistration;
