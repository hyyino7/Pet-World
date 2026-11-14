import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { type CompactionEngine } from '@deepseek-ai/dsh-compaction';
import type { Session } from '@deepseek-ai/dsh-session';
export interface HomeApplyState {
    status: 'idle' | 'waiting' | 'compacting' | 'done' | 'failed' | 'cancelled';
    sessionId?: string;
    message?: string;
}
interface HomeApplyDeps {
    ctx: Context;
    home(): Promise<Agent>;
    isHome(agent: Agent): boolean;
    /** The engine her home actually compacts with; on the Web host it sits inside the session's preset, not on the host. */
    compaction(agent: Agent): Pick<CompactionEngine, 'compactNow'> | undefined;
    refresh(session: Session): void;
    changed(): void;
    /** The console health entry for a failed request; undefined clears it. */
    fault(message: string | undefined): void;
}
/**
 * DSH's Web host composes compaction inside each session's preset, an isolated realm the host plane cannot see; the
 * host-plane service is what the TUI, or a profile that inserts one at the top level, provides.
 */
export declare function compactionFor(ctx: Pick<Context, 'get'>, agent: Agent): Pick<CompactionEngine, 'compactNow'> | undefined;
/** One explicit request, held behind existing turns and cancelled with the life line. */
export declare function createHomeApply(deps: HomeApplyDeps): {
    snapshot: () => HomeApplyState;
    /** Failures, including a missing engine, arrive later as the `failed` state. */
    request(): undefined;
    cancel(): Promise<void>;
};
export {};
