import { createSystemMessage, createUserMessage } from '@deepseek-ai/dsh-llm';
import { joinContextSections } from '@deepseek-ai/dsh-system-prompt';
import { reassembleOnChange } from '#dsh-world/worldScope';
const previousSections = new Set(['chatpet.identity', 'chatpet.user', 'chatpet.memory-policy', 'chatpet.expression',
    'chatpet.expression-state', 'chatpet.expression-guide', 'chatpet.memory']);
// Any remaining section must pick up a removed sibling's pending change when
// an optional component is unloaded between two turns of the same Agent.
const restart = new WeakMap();
const admitted = new WeakMap();
/** Replace each surviving legacy snapshot at its original position, retaining
 * other producers' sections and the complete original event in the native log.
 * Like World's retireRecall, run in agent/request while a native step is open. */
export function retireLegacyPrompt(session, turn, step, bound) {
    for (const seq of [...session.surface.nodes]) {
        const event = session.eventAt(seq);
        if (event?.type !== 'user/message')
            continue;
        const { source } = event.data;
        if (source.kind !== 'runtime-context' || source.form !== 'snapshot')
            continue;
        const sections = source.sections.filter(section => !previousSections.has(section.name) && (bound || !section.name.startsWith('chatpet.')));
        if (sections.length === source.sections.length)
            continue;
        const intent = { surfaceOp: { op: 'replace', startSeq: seq, endSeq: seq }, sourceEventSeqs: [seq] };
        if (sections.length) {
            session.append('user/message', createUserMessage({
                source: { ...source, sections }, content: [{ type: 'text', text: joinContextSections(sections) }],
            }), intent);
        }
        else {
            session.append('system/message', { turn, step, message: createSystemMessage('') }, intent);
        }
    }
}
export function registerWorldPrompt(ctx, name, order, read, prepare, admit) {
    const entries = new Map();
    function sync(agent) {
        const text = read(agent);
        const entry = entries.get(agent);
        if (text === (entry?.text ?? ''))
            return false;
        if (entry && !text) {
            entry.dispose();
            entries.delete(agent);
        }
        else if (entry)
            entry.text = text;
        else {
            const dispose = agent.ctx.systemPrompt.section({
                name, order, interpolate: false,
                text: context => context.agent === agent ? entries.get(agent)?.text ?? '' : '',
            });
            entries.set(agent, { text, dispose });
        }
        restart.set(agent, Symbol());
        return true;
    }
    const scopes = new Map();
    let stopped = false;
    const attach = (scope) => {
        if (stopped || scopes.has(scope))
            return;
        const offAssembly = reassembleOnChange(scope, sync);
        // The native loop assembles the system prompt before agent/pre-step. A
        // scoped asynchronous reader must finish before the original sync listener
        // selects sections, then join its scoped material after the native step starts.
        const offPrepare = prepare && scope.on('system-prompt/assemble', async (_assembly, context, next) => {
            if (context.agent)
                await prepare(context.agent);
            return next();
        }, { prepend: true, global: true });
        const offPreStep = scope.on('agent/pre-step', async ({ agent }, next) => {
            const decision = await next();
            if (admit && decision.kind === 'enter')
                await admit(agent);
            const pending = restart.get(agent);
            if (decision.kind !== 'enter' || !pending)
                return decision;
            admitted.set(agent, pending);
            return { ...decision, startsRequestSeries: true };
        }, { global: true });
        // A cancelled admission may finish before DSH records a request. Keep the
        // restart pending so a retry can still replace the prior in-history prompt.
        const offAdmission = scope.on('session/event', (session, event) => {
            if (event.type !== 'assistant/message')
                return;
            const agent = ctx.agents.get(session.id);
            if (agent && restart.get(agent) === admitted.get(agent))
                restart.delete(agent);
        }, { global: true });
        const offAgent = scope.on('agent/disposed', ({ agent }) => {
            entries.get(agent)?.dispose();
            entries.delete(agent);
        }, { global: true });
        const detach = () => {
            if (!scopes.delete(scope))
                return;
            offPrepare?.();
            offAssembly();
            offPreStep();
            offAdmission();
            offAgent();
        };
        scopes.set(scope, detach);
        scope.effect(() => detach);
    };
    const dispose = Object.assign(() => {
        if (stopped)
            return;
        stopped = true;
        for (const detach of [...scopes.values()])
            detach();
        for (const [agent, entry] of entries) {
            entry.dispose();
            restart.set(agent, Symbol());
        }
        entries.clear();
    }, { attach });
    attach(ctx);
    ctx.effect(() => dispose);
    return dispose;
}
//# sourceMappingURL=world-prompt.js.map