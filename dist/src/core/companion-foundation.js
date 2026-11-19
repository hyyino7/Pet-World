import { existsSync, lstatSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHome, markHomeArrival } from '#dsh-world/life/home';
import { createLifeStore } from '#dsh-world/life/lifeStore';
import { Faults } from '#dsh-world/faults';
import { renderTemplate } from '#dsh-world/worldPrompt';
import { check } from './storage.js';
import { registerWorldPrompt } from './native/prompt.js';
import { readSelfPrompt, trackCompanionWriting } from './companion-writing.js';
import { companionRecordPaths } from './record-paths.js';
function workspace(ctx, host) {
    const native = ctx, current = host.workspace.status();
    const registry = native.get('workspaceRegistry');
    const target = current.state === 'ready' && current.target ? registry?.get(current.target.id) : undefined;
    return target && target.path === current.target?.path ? { target, registry: registry } : undefined;
}
/** Core selects one canonical record location independently of Life. */
export function companionWritingScope(ctx, host) {
    const current = workspace(ctx, host);
    if (!current)
        return;
    const directory = companionRecordPaths(current.target.path).directory;
    return { id: current.target.id, directory, sessionIds: current.target.sessionIds,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        isHome: id => isCompanionHome(ctx, host, id) };
}
function recordedHome(host) {
    const bound = host.workspace.status();
    if (bound.state !== 'ready' || !bound.target)
        return;
    let path = bound.target.path;
    for (const part of ['.chatpet', 'data', 'life', 'life.json']) {
        path = join(path, part);
        const stat = lstatSync(path, { throwIfNoEntry: false });
        if (!stat)
            return;
        check(!stat.isSymbolicLink() && (part === 'life.json' ? stat.isFile() && stat.nlink === 1 && stat.size <= 64 * 1024 : stat.isDirectory()), 'Companion home data is invalid');
    }
    const state = JSON.parse(readFileSync(path, 'utf8'));
    check(state.version === 1 && (state.homeSessionId === undefined || typeof state.homeSessionId === 'string'), 'Companion home record is invalid');
    return state.homeSessionId;
}
/** Foreground home identity does not imply that autonomous Life is enabled. */
export function isCompanionHome(ctx, host, sessionId) {
    const current = workspace(ctx, host);
    return !!current && current.target.sessionIds.includes(sessionId)
        && !current.registry.archivedSessionIds.includes(sessionId) && recordedHome(host) === sessionId;
}
const homes = new WeakMap();
const owners = new WeakMap();
/** Reuse World's recorded native home without starting its schedules or wakeups. */
export async function resolveCompanionHome(ctx, host, preset) {
    ctx = owners.get(host) ?? ctx;
    await ctx.get('petTranscripts')?.restore();
    const current = workspace(ctx, host);
    check(current, 'Bind the companion workspace before opening its home');
    const key = JSON.stringify([current.target.id, current.target.path, host.workspace.storageId()]);
    let cached = homes.get(host);
    if (!cached || cached.key !== key) {
        const native = ctx, bound = current.target;
        let directory = bound.path;
        for (const part of ['.chatpet', 'data', 'life']) {
            directory = join(directory, part);
            if (!existsSync(directory))
                mkdirSync(directory, { mode: 0o700 });
            check(lstatSync(directory).isDirectory() && !lstatSync(directory).isSymbolicLink(), 'Companion home directory is invalid');
        }
        const store = createLifeStore(directory, Intl.DateTimeFormat().resolvedOptions().timeZone);
        const active = () => {
            const selected = workspace(ctx, host);
            return selected?.target.id === bound.id && selected.target.path === bound.path;
        };
        const selectedPreset = preset || native.get('agentPresets')?.composedPreset(ctx) || 'standard';
        const controller = () => {
            const value = native.get('sessionController');
            check(value, 'Native session controller is unavailable');
            return value;
        };
        const logger = ctx.logger('chatpet-home');
        const home = createHome({ roomDir: bound.path, agentPreset: selectedPreset,
            get title() { const name = host.workspace.runtime.identity().displayName; return name ? name + '的家' : '伙伴的家'; }, roomTitle: bound.path,
            faults: new Faults(), logger, stopped: () => !active(),
            current: () => recordedHome(host),
            moveIn: id => {
                check(active(), 'Companion home binding changed');
                // Preserve World's pending arrival even when Room opened the home first.
                // Life delivers it only after its scheduler is explicitly enabled.
                store.write(markHomeArrival(store.read(), id));
            },
            opened: agent => { check(active() && host.workspace.sessionStatus(agent.session, current.registry)?.state === 'ready', 'Companion home left its workspace'); },
            inWorld: session => active() && host.workspace.sessionStatus(session, current.registry)?.state === 'ready',
            host: {
                workspace: async () => { check(active(), 'Companion home binding changed'); return workspace(ctx, host).target; },
                createSession: async (_cwd, agentPreset, workspaceId) => {
                    check(active() && workspaceId === bound.id, 'Companion home binding changed');
                    return (await controller().create({ workspaceId: bound.id, agentPreset })).sessionId;
                },
                resolveAgent: async (id) => {
                    check(active() && workspace(ctx, host).target.sessionIds.includes(id), 'Companion home does not belong to the workspace');
                    const result = await controller().resolveAgent(id);
                    if (!result.agent && result.error?.code === 'session/not-found')
                        return;
                    check(result.agent && host.workspace.sessionStatus(result.agent.session, current.registry)?.state === 'ready', result.error?.message || 'Companion home is unavailable');
                    return result.agent;
                },
                isArchived: id => current.registry.archivedSessionIds.includes(id),
                rename: async (id, title) => { check(active(), 'Companion home binding changed'); await controller().rename({ sessionId: id, title }); },
                origin: () => native.get('webServer')?.getOrigin() ?? '',
            },
        });
        cached = { key, home };
        homes.set(host, cached);
    }
    return cached.home.open();
}
/** Installs only scoped native prompt sections and existing guarded file-tool hooks. */
export function renderCompanionFoundation(ctx, host, world, agent) {
    if (world.sessionStatus(agent.session)?.state !== 'ready')
        return '';
    const scope = companionWritingScope(ctx, host);
    if (!scope)
        return '';
    const get = ctx.get.bind(ctx);
    return renderTemplate(host.workspace.foundation().text, { memory: !!host.native.memoryFor(agent.id), emotion: !!get('petEmotion'), behavior: host.native.companionPorts.get('bodyAvailable')?.() ?? false, records: true }, { selfFile: join(scope.directory, 'self.md') });
}
export function installCompanionFoundation(ctx, host, world) {
    owners.set(host, ctx);
    const prepared = new WeakMap();
    const getScope = () => companionWritingScope(ctx, host);
    const stopScope = host.native.companionPorts.bind(ctx, agent => {
        if (agent.session.header.agentPreset === 'chatpet-channel-guest' || host.native.isGuest(agent.id)
            || world.sessionStatus(agent.session)?.state !== 'ready')
            return;
        const current = workspace(ctx, host), scope = getScope();
        if (!current || !scope || !scope.sessionIds.includes(agent.id) || current.registry.archivedSessionIds.includes(agent.id))
            return;
        return { workspaceId: scope.id, path: current.target.path, storageId: host.workspace.storageId() };
    });
    const stopWriting = trackCompanionWriting(ctx, host, getScope);
    const stopHomeEvents = ctx.on('session/event', (session, event) => {
        if (event.type === 'turn/end')
            homes.get(host)?.home.turnEnded(session.id);
    });
    let lastHomeTitle = '';
    const refreshHomeTitle = () => {
        try {
            const current = workspace(ctx, host), id = recordedHome(host);
            if (!current || !id || !current.target.sessionIds.includes(id))
                return;
            const name = host.workspace.runtime.identity().displayName, title = name ? name + '的家' : '伙伴的家';
            const key = JSON.stringify([current.target.id, id, title]);
            if (lastHomeTitle === key)
                return;
            lastHomeTitle = key;
            void ctx.sessionController.rename({ sessionId: id, title })
                .catch(error => { lastHomeTitle = ''; ctx.logger('chatpet-home').warn('Shared home title could not be refreshed', error); });
        }
        catch (error) {
            ctx.logger('chatpet-home').warn('Shared home title is unavailable', error);
        }
    };
    const stopIdentity = ctx.on('pet/core.changed', refreshHomeTitle);
    const stopIdentityTurn = ctx.on('agent/request', (_request, next) => { refreshHomeTitle(); return next(); });
    const foundation = registerWorldPrompt(ctx, 'chatpet.foundation', 12, agent => renderCompanionFoundation(ctx, host, world, agent));
    const records = registerWorldPrompt(ctx, 'chatpet.records', 13, agent => {
        const scope = getScope();
        if (!scope || world.sessionStatus(agent.session)?.state !== 'ready')
            return '';
        return `【核心记录位置】\n自述：${join(scope.directory, 'self.md')}\n日记目录：${join(scope.directory, 'diary')}\n它们是你的自述与真实经历原文，使用当前原生文件工具按需阅读和更新。没有内容时保持空白，不编造经历。关闭自主生活或长期记忆不影响这些文件。`;
    });
    const self = registerWorldPrompt(ctx, 'chatpet.self', 35, agent => {
        const saved = prepared.get(agent), scope = getScope();
        return scope && saved?.workspaceId === scope.id && world.sessionStatus(agent.session)?.state === 'ready' ? saved.text : '';
    }, async (agent) => {
        prepared.delete(agent);
        const scope = getScope();
        if (!scope || world.sessionStatus(agent.session)?.state !== 'ready')
            return;
        const text = await readSelfPrompt(host, scope, agent.id);
        if (text && getScope()?.id === scope.id)
            prepared.set(agent, { workspaceId: scope.id, text });
    });
    return () => {
        foundation();
        records();
        self();
        stopWriting();
        stopHomeEvents();
        stopScope();
        stopIdentity();
        stopIdentityTurn();
        homes.delete(host);
        if (owners.get(host) === ctx)
            owners.delete(host);
    };
}
//# sourceMappingURL=companion-foundation.js.map