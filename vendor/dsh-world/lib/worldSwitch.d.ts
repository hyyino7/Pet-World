import { type MemoryArchiveScope } from './archiveSelection.ts';
/** How many of the newest turns the memory block carries when nothing else is set. */
export declare const DEFAULT_MEMORY_TURNS = 200;
/** Hours a session stays silent before its next turn re-reads her memory block and prompt (#36); see `runtime.ts`. */
export declare const DEFAULT_COLD_HOURS = 24, MAX_COLD_HOURS = 720;
/** WeChat group messages read before a mention, and seconds a private image waits for its companions. */
export declare const DEFAULT_WECHAT_CONTEXT = 5, MAX_WECHAT_CONTEXT = 20;
export declare const DEFAULT_WECHAT_BUFFER_SECONDS = 3, MAX_WECHAT_BUFFER_SECONDS = 30;
/**
 * Her world's own settings, changed from the world console and kept in `<world>/world.json` so they outlast a
 * restart: whether it runs (memory block, prompts, archive and life line together), how much her home may
 * spend a day, and how many recent turns her memory block carries. A world that already has a life line from before the switch existed is running; a new one waits
 * for its partner to press start.
 */
export declare function createWorldSwitch(worldDir: string, configuredScope?: MemoryArchiveScope, configuredWake?: string): {
    archiveScope: () => MemoryArchiveScope;
    selectedArchiveScope: () => MemoryArchiveScope;
    restartRequired: () => boolean;
    setArchiveScope(scope: MemoryArchiveScope): void;
    workspacePermission: () => string;
    setWorkspacePermission(permission: string): void;
    /** Compact the home after the evening look back unless the partner turns it off. */
    compactAfterReview: () => boolean;
    setCompactAfterReview(on: boolean): void;
    /** Whether the profile has been switched to the tool-free compaction (by this plugin or by hand); asked once, so putting the stock one back sticks. */
    compactionSwapped: () => boolean;
    markCompactionSwapped: () => void;
    running: () => boolean;
    set: (running: boolean) => void;
    /** CNY a day for her home; undefined is no limit. */
    dailyBudget: () => number | undefined;
    setDailyBudget(yuan: number | undefined): void;
    /** Turns in her memory block; read when a block is built, so a change shows from the next session start or compaction. */
    memoryTurns: () => number;
    setMemoryTurns(turns: number | undefined): void;
    /** Read at every turn start, so a change applies from the next turn of each session. */
    coldHours: () => number;
    setColdHours(hours: number | undefined): void;
    /**
     * The console's switches for the WeChat and QQ modules; both are off until someone turns them on. QQ's SDK is an
     * optional dependency, so its code is not even loaded before then. WeChat used to default to on, so a world that
     * never stored a choice but whose WeChat module has already run (it keeps its outbox) stays on after the upgrade.
     */
    wechatEnabled: () => boolean;
    qqEnabled: () => boolean;
    setModules(next: {
        wechat?: boolean;
        qq?: boolean;
    }): void;
    /** Her evening look back and her morning wake when nothing is pending; the configured `fallbackWakeTime` is the morning's default. */
    reviewTime: () => string;
    wakeTime: () => string;
    /** A field left out stays as it is; null goes back to its default. */
    setSchedule(next: {
        review?: string | null;
        wake?: string | null;
    }): void;
    /** Read by the WeChat adapter on its next poll; a batch already waiting keeps the value it started with. */
    wechatContext: () => number;
    wechatBufferSeconds: () => number;
    setWechat(next: {
        context?: number | null;
        bufferSeconds?: number | null;
    }): void;
};
export declare const validTurns: (value: unknown) => value is number;
export declare const validColdHours: (value: unknown) => value is number;
export declare const validWorkspacePermission: (value: unknown) => value is string;
export declare const validWechatContext: (value: unknown) => value is number;
export declare const validWechatBuffer: (value: unknown) => value is number;
