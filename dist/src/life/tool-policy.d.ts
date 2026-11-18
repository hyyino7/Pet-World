import type { Context } from '@deepseek-ai/cordis';
import type { UserMessage } from '@deepseek-ai/dsh-session';
import type { SourceAdapter } from '../contracts/tables.js';
import type { PetCoreHost } from '../core/index.js';
import { type LifeReviewFileAccess } from './review-files.js';
import { type NativeSourceContext } from '../core/native/conversation.js';
import type { CompanionToolTable } from '../core/tables/tools.js';
export declare function registerLifeToolPolicy(ctx: Context, table: CompanionToolTable): void;
/** Capability names, never phrase matching or command-string filtering. */
export declare function lifeToolAllowed(table: CompanionToolTable, name: string, review?: boolean): boolean;
/** File tools belong to the native preset, not the global registry. Life only
 * registers its own domain tools locally: never pass those local names to
 * restrict(). Inspect the host service's views, keeping its scope identity. */
export declare function lifeInheritedToolNames<S>(tools: {
    definitions(scope?: S): readonly {
        name: string;
    }[];
}, agent: S, review?: boolean): string[];
/** Native scoped restrictions have exact disposers; ordinary turns are restored. */
export declare function restrictLifeTools(table: CompanionToolTable, scoped: {
    restrict(filter: {
        allow: readonly string[];
    }): () => void;
}, inheritedNames: readonly string[], review?: boolean): () => void;
interface LifeSourceContext extends NativeSourceContext {
    sessionId: string;
    hasFacts: boolean;
    fileAccess?(): LifeReviewFileAccess;
}
export declare function createLifeSourceAdapter(ctx: Context, host: PetCoreHost, accepts: (sessionId: string, message: UserMessage) => boolean): SourceAdapter<LifeSourceContext>;
export {};
