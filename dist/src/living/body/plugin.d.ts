import type { Context } from '@deepseek-ai/cordis';
import type { PetCoreHost } from '../../core/index.js';
import { type BehaviorChange, type BehaviorSnapshot, type PlannedActivity, type PlannedExecution } from '../../contracts/behavior.js';
import { CompanionRoom } from './room.js';
import type { CompanionFactSource } from '../../contracts/interaction.js';
import type { WorldCommands } from '../../contracts/living.js';
import type { RoomInteractionContext } from './room.js';
import { LivingView, type LivingPorts, type RecordCommandEffect } from '../index.js';
export type { PlannedActivity, PlannedExecution } from '../../contracts/behavior.js';
/** The only home/garden runtime writer. It does not create agents or model turns. */
export declare class CompanionBehavior {
    private ctx;
    private host;
    private binding?;
    private serial;
    private closed;
    private closing?;
    private readonly living;
    private autonomous;
    private fault?;
    private publicationFault?;
    private revision;
    private expression?;
    private readingConfirmationEffect?;
    private subscriptions;
    readonly bootId: `${string}-${string}-${string}-${string}-${string}`;
    private timer?;
    private deadlineAt?;
    private awaitingRecovery;
    private conditions;
    readonly worldFacts: CompanionFactSource;
    constructor(ctx: Context, host: PetCoreHost, ports?: LivingPorts | LivingView);
    activate(): void;
    private enqueue;
    private arm;
    private advanceRoom;
    setReconsiderConditions(workspaceId: string, conditions: readonly {
        metric: string;
        comparison: string;
        value: number;
    }[]): Promise<void>;
    nextWakeAt(workspaceId: string, conditions?: readonly {
        metric: string;
        comparison: string;
        value: number;
    }[]): Promise<number | null>;
    private synchronize;
    private checked;
    private activity;
    private presentHome;
    private publish;
    private currentBound;
    private refreshEmotion;
    promptLine(workspaceId: string): string;
    restState(workspaceId: string): {
        sleeping: boolean;
        pending: boolean;
    } | undefined;
    snapshot(workspaceId: string): Promise<BehaviorSnapshot>;
    worldSnapshot(workspaceId: string): Promise<import("../../contracts/living.js").WorldSnapshot>;
    readonly worldCommands: Pick<WorldCommands, 'care'>;
    roomState(workspaceId: string): Promise<any>;
    roomAction(workspaceId: string, input: unknown, by?: string, interaction?: RoomInteractionContext, recordEffect?: RecordCommandEffect): Promise<{
        home: any;
        behavior: {
            revision: number;
            bootId: `${string}-${string}-${string}-${string}-${string}`;
            activityId: string | null;
            kind: string;
            startedAt?: number;
            phase: "idle" | "pending" | "moving" | "working" | "sleeping" | "completed";
            presentationKind?: "read" | "reading-wait" | "rest";
            readingState?: import("../../contracts/behavior.js").ReadingState;
            animationContext?: import("../../contracts/behavior.js").BehaviorAnimationContext;
        };
        ok: boolean;
        changed: boolean;
        event: any;
        room?: any;
        fact?: import("../../contracts/interaction.js").CompanionFact;
    }>;
    act(workspaceId: string, action: string, requestId?: string, channel?: string, recordEffect?: RecordCommandEffect): Promise<{
        home: any;
        behavior: {
            revision: number;
            bootId: `${string}-${string}-${string}-${string}-${string}`;
            activityId: string | null;
            kind: string;
            startedAt?: number;
            phase: "idle" | "pending" | "moving" | "working" | "sleeping" | "completed";
            presentationKind?: "read" | "reading-wait" | "rest";
            readingState?: import("../../contracts/behavior.js").ReadingState;
            animationContext?: import("../../contracts/behavior.js").BehaviorAnimationContext;
        };
        ok: boolean;
        changed: boolean;
        event: any;
        room?: any;
        fact?: import("../../contracts/interaction.js").CompanionFact;
    }>;
    pendingFacts(workspaceId: string): Promise<import("../../contracts/interaction.js").CompanionFact[]>;
    readFacts(workspaceId: string, ids: readonly string[]): Promise<import("../../contracts/interaction.js").CompanionFact[]>;
    acknowledgeFacts(workspaceId: string, ids: readonly string[]): Promise<void>;
    garden(workspaceId: string, operation: 'state' | 'act' | 'control', input?: unknown): Promise<ReturnType<CompanionRoom['garden']> & {
        home?: any;
    }>;
    setAutonomy(workspaceId: string, enabled: boolean): Promise<void>;
    gardenClockState(workspaceId: string): boolean | undefined;
    private plannedCall;
    consumeFood(workspaceId: string, input: {
        operationId: string;
        itemId: string;
        interaction?: RoomInteractionContext;
    }, validate?: () => void): Promise<PlannedExecution>;
    readPlannedSegment(workspaceId: string, operationId: string, validate?: () => void): Promise<import("./room.js").RoomReadingSegment>;
    confirmPlannedReading(workspaceId: string, operationId: string, receiptToken: string, validate?: () => void, recordEffect?: RecordCommandEffect): Promise<PlannedExecution>;
    startPlanned(workspaceId: string, input: PlannedActivity): Promise<PlannedExecution>;
    inspectPlanned(workspaceId: string, operationId: string): Promise<PlannedExecution | undefined>;
    pausePlanned(workspaceId: string, operationId: string): Promise<PlannedExecution>;
    resumePlanned(workspaceId: string, operationId: string): Promise<PlannedExecution>;
    cancelPlanned(workspaceId: string, operationId: string): Promise<PlannedExecution>;
    close(): Promise<void>;
}
export declare const name = "25-Behavior";
export declare const inject: string[];
declare module '@deepseek-ai/cordis' {
    interface Context {
        petBehavior: CompanionBehavior;
    }
    interface Events {
        'pet/behavior.changed'(value: BehaviorChange): void;
    }
}
export declare function apply(ctx: Context): void;
