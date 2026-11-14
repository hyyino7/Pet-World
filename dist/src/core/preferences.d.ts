import type { AttentionPolicy } from '../contracts/core.js';
import type { CoreRuntime } from './runtime.js';
import type { ServiceCall } from '../contracts/common.js';
import { type ConversationOptions } from './options.js';
/** A configured workspace target, not proof of a working native conversation adapter. */
export interface WorkspaceTarget {
    id: string;
    path: string;
    title: string;
}
export interface CorePreferences {
    revision: number;
    workspace: WorkspaceTarget | null;
    conversation: Readonly<ConversationOptions>;
}
export interface PreferencesService {
    read: ServiceCall<Record<string, never>, CorePreferences>;
    setQuiet: ServiceCall<{
        expectedRevision: number;
        quiet: boolean;
    }, AttentionPolicy>;
    save: ServiceCall<{
        expectedRevision: number;
        workspace: WorkspaceTarget | null;
        conversation: ConversationOptions;
    }, CorePreferences>;
}
export declare function preferences(runtime: CoreRuntime): CorePreferences;
export declare function createPreferences(runtime: CoreRuntime): PreferencesService;
