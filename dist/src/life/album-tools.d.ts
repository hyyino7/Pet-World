import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { PetCoreHost } from '../core/index.js';
import type { CompanionRecordLibrary } from '../core/records.js';
export declare const upstreamAlbumToolNames: string[];
/** Use the upstream tools against the admitted message and the same bound album in ordinary chats. */
export declare function registerAlbumTools(ctx: Context, host: PetCoreHost, library: (agent: Agent) => CompanionRecordLibrary | undefined): void;
