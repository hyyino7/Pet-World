import { type MessagingSettings } from './messaging-settings.js';
/** Device connection/account bindings and portable routing policy never share
 * a persisted file. Legacy policy migrates only from this stable scope's file.
 */
export declare function messagingStorage(deviceDirectory: string, dataDirectory: string): {
    current: {
        qq: {
            enabled: boolean;
            ownerReach: boolean;
            accountId: string;
            ownerSpeakerId: string;
            allowPrivate: string[];
            allowGroups: string[];
            contextMessages: number;
            wsUrl: string;
            tokenEnv: string;
            autoReply: boolean;
            voiceEnabled: boolean;
            voicePerMinute: number;
            voicePerHour: number;
            groupTrigger: "mention" | "all";
            groupKeywords: string[];
            batchQuietMs: number;
            mutedUntil: string;
        };
        wechat: {
            enabled: boolean;
            ownerReach: boolean;
            accountId: string;
            ownerSpeakerId: string;
            allowPrivate: string[];
            allowGroups: string[];
            contextMessages: number;
            bufferSeconds: number;
        };
    };
    save(next: MessagingSettings): void;
};
