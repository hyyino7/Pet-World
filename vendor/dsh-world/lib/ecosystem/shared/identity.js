/** Structured adapter metadata only; message text is never an identity source. */
export function speakerIdentity(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new TypeError('invalid identity');
    const input = value;
    for (const key of ['channel', 'accountId', 'conversationId', 'speakerId']) {
        const field = input[key];
        if (typeof field !== 'string' || !field.trim() || field.length > 256 || /[\u0000-\u001f\u007f]/.test(field))
            throw new TypeError(`invalid ${key}`);
    }
    const channel = input.channel;
    const speakerId = input.speakerId;
    if (!/^[a-z][a-z0-9-]*$/.test(channel) || !speakerId.startsWith(`${channel}:`) || speakerId.length === channel.length + 1)
        throw new TypeError('invalid speakerId namespace');
    for (const key of ['speakerName', 'conversationName'])
        if (input[key] !== undefined && (typeof input[key] !== 'string' || input[key].length > 256 || /[\u0000-\u001f\u007f]/.test(input[key])))
            throw new TypeError(`invalid ${key}`);
    if (input.conversationType !== undefined && input.conversationType !== 'private' && input.conversationType !== 'group')
        throw new TypeError('invalid conversationType');
    if (input.platformMessageId !== undefined && (typeof input.platformMessageId !== 'string' || !input.platformMessageId.trim() || input.platformMessageId.length > 256 || /[\u0000-\u001f\u007f]/.test(input.platformMessageId)))
        throw new TypeError('invalid platformMessageId');
    if (input.mentionIds !== undefined && (!Array.isArray(input.mentionIds) || input.mentionIds.length > 64 || input.mentionIds.some(id => typeof id !== 'string' || !id.startsWith(`${channel}:`) || id.length <= channel.length + 1 || id.length > 256 || /[\u0000-\u001f\u007f]/.test(id))))
        throw new TypeError('invalid mentionIds');
    return { channel, accountId: input.accountId, conversationId: input.conversationId, speakerId,
        ...(input.speakerName === undefined ? {} : { speakerName: input.speakerName }),
        ...(input.conversationType === undefined ? {} : { conversationType: input.conversationType }),
        ...(input.platformMessageId === undefined ? {} : { platformMessageId: input.platformMessageId }),
        ...(input.mentionIds === undefined ? {} : { mentionIds: [...input.mentionIds] }),
        ...(input.conversationName === undefined ? {} : { conversationName: input.conversationName }) };
}
export function conversationKey(identity) {
    return JSON.stringify([identity.channel, identity.accountId, identity.conversationType ?? 'private', identity.conversationId]);
}
const appName = (channel) => channel === 'wechat' ? '微信' : channel === 'qq' || channel === 'qq-bridge' ? 'QQ' : channel;
/** A chat as she reads it: 微信「Ken」, 微信群「一家人」, QQ群「…」. */
export function chatLabel(channel, conversationType, name) {
    return `${appName(channel)}${conversationType === 'group' ? '群' : ''}「${name}」`;
}
/** The chat's own name, or for a private chat the person it is with. */
export const chatName = (identity) => identity.conversationName ?? (identity.conversationType === 'group' ? undefined : identity.speakerName);
/**
 * Opens every channel message she receives: which chat, who in a group, and the chatId her send tools take. Kept to
 * one short line because it stays in her context with every message; the full identity rides on the message source.
 */
export function identityPrefix(identity) {
    const speaker = identity.conversationType === 'group' ? ` ${identity.speakerName ?? identity.speakerId} 说` : '';
    return `【${chatLabel(identity.channel, identity.conversationType, chatName(identity) ?? identity.conversationId)}${speaker}，chatId ${identity.conversationId}】\n`;
}
/** Channel messages from 0.7.0 and earlier opened with the whole identity; an upgraded log may still hold some. */
export const legacyIdentityPrefix = (identity) => `【消息来源 ${JSON.stringify(identity)}】\n`;
/** A whole line that is one of the headers above, new or legacy, whoever it names. */
export const IDENTITY_HEADER_LINE = /^【(?:消息来源 \{.*\}|[^【】\n]*，chatId [^【】\n]+)】$/;
