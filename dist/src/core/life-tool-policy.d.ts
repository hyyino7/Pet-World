import type { Context } from '@deepseek-ai/cordis';
import type { UserMessage } from '@deepseek-ai/dsh-session';
import type { SourceAdapter } from '../contracts/tables.js';
import type { PetCoreHost } from './index.js';
import { type LifeReviewFileAccess } from './life-review-files.js';
import { type NativeSourceContext } from './native/conversation.js';
export declare function lifeToolAllowed(name: string, review?: boolean): boolean;
/** File tools belong to the native preset, not the global registry. Life only
 * registers its own domain tools locally: never pass those local names to
 * restrict(). Inspect the host service's views, keeping its scope identity. */
export declare function lifeInheritedToolNames<S>(tools: {
    definitions(scope?: S): readonly {
        name: string;
    }[];
}, agent: S, review?: boolean): string[];
/** Native scoped restrictions have exact disposers; ordinary turns are restored. */
export declare function restrictLifeTools(scoped: {
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
