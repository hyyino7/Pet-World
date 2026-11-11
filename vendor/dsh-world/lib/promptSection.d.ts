import type { Agent } from '@deepseek-ai/dsh-agent';
import type { Session } from '@deepseek-ai/dsh-session';
import type { WorldConfig } from './types.ts';
import { type WorldNames, type WorldPrompt } from './worldPrompt.ts';
export declare const WORLD_PROMPT_PREFIX = "dsh-world:";
export interface WorldPromptSource {
    prompt: WorldPrompt;
    isHome(sessionId: string): boolean;
    archiveSession?(sessionId: string): boolean;
    /** Resolved with the persona, so a rename appears in both parts of the prompt together. */
    names?(): WorldNames;
    /** Her room's workspace; her world and persona reach only its sessions. Absent, every session of hers. */
    inWorkspace?(sessionId: string): boolean;
    /** Long-term memory; its two tools are registered on world sessions. */
    memory?: import('./memory.ts').MemoryService;
}
/**
 * Her persona and the world prompt both reach only sessions of her preset inside the world's workspace, and come and
 * go together as a session enters or leaves it: the preset alone is DSH's default `standard` for most setups, so it
 * would turn every unrelated session into her (#37). Both are sections of the session's system prompt so she sees them on every
 * request. Checking the files during assembly also covers compression outside DSH (#42). The prompt stays in the
 * provider-cached prefix while its content is the same. Whether the session is her home is asked per request.
 *
 * Her persona takes the place of DeepSeek Harness's stock identity line, but never of a persona someone has set: it is its own
 * section placed right after the host's persona slot, so a system persona the deployment or her preset already has stays
 * where it is and hers follows it.
 */
export declare function createPromptSections(config: WorldConfig, world: WorldPromptSource, deps: {
    logger: {
        warn(...args: unknown[]): void;
    };
}): {
    add(agent: Agent): void;
    active(session: Session): boolean;
    /** On in-history routes, start a new series to replace the old prompt instead of appending to it. */
    takeRestart(session: Session): boolean;
    refresh(session: Session): void;
    clear(): void;
};
