import type { CompanionFact, CompanionFactSource } from '../contracts/interaction.js';
export interface PromptFactSource {
    service: CompanionFactSource;
    facts: CompanionFact[];
}
/** A completed native turn is not durable until its original session flushes. */
export declare function acknowledgePromptFacts(input: {
    turn: number;
    workspaceId: string;
    sources: readonly PromptFactSource[];
    events: () => readonly {
        type: string;
        data: unknown;
    }[];
    flush: () => Promise<unknown>;
    validate: () => void;
}): Promise<void>;
