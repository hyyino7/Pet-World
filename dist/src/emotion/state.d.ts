import type { EmotionDependencies, EmotionSnapshot, EmotionState, EmotionUpdate } from '../contracts/emotion.js';
interface Scope {
    path: string;
    companionId: string;
    scopeId: string;
    storageId: string;
}
interface Document {
    schema: 1;
    companionId: string;
    scopeId: string;
    storageId: string;
    revision: number;
    current: EmotionState | null;
    importedLegacy?: true;
}
export declare function readDependencies(value: unknown): EmotionDependencies;
export declare function readEmotionState(value: unknown): EmotionState;
/** One canonical file; old Core rows are only a one-time import source. */
export declare class EmotionFile {
    private readonly scope;
    private readonly legacy;
    constructor(scope: Scope, legacy: () => unknown);
    /** Prepare the existing canonical store without inventing a first feeling. */
    initialize(): void;
    private location;
    private empty;
    load(): {
        document: Document;
        contentHash: string;
    };
    snapshot(value: ReturnType<EmotionFile['load']>): EmotionSnapshot;
    private write;
    update(input: EmotionUpdate, at?: number): EmotionSnapshot;
}
export {};
