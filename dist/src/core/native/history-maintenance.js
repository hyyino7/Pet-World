import { roomOverview, gardenOverview } from '../../room/tool-context.js';
import { economyOverview } from '../../economy/tool-context.js';
import { planOverview } from '../../life/tool-context.js';
const object = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
/** Reuse module-owned structured projections, never middle-slice JSON or prose.
 * Explicit full/detail/receipt reads and already-small results are immutable. */
export function historicalStateOverview(name, args, value) {
    if (!object(args) || !object(value) || args.view === 'full' || value.view !== undefined || value.ok === false
        || 'factIds' in args || 'section' in args)
        return;
    if (name === 'room_state' && object(value.layout) && Array.isArray(value.layout.rooms)
        && object(value.layout.spots) && object(value.her) && object(value.body))
        return roomOverview(value);
    if (name === 'room_garden' && args.type === 'state' && object(value.garden) && Array.isArray(value.garden.plots)
        && object(value.garden.care))
        return gardenOverview(value);
    if (name === 'pet_economy_state' && object(value.configuration) && Array.isArray(value.inventory)
        && Array.isArray(value.ledger) && Array.isArray(value.catalog))
        return economyOverview(value);
    if (name === 'life_plan_read' && typeof value.revision === 'number' && (value.plan === null || object(value.plan)))
        return planOverview(value);
}
// Native logs store these model-facing projections as user/message events too.
const historyContextSources = new Set(['runtime-context', 'chatpet-recall', 'compact-checkpoint']);
export function lifeHistoryCandidates(events, nodes, classify, warn = console.warn) {
    let turn;
    const states = new Map();
    const calls = new Map();
    for (const event of events) {
        if (event.type === 'turn/start') {
            turn = event.data.turn;
            states.set(turn, { protected: false, completed: false });
        }
        if (event.type === 'tool/call')
            calls.set(event.data.callId, event.data);
        const state = turn === undefined ? undefined : states.get(turn);
        if (!state)
            continue;
        if (event.type === 'user/message' && !historyContextSources.has(event.data.source.kind)) {
            const classification = classify(event.data);
            if (!classification || 'kind' in classification) {
                state.protected = true;
                if (classification)
                    warn(`History classification failed for ${event.data.source.kind} (adapter ${classification.adapterId}); retaining turn ${turn}`);
            }
            else {
                if (classification.historyProjection?.participates)
                    state.lease = classification.lease;
                if (classification.historyProjection?.protectsTurn)
                    state.protected = true;
            }
        }
        if (event.type === 'turn/end') {
            state.completed = event.data.reason.kind === 'completed';
            turn = undefined;
        }
    }
    const latest = Math.max(...states.keys());
    return nodes.flatMap(seq => {
        const event = events[seq];
        if (event?.type !== 'tool/result' || event.data.message.isError)
            return [];
        const call = calls.get(event.data.message.toolCallId), state = call && states.get(call.turn);
        if (!call || !state?.lease?.isCurrent() || state.protected || !state.completed || call.turn === latest)
            return [];
        return [{ event, call, lease: state.lease }];
    });
}
/** Idle maintenance is read-only. Native persistence requires replacement
 * tool results inside an open turn, so landing waits for the next real request.
 * This does not wake a session or consume/acknowledge any domain facts. */
export async function prepareLifeHistory(agent, isCurrent, classify) {
    if (agent.status !== 'idle' || agent.inbox.nextTurn.length || agent.inbox.nextStep.length || !isCurrent())
        return [];
    return agent.runMaintenance(async (signal) => {
        const changes = [];
        const candidates = lifeHistoryCandidates(agent.session.snapshotEvents(), agent.session.surface.nodes, classify, message => agent.ctx.logger('chatpet-context').warn(message));
        for (const { event, call, lease } of candidates) {
            signal.throwIfAborted();
            if (!isCurrent())
                return [];
            const original = agent.session.deriveEventMessage(event);
            if (!original || original.content.length !== 1 || original.content[0]?.type !== 'text')
                continue;
            let args, value;
            try {
                args = JSON.parse(call.arguments);
                value = JSON.parse(original.content[0].text);
            }
            catch {
                continue;
            }
            const view = historicalStateOverview(call.name, args, value);
            if (view === undefined)
                continue;
            const text = JSON.stringify(view);
            if (text.length < original.content[0].text.length)
                changes.push({ event, text, lease });
        }
        return changes;
    });
}
/** Native pruning pattern: shadow pricing, positional replacement and exact
 * source citation. Must run in agent/request, never in the idle log. Ordinary
 * native turn persistence checkpoints the change; originals remain replayable. */
export function applyLifeHistory(agent, changes, meter) {
    const result = { replaced: 0, charsBefore: 0, charsAfter: 0 }, session = agent.session;
    const visible = new Set(session.surface.nodes);
    for (const { event, text, lease } of changes) {
        if (!lease.isCurrent() || !visible.has(event.seq))
            continue; // Native compaction may have superseded the prepared span.
        const original = session.deriveEventMessage(event);
        if (!original || original.content.length !== 1 || original.content[0]?.type !== 'text')
            continue;
        const appendPrune = session.append.bind(session);
        appendPrune('compaction/prune', { shadowedRange: { start: event.seq, end: event.seq }, shadowedSeqs: [event.seq],
            shadowedTokenCount: meter.estimateMessage(original) });
        session.append('tool/result', { ...event.data, message: { ...original, content: [{ type: 'text', text }] } }, { surfaceOp: { op: 'replace', startSeq: event.seq, endSeq: event.seq }, sourceEventSeqs: [event.seq] });
        visible.delete(event.seq);
        result.replaced++;
        result.charsBefore += original.content[0].text.length;
        result.charsAfter += text.length;
    }
    return result;
}
//# sourceMappingURL=history-maintenance.js.map