import type { Context } from '@deepseek-ai/cordis';
import type { PetCoreHost } from '../core/index.js';
/** dsh-chatbot's turn/idle/minimum-interval policy over DSH's existing
 * compaction maintenance transaction. Original events remain in the native log. */
export declare function installMemoryBatch(ctx: Context, host: PetCoreHost): () => Promise<void>;
