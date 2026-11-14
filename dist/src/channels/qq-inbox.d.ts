import type { UserMessage } from '@deepseek-ai/dsh-llm';
import type { ChannelContextMessage } from '#dsh-world/ecosystem/shared/context';
import type { SpeakerIdentity } from '#dsh-world/ecosystem/shared/identity';
import { type CoreStore } from '../core/storage.js';
export interface QQInput {
    identity: SpeakerIdentity;
    text: string;
    at: string;
    record: boolean;
    directed: boolean;
    replyToSelf: boolean;
    segments?: {
        type: string;
        data?: Record<string, unknown>;
    }[];
}
export interface QQReceived extends QQInput {
    kind: 'qq-input';
    version: 1;
    key: string;
    storageId: string;
    owner: boolean;
    state: 'received' | 'queued' | 'ignored' | 'batched' | 'admitted';
    mode?: 'v1' | 'v2';
    batchId?: string;
}
export interface QQSubmission {
    sessionId: string;
    message: UserMessage;
    context?: UserMessage;
}
export interface QQBatch {
    kind: 'qq-batch';
    version: 1;
    key: string;
    storageId: string;
    owner: boolean;
    identity: SpeakerIdentity;
    state: 'queued' | 'unknown' | 'admitted';
    inputs: string[];
    question: string;
    context: ChannelContextMessage[];
    mode: 'v1' | 'v2';
    submission?: QQSubmission;
}
interface Options {
    store: Pick<CoreStore, 'get' | 'put' | 'all' | 'transaction'>;
    storageId: string;
    active(): boolean;
    allowed(id: SpeakerIdentity): boolean;
    owner(id: SpeakerIdentity): boolean;
    probe(submission: QQSubmission): Promise<'admitted' | 'absent' | 'unknown'>;
}
/** Pending input is a receipt checkpoint, not another chat log or agent queue.
 * The original QQ batcher and native inbox still execute every request. */
export declare function createQQInbox(options: Options): {
    receive(input: QQInput): QQReceived | undefined;
    ready(row: QQReceived, mode: "v1" | "v2", wake: boolean): QQReceived | undefined;
    pendingInputs: () => QQReceived[];
    pendingBatches: () => QQBatch[];
    batch(items: QQReceived[], question: string, context: ChannelContextMessage[]): QQBatch | undefined;
    checkpoint(batch: QQBatch, submission: QQSubmission): void;
    reconcile(batch: QQBatch): Promise<"ready" | "admitted" | "unknown" | "blocked">;
    current: (key: string) => QQBatch;
    inputs: (batch: QQBatch) => QQReceived[];
    counts(): {
        pending: number;
        uncertain: number;
    };
};
/** Read the native splice vocabulary without mutating/replaying its inbox.
 * Any removed/canceled/consumed trace without user/message remains uncertain. */
export declare function qqAdmission(events: readonly {
    type: string;
    data: any;
}[], message: UserMessage): 'admitted' | 'absent' | 'unknown';
interface NativeQQ {
    sessions: {
        get(id: string): unknown;
        flush(session: unknown): Promise<boolean>;
    };
    agents: {
        get(id: string): {
            status: string;
            inbox: {
                nextStep: readonly UserMessage[];
                nextTurn: readonly UserMessage[];
            };
        } | undefined;
    };
    get(name: 'sessionPersistence'): {
        open(id: string, access: 'read'): Promise<{
            read(): Promise<{
                events: {
                    type: string;
                    data: any;
                }[];
            }>;
            close(): Promise<void>;
        }>;
    };
}
/** Reads only the originally captured native session, including archived logs.
 * It never resolves/creates a home merely to prove whether input was admitted. */
export declare function probeQQAdmission(native: NativeQQ, submission: QQSubmission, active: () => boolean): Promise<'admitted' | 'absent' | 'unknown'>;
export {};
