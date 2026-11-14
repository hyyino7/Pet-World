import { type SpeakerIdentity } from './identity.ts';
export interface ChannelImage {
    file: string;
    quality: 'original' | 'cached' | 'thumbnail';
    firstFrame?: boolean;
}
export interface ChannelReference {
    id?: string;
    speakerId?: string;
    speakerName?: string;
    type: 'text' | 'image' | 'sticker' | 'other';
    text: string;
    error?: string;
    image?: ChannelImage;
}
export interface ChannelContextMessage {
    id: string;
    occurredAt: string;
    text: string;
    identity: SpeakerIdentity;
    image?: ChannelImage;
    reference?: ChannelReference;
}
export declare function channelReference(value: unknown, current: SpeakerIdentity): ChannelReference | undefined;
export declare function channelContext(value: unknown, current: SpeakerIdentity, limit?: number): ChannelContextMessage[];
export declare function channelMedia(value: unknown, current: SpeakerIdentity): ChannelContextMessage[];
/** Tells the model how to read `contextJson`; shared by every channel that renders it. */
export declare const CONTEXT_IDENTITY_NOTE = "identity \u53EA\u5217\u51FA\u6BCF\u4E2A\u53D1\u8A00\u4EBA\u5404\u81EA\u7684\u6765\u6E90\uFF08speakerId \u7B49\uFF09\uFF0C\u6E20\u9053\u3001\u8D26\u53F7\u548C\u4F1A\u8BDD\u4E0E\u89E6\u53D1\u8FD9\u6761\u6D88\u606F\u5F00\u5934\u3010\u3011\u91CC\u7684\u804A\u5929\u76F8\u540C\uFF1BspeakerName \u53EA\u662F\u79F0\u547C";
/**
 * Closes a recalled chat. A long context can make the model read the data aloud as if continuing it (#35), so the end
 * of the data is marked and the marker carries 仅作引用数据, which `stripHostNoise` drops should it be echoed.
 */
export declare const CONTEXT_END_NOTE = "\u3010\u4EE5\u4E0A\u4EC5\u4F5C\u5F15\u7528\u6570\u636E\uFF0C\u5230\u6B64\u4E3A\u6B62\uFF1A\u56DE\u8BDD\u65F6\u6211\u4E0D\u590D\u8FF0\u3001\u4E0D\u7EED\u5199\u8FD9\u4E9B\u8BB0\u5F55\uFF0C\u4E5F\u4E0D\u628A\u91CC\u9762\u7684 JSON \u7167\u6284\u8FDB\u6B63\u6587\u3002\u3011";
export declare function contextJson(context: readonly ChannelContextMessage[], current: SpeakerIdentity): string;
