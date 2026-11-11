import type { Context } from '@deepseek-ai/cordis';
import type { LifeStore } from '../life/lifeStore.ts';
import type { LifeRuntime } from '../life/runtime.ts';
import type { ArchiveStore } from '../store.ts';
import type { WorldConfig } from '../types.ts';
import type { WorldNames } from '../worldPrompt.ts';
import type { MemoryArchiveScope } from '../archiveSelection.ts';
import type { ConsoleSources } from './routes.ts';
import type { HomeApplyState } from './homeApply.ts';
import type { PhotoStore } from '../life/photos.ts';
import type { DailySchedule } from '../life/types.ts';
import type { MemoryService } from '../memory.ts';
export declare function estimateTokens(text: string): number;
export interface SnapshotDeps {
    ctx: Context;
    config: WorldConfig;
    archive: ArchiveStore;
    names(): WorldNames;
    /** Absent when the life line could not be set up. */
    lifeStore?: LifeStore;
    /** The running life line; undefined while her world is stopped. */
    life(): LifeRuntime | undefined;
    homeApply?(): HomeApplyState;
    photos?(): PhotoStore;
    /** Long-term memory: the console's lookups and the health of its index. */
    longTerm?: MemoryService;
    diaryDir: string;
    running(): boolean;
    /** CNY a day for her home; undefined is no limit. */
    dailyBudget(): number | undefined;
    /** Turns her memory block carries. */
    memoryTurns(): number;
    /** Hours of silence after which a session re-reads her memory block and prompt. */
    coldHours?(): number;
    selectedArchiveScope?(): MemoryArchiveScope;
    compactAfterReview?(): boolean;
    /** The evening look back and the morning wake, with what an empty field goes back to; absent without the life line. */
    schedule?(): DailySchedule & {
        defaults: DailySchedule;
    };
    workspacePermissions?(): {
        defaultPermission: string;
        options: {
            value: string;
            name: string;
            description?: string;
        }[];
    };
    /** The WeChat module's state; undefined while it is off or her world is stopped. */
    wechat?(): unknown;
    /** Whose conversations her archive keeps; the memory block shown is read through it. */
    archiveSession?(id: string): boolean;
    /** Faults outside the life line: the memory line, the bridge, starting and stopping. */
    faults(): string[];
    /** Which modules the config allows, whether their console switch is on, and whether they are running now. */
    modules?(): unknown;
    /** The OneBot channel she runs herself; null while it is off. */
    native?(): unknown;
}
/** Read-only views for the console; repeated polling within a few seconds reuses one snapshot until `invalidate`. */
export declare function consoleSources(deps: SnapshotDeps): ConsoleSources & {
    invalidate(): void;
};
