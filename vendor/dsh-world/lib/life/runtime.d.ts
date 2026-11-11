import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import '../hostContract.ts';
import type { WorldConfig } from '../types.ts';
import { type LifeTimers } from './alarmTimer.ts';
import type { LifeHost } from './host.ts';
import type { LifeStore } from './lifeStore.ts';
import type { Notifier } from './notify.ts';
import type { PhotoStore } from './photos.ts';
import type { Alarm, LifeOptions, Review } from './types.ts';
export interface LifeDeps {
    ctx: Context;
    config: WorldConfig;
    options: LifeOptions;
    store: LifeStore;
    host: LifeHost;
    notifier: Notifier;
    clock?: () => Date;
    timers?: LifeTimers;
    /** CNY her home may spend a day; undefined or absent is no limit. */
    dailyBudget?: () => number | undefined;
    /** Called once each evening look back has been handed to her home (not for alarms or greetings, and not when delivery failed). */
    afterReview?: () => void;
    /** Read-only facts appended after the user's alarm template is rendered. */
    alarmContext?: (now: Date) => string | undefined;
    photos?: () => PhotoStore;
    /** Her room's workspace; the life line reaches only its sessions. Absent, every session of hers. */
    inWorkspace?: (sessionId: string) => boolean;
}
/**
 * Her life line: one pending alarm, kept in life.json and delivered into her home with `agent.steer`, the
 * tools she sets it with, the home itself, a new home's greeting and the evening look back. The parts live in
 * their own modules; this wires them.
 */
export declare function createLifeRuntime(deps: LifeDeps): {
    start: (options?: {
        resumed?: boolean;
    }) => Promise<void>;
    stop: () => void;
    planNext: (input: {
        at?: string;
        after_minutes?: number;
    }, note: string) => string;
    checkAlarm: () => string;
    cancelAlarm: () => string;
    deliver: () => Promise<void>;
    reschedule: () => void;
    snapshot: () => {
        homeSessionId: string | undefined;
        alarm: Alarm | undefined;
        review: Review | undefined;
        spend: import("./types.ts").Spend | undefined;
        faults: string[];
    };
    /** Resolves once no alarm delivery is in flight (its durability flush can outlast the turn it starts). */
    settled: () => Promise<void>;
    home: () => Promise<Agent>;
    /** Whether this session is her home now; the world prompt gives the home its world line. */
    isHome: (sessionId: string) => boolean;
};
export type LifeRuntime = ReturnType<typeof createLifeRuntime>;
