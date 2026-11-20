import { type CompanionWritingScope } from '../../core/companion-writing.js';
import type { PetCoreHost } from '../../core/index.js';
export interface LifeReviewFileAccess {
    workspaceId: string;
    root: string;
    storageId: string;
    sessionId: string;
    guest: boolean;
    reviewDay?: string;
    writing?: CompanionWritingScope;
}
export declare const lifeReviewFileAccessKey: (access: LifeReviewFileAccess) => string;
/** Exact record/material ownership, after native filesystem/cwd resolution. */
export declare function assertLifeReviewFile(host: Pick<PetCoreHost, 'workspace'>, access: LifeReviewFileAccess, tool: string, path: string, now?: Date): void;
