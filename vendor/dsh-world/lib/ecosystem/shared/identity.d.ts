export interface SpeakerIdentity {
    channel: string;
    accountId: string;
    conversationId: string;
    speakerId: string;
    speakerName?: string;
    conversationType?: 'private' | 'group';
    conversationName?: string;
    platformMessageId?: string;
    mentionIds?: string[];
}
/** Structured adapter metadata only; message text is never an identity source. */
export declare function speakerIdentity(value: unknown): SpeakerIdentity;
export declare function conversationKey(identity: SpeakerIdentity): string;
/** A chat as she reads it: 微信「Ken」, 微信群「一家人」, QQ群「…」. */
export declare function chatLabel(channel: string, conversationType: SpeakerIdentity['conversationType'], name: string): string;
/** The chat's own name, or for a private chat the person it is with. */
export declare const chatName: (identity: Pick<SpeakerIdentity, "conversationName" | "conversationType" | "speakerName">) => string | undefined;
/**
 * Opens every channel message she receives: which chat, who in a group, and the chatId her send tools take. Kept to
 * one short line because it stays in her context with every message; the full identity rides on the message source.
 */
export declare function identityPrefix(identity: SpeakerIdentity): string;
/** Channel messages from 0.7.0 and earlier opened with the whole identity; an upgraded log may still hold some. */
export declare const legacyIdentityPrefix: (identity: SpeakerIdentity) => string;
/** A whole line that is one of the headers above, new or legacy, whoever it names. */
export declare const IDENTITY_HEADER_LINE: RegExp;
