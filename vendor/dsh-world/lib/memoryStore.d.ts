import type { DatabaseSync } from 'node:sqlite';
import type { ConversationRecord } from './types.ts';
export declare const MEMORY_KINDS: readonly ["conversation", "diary"];
export type MemoryKind = typeof MEMORY_KINDS[number];
/** `message`: when the line was said. `diaryDate`: the day in a diary's file name. `fileObserved`: when the file last changed. */
export type TimeBasis = 'message' | 'diaryDate' | 'fileObserved';
export type MemoryErrorCode = 'invalidQuery' | 'invalidRef' | 'invalidCursor' | 'cursorExpired' | 'notFound' | 'outOfScope' | 'sourceChanged' | 'scopeChanged' | 'readFailed';
export declare class MemoryError extends Error {
    readonly code: MemoryErrorCode;
    constructor(code: MemoryErrorCode, message: string, options?: ErrorOptions);
}
export interface MemoryStatus {
    state: 'ready' | 'partial';
    failures: {
        sourceId: string;
        message: string;
    }[];
    checkedAt: string;
}
/** Where a chat line came from: only what the record itself carries. */
export interface MemoryOrigin {
    sessionId?: string;
    role?: 'user' | 'assistant';
    speakerId?: string;
    speakerName?: string;
    channel?: string;
    conversationId?: string;
    conversationName?: string;
    conversationType?: string;
}
export interface MemoryItem {
    ref: string;
    sourceId: string;
    kind: MemoryKind;
    title: string;
    time: string;
    timeBasis: TimeBasis;
    current: boolean;
    excerpt: string;
    turnId?: string;
    origin?: MemoryOrigin;
    version?: number;
}
export interface FindParams {
    query?: string;
    kinds?: readonly MemoryKind[];
    fromMs?: number;
    toMs?: number;
    sourceId?: string;
    turnId?: string;
    linkedTo?: string;
    order: 'newest' | 'oldest';
    limit: number;
    cursor?: string;
}
export interface ReadResult {
    ref: string;
    sourceId: string;
    kind: MemoryKind;
    version: string;
    title: string;
    time: string;
    timeBasis: TimeBasis;
    current: boolean;
    content: string;
    turnId?: string;
    origin?: MemoryOrigin;
}
export declare const MAX_QUERY_CHARS = 200;
export declare const EXCERPT_CHARS = 300;
export declare const sha: (text: string) => string;
export declare function decodeRef(ref: string): {
    kind: 'c';
    recordId: string;
    hash: string;
} | {
    kind: 'a';
    sourceId: string;
    hash: string;
};
export declare const chatRef: (recordId: string, content: string) => string;
export declare const fileRef: (sourceId: string, content: string) => string;
/** Explicit links only: a line `引用：memory:<ref> memory:<ref>`. */
export declare function extractLinks(content: string): string[];
/** The instant a local calendar day starts in the zone, with the offset it has then. */
export declare function localDayStart(date: string, timeZone: string): {
    ms: number;
    time: string;
} | undefined;
/** A window of `EXCERPT_CHARS` characters around the first match (or the start), cut on whole characters. */
export declare function excerptOf(content: string, query: string | undefined): string;
/**
 * Chat lines are searched where they already are: the archive's `records` table, by scanning. Nothing is copied or
 * indexed, so there is nothing to build, migrate or rebuild; an archive from before this existed answers at once.
 */
export declare function createMemoryStore(db: DatabaseSync, deps: {
    timeZone: string;
}): {
    find: (params: FindParams, sessions: readonly string[], upTo: number, take: number) => ConversationRecord[];
    item: (record: ConversationRecord, query: string | undefined) => MemoryItem;
    byRecordId: (recordId: string) => ConversationRecord | undefined;
    refSession: (ref: string) => string | undefined;
    read: (ref: string, canSee: (sessionId: string) => boolean) => ReadResult;
    sessionIds: () => string[];
    snapshot: () => {
        head: number;
        revisions: number;
    };
    revised: () => void;
};
export type MemoryStore = ReturnType<typeof createMemoryStore>;
