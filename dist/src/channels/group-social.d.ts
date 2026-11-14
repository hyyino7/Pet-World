import type { SpeakerIdentity } from '#dsh-world/ecosystem/shared/identity';
import type { GroupArguments } from './group-tools.js';
export interface WakeSettings {
    anyMessage: boolean;
    atMention: boolean;
    nameMention: boolean;
    question: boolean;
    keywords: string[];
    speakerIds: string[];
    probability: number;
    maxPerMinute: number;
    maxPerHour: number;
}
export declare const defaultWake: WakeSettings;
export declare function wakeSettings(value: unknown): WakeSettings;
export interface GroupReport {
    level: 'info' | 'warning' | 'error';
    message: string;
    at: number;
}
export declare const socialOperations: Set<string>;
/** Each native group has its own wake ledger and read receipts. Only messages
 * shown in this process can be acknowledged. A new process must fetch them again. */
export declare class GroupSocial {
    private file;
    private companionName;
    private seen;
    private replies;
    constructor(file: string, companionName?: () => string);
    private read;
    private save;
    observe(id: SpeakerIdentity, text: string, segments: readonly {
        type: string;
        data?: Record<string, unknown>;
    }[], reply: boolean, settings: WakeSettings): void;
    wake(id: SpeakerIdentity, configured: boolean, settings: WakeSettings, recovering?: boolean): boolean;
    view(): {
        unread: number;
        lastFeedback: string;
        lastWakeReason: string;
        reports: GroupReport[];
    };
    private unread;
    private markRead;
    private report;
    act(id: SpeakerIdentity, name: string, input: GroupArguments): GroupReport | {
        messages: {
            seq: number;
            messageId: string;
            sender: string;
            speakerId: string;
            text: string;
        }[];
        readThroughSeq: number;
    } | {
        count: number;
        throughSeq: number;
    } | {
        queued: boolean;
        note: string;
        feedback?: undefined;
    } | {
        feedback: string;
        queued?: undefined;
        note?: undefined;
    };
    response(id: SpeakerIdentity): string;
    quoteTarget(id: SpeakerIdentity): string | undefined;
}
