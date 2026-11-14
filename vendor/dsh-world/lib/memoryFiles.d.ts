import { type MemoryKind, type TimeBasis } from './memoryStore.ts';
/** Where she keeps what she writes for memory to find: her diary directory's markdown and text files. 我是谁 is not here; it is placed whole in the world prompt. */
export interface MemorySources {
    diaryDir?: string;
}
export type AuthorKind = Exclude<MemoryKind, 'conversation'>;
/** One file as she wrote it, with the time it has and the ref that is bound to this exact text. */
export interface AuthorDoc {
    sourceId: string;
    kind: AuthorKind;
    path: string;
    title: string;
    content: string;
    ref: string;
    links: string[];
    timeMs: number;
    time: string;
    timeBasis: TimeBasis;
}
type Read = {
    kind: 'ok';
    content: string;
    stat: string;
    mtimeMs: number;
} | {
    kind: 'missing';
} | {
    kind: 'failed';
    message: string;
};
/**
 * Reads a file the way its text may be used: stat before and after must agree and the bytes must be valid UTF-8. A
 * file that is changing under us, or cannot be read or decoded, is a failure to retry, never new content and never a
 * deletion. A writer that appends valid text piece by piece cannot be told apart from a finished file.
 */
export declare function readStable(path: string, between?: () => Promise<void>): Promise<Read>;
/**
 * What she wrote, read on demand. Files are few and small, so a query looks at the configured places directly; a
 * file whose size and time are unchanged is not read again. A file that cannot be read keeps its last text and is
 * reported; only a file that is really gone leaves the results.
 */
export declare function createAuthorFiles(sources: MemorySources, timeZone: string): {
    docs: () => Promise<AuthorDoc[]>;
    failures: () => {
        sourceId: string;
        message: string;
    }[];
};
export {};
