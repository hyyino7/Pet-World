import type { Agent } from '@deepseek-ai/dsh-agent';
import type { SpeakerIdentity } from '#dsh-world/ecosystem/shared/identity';
export interface GroupTransport {
    forward?(id: string): Promise<unknown>;
    sendSticker?(identity: SpeakerIdentity, id: string): Promise<unknown>;
}
export interface GroupArguments {
    id?: string;
    query?: string;
    term?: string;
    note?: string;
    messageId?: string;
    text?: string;
    throughSeq?: number;
    decision?: string;
    level?: string;
    message?: string;
    replyToMessageId?: string;
}
export declare function groupTools(agent: Agent, allowed: (name: string) => boolean, run: (name: string, args: GroupArguments) => Promise<unknown>): () => void;
