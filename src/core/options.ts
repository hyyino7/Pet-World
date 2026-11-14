import { check, integer } from './storage.js';

export interface ConversationOptions {
  maxContextChars: number; maxSteps: number;
  maxToolCalls: number; maxDurationMs: number;
}
/** Host-owned defaults, not persona, intent classifiers, answers or accepted cost targets. */
export const DEFAULT_CONVERSATION: Readonly<ConversationOptions> = Object.freeze({
  maxContextChars: 24_000, maxSteps: 12, maxToolCalls: 24, maxDurationMs: 120_000,
});
export function conversationOptions(input: Partial<ConversationOptions> & {maxHistoryMessages?:number} = {}): Readonly<ConversationOptions> {
  // Old portable settings may contain the retired Core history-window option.
  // Read it compatibly without recreating that history system or advertising it.
  const {maxHistoryMessages,...current}=input;
  if(maxHistoryMessages!==undefined)integer(maxHistoryMessages,'legacy maxHistoryMessages',0,200);
  check(Object.keys(current).every(key=>Object.hasOwn(DEFAULT_CONVERSATION,key)),'Unknown conversation setting');
  const value = { ...DEFAULT_CONVERSATION, ...current };
  integer(value.maxContextChars, 'maxContextChars', 2048, 128_000);
  integer(value.maxSteps, 'maxSteps', 1, 64);
  integer(value.maxToolCalls, 'maxToolCalls', 0, 128);
  integer(value.maxDurationMs, 'maxDurationMs', 1000, 600_000);
  return Object.freeze(value);
}
