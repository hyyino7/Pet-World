import { join } from 'node:path';
import { createHome } from '#dsh-world/life/home';
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
    const scope = host.workspace.homeScope();
    return scope && host.workspace.readCompanionHome(scope)?.sessionId;
}
/** Foreground home identity does not imply that autonomous Life is enabled. */
export function isCompanionHome(ctx, host, sessionId) {
    const current = workspace(ctx, host);
    return !!current && current.target.sessionIds.includes(sessionId)
        && !current.registry.archivedSessionIds.includes(sessionId) && !host.native.isGuest(sessionId) && recordedHome(host) === sessionId;
}
const homes = new WeakMap();
const owners = new WeakMap();
const openings = new WeakMap();
function currentHomeWorkspace(ctx, host, scope) {
    host.workspace.readCompanionHome(scope);
    const current = workspace(ctx, host);
    check(current, 'Companion home workspace is unavailable');
    return current;
}
function controller(ctx) {
    const value = ctx.get('sessionController');
    check(value, 'Native session controller is unavailable');
    return value;
}
export async function resolveHomeAgent(ctx, host, scope, id) {
    const before = currentHomeWorkspace(ctx, host, scope);
    if (before.registry.archivedSessionIds.includes(id))
        return;
    check(before.target.sessionIds.includes(id) && !host.native.isGuest(id), 'Companion home does not belong to the workspace');
    const result = await controller(ctx).resolveAgent(id);
    const after = currentHomeWorkspace(ctx, host, scope);
    if (after.registry.archivedSessionIds.includes(id) || !result.agent && result.error?.code === 'session/not-found')
        return;
    check(!result.error && result.agent?.id === id && !host.native.isGuest(id)
        && host.workspace.sessionStatus(result.agent.session, after.registry)?.state === 'ready', 'Companion home is unavailable');
    return result.agent;
}
function offerArrival(host, scope, sessionId) {
    if (host.workspace.readCompanionHome(scope)?.arrivalPending)
        host.native.companionPorts.get('applyHomeArrival')?.(scope, sessionId);
}
export function ensureCompanionHomeSession(ctx, host, scope, preset) {
    currentHomeWorkspace(ctx, host, scope);
    let state = openings.get(host);
    if (!state || state.generation !== scope.generation)
        openings.set(host, state = { generation: scope.generation });
    const flight = state;
    return flight.promise ??= Promise.resolve().then(async () => {
        const old = host.workspace.readCompanionHome(scope);
        if (old && await resolveHomeAgent(ctx, host, scope, old.sessionId))
            return old.sessionId;
        let sessionId = flight.candidate;
        if (!sessionId || !await resolveHomeAgent(ctx, host, scope, sessionId)) {
            currentHomeWorkspace(ctx, host, scope);
            sessionId = (await controller(ctx).create({ workspaceId: scope.workspaceId, agentPreset: preset })).sessionId;
            flight.candidate = sessionId;
            check(await resolveHomeAgent(ctx, host, scope, sessionId), 'New companion home is unavailable');
        }
        host.workspace.writeCompanionHome(scope, old, { sessionId, arrivalPending: true });
        flight.candidate = undefined;
        offerArrival(host, scope, sessionId);
        return sessionId;
    }).finally(() => { flight.promise = undefined; });
}
/** Reuse World's recorded native home without starting its schedules or wakeups. */
export async function resolveCompanionHome(ctx, host, preset) {
    ctx = owners.get(host) ?? ctx;
    const scope = host.workspace.homeScope();
    check(scope, 'Bind the companion workspace before opening its home');
    await ctx.get('petTranscripts')?.restore();
    const current = currentHomeWorkspace(ctx, host, scope);
    let cached = homes.get(host);
    if (!cached || cached.generation !== scope.generation) {
        const native = ctx, bound = current.target;
        const selected = () => currentHomeWorkspace(ctx, host, scope);
        const active = () => host.workspace.homeScope()?.generation === scope.generation;
        const member = (session) => active() && !selected().registry.archivedSessionIds.includes(session.id)
            && !host.native.isGuest(session.id) && host.workspace.sessionStatus(session, selected().registry)?.state === 'ready';
        const selectedPreset = preset || native.get('agentPresets')?.composedPreset(ctx) || 'standard';
        const logger = ctx.logger('chatpet-home');
        const home = createHome({ roomDir: bound.path, agentPreset: selectedPreset,
            get title() { const name = host.workspace.runtime.identity().displayName; return name ? name + '的家' : '伙伴的家'; }, roomTitle: bound.path,
            faults: new Faults(), logger, stopped: () => !active(),
            current: () => host.workspace.readCompanionHome(scope)?.sessionId,
            moveIn: () => { }, // The shared creator commits before upstream opens the new Agent.
            opened: agent => { check(member(agent.session), 'Companion home left its workspace'); offerArrival(host, scope, agent.id); },
            inWorld: member,
            host: {
                workspace: async () => selected().target,
                createSession: async (_cwd, agentPreset, workspaceId) => {
                    check(workspaceId === bound.id, 'Companion home binding changed');
                    return ensureCompanionHomeSession(ctx, host, scope, agentPreset);
                },
                resolveAgent: id => resolveHomeAgent(ctx, host, scope, id),
                isArchived: id => selected().registry.archivedSessionIds.includes(id),
                rename: async (id, title) => { selected(); await controller(ctx).rename({ sessionId: id, title }); },
                origin: () => native.get('webServer')?.getOrigin() ?? '',
            },
        });
        cached = { generation: scope.generation, home };
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
        openings.delete(host);
        if (owners.get(host) === ctx)
            owners.delete(host);
    };
}
//# sourceMappingURL=companion-foundation.js.map