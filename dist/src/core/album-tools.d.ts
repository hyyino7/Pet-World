import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { PetCoreHost } from './index.js';
import type { CompanionRecordLibrary } from './records.js';
type Album = CompanionRecordLibrary['photoTools'];
export declare const upstreamAlbumToolNames: string[];
/** Use the upstream tools against the admitted message and the same bound album in ordinary chats. */
export declare function registerAlbumTools(ctx: Context, host: PetCoreHost, currentAlbum: (agent: Agent) => Album | undefined): void;
export {};
