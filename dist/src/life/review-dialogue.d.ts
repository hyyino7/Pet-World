import type { CoreRuntime } from '../core/runtime.js';
import type { Decision } from '../memory/client.js';
export interface DialogueQuery {
    day?: string;
    timeZone: string;
    query?: string;
    offset?: number;
}
export interface DialogueLine {
    id: string;
    sessionId: string;
    time: string;
    role: 'user' | 'assistant';
    text: string;
}
/** Per-observation enrollment and original message identity come from Core. The
 * Bank decides what is still readable on each page, including excerpt withdrawals.
 * No second daily text archive is created. */
export declare function readReviewDialogue(runtime: CoreRuntime, bank: string, sessionIds: readonly string[], input: DialogueQuery, validate: (ids: string[]) => Promise<Decision>, captureQueued: (ids: string[]) => Promise<void>): Promise<{
    items: DialogueLine[];
    nextOffset: number | undefined;
    coverage: "partial" | "eligible";
}>;
