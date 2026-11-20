import type { DatabaseSync } from 'node:sqlite';
export declare const ECONOMY_ADOPTION_FILE = "data/living/economy-adoption.json";
export declare const ECONOMY_INITIALIZED = "economy.initialized";
export interface EconomyIdentity {
    storageId: string;
    companionId: string;
}
export declare function economyFile(path: string): import("fs").Stats | undefined;
export declare function assertEconomyIdentity(value: unknown, identity: EconomyIdentity): void;
export declare function readEconomyFileEvidence(path: string, identity: EconomyIdentity): {
    adoption: boolean;
    storage: boolean;
    database: boolean;
};
export declare function readEconomyJournalEvidence(path: string, storageId: string): boolean;
export declare function inspectEconomyAdoption(path: string, identity: EconomyIdentity, expectedInitialized?: boolean): {
    adoption: boolean;
    storage: boolean;
    database: boolean;
};
export declare function bodyCheckpointDirectory(path: string): string;
export declare function readBodyEconomyAuthority(path: string): boolean;
export declare function readEconomyDatabaseMarker(db: DatabaseSync, identity: EconomyIdentity, incomplete?: string): boolean;
export declare function syncPath(path: string): void;
export declare function economyAdoptionPath(path: string): string;
export declare function ensureAdoptionDirectory(file: string): void;
export declare function writeEconomyFile(file: string, content: string): void;
export declare function economyRecoveryAdvice(file: string, database?: string): string;
