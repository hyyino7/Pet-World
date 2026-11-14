import type { Context } from '@deepseek-ai/cordis';
import type { CoreRuntime } from './runtime.js';
import type { NativeRunResult } from './native-result.js';
import type { UserMessage, SessionEvent } from '@deepseek-ai/dsh-session';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { NativeMemory } from './native-memory.js';
import type { CompanionFact } from '../contracts/interaction.js';
export interface NativeScope {
    workspaceId: string;
    path: string;
    storageId: string;
    guest: boolean;
}
/** Scoped services for the existing DSH Agent; only autonomous inputs have extra allowances. */
export declare class CoreNative {
    readonly runtime: CoreRuntime;
    memory?: NativeMemory;
    memoryEnabledForNewSessions: boolean;
    /** Life owns admission; absence/unload leaves background native turns denied. */
    lifeAdmission?: (sessionId: string, message: UserMessage) => boolean;
    roomAdmission?: (sessionId: string, message: UserMessage) => boolean;
    channelBoundary?: {
        guest(sessionId: string): boolean;
        admit(sessionId: string, message: UserMessage): boolean;
        identity?(sessionId: string): Record<string, unknown> | undefined;
    };
    resolveScope?: (sessionId: string) => NativeScope | undefined;
    attachGuest?: (context: Context) => void;
    private readonly turns;
    private readonly preparedFactInputs;
    scopeFor(sessionId: string): NativeScope | undefined;
    private current;
    acceptsInput(sessionId: string, message: UserMessage): boolean;
    memoryFor(_sessionId: string): NativeMemory | undefined;
    /** Native DSH owns the turn. Core retains only its attributed input identifiers,
     * not an execution/activity, allowance, serial slot or cancellation timer. */
    observeInputs(sessionId: string, turn: number, messages: readonly UserMessage[], scope?: NativeScope): string[];
    /** Called only by scoped native input/prompt adapters, never a model tool. */
    clearPreparedFacts(sessionId: string): void;
    observeFacts(sessionId: string, facts: readonly CompanionFact[], scope?: NativeScope): string[];
    finishTurn(sessionId: string, turn: number, result: NativeRunResult): Promise<void>;
    playbackEvidence?: (sessionId: string, playbackId: string) => {
        text: string;
        occurredAt: number;
        associated(memoryId: string): void;
    } | undefined;
    private readonly active;
    private closing;
    constructor(runtime: CoreRuntime);
    manages(sessionId: string): boolean;
    /** Autonomous planning submits durable intent; it must not bypass it with ad-hoc body goals. */
    isAutonomous(sessionId: string): boolean;
    /** Read selected sources through the owning Memory service. This does not
     * enroll a runner or attach dependencies to the whole native conversation. */
    useSources(sessionId: string, sourceIds: string[]): Promise<void>;
    useTranscript(sessionId: string, nodes: readonly number[], events: readonly SessionEvent[]): void;
    begin(sessionId: string, turn: number, messages: readonly UserMessage[], signal: AbortSignal, lifecycle: {
        cancel(): void;
    }): Promise<void>;
    validate(sessionId: string): void;
    guardTool(sessionId: string): void;
    tools(sessionId?: string): ToolDefinition[];
    context(): {
        identity: string;
        user: string;
    };
    finish(sessionId: string): void;
    end(sessionId: string): Promise<void>;
    close(): Promise<void>;
}
