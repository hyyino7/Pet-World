import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { PetCoreHost } from './index.js';
import type { PetWorld } from '../world/service.js';
import { type CompanionWritingScope } from './companion-writing.js';
import type { HomeBinding } from './workspace.js';
/** Core selects one canonical record location independently of Life. */
export declare function companionWritingScope(ctx: Context, host: PetCoreHost): CompanionWritingScope | undefined;
/** Foreground home identity does not imply that autonomous Life is enabled. */
export declare function isCompanionHome(ctx: Context, host: PetCoreHost, sessionId: string): boolean;
export declare function resolveHomeAgent(ctx: Context, host: PetCoreHost, scope: HomeBinding, id: string): Promise<Agent | undefined>;
export declare function ensureCompanionHomeSession(ctx: Context, host: PetCoreHost, scope: HomeBinding, preset: string): Promise<string>;
/** Reuse World's recorded native home without starting its schedules or wakeups. */
export declare function resolveCompanionHome(ctx: Context, host: PetCoreHost, preset?: string): Promise<Agent>;
/** Installs only scoped native prompt sections and existing guarded file-tool hooks. */
export declare function renderCompanionFoundation(ctx: Context, host: PetCoreHost, world: PetWorld, agent: Agent): string;
export declare function installCompanionFoundation(ctx: Context, host: PetCoreHost, world: PetWorld): () => void;
