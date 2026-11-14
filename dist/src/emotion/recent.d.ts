import type { CompanionSettings } from '../core/companion-settings.js';
import type { PlaybackReceipt, ReplyIntent } from './index.js';
export type Retention = Pick<CompanionSettings, 'recentActionCount' | 'recentActionMinutes' | 'recentMoodCount' | 'recentMoodHours'>;
/** Create only the ledger schema; no synthetic experience is inserted. */
export declare function initializeRecentStorage(root: string): void;
interface Feedback {
    quote: string;
    at: number;
    sourceId: string;
    memories: string[];
}
interface Action {
    id: string;
    name: string;
    at: number;
    status: PlaybackReceipt['status'];
    feedback: Feedback[];
}
interface Mood {
    mood: string;
    reason: string;
    at: number;
    memories: string[];
    action?: string;
}
export interface RecentExperience {
    actions: Action[];
    moods: Mood[];
}
interface Location {
    id: string;
    path: string;
}
type Receipt = Pick<PlaybackReceipt, 'id' | 'name' | 'status' | 'kind'>;
/** A single bounded row per workspace. No promotions or second copy of the durable Bank. */
export declare class RecentLedger {
    private readonly workspace;
    private readonly retention;
    private readonly clock;
    constructor(workspace: Location, retention: () => Retention, clock?: () => number);
    private access;
    read(): RecentExperience;
    playback(receipt: Receipt): void;
    /** Match model-selected feedback to an observed action and to exact text in the current owner message. */
    reply(intent: ReplyIntent, user: {
        id: string;
        text: string;
    } | undefined, memoryIds: string[]): void;
    /** Connect earlier situational feedback on this exact action to the confirmed lasting preference. */
    associate(actionName: string, memoryId: string): void;
    /** Updating a durable preference also retires its old evidence from short-term use. */
    retire(memoryId: string): void;
}
export {};
