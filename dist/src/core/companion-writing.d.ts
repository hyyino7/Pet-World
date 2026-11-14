import type { Context } from '@deepseek-ai/cordis';
import type { PetCoreHost } from './index.js';
export interface CompanionWritingScope {
    id: string;
    directory: string;
    timeZone: string;
    sessionIds: readonly string[];
    running?: boolean;
    isHome(id: string): boolean;
}
export declare function companionWritingFile(host: Pick<PetCoreHost, 'workspace'>, scope: CompanionWritingScope, name: string): string;
/** Self and diaries are module-owned documents, not Memory projections. Bank
 * withdrawal does not erase these files or make an owner conversation unusable.
 * Native scope and stable-file checks remain independent of Memory availability. */
export declare function readCompanionWriting(host: Pick<PetCoreHost, 'workspace'>, scope: CompanionWritingScope, name: string, consumerSessionId?: string): Promise<string | undefined>;
export declare function readSelfPrompt(host: PetCoreHost, scope: CompanionWritingScope, sessionId: string): Promise<string>;
/** Keep the existing local path guard; DSH still owns file-tool permissions.
 * There is no whole-chat dependency graph or Memory mode stored by this hook. */
export declare function trackCompanionWriting(ctx: Context, host: PetCoreHost, getScope: () => CompanionWritingScope | undefined): () => boolean;
