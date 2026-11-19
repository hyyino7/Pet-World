import { type GardenClock } from '../../economy/garden-clock.js';
export declare class LifeControlFileError extends Error {
    constructor(cause?: unknown);
}
export declare function safeLifeFile(file: string): import("fs").Stats | undefined;
export declare function lifeDirectories(workspacePath: string): readonly [string, string, string];
/** Reads the committed clock without starting Life or creating files. */
export declare function readLifeControl(workspacePath: string): GardenClock | undefined;
export declare function readLifeSettings(workspacePath: string): {
    enabled: boolean;
    pauses: readonly import("../../economy/garden-clock.js").GardenPause[] | undefined;
    preferences: import("./library.js").LifePreferences | undefined;
} | undefined;
