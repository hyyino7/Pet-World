import type { SpeakerIdentity } from '../shared/identity.ts';
import type { ChannelReference } from '../shared/context.ts';
export declare const wechatTextOutput: {
    schema: {
        type: "string";
    };
    render: (_args: unknown, value: string) => {
        type: "text";
        text: string;
    }[];
};
export declare function incomingText(text: string, reference?: ChannelReference): string;
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        'dsh-world-wechat-outgoing': {
            kind: 'dsh-world-wechat-outgoing';
            form: 'recall';
            identity: SpeakerIdentity;
            messages: WechatMessage[];
        };
        'dsh-world-wechat-delivery': {
            kind: 'dsh-world-wechat-delivery';
        };
    }
}
export type WechatMessage = {
    type: 'text';
    text: string;
} | {
    type: 'image' | 'sticker';
    path: string;
} | {
    type: 'sticker';
    stickerId: string;
};
export declare function replyText(messages: readonly WechatMessage[]): string;
/** What she is told when a batch did not go out or may have gone out only in part; a batch that went out says nothing. */
export declare function deliveryNotice(chat: string, messages: readonly WechatMessage[], outcome: {
    status: 'failed';
    error?: string;
} | {
    status: 'uncertain';
    confirmed: number;
}): string;
export declare function replyMessages(value: unknown): WechatMessage[];
export declare function wechatSendTool(send: (chatId: string, messages: WechatMessage[], context: import('@deepseek-ai/dsh-tools').ToolRunContext) => Promise<string>): import("@deepseek-ai/dsh-tools").ToolDefinition;
