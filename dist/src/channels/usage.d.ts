import type { Context } from '@deepseek-ai/cordis';
import type { PetCoreHost } from '../core/index.js';
import { type SpeakerIdentity } from '#dsh-world/ecosystem/shared/identity';
export declare function channelUsage(ctx: Context, host: PetCoreHost, storageId: string, allowed: (sessionId: string, identity: SpeakerIdentity) => boolean): {
    read: (channel: string, accountId: string) => {
        requests: number;
        inputTokens: number;
        outputTokens: number;
        cacheReadTokens: number;
        unreported: number;
    };
    stop: () => boolean;
};
