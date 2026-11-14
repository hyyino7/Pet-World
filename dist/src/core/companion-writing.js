import { existsSync, lstatSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { collectPaths } from '#dsh-world/life/activity';
import { readStable } from '#dsh-world/memoryFiles';
import { renderSelf } from '#dsh-world/self';
import { check } from './storage.js';
import { companionRecordPaths } from './record-paths.js';
const owned = (path) => path === 'self.md' || /^(?:diary|self\.history)\/\d{4}-\d{2}-\d{2}\.md$/.test(path);
export function companionWritingFile(host, scope, name) {
    const current = host.workspace.status();
    check(owned(name) && current.state === 'ready' && current.target?.id === scope.id
        && companionRecordPaths(current.target.path).directory === scope.directory, 'Companion writing is outside the bound workspace');
    let path = current.target.path;
    const parts = relative(current.target.path, join(scope.directory, name)).split(sep);
    for (const part of parts) {
        path = join(path, part);
        const stat = lstatSync(path, { throwIfNoEntry: false });
        if (!stat)
            continue;
        check(!stat.isSymbolicLink() && (path === join(scope.directory, name) ? stat.isFile() && stat.nlink === 1 : stat.isDirectory()), 'Unexpected companion writing path');
    }
    return path;
}
/** Self and diaries are module-owned documents, not Memory projections. Bank
 * withdrawal does not erase these files or make an owner conversation unusable.
 * Native scope and stable-file checks remain independent of Memory availability. */
export async function readCompanionWriting(host, scope, name, consumerSessionId) {
    if (consumerSessionId && !scope.sessionIds.includes(consumerSessionId))
        return;
    const file = companionWritingFile(host, scope, name);
    if (!existsSync(file))
        return;
    const read = await readStable(file);
    if (read.kind === 'missing')
        return;
    check(read.kind === 'ok', 'Companion writing is unreadable or changing');
    companionWritingFile(host, scope, name);
    return read.content;
}
export async function readSelfPrompt(host, scope, sessionId) {
    const content = await readCompanionWriting(host, scope, 'self.md', sessionId);
    if (!content?.trim())
        return '';
    // World owns quoting, Unicode limits and the truncation notice.
    const file = companionWritingFile(host, scope, 'self.md');
    let rendered = '';
    const compared = await readStable(file, async () => { rendered = renderSelf(file); });
    companionWritingFile(host, scope, 'self.md');
    return compared.kind === 'ok' && compared.content === content ? rendered : '';
}
/** Keep the existing local path guard; DSH still owns file-tool permissions.
 * There is no whole-chat dependency graph or Memory mode stored by this hook. */
export function trackCompanionWriting(ctx, host, getScope) {
    return ctx.on('tools/pre-execute', (exec, next) => {
        const scope = getScope(), agent = exec.agent;
        if (!scope || !agent || !scope.sessionIds.includes(agent.id) || !['read', 'write', 'edit'].includes(exec.name))
            return next();
        for (const path of collectPaths(exec.arguments, false, [])) {
            const name = relative(scope.directory, resolve(agent.session.header.cwd ?? scope.directory, path)).split(sep).join('/');
            if (owned(name))
                companionWritingFile(host, scope, name);
        }
        return next();
    });
}
//# sourceMappingURL=companion-writing.js.map