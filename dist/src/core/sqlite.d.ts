import type { DatabaseSync } from 'node:sqlite';
export declare function setSqliteMeta(db: DatabaseSync, key: string, jsonText: string): void;
export declare function closeSqliteLease(db: DatabaseSync, lockPath: string, lockToken: string): void;
