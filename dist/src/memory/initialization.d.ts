import type { WorkspaceTarget } from '../core/preferences.js';
import { type MemoryConfig } from './client.js';
/** Offline schema preparation only: no HTTP host, scheduler, model or observations. */
export declare function initializeMemoryStorage(config: MemoryConfig | undefined, target: WorkspaceTarget, useConfiguredDirectory?: boolean): void;
