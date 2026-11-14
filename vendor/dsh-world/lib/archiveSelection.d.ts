import type { Context } from '@deepseek-ai/cordis';
export type MemoryArchiveScope = 'home' | 'workspace';
export declare const validArchiveScope: (value: unknown) => value is MemoryArchiveScope;
/** Native resolution canonicalizes case on Windows, as the host's registry does. */
export declare const canonicalPath: (path: string) => string;
type WorkspaceMembership = (id: string, requireRegistry?: boolean) => boolean;
/**
 * Whose conversations her archive keeps: her home, or every session of her room's workspace. The room is found by
 * its path, as for her world's reach: a home moved in from an older workspace stays listed there too, and that
 * workspace must not become hers. Workspace membership comes from the host, never a preset or a display name.
 */
export declare function createArchiveSelection(scope: MemoryArchiveScope, isHome: (id: string) => boolean, inWorkspace: WorkspaceMembership): (id: string) => boolean;
/**
 * Whether a session is in her room's workspace. Found by the room's path only, so a home recorded elsewhere cannot
 * pull another workspace in; nothing is while the host keeps no workspaces (or has not started them yet).
 */
export declare function createWorkspaceMembership(ctx: Context, roomDir: string, rooms?: () => Iterable<string>): WorkspaceMembership;
export {};
