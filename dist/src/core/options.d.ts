export interface ConversationOptions {
    maxContextChars: number;
    maxSteps: number;
    maxToolCalls: number;
    maxDurationMs: number;
}
/** Host-owned defaults, not persona, intent classifiers, answers or accepted cost targets. */
export declare const DEFAULT_CONVERSATION: Readonly<ConversationOptions>;
export declare function conversationOptions(input?: Partial<ConversationOptions> & {
    maxHistoryMessages?: number;
}): Readonly<ConversationOptions>;
