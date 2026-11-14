import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { type CompanionWritingScope } from './companion-writing.js';
import type { PetCoreHost } from './index.js';
export interface LifeReviewFileAccess {
    workspaceId: string;
    root: string;
    storageId: string;
    sessionId: string;
    guest: boolean;
    reviewDay?: string;
    writing?: CompanionWritingScope;
}
/** Exact record/material ownership, after native filesystem/cwd resolution. */
export declare function assertLifeReviewFile(host: Pick<PetCoreHost, 'workspace'>, access: LifeReviewFileAccess, tool: string, path: string, now?: Date): void;
/** Preparation resolves paths through DSH. The monotonic guard rechecks scope
 * and stable record paths immediately before native file-tool dispatch. */
export declare function installLifeReviewFileGuard(ctx: Context, host: PetCoreHost, getAccess: (agent: Agent) => LifeReviewFileAccess | undefined, clock?: () => Date): () => void;
