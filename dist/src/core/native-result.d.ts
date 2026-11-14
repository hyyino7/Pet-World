import type { SessionEvent } from '@deepseek-ai/dsh-session';
export interface NativeRunResult {
    state: 'completed' | 'cancelled' | 'failed' | 'unknown';
    hostTurnIds: readonly string[];
    text: string;
    reason?: string;
}
/** Read the original native log; this neither schedules nor resumes a session. */
export declare function nativeResult(events: readonly SessionEvent[], messageId: string): NativeRunResult;
