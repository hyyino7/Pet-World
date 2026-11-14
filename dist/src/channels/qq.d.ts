import type { ChannelContextMessage } from '#dsh-world/ecosystem/shared/context';
import { type SpeakerIdentity } from '#dsh-world/ecosystem/shared/identity';
import type { createQzoneLedger } from './group-qzone.js';
import type { QQSettings } from './messaging-settings.js';
import type { QqDelivery } from '#dsh-world/adapters/qq-home';
import type { createQQInbox } from './qq-inbox.js';
type Segment = {
    type: string;
    data?: Record<string, unknown>;
};
export interface QQMessage {
    kind: 'group' | 'private';
    selfId: string;
    userId: string;
    groupId?: string;
    messageId: string;
    text: string;
    segments?: Segment[];
    sender?: {
        nickname?: string;
        card?: string;
    };
    time?: number;
}
export type QQTransport = Pick<ReturnType<typeof import('#dsh-world/adapters/qq-sdk').createBridge>, 'start' | 'stop' | 'getState' | 'sendPrivate' | 'sendGroup' | 'sendCustomFace' | 'publishQzone' | 'getForward' | 'sendGroupSticker' | 'recordText' | 'sendVoice'>;
export interface QQOptions {
    wsUrl: string;
    accessToken?: string;
    onGroupMessage(message: QQMessage): void;
    onPrivateMessage(message: QQMessage): void;
    onState(s: string): void;
    onNotice(type: string): void;
    log(level: string, message: string): void;
}
interface Host {
    settings: QQSettings;
    qzone: ReturnType<typeof createQzoneLedger>;
    active(): boolean;
    allowed(id: SpeakerIdentity): boolean;
    owner(id: SpeakerIdentity): boolean;
    inbox: ReturnType<typeof createQQInbox>;
    speak(text: string): Promise<Buffer>;
    decideGroup(id: SpeakerIdentity, trigger: boolean, recovering?: boolean): {
        mode: 'v1' | 'v2';
        wake: boolean;
    };
    groupQuote(id: SpeakerIdentity): string | undefined;
    groupResponse(id: SpeakerIdentity, text: string, mode: 'v1' | 'v2'): string;
    observeGroup(id: SpeakerIdentity, message: QQMessage, flags: {
        replyToSelf: boolean;
    }): void;
    ask(text: string, id: SpeakerIdentity, context: ChannelContextMessage[], mode: 'v1' | 'v2', delivery: QqDelivery): Promise<{
        text: string;
    }>;
    transport(options: QQOptions): QQTransport;
}
/** World QQ home, SDK, reply planner, batching and retry queue. The owner
 * binding is explicit and group batches retain a single verified speaker. */
export declare function openQQ(host: Host): {
    reach(id: SpeakerIdentity, text: string): Promise<string>;
    forward(id: SpeakerIdentity, messageId: string): Promise<unknown>;
    sendSticker(id: SpeakerIdentity, stickerId: string): Promise<{
        messageId: string;
    }>;
    status: () => {
        pending: number;
        uncertain: number;
        connected: boolean;
        state: string;
        error: string | null;
        sent: number;
        failed: number;
        blocked: number;
        voiceReceived: number;
        voiceVerified: number;
        voiceUncertain: number;
        outbox: number;
    };
    close(): Promise<void>;
};
export {};
