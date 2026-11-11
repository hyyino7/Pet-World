import { existsSync, realpathSync } from 'node:fs';
export const validArchiveScope = (value) => value === 'home' || value === 'workspace';
const workspaces = (ctx) => ctx.get('workspaceRegistry')?.list();
/** Native resolution canonicalizes case on Windows, as the host's registry does. */
export const canonicalPath = (path) => existsSync(path) ? realpathSync.native(path) : path;
/**
 * Whose conversations her archive keeps: her home, or every session of her room's workspace. The room is found by
 * its path, as for her world's reach: a home moved in from an older workspace stays listed there too, and that
 * workspace must not become hers. Workspace membership comes from the host, never a preset or a display name.
 */
export function createArchiveSelection(scope, isHome, inWorkspace) {
    return id => (scope !== 'home' || isHome(id)) && inWorkspace(id, true);
}
/**
 * Whether a session is in her room's workspace. Found by the room's path only, so a home recorded elsewhere cannot
 * pull another workspace in; nothing is while the host keeps no workspaces (or has not started them yet).
 */
export function createWorkspaceMembership(ctx, roomDir, rooms) {
    return (id, requireRegistry = false) => {
        const all = workspaces(ctx);
        if (!all) {
            if (requireRegistry)
                throw new Error('工作区归档需要宿主工作区服务');
            return false;
        }
        const path = canonicalPath(roomDir);
        if (!all.find(workspace => workspace.path === path)?.sessionIds.includes(id))
            return false;
        return !rooms || !Array.from(rooms()).some(other => {
            if (other === roomDir)
                return false;
            const otherPath = canonicalPath(other);
            return otherPath === path || all.some(workspace => workspace.path === otherPath && workspace.sessionIds.includes(id));
        });
    };
}
