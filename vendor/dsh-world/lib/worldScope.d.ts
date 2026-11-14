import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { Session } from '@deepseek-ai/dsh-session';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
/**
 * Her world and persona reach only her preset's sessions in her room's workspace. A
 * session can join or leave the workspace at any time, so every way in checks again where it matters: before an
 * injection, after every wait, and when a tool runs.
 */
export type InWorld = (session: Session) => boolean;
export declare class OutsideWorldError extends Error {
    constructor();
}
/** The agent, if it is (still) in her world; without a predicate every agent is. */
export declare function admit(inWorld: InWorld | undefined, agent: Agent): Agent;
/** The same scope check controls step admission and execution; older hosts ignore the registration condition. */
export declare function registerScopedTool(agent: Agent, tool: ToolDefinition, inside: () => boolean, left?: () => void): () => void;
/**
 * DSH 0.2.2 selects tools before prompt assembly, so synchronize at turn start and between steps as well.
 * The assembly check still catches membership changes while a request is being prepared.
 */
export declare function reassembleOnChange(ctx: Context, sync: (agent: Agent) => boolean): () => void;
