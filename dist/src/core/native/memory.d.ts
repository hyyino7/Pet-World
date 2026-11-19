import type { CoreRuntime } from '../runtime.js';
import { MemoryConnection, type MemoryConfig } from '../../memory/client.js';
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import { type DialogueQuery } from '../../living/plan/review-dialogue.js';
/** One asynchronous Memory operation, using the existing configuration revision.
 * This is an ephemeral scope snapshot, not another conversation execution. */
export interface NativeMemoryBinding {
    workspaceId: string;
    path: string;
    storageId: string;
    preferencesRevision: number;
}
/** Core-owned durable acknowledgement/source join. Provider owns all decisions. */
export declare class NativeMemory {
    readonly runtime: CoreRuntime;
    readonly connection: MemoryConnection;
    private readonly contextBySession;
    private closed;
    lastError?: string;
    clear(sessionId: string): void;
    unavailable(error: unknown): void;
    constructor(runtime: CoreRuntime, config: MemoryConfig);
    context(sessionId: string): string;
    private binding;
    assertBinding(binding: NativeMemoryBinding): void;
    private connect;
    private ownerBank;
    /** Owner archive reads use the same Bank and eligibility rules as chat.
     * Browsing has no chat session and does not record conversation dependencies. */
    findForOwner(workspaceId: string, query: string): Promise<{
        items: {
            id: string;
            excerpt: string;
        }[];
        limit: number;
    }>;
    readForOwner(workspaceId: string, memoryId: string): Promise<{
        id: string;
        content: string;
        dialogue: {
            role: string;
            text: string;
        }[];
    }>;
    dialogueForDay(workspaceId: string, sessionIds: readonly string[], input: DialogueQuery): Promise<{
        items: import("../../living/plan/review-dialogue.js").DialogueLine[];
        nextOffset: number | undefined;
        coverage: "partial" | "eligible";
    }>;
    private materialize;
    private contextFor;
    capture(sourceIds: readonly string[], binding: NativeMemoryBinding): Promise<void>;
    prepare(sessionId: string, expected?: {
        workspaceId: string;
        path: string;
        storageId: string;
    }): Promise<NativeMemoryBinding>;
    needsArchive(sessionId: string, workspaceId: string, path: string): boolean;
    archive(sessionId: string, workspaceId: string, path: string, events: readonly SessionEvent[]): Promise<void>;
    recall(sessionId: string, query: string, includeRecent: boolean, binding: NativeMemoryBinding): Promise<string[]>;
    detail(memoryId: string, binding: NativeMemoryBinding): Promise<{
        text: string;
        sources: string[];
    }>;
    close(): Promise<void>;
}
