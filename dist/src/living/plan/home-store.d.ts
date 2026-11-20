import type { LifeStore } from '#dsh-world/life/lifeStore';
import type { LifeState } from '#dsh-world/life/types';
import type { CoreWorkspace, HomeBinding } from '../../core/workspace.js';
export declare function createHomeStore(raw: LifeStore, directory: string, workspace: CoreWorkspace, scope: HomeBinding, changed: () => void): {
    applyArrival: (sessionId: string) => boolean;
    refresh: () => void;
    sessionId: () => string | undefined;
    store: {
        read: () => LifeState;
        refresh: (state: LifeState) => LifeState;
        write(state: LifeState): void;
        update: (change: (state: LifeState) => void) => LifeState;
        appendWake: (record: import("#dsh-world/life/types").WakeRecord) => void;
        appendCompaction: (record: import("#dsh-world/life/types").CompactionRecord) => void;
        appendActivity(record: import("#dsh-world/life/types").ActivityRecord): boolean;
        wakes: () => import("#dsh-world/life/types").WakeRecord[];
        compactions: () => import("#dsh-world/life/types").CompactionRecord[];
        activity: (day: string) => import("#dsh-world/life/types").ActivityRecord[];
        activityDays: () => string[];
    };
};
