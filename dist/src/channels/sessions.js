import { createHash, randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { speakerIdentity, conversationKey } from '#dsh-world/ecosystem/shared/identity';
import { createChannelSessions } from '#dsh-world/ecosystem/shared/sessions';
import { privateDeviceDirectory } from './bridge.js';
import { GUEST_PRESET } from './guest.js';
const keyFor = (identity) => JSON.stringify([conversationKey(identity), identity.conversationType === 'private' ? identity.speakerId : null]);
const shipment = (identity) => JSON.stringify([keyFor(identity), identity.speakerId, identity.platformMessageId ?? null]);
/** World owns per-conversation session recovery. Native workspace membership
 * stores the routing association, including across process restarts. */
export function createChannelHomes(ctx, host, options) {
    const native = ctx;
    const sessions = native.get('sessionController'), registry = native.get('workspaceRegistry'), presets = native.get('agentPresets');
    const routes = new Map();
    const guests = new Map();
    const pending = new Map();
    const accepted = new Map();
    const delivered = new Map();
    const nudges = new Map();
    let owner, stopped = false;
    const active = () => !stopped && options.active();
    const allowed = (identity) => active() && !!identity.conversationType && options.identityAllowed(identity);
    const isOwner = (identity) => identity.conversationType === 'private' && options.ownerIdentity(identity);
    const ownerAlive = (id) => !!owner && owner.id === id && active()
        && host.workspace.sessionStatus(owner.session, native.get('workspaceRegistry'))?.state === 'ready'
        && !registry.archivedSessionIds.includes(id);
    function latestInput(id) {
        const agent = owner?.id === id ? owner : guests.get(id)?.agent;
        const event = agent?.session.snapshotEvents().filter(event => event.type === 'user/message' && event.data.source.kind === 'user').at(-1);
        return event?.type === 'user/message' ? JSON.stringify(event.data) : undefined;
    }
    function guest(id) {
        const row = guests.get(id);
        return !!row && allowed(row.identity) && !isOwner(row.identity) && row.agent.session.header.cwd === row.directory
            && presets.composedPreset(row.agent.ctx) === GUEST_PRESET && !registry.archivedSessionIds.includes(id);
    }
    function allowsReply(id, supplied) {
        let identity;
        try {
            identity = speakerIdentity(supplied);
        }
        catch {
            return false;
        }
        if (!allowed(identity))
            return false;
        if (isOwner(identity))
            return ownerAlive(id);
        const row = guests.get(id);
        return guest(id) && row !== undefined && keyFor(row.identity) === keyFor(identity);
    }
    function admit(id, message) {
        if (message.source.kind === 'dsh-world-reply-nudge') {
            const grant = nudges.get(id), original = delivered.get(id);
            return !!grant && !!original && grant.id === message.id && grant.message === JSON.stringify(message)
                && original.message === grant.original && original.scope === grant.scope
                && latestInput(id) === grant.original
                && JSON.stringify(host.native.scopeFor(id) ?? null) === grant.scope && allowsReply(id, grant.identity);
        }
        if (message.source.kind !== 'user' || !('identity' in message.source))
            return false;
        let identity;
        try {
            identity = speakerIdentity(message.source.identity);
        }
        catch {
            return false;
        }
        if (!allowsReply(id, identity))
            return false;
        const key = shipment(identity), checked = accepted.get(id);
        if (checked?.get(message.id) === key)
            return true;
        const outstanding = pending.get(id), count = outstanding?.get(key) ?? 0;
        if (!count || !outstanding)
            return false;
        if (count === 1)
            outstanding.delete(key);
        else
            outstanding.set(key, count - 1);
        const messages = checked ?? new Map();
        messages.set(message.id, key);
        accepted.set(id, messages);
        delivered.set(id, { message: JSON.stringify(message), identity, scope: JSON.stringify(host.native.scopeFor(id) ?? null) });
        return true;
    }
    if (host.native.channelBoundary)
        throw Error('渠道会话已由另一个接入实例管理');
    const boundary = { guest, admit };
    host.native.channelBoundary = boundary;
    const cleared = ctx.on('session/event', (session, event) => {
        if (event.type === 'turn/end')
            accepted.delete(session.id);
    });
    function route(identity) {
        const key = keyFor(identity), previous = routes.get(key);
        if (previous)
            return previous;
        const digest = createHash('sha256').update(key).digest('hex');
        const root = privateDeviceDirectory(options.dataDirectory, 'conversations');
        const directory = realpathSync(privateDeviceDirectory(root, digest));
        const prefix = 'chatpet-guest-' + digest + '-';
        let workspace;
        const requireBound = () => {
            if (!active() || workspace?.path !== directory)
                throw Error('外部会话工作区已切换');
            return workspace;
        };
        const result = createChannelSessions({
            ctx, roomDir: directory, roomTitle: identity.conversationName || identity.conversationId, agentPreset: GUEST_PRESET,
            store: {
                channelSession: () => [...requireBound().sessionIds].reverse().find(id => id.startsWith(prefix) && !registry.archivedSessionIds.includes(id)),
                bindChannelSession: (_key, id) => {
                    if (!id.startsWith(prefix) || !requireBound().sessionIds.includes(id))
                        throw Error('原生会话没有绑定到该聊天');
                },
            },
            host: {
                workspace: async (path, title) => {
                    workspace = await registry.create(path, title);
                    const logs = ctx.get('petTranscripts');
                    if (!logs)
                        throw Error('Core 完整聊天存储尚未就绪');
                    await logs.registerChannelWorkspace(workspace.id, directory, prefix);
                    return requireBound();
                },
                createSession: async (_path, agentPreset, workspaceId) => {
                    const bound = requireBound();
                    if (workspaceId !== bound.id || agentPreset !== GUEST_PRESET)
                        throw Error('外部会话预设或工作区不匹配');
                    return (await sessions.create({ sessionId: prefix + randomUUID(), workspaceId, agentPreset })).sessionId;
                },
                resolveAgent: async (id) => {
                    const bound = requireBound();
                    if (!id.startsWith(prefix) || !bound.sessionIds.includes(id))
                        throw Error('会话属于其他聊天');
                    const { agent, error } = await sessions.resolveAgent(id);
                    if (!agent && error?.code === 'session/not-found')
                        return;
                    if (!agent || agent.session.header.cwd !== directory || agent.session.header.agentPreset !== GUEST_PRESET
                        || presets.composedPreset(agent.ctx) !== GUEST_PRESET || !requireBound().sessionIds.includes(id))
                        throw Error('外部会话隔离预设不可用');
                    return agent;
                },
                isArchived: id => registry.archivedSessionIds.includes(id),
                rename: async (sessionId, title) => { await sessions.rename({ sessionId, title }); },
                origin: () => '',
            },
        });
        routes.set(key, result);
        return result;
    }
    return {
        async open(supplied, expectedSessionId) {
            const identity = speakerIdentity(supplied);
            if (!allowed(identity))
                throw Error('外部聊天未登记或已停用');
            const ownerRoute = isOwner(identity);
            const agent = ownerRoute ? await options.ownerHome() : await route(identity).open(identity);
            if (!allowed(identity) || ownerRoute !== isOwner(identity))
                throw Error('外部聊天的绑定已变更');
            if (expectedSessionId && agent.id !== expectedSessionId)
                throw Error('QQ 原输入会话已关闭，不能转交其他会话');
            if (ownerRoute)
                owner = agent;
            else
                guests.set(agent.id, { identity, agent, directory: agent.session.header.cwd });
            if (!allowsReply(agent.id, identity))
                throw Error('外部聊天会话已关闭');
            const key = shipment(identity), queued = pending.get(agent.id) ?? new Map();
            queued.set(key, (queued.get(key) ?? 0) + 1);
            pending.set(agent.id, queued);
            return agent;
        },
        owns: (id) => active() && (ownerAlive(id) || guest(id)),
        identityFor: (id) => guest(id) ? guests.get(id)?.identity : undefined,
        allowsReply,
        /** Adapter-only capability for the one retry of an actually admitted QQ input.
         * Source-kind text alone never grants native or guest admission. */
        replyNudge(id, original, message) {
            const previous = delivered.get(id);
            if (!previous || previous.identity.channel !== 'qq' || previous.message !== JSON.stringify(original)
                || latestInput(id) !== previous.message
                || !allowsReply(id, previous.identity) || JSON.stringify(host.native.scopeFor(id) ?? null) !== previous.scope
                || message.source.kind !== 'dsh-world-reply-nudge' || !('forMessageId' in message.source) || message.source.forMessageId !== original.id
                || nudges.has(id))
                throw Error('QQ 补答的原消息或会话已失效');
            const grant = { id: message.id, message: JSON.stringify(message), original: previous.message, identity: previous.identity, scope: previous.scope };
            nudges.set(id, grant);
            return () => { if (nudges.get(id) === grant)
                nudges.delete(id); };
        },
        stop() {
            if (stopped)
                return;
            stopped = true;
            if (host.native.channelBoundary === boundary)
                host.native.channelBoundary = undefined;
            for (const router of routes.values())
                router.stop();
            for (const { agent } of guests.values())
                if (agent.status !== 'idle')
                    agent.cancel({ kind: 'user' });
            if (owner && accepted.has(owner.id) && owner.status !== 'idle')
                owner.cancel({ kind: 'user' });
            cleared();
            routes.clear();
            guests.clear();
            pending.clear();
            accepted.clear();
            delivered.clear();
            nudges.clear();
            owner = undefined;
        },
    };
}
//# sourceMappingURL=sessions.js.map