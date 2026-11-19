/** Read-only media selection. Accepted domain work owns effects and completion. */
export interface ActivityClip {
    roomClip: string;
    desktopClip: string;
    mode: 'loop' | 'once' | 'static';
    durationMs: number;
    mirror?: boolean;
}
export interface AnimationSlotContext {
    kind: string;
    action?: string;
    economy?: {
        type: string;
    };
    garden?: Record<string, unknown>;
    foodSlot?: string;
}
export interface ActivityAnimationContext {
    slotId?: string;
    foodSlot?: string;
    itemId?: string;
    startedAt?: number;
    presentationFreeze?: {
        onsetAt: number;
        pausedMs: number;
    };
    interaction?: {
        id: string;
        action: string;
        at: number;
        until: number;
        text?: string;
        summary?: string;
        actor?: {
            kind?: string;
        } | string;
    };
}
export interface ActivityPlayback {
    version: 1;
    key: string;
    activityId: string | null;
    phase: string;
    kind: string;
    startedAt: number;
    /** Accepted pause time for this exact cue; startedAt retains its real onset. */
    pausedMs?: number;
    segments: ActivityClip[];
    gap: boolean;
    notice?: string;
    toolOwner: 'clip' | 'scene' | 'none';
    slotId?: string;
    match?: string;
    uncovered?: string[];
    feedback?: {
        id: string;
        at: number;
        until: number;
        text?: string;
        sticker?: string;
        slotId?: string;
        gap?: boolean;
    };
}
/** One admission rule shared by plan parsing, Body and item metadata. A slot is
 * cosmetic authority only; it cannot grant an item or a new business action. */
export declare function animationSlotAllowed(value: unknown, input: string | AnimationSlotContext): boolean;
export declare function requirePresentationSlot(value: unknown, context: string | AnimationSlotContext): string;
export declare function resolveActivityPlayback(home: any): ActivityPlayback | undefined;
/** Self-contained for both generated carriers: no resolver/table is inlined.
 * Unknown starts skip historical one-shots; loops share a cosmetic clock. */
export declare function sampleActivityPlayback(playback: ActivityPlayback, now?: number): {
    nextInMs?: number | undefined;
    key: string;
    offsetMs: number;
    complete: boolean;
    roomClip: string;
    desktopClip: string;
    mode: "loop" | "once" | "static";
    durationMs: number;
    mirror?: boolean;
} | undefined;
