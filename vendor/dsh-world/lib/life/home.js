import { mkdirSync } from 'node:fs';
import { errorText } from "../faults.js";
import { admit } from "../worldScope.js";
/** The existing durable first-home transition, shared by foreground and Life
 * openers. Recording it does not deliver a turn or start an autonomous runtime. */
export function markHomeArrival(state, sessionId, at = new Date().toISOString()) {
    if (state.homeSessionId === sessionId)
        return state;
    state.homeSessionId = sessionId;
    state.greeting = { at, kind: 'arrival' };
    return state;
}
/**
 * Her home session: the recorded one while it exists and is not archived, otherwise a new one.
 * Her world lives only in her room's workspace, so the home is built in it, or moved into it, or not opened at all.
 * The title is applied when the home is built and again after its first turn, because the
 * host retitles a session from its first prompt.
 */
export function createHome(deps) {
    const { host, faults } = deps;
    let opening;
    /** A new home whose title is not applied yet; retried on the next open. */
    let untitled;
    /** A new home before its first turn ends. */
    let firstTurn;
    async function rename(sessionId) {
        try {
            await host.rename(sessionId, deps.title);
            faults.clear('rename');
            return true;
        }
        catch (error) {
            faults.set('rename', `家改名失败：${errorText(error)}`);
            deps.logger.error(error);
            return false;
        }
    }
    async function ready(agent) {
        admit(deps.inWorld, agent);
        if (untitled === agent.id && await rename(agent.id) && untitled === agent.id)
            untitled = undefined;
        deps.opened(agent);
        return agent;
    }
    /** Her room as a workspace; without one there is no home (the caller reports why). */
    async function room() {
        mkdirSync(deps.roomDir, { recursive: true });
        const workspace = await host.workspace(deps.roomDir, deps.roomTitle);
        if (!workspace)
            throw new Error('宿主没有工作区服务，世界只能住在房间工作区里');
        return workspace;
    }
    async function build() {
        const workspace = await room();
        const current = deps.current();
        if (current && !host.isArchived(current)) {
            const agent = await host.resolveAgent(current);
            if (agent) {
                // A home built before her room was a workspace moves in.
                if (!workspace.sessionIds.includes(agent.id))
                    await workspace.attachSession(agent.id);
                return ready(agent);
            }
        }
        const sessionId = await host.createSession(deps.roomDir, deps.agentPreset, workspace.id);
        if (deps.stopped())
            throw new Error('生活线已停止');
        untitled = sessionId;
        firstTurn = sessionId;
        deps.moveIn(sessionId);
        const agent = await host.resolveAgent(sessionId);
        if (!agent)
            throw new Error(`dsh-world: the new home ${sessionId} cannot be resolved`);
        return ready(agent);
    }
    return {
        /** The current home, resolving or rebuilding it; one attempt at a time. */
        open() { return opening ??= build().finally(() => { opening = undefined; }); },
        turnEnded(sessionId) {
            if (firstTurn !== sessionId || deps.stopped())
                return;
            firstTurn = undefined;
            void rename(sessionId).then(ok => { if (!ok && deps.current() === sessionId)
                untitled = sessionId; });
        },
    };
}
