import type { ArchiveReader, ConversationTurn } from './types.ts';
import { type WorldNames } from './worldPrompt.ts';
export declare function createHistory(store: ArchiveReader): {
    loadRecentTurns: (count: number, includes?: (sessionId: string) => boolean) => Promise<ConversationTurn[]>;
};
export declare function excludePresentMessages(turns: readonly ConversationTurn[], sourceMessageIds: ReadonlySet<string>): ConversationTurn[];
/** Short stable conversation marker: the first eight characters of the host session id. */
export declare function sessionMarker(sessionId: string): string;
export declare function shortenLocalImages(content: string): string;
/**
 * Model-facing memory: one JSON line per turn with only the conversation marker and, per message, role,
 * local time (to the minute) and text. Archive identifiers and channel accounts stay in the archive; a line from
 * WeChat or QQ says only which chat it was (`via`), who in a group (`who`) and, for what she sent, whether it went
 * out (`sent`). Times are stored in UTC and rendered in the configured zone. Her own messages are labelled with her
 * name, so the memory reads as hers rather than a generic assistant's. `homeOnly` (archiveScope home) says the
 * memory is her time at home.
 */
export declare function renderHistory(turns: readonly ConversationTurn[], timeZone: string, names: WorldNames, homeOnly?: boolean): string;
