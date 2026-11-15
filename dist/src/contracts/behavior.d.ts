import type { CompanionFactActor } from './interaction.js';
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
    action?: 'sleep' | 'wake' | 'water' | 'feed' | 'play';
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
