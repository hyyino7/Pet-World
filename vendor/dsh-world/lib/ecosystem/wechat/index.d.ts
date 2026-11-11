import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { type SpeakerIdentity } from '../shared/identity.ts';
import type { PreparedReply, WechatReceipt } from './archive.ts';
import { type InWorld } from '../../worldScope.ts';
export declare function createWechatModule(deps: {
    ctx: Context;
    home(identity: SpeakerIdentity): Promise<Agent>;
    file: string;
    worldId?: string;
    inWorld?: InWorld;
    incomingDir?: string;
    origin(): string;
    allowedHosts: readonly string[];
    settings?(): {
        contextMessages: number;
        bufferSeconds: number;
    };
    record?(reply: PreparedReply): Promise<string>;
    receipt?(receipt: WechatReceipt): Promise<void>;
}): {
    presence: (now: Date) => string | undefined;
    status(): {
        contextMessages: number;
        bufferSeconds: number;
        lastContactAt: string | null;
        account: "online" | "offline" | null;
        accountId: string | null;
        chats: number;
        pending: number;
        uncertain: number;
    };
    start(): void;
    stop(): Promise<void> | undefined;
    route: {
        kind: "exact";
        path: string;
        handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    };
};
export type WechatModule = ReturnType<typeof createWechatModule>;
