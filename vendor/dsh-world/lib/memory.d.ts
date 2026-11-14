import { type MemorySources } from './memoryFiles.ts';
import { type FindParams, type MemoryItem, type MemoryKind, type MemoryStatus, type MemoryStore, type ReadResult } from './memoryStore.ts';
export { MEMORY_KINDS, MemoryError } from './memoryStore.ts';
export { readStable } from './memoryFiles.ts';
export type { MemoryErrorCode, MemoryItem, MemoryKind, MemoryStatus } from './memoryStore.ts';
export type { MemorySources } from './memoryFiles.ts';
export interface MemoryPage {
    items: MemoryItem[];
    nextCursor?: string;
    coverage: MemoryStatus;
    search: {
        method: 'browse' | 'scan';
        elapsedMs: number;
    };
}
export interface MemoryContent {
    ref: string;
    sourceId: string;
    kind: MemoryKind;
    version: string;
    title: string;
    time: string;
    timeBasis: ReadResult['timeBasis'];
    current: boolean;
    content: string;
    offset: number;
    nextOffset?: number;
    totalChars: number;
    turnId?: string;
    origin?: ReadResult['origin'];
}
export interface MemoryService {
    find(input: Record<string, unknown>): Promise<MemoryPage>;
    read(input: Record<string, unknown>): Promise<MemoryContent>;
    status(): MemoryStatus;
}
export interface MemoryDeps {
    store: MemoryStore;
    timeZone: string;
    sources: MemorySources;
    /** Whether the caller may see this chat session; may throw while the host cannot say yet, which counts as no. */
    visible(sessionId: string): boolean;
    now?: () => Date;
}
export declare const DEFAULT_FIND_LIMIT = 20, MAX_FIND_LIMIT = 100, DEFAULT_READ_LIMIT = 4000, MAX_READ_LIMIT = 16000;
/** The one place a query is checked, for the tools and the console alike. */
export declare function normalizeFind(input: Record<string, unknown>, timeZone: string): FindParams;
export declare function normalizeRead(input: Record<string, unknown>): {
    ref: string;
    offset: number;
    limit: number;
};
/**
 * The one entry to long-term memory: tools and console call the same `find` and `read`. Nothing is indexed: chat is
 * scanned in the archive and her files are read when asked, so there is no queue to wait for and no index to rebuild.
 */
export declare function createMemory(deps: MemoryDeps): MemoryService;
