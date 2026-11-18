import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { type CompanionWritingScope } from './companion-writing.js';
import type { PetCoreHost } from './index.js';
import type { RegistrationLease } from '../contracts/tables.js';
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
interface SourceFileGuardAccess {
    readonly lease?: RegistrationLease;
    key(): string | undefined;
    check(tool: string, path: string): void;
}
/** DSH resolves paths. Recheck the registration and access before native dispatch. */
export declare function installSourceFileGuard(ctx: Context, getAccess: (agent: Agent) => SourceFileGuardAccess | undefined): () => void;
export declare function installLifeReviewFileGuard(ctx: Context, host: PetCoreHost, getAccess: (agent: Agent) => LifeReviewFileAccess | undefined, clock?: () => Date): () => void;
export {};
