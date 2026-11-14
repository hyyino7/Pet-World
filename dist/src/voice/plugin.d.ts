import type { Context } from '@deepseek-ai/cordis';
import type { PetCoreHost } from '../core/index.js';
export interface VoiceRequest {
    rest: string;
    method: string;
    body?: string;
    signal?: AbortSignal;
}
type VoiceResponse = {
    kind: 'json';
    status: number;
    obj: unknown;
} | {
    kind: 'file';
    file: string;
    contentType: string;
};
export declare class CompanionVoice {
    private host;
    private directory;
    private recognizer;
    private lifetime;
    private scope?;
    constructor(host: PetCoreHost, directory: string, recognizer: () => unknown);
    canTranscribe(): boolean;
    private binding;
    refresh(): void;
    release(): void;
    handle(input: VoiceRequest): Promise<VoiceResponse>;
}
export declare const name = "70-Voice";
export declare const inject: string[];
export declare function apply(ctx: Context, config?: {
    deviceDirectory?: string;
}): void;
declare module '@deepseek-ai/cordis' {
    interface Context {
        petVoice: CompanionVoice;
    }
}
export {};
