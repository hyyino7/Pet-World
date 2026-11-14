import { CoreNative } from './native.js';
import { CoreWorkspace } from './workspace.js';
import { type CoreConfig } from './runtime.js';
import { CoreRecords } from './records.js';
/** One companion's configuration, records and hooks into the native DSH runtime. */
export declare function createCore(config: CoreConfig): {
    services: {
        core: Readonly<import("../contracts/core.js").CoreService>;
        preferences: import("./preferences.js").PreferencesService;
        workspace: import("./workspace.js").WorkspaceService;
    };
    operator: {
        request: (requestId: string) => import("../contracts/common.js").RequestContext;
    };
    observe: (observer: (operation: string, value: unknown) => void) => void;
    workspace: CoreWorkspace;
    native: CoreNative;
    records: CoreRecords;
    close: () => Promise<void>;
};
export type PetCoreHost = ReturnType<typeof createCore>;
export type { CoreConfig } from './runtime.js';
export type { NativeRunResult } from './native-result.js';
export type { ConversationOptions } from './options.js';
export type { CorePreferences, PreferencesService, WorkspaceTarget } from './preferences.js';
export type { WorkspaceStatus, WorkspaceService } from './workspace.js';
