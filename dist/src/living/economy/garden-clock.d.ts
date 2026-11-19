export interface GardenPause {
    readonly from: number;
    readonly to: number | null;
}
export interface GardenClock {
    readonly enabled: boolean;
    readonly pauses?: readonly GardenPause[];
}
export declare function parseGardenPauses(value: unknown, enabled?: boolean): readonly GardenPause[] | undefined;
export declare function recordGardenPause(pauses: readonly GardenPause[] | undefined, enabled: boolean, now: number): readonly GardenPause[] | undefined;
export declare function advanceGardenClock<T extends {
    updatedAt: number;
}>(state: T, now: number, clock: GardenClock, advance: (state: T, now: number) => T): T;
