import { lstatSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { formatLocalTime } from '#dsh-world/timeContext';
import { companionWritingFile } from './companion-writing.js';
import { companionRecordPaths } from './record-paths.js';
const validDay = (day) => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)
    && Number.isFinite(Date.parse(day + 'T00:00:00Z')) && new Date(day + 'T00:00:00Z').toISOString().slice(0, 10) === day;
export const lifeReviewFileAccessKey = (access) => JSON.stringify([access.workspaceId, access.root, access.storageId, access.sessionId, access.guest, access.reviewDay, access.writing?.directory]);
/** Exact record/material ownership, after native filesystem/cwd resolution. */
export function assertLifeReviewFile(host, access, tool, path, now = new Date()) {
    const current = host.workspace.status(), writing = access.writing;
    if (access.guest || !writing || !writing.sessionIds.includes(access.sessionId) || !writing.isHome(access.sessionId)
        || current.state !== 'ready' || current.target?.id !== access.workspaceId || current.target.path !== access.root
        || host.workspace.storageId() !== access.storageId || !validDay(access.reviewDay))
        throw Error('自主回顾的文件范围暂时无法核对');
    const today = formatLocalTime(now, writing.timeZone).slice(0, 10);
    if (access.reviewDay > today)
        throw Error('自主回顾日期不能在未来');
    const name = relative(writing.directory, resolve(path)).split(sep).join('/');
    if (tool === 'read' && (name === 'diary' || name === 'self.history')) {
        // Validate the directory through the same canonical record-path checks.
        companionWritingFile(host, writing, `${name}/${access.reviewDay}.md`);
        const stat = lstatSync(resolve(path), { throwIfNoEntry: false });
        if (!stat?.isDirectory() || stat.isSymbolicLink())
            throw Error('自主回顾记录目录无效');
        return;
    }
    if (name === 'self.md' || /^(?:diary|self\.history)\/\d{4}-\d{2}-\d{2}\.md$/.test(name)) {
        companionWritingFile(host, writing, name);
        if (tool === 'read')
            return;
        if (tool === 'write' && (name === 'self.md' || name === `diary/${today}.md`))
            return;
        if (tool === 'write' && name === `diary/${access.reviewDay}.md`) {
            if (lstatSync(resolve(path), { throwIfNoEntry: false }))
                throw Error('历史日记已经存在，不能覆盖；更正写入今天的日记');
            return;
        }
        throw Error('自主回顾只写自己的当前自述和本次回顾/当日日记');
    }
    if (tool === 'read') {
        const paths = companionRecordPaths(access.root);
        const allowed = ['activity', 'conversations'].map(kind => join(paths.lifeDirectory, kind, access.reviewDay + '.jsonl'));
        if (allowed.includes(resolve(path))) {
            // Native review names only existing materials; aliases and hard links
            // cannot turn an allowed material into another module's authority.
            let target = access.root;
            for (const part of relative(access.root, resolve(path)).split(sep)) {
                target = join(target, part);
                const stat = lstatSync(target, { throwIfNoEntry: false });
                if (!stat || stat.isSymbolicLink() || (target === resolve(path) ? !stat.isFile() || stat.nlink !== 1 : !stat.isDirectory()))
                    throw Error('自主回顾素材路径无效');
            }
            return;
        }
    }
    throw Error('自主回顾的原生文件工具仅访问自己的记录和本次明确回顾素材');
}
const changed = '自主回顾文件范围已变化，请重新读取当前状态';
const denial = (error) => String(error instanceof Error ? error.message : error);
const isFileTool = (name) => name === 'read' || name === 'write';
/** DSH resolves paths. Recheck the registration and access before native dispatch. */
export function installSourceFileGuard(ctx, getAccess) {
    const prepared = new Map();
    const native = ctx;
    const stopPrepare = ctx.on('tools/pre-execute', async (exec, next) => {
        if (!exec.agent || !isFileTool(exec.name))
            return next();
        const access = getAccess(exec.agent);
        if (!access)
            return next();
        const entry = { lease: access.lease };
        prepared.set(exec.token, entry);
        const assertCurrent = () => {
            access.lease?.assertCurrent();
            if (access.key() !== entry.key)
                throw Error(changed);
        };
        try {
            access.lease?.assertCurrent();
            entry.key = access.key();
            if (entry.key === undefined)
                throw Error(changed);
            const args = exec.arguments;
            if (!args || typeof args.file_path !== 'string' || !args.file_path)
                throw Error('自主回顾文件路径缺失');
            const fs = native.get('fs'), working = native.get('workingDirectory');
            if (!fs || !working)
                throw Error('原生文件路径服务尚未就绪');
            const cwd = await working.ensure(exec.agent, exec.signal);
            assertCurrent();
            const file = await fs.resolve(args.file_path, { cwd, signal: exec.signal });
            assertCurrent();
            entry.path = fs.processPath(file);
            access.check(exec.name, entry.path);
        }
        catch (error) {
            entry.denial = denial(error);
        }
        return next();
    });
    const stopGuard = ctx.tools.guard(exec => {
        if (!exec.agent || !isFileTool(exec.name))
            return;
        const entry = prepared.get(exec.token);
        if (entry?.lease && !entry.lease.isCurrent())
            return changed;
        const access = getAccess(exec.agent);
        if (!access)
            return;
        try {
            access.lease?.assertCurrent();
            if (!entry || entry.lease?.generation !== access.lease?.generation)
                return changed;
            if (entry.denial)
                return entry.denial;
            if (access.key() !== entry.key || !entry.path)
                return changed;
            access.check(exec.name, entry.path);
        }
        catch (error) {
            return denial(error);
        }
    });
    const stopResult = ctx.on('tools/result', exec => { prepared.delete(exec.token); });
    return () => { stopPrepare(); stopGuard(); stopResult(); prepared.clear(); };
}
export function installLifeReviewFileGuard(ctx, host, getAccess, clock = () => new Date()) {
    return installSourceFileGuard(ctx, agent => {
        const access = getAccess(agent);
        if (access)
            return {
                key: () => lifeReviewFileAccessKey(access),
                check: (tool, path) => assertLifeReviewFile(host, access, tool, path, clock()),
            };
    });
}
//# sourceMappingURL=life-review-files.js.map