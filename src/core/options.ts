import { integer } from './storage.js';

export interface ConversationOptions {
  maxHistoryMessages: number; maxContextChars: number; maxSteps: number;
  maxToolCalls: number; maxDurationMs: number;
}
/** Host-owned defaults, not persona, intent classifiers, answers or accepted cost targets. */
export const DEFAULT_CONVERSATION: Readonly<ConversationOptions> = Object.freeze({
  maxHistoryMessages: 32, maxContextChars: 24_000, maxSteps: 12, maxToolCalls: 24, maxDurationMs: 120_000,
});
export function conversationOptions(input: Partial<ConversationOptions> = {}): Readonly<ConversationOptions> {
  const value = { ...DEFAULT_CONVERSATION, ...input };
  integer(value.maxHistoryMessages, 'maxHistoryMessages', 0, 200);
  integer(value.maxContextChars, 'maxContextChars', 2048, 128_000);
  integer(value.maxSteps, 'maxSteps', 1, 64);
  integer(value.maxToolCalls, 'maxToolCalls', 0, 128);
  integer(value.maxDurationMs, 'maxDurationMs', 1000, 600_000);
  return Object.freeze(value);
}
