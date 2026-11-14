import { type CompanionSettings } from '../../core/companion-settings.js';
export interface PresentationConfigPaths {
    userFile: string;
    legacyUserFile?: string;
    defaultFile: string;
    petDir?: string;
}
export interface PresentationConflict {
    field: string;
    legacy: unknown;
    current: unknown;
}
export interface PresentationMigrationReceipt {
    schema: 1;
    status: 'complete' | 'conflicts';
    configFile: string;
    backup: string | null;
    originalHash: string;
    legacyHash: string;
    configHash: string;
    changes: {
        field: string;
        legacy: unknown;
        previous: unknown;
    }[];
    conflicts: PresentationConflict[];
    preserved: string[];
    bodyId: string;
    pending?: boolean;
    beforeHash?: string;
}
export interface PresentationResolution {
    field: string;
    choice: 'legacy' | 'current';
}
/** One-time, field-level reconciliation. Unknown fields and pet packs never pass through the upstream whitelist writer. */
export declare function migratePresentation(directory: string, prefs: CompanionSettings, input?: Partial<PresentationConfigPaths>): PresentationMigrationReceipt;
/** Resolve only named recorded conflicts, preserving every other current field and the immutable original backup. */
export declare function resolvePresentationMigration(directory: string, choices: readonly PresentationResolution[], _paths?: Partial<PresentationConfigPaths>, expectedHash?: string): PresentationMigrationReceipt;
