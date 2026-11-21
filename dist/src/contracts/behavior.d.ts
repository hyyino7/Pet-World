import type { CompanionFactActor } from './interaction.js';
interface ActionMembership {
    care?: {
        order: number;
        label: string;
    };
    role?: number;
    plan?: number;
    feedback?: true;
}
export declare const BODY_ACTIONS: {
    readonly command: {
        readonly role: 1;
    };
    readonly pet: {
        readonly role: 2;
        readonly care: {
            readonly order: 3;
            readonly label: "摸摸头";
        };
        readonly feedback: true;
    };
    readonly poke: {
        readonly role: 3;
        readonly feedback: true;
    };
    readonly feed: {
        readonly role: 4;
        readonly care: {
            readonly order: 1;
            readonly label: "免费基础餐食";
        };
        readonly plan: 4;
        readonly feedback: true;
    };
    readonly water: {
        readonly role: 5;
        readonly care: {
            readonly order: 2;
            readonly label: "倒杯水";
        };
        readonly plan: 3;
        readonly feedback: true;
    };
    readonly play: {
        readonly role: 6;
        readonly care: {
            readonly order: 4;
            readonly label: "一起玩";
        };
        readonly plan: 5;
        readonly feedback: true;
    };
    readonly talk: {
        readonly role: 7;
        readonly feedback: true;
    };
    readonly sleep: {
        readonly role: 8;
        readonly care: {
            readonly order: 5;
            readonly label: "去睡觉";
        };
        readonly plan: 1;
    };
    readonly wake: {
        readonly role: 9;
        readonly care: {
            readonly order: 6;
            readonly label: "叫醒";
        };
        readonly plan: 2;
    };
    readonly lamp: {
        readonly role: 10;
    };
};
export type BodyAction = keyof typeof BODY_ACTIONS;
type ActionIn<Group extends keyof ActionMembership> = {
    [Action in BodyAction]: Group extends keyof (typeof BODY_ACTIONS)[Action] ? Action : never;
}[BodyAction];
export type CareAction = ActionIn<'care'>;
export type RoleAction = ActionIn<'role'>;
export type PlanBodyAction = ActionIn<'plan'>;
export type FeedbackAction = ActionIn<'feedback'>;
export declare const BODY_ACTION_NAMES: readonly BodyAction[];
export declare const CARE_ACTIONS: readonly ActionIn<"care">[];
export declare const ROLE_ACTIONS: readonly ActionIn<"role">[];
export declare const PLAN_BODY_ACTIONS: readonly ActionIn<"plan">[];
export declare const FEEDBACK_ACTIONS: readonly ActionIn<"feedback">[];
export declare function isCareAction(action: unknown): action is CareAction;
export declare function isPlanBodyAction(action: unknown): action is PlanBodyAction;
/** Read-only media hints grounded in the current accepted operation and facts. */
export interface BehaviorAnimationContext {
    slotId?: string;
    /** Real execution/phase onset when known; never a snapshot/window timestamp. */
    startedAt?: number;
    /** Frozen duration of this exact, known media cue in its original execution. */
    presentationFreeze?: {
        onsetAt: number;
        pausedMs: number;
    };
    itemId?: string;
    foodSlot?: string;
    interaction?: {
        id: string;
        action: string;
        at: number;
        until: number;
        text: string;
        actor: CompanionFactActor;
    };
}
/** Actual semantic activity is distinct from a surface's animation receipt. */
export interface BehaviorActivity {
    activityId: string | null;
    kind: string;
    /** Persisted phase onset when known; zero never claims a historical start. */
    startedAt?: number;
    phase: 'idle' | 'pending' | 'moving' | 'working' | 'sleeping' | 'completed';
    /** Derived from accepted execution and real content receipts, never activity prose. */
    presentationKind?: 'read' | 'reading-wait' | 'rest';
    readingState?: 'unread' | 'offered' | 'confirmed';
    animationContext?: BehaviorAnimationContext;
}
export interface BehaviorChange {
    workspaceId: string;
    bootId: string;
    revision: number;
    reason?: 'observation' | 'transition';
}
export interface CompanionExpression {
    sessionId: string;
    turn: number;
    action?: string;
    actionLabel?: string;
    sticker?: string;
    feelings?: string[];
}
export interface BehaviorPresentation {
    action: string;
    activity: string;
    exclusive: boolean;
    fallback?: boolean;
    feelings: string[];
    emotionLabel: string;
    expression?: CompanionExpression;
}
export interface BehaviorSnapshot extends BehaviorChange {
    storageId: string;
    autonomyEnabled: boolean;
    behavior: BehaviorActivity;
    home: any;
    presentation: BehaviorPresentation;
    fault: string | null;
    planned?: PlannedExecution;
    /** Unrounded authoritative metrics for deterministic plan conditions. */
    needs: Record<'hunger' | 'thirst' | 'energy' | 'bladder' | 'pain', number>;
}
/** A durable program execution receipt; it is not a visual animation receipt. */
export interface PlannedActivity {
    operationId: string;
    kind: 'hold' | 'room' | 'move' | 'garden' | 'body' | 'economy' | 'read';
    activity: string;
    /** Optional registered portrayal; never grants an operation, object or effect. */
    presentationSlot?: string;
    room?: string;
    spot?: string;
    garden?: Record<string, unknown>;
    action?: PlanBodyAction;
    economy?: {
        type: 'buy' | 'sell' | 'consume';
        itemId: string;
        quantity: number;
    };
    reading?: {
        itemId: string;
        segment: number;
    };
    until?: string;
    /** Durations freeze while paused; explicit calendar deadlines do not. */
    freezeOnPause?: boolean;
}
/** Body's synchronous admission guard ran before the durable execution intent
 * or any effect was submitted. Only this proof permits admission to be retried. */
export interface PlannedAdmissionWait {
    version: 1;
    kind: 'owner-activity';
    operationId: string;
    requestId: string;
    observedAt: string;
}
export declare class PlannedAdmissionWaitError extends Error {
    readonly wait: PlannedAdmissionWait;
    constructor(wait: PlannedAdmissionWait);
}
export interface PlannedExecution {
    operationId: string;
    kind: PlannedActivity['kind'];
    status: 'running' | 'paused' | 'completed' | 'cancelled' | 'interrupted' | 'failed';
    phase: 'pending' | 'moving' | 'working' | 'waiting' | 'completed';
    activity: string;
    startedAt: string;
    updatedAt: string;
    until?: string;
    /** Completion contract, derived from the accepted operation. */
    completion?: 'arrival' | 'deadline' | 'explicit-control' | 'receipt';
    reason?: string;
    /** A real program handoff that requires a native model turn, not animation. */
    awaitingInput?: 'reading-content';
    /** A temporary owner interaction retains this accepted operation for safe return. */
    resumeAfterInteraction?: boolean;
}
export {};
