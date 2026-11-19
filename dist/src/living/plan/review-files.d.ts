import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
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
export declare function installLifeReviewFileGuard(ctx: Context, host: PetCoreHost, getAccess: (agent: Agent) => LifeReviewFileAccess | undefined, clock?: () => Date): () => void;
