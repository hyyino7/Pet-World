import type { Context } from '@deepseek-ai/cordis';
import type { PetCoreHost } from '../core/index.js';
import { type LifePreferences } from './library.js';
import type { RecordOperation } from '../core/records.js';
import type { CompanionFact } from '../contracts/interaction.js';
/** The upstream fact layer is the only state writer. World owns scheduling,
 * journal and native home recovery; Core owns every model step and Memory. */
export declare class CompanionLife {
    private ctx;
    private host;
    private preset;
    private binding?;
    private runtime?;
    private enabled;
    private restoredClock;
    private preferences;
    private closed;
    private fault?;
    private serial;
    private timer?;
    private subscriptions;
    readonly timeZone: string;
    constructor(ctx: Context, host: PetCoreHost, preset: string);
    /** Domain changes and native alarms wake Life; an idle world needs no pump. */
    private scheduleTick;
    private native;
    private enqueue;
    private current;
    running(): boolean;
    /** Saved clock intent is independent of native planner readiness. This read
     * never waits on Life's queue or initializes a missing control directory. */
    bodyClockState(workspaceId: string): {
        enabled: boolean;
        restoreElapsed: boolean;
    } | undefined;
    isHome(id: string): boolean;
    homeSessionId(): string | undefined;
    /** Presentation reads the original body's two distinct states: walking to bed
     * can be cancelled, but the sleeping animation starts only after arrival. */
    restState(workspaceId: string): {
        sleeping: boolean;
        pending: boolean;
    } | undefined;
    private publishRest;
    private safe;
    private directory;
    private synchronize;
    private startRuntime;
    private stopRuntime;
    private tick;
    private resumeAcceptedPlan;
    private factSource;
    private pendingFacts;
    snapshot(workspaceId: string): Promise<{
        workspaceId: string;
        enabled: boolean;
        running: boolean;
        timeZone: string;
        preferences: {
            wake: string;
            review: string;
            dailyBudget: number | null;
            compactAfterReview: boolean | null;
            planningRepairAttempts: number | null;
        };
        home: any;
        life: import("../../vendor/dsh-world/lib/life/types.js").LifeState | {
            homeSessionId: string | undefined;
            alarm: import("../../vendor/dsh-world/lib/life/types.js").Alarm | undefined;
            review: import("../../vendor/dsh-world/lib/life/types.js").Review | undefined;
            pendingReviews: import("../../vendor/dsh-world/lib/life/types.js").LifeState["pendingReviews"];
            spend: import("../../vendor/dsh-world/lib/life/types.js").Spend | undefined;
            currentPlan: unknown;
            planRevision: number | undefined;
            planningRecovery: import("../../vendor/dsh-world/lib/life/types.js").PlanningRecovery | undefined;
            faults: string[];
        };
        activity: import("../../vendor/dsh-world/lib/life/types.js").ActivityRecord[];
        fault: string | null;
    }>;
    /** Synchronous, read-only prompt projection; no implicit scheduling or model calls. */
    currentPlanSummary(workspaceId: string): string;
    private checkedPlan;
    readPlan(workspaceId: string, validate?: () => void): Promise<{
        revision: number;
        plan: import("./plan.js").CurrentLifePlan | null;
        enabled: boolean;
        running: boolean;
    }>;
    updatePlan(workspaceId: string, expectedRevision: number, raw: unknown, validate?: () => void): Promise<{
        revision: number;
        plan: import("./plan.js").CurrentLifePlan | null;
        enabled: boolean;
        running: boolean;
    }>;
    keepPlan(workspaceId: string, expectedRevision: number, reason: string, nextConsiderAt: string | null, validate?: () => void): Promise<{
        revision: number;
        plan: import("./plan.js").CurrentLifePlan | null;
    }>;
    private checkReadingPlan;
    readPlannedSegment(workspaceId: string, expectedRevision: number, operationId: string, validate?: () => void): Promise<{
        operationId: string;
        confirmation: string;
        title: string;
        version: string;
        totalSegments: number;
        text: string;
        startOffset: number;
        endOffset: number;
        nextSegment: number | null;
        receiptToken: string;
        source: {
            kind: string;
            name: string;
        };
        itemId: string;
        segment: number;
    }>;
    confirmPlannedReading(workspaceId: string, expectedRevision: number, operationId: string, receiptToken: string, validate?: () => void): Promise<{
        revision: number;
        plan: import("./plan.js").CurrentLifePlan | null;
        execution: import("../contracts/behavior.js").PlannedExecution;
    }>;
    controlPlan(workspaceId: string, expectedRevision: number, action: 'pause' | 'resume' | 'cancel', reason: string, validate?: () => void): Promise<{
        revision: number;
        plan: import("./plan.js").CurrentLifePlan | null;
    }>;
    control(workspaceId: string, enabled: boolean): Promise<{
        enabled: boolean;
        running: boolean;
    }>;
    act(workspaceId: string, action: string, requestId?: string, channel?: string): Promise<{
        home: any;
        behavior: {
            revision: number;
            bootId: `${string}-${string}-${string}-${string}-${string}`;
            activityId: string | null;
            kind: string;
            startedAt?: number;
            phase: "idle" | "pending" | "moving" | "working" | "sleeping" | "completed";
            presentationKind?: "read" | "reading-wait" | "rest";
            readingState?: "unread" | "offered" | "confirmed";
            animationContext?: import("../contracts/behavior.js").BehaviorAnimationContext;
        };
        ok: boolean;
        changed: boolean;
        event: any;
        room?: any;
        fact?: CompanionFact;
    }>;
    /** Compatibility methods delegate; Behavior remains available after Life unload. */
    desktopRest(workspaceId: string, action: 'sleep' | 'wake'): Promise<{
        home: any;
        behavior: {
            revision: number;
            bootId: `${string}-${string}-${string}-${string}-${string}`;
            activityId: string | null;
            kind: string;
            startedAt?: number;
            phase: "idle" | "pending" | "moving" | "working" | "sleeping" | "completed";
            presentationKind?: "read" | "reading-wait" | "rest";
            readingState?: "unread" | "offered" | "confirmed";
            animationContext?: import("../contracts/behavior.js").BehaviorAnimationContext;
        };
        ok: boolean;
        changed: boolean;
        event: any;
        room?: any;
        fact?: CompanionFact;
    }>;
    private behavior;
    roomAction(workspaceId: string, input: unknown, by?: string): Promise<{
        home: any;
        behavior: {
            revision: number;
            bootId: `${string}-${string}-${string}-${string}-${string}`;
            activityId: string | null;
            kind: string;
            startedAt?: number;
            phase: "idle" | "pending" | "moving" | "working" | "sleeping" | "completed";
            presentationKind?: "read" | "reading-wait" | "rest";
            readingState?: "unread" | "offered" | "confirmed";
            animationContext?: import("../contracts/behavior.js").BehaviorAnimationContext;
        };
        ok: boolean;
        changed: boolean;
        event: any;
        room?: any;
        fact?: CompanionFact;
    }>;
    roomState(workspaceId: string): Promise<any>;
    garden(workspaceId: string, operation: 'state' | 'act' | 'control', input?: unknown): Promise<({
        ok: boolean;
        accepted?: boolean;
        status?: string;
        message: string;
        garden?: any;
        home?: any;
    } | {
        ok: boolean;
        garden: any;
    } | {
        message: string;
        execution: import("../contracts/behavior.js").PlannedExecution;
        garden: any;
        home: any;
        ok: boolean;
        accepted?: boolean;
        status?: string;
    }) & {
        home?: any;
    }>;
    settings(workspaceId: string, expected: unknown, next: unknown): Promise<{
        preferences: LifePreferences;
    }>;
    library(workspaceId: string, operation: RecordOperation, input?: unknown): Promise<string[] | {
        photos: import("../../vendor/dsh-world/lib/life/photos.js").PhotoSummary[];
        total: number;
        hasMore: boolean;
        limit: number;
        offset: number;
    } | {
        diary: string | null;
        day: string;
        activity: import("../../vendor/dsh-world/lib/life/types.js").ActivityRecord[];
        dialogue?: undefined;
        diaries?: undefined;
        removed?: undefined;
        mediaType?: undefined;
        data?: undefined;
    } | {
        dialogue: {
            items: import("./review-dialogue.js").DialogueLine[];
            nextOffset: number | undefined;
            coverage: "partial" | "eligible";
        } | undefined;
        diaries: {
            date: string;
            excerpt: string;
        }[];
        removed?: undefined;
        mediaType?: undefined;
        data?: undefined;
    } | {
        removed: boolean;
        dialogue?: undefined;
        diaries?: undefined;
        mediaType?: undefined;
        data?: undefined;
    } | {
        mediaType: any;
        data: string;
        dialogue?: undefined;
        diaries?: undefined;
        removed?: undefined;
    }>;
    close(): Promise<void>;
}
export declare const name = "40-Life";
export declare const inject: string[];
export interface Config {
    agentPreset?: string;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        petLife: CompanionLife;
    }
    interface Events {
        'pet/life.review'(sessionId: string): void;
        'pet/life.changed'(): void;
    }
}
export declare function apply(ctx: Context, config?: Config): void;
