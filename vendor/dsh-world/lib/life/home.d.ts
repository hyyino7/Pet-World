import type { Agent } from '@deepseek-ai/dsh-agent';
import { type Faults } from '../faults.ts';
import { type InWorld } from '../worldScope.ts';
import type { LifeHost } from './host.ts';
export interface HomeDeps {
    host: LifeHost;
    roomDir: string;
    agentPreset: string;
    title: string;
    /** The title of her room as a workspace. */
    roomTitle: string;
    faults: Faults;
    logger: {
        error(...args: unknown[]): void;
    };
    /** The recorded home, if any. */
    current(): string | undefined;
    /** Records a newly built home before anything else can fail, so a retry reuses it instead of building another. */
    moveIn(sessionId: string): void;
    /** Called with the home every time it is opened. */
    opened(agent: Agent): void;
    stopped(): boolean;
    /** Her world; a home outside it is never opened. */
    inWorld?: InWorld;
}
/**
 * Her home session: the recorded one while it exists and is not archived, otherwise a new one.
 * Her world lives only in her room's workspace, so the home is built in it, or moved into it, or not opened at all.
 * The title is applied when the home is built and again after its first turn, because the
 * host retitles a session from its first prompt.
 */
export declare function createHome(deps: HomeDeps): {
    /** The current home, resolving or rebuilding it; one attempt at a time. */
    open(): Promise<Agent>;
    turnEnded(sessionId: string): void;
};
