import type { SessionEvent } from '@deepseek-ai/dsh-session';
/** Project only a successful turn's final non-tool reply, never its intermediate commentary. */
export declare function finalReply(events: readonly SessionEvent[], turn: number): string;
