import type { Agent } from '@deepseek-ai/dsh-agent';
import type { Message } from '@deepseek-ai/dsh-llm';
import type { SessionEvent, UserMessage } from '@deepseek-ai/dsh-session';
import type { RegistrationLease, SourceClassificationResult } from '../../contracts/tables.js';
/** Reuse module-owned structured projections, never middle-slice JSON or prose.
 * Explicit full/detail/receipt reads and already-small results are immutable. */
export declare function historicalStateOverview(name: string, args: unknown, value: unknown): unknown | undefined;
/** Only completed Life turns, excluding owner takeovers, reviews and the latest
 * turn. Raw tool calls identify reads; mutations, errors and other tools stay. */
type ClassifySource = (message: UserMessage) => SourceClassificationResult;
export declare function lifeHistoryCandidates(events: readonly SessionEvent[], nodes: readonly number[], classify: ClassifySource, warn?: (message: string) => void): {
    event: SessionEvent<'tool/result'>;
    call: SessionEvent<'tool/call'>['data'];
    lease: RegistrationLease;
}[];
export interface HistoryProjection {
    event: SessionEvent<'tool/result'>;
    text: string;
    lease: RegistrationLease;
}
export interface HistoryMaintenanceResult {
    replaced: number;
    charsBefore: number;
    charsAfter: number;
}
/** Idle maintenance is read-only. Native persistence requires replacement
 * tool results inside an open turn, so landing waits for the next real request.
 * This does not wake a session or consume/acknowledge any domain facts. */
export declare function prepareLifeHistory(agent: Agent, isCurrent: () => boolean, classify: ClassifySource): Promise<HistoryProjection[]>;
/** Native pruning pattern: shadow pricing, positional replacement and exact
 * source citation. Must run in agent/request, never in the idle log. Ordinary
 * native turn persistence checkpoints the change; originals remain replayable. */
export declare function applyLifeHistory(agent: Agent, changes: readonly HistoryProjection[], meter: {
    estimateMessage(message: Message): number;
}): HistoryMaintenanceResult;
export {};
