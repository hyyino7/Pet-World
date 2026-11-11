import { type ContentBlock } from '@deepseek-ai/dsh-llm';
import { type SessionEvent, type SessionHeader } from '@deepseek-ai/dsh-session';
import type { ArchiveScope, ConversationRecord } from './types.ts';
export declare const conversationRecordId: (worldId: string, sessionId: string, messageId: string) => string;
export declare function visibleText(content: readonly ContentBlock[]): string;
/** A session someone talks in: not a subagent, not delegated. Only these are archived or carry her world. */
export declare const isOrdinarySession: (header: Pick<SessionHeader, "origin" | "delegationDepth">) => boolean;
export declare function extractConversationRecords(event: SessionEvent, scope: ArchiveScope): ConversationRecord[];
