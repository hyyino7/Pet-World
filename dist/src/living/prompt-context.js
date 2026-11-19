import { acknowledgePromptFacts } from '../core/interaction-context.js';
import { INTERACTION_CONTEXT, presentFacts } from '../core/interaction-presentation.js';
import { registerWorldContext } from '../core/native/prompt.js';
import { check } from '../core/storage.js';
import { withLivingCaller } from './index.js';
export function installLivingPrompt(ctx, host, world, ownerScope) {
    const prepared = new Map();
    const logger = ctx.logger('chatpet-environment');
    let stopped = false;
    const discard = (id) => {
        prepared.delete(id);
        host.native.clearPreparedFacts(id);
    };
    const isCurrent = (frame) => {
        if (prepared.get(frame.agent.id) !== frame || !frame.sameAreas())
            return false;
        const current = ownerScope(frame.agent);
        return current?.workspaceId === frame.binding.workspaceId && current.path === frame.binding.path &&
            current.storageId === frame.binding.storageId;
    };
    const validate = (frame) => check(isCurrent(frame), 'Interaction context binding or Living area changed');
    const read = (agent) => {
        const frame = prepared.get(agent.id);
        if (frame?.agent === agent && isCurrent(frame))
            return frame;
    };
    const environment = registerWorldContext(ctx, 'chatpet.environment', 14, agent => read(agent)?.text ?? '', async (agent) => {
        if (stopped)
            return;
        discard(agent.id);
        const binding = ownerScope(agent);
        if (!binding)
            return;
        const body = world.lookup('body'), plan = world.lookup('plan'), economy = world.lookup('economy');
        if (!body && !plan && !economy)
            return;
        const { workspaceId } = binding;
        const frame = { agent, binding, sources: [], facts: [], text: '', sameAreas: () => world.lookup('body')?.lease === body?.lease && world.lookup('plan')?.lease === plan?.lease &&
                world.lookup('economy')?.lease === economy?.lease };
        prepared.set(agent.id, frame);
        const guard = () => validate(frame);
        let bodyText = '', planText = '';
        if (body)
            try {
                await withLivingCaller(guard, () => body.value.snapshot(workspaceId));
                if (!isCurrent(frame))
                    return;
                bodyText = body.value.promptLine(workspaceId);
            }
            catch (error) {
                bodyText = '当前身体状态暂不可读；不要根据旧对话推定现在的位置、活动或动作结果。';
                logger.warn('Shared body context is unavailable', error);
            }
        if (plan)
            try {
                planText = plan.value.currentPlanSummary(workspaceId);
            }
            catch (error) {
                planText = '当前生活计划暂不可读；保留已有安排，不根据旧聊天猜测执行进度或重新派工。';
                logger.warn('Shared life plan context is unavailable', error);
            }
        for (const service of [body?.value, economy?.value]) {
            if (!service)
                continue;
            if (!isCurrent(frame))
                return;
            try {
                const facts = (await withLivingCaller(guard, () => service.pendingFacts(workspaceId))).slice(0, 16);
                frame.sources.push({ facts, service: { pendingFacts: service.pendingFacts.bind(service), readFacts: service.readFacts.bind(service),
                        acknowledgeFacts: (id, ids) => withLivingCaller(guard, () => service.acknowledgeFacts(id, ids)) } });
            }
            catch (error) {
                logger.warn('Pending interaction facts remain unavailable', error);
            }
        }
        if (!isCurrent(frame))
            return;
        frame.facts = frame.sources.flatMap(source => source.facts);
        if (frame.facts.length)
            host.native.observeFacts(agent.id, frame.facts);
        const relation = '【同一个伙伴与身体】桌宠、房间画面和当前对话是同一个你的不同入口，画面中的身体不是另一个宠物。聊天可以表达动作和感受；身体活动是否执行、是否完成，以共享身体状态和工具结果为准，动画片段结束不代表生活活动结束。切换对话不重置生活计划，交流后按真实进度继续；不要因为换了会话就重新执行或消费。';
        const capabilities = body ? '移动、身体互动和菜园操作通过当前实际可用的原生工具执行；文字描述不会自动产生动作、金钱或物品。' : '当前没有共享身体执行服务；不要假装已查询或控制画面身体。';
        frame.text = [relation, capabilities, bodyText, planText].filter(Boolean).join('\n\n');
    });
    const interactions = registerWorldContext(ctx, INTERACTION_CONTEXT, 15, agent => {
        const frame = read(agent);
        return frame?.facts.length ? presentFacts(frame.facts) : '';
    });
    const offStep = ctx.on('agent/pre-step', ({ agent, turn }, next) => {
        const frame = prepared.get(agent.id);
        if (frame?.agent === agent) {
            if (!isCurrent(frame))
                discard(agent.id);
            else if (frame.facts.length)
                frame.turn = turn;
        }
        return next();
    }, { prepend: true });
    const offAgent = ctx.on('agent/disposed', ({ agent }) => {
        if (prepared.get(agent.id)?.agent === agent)
            discard(agent.id);
    });
    const offEnd = ctx.on('session/event', (session, event) => {
        if (event.type !== 'turn/end')
            return;
        const frame = prepared.get(session.id);
        if (!frame || frame.agent.session !== session || frame.turn !== event.data.turn)
            return;
        frame.turn = undefined;
        if (event.data.reason.kind !== 'completed' || !isCurrent(frame))
            return;
        // The native log owns persistence. Keep the domain acknowledgement off its event callback.
        void acknowledgePromptFacts({ turn: event.data.turn, workspaceId: frame.binding.workspaceId, sources: frame.sources,
            events: () => [...session.surface.nodes].flatMap(seq => { const row = session.eventAt(seq); return row ? [row] : []; }),
            flush: () => ctx.sessions.flush(session), validate: () => validate(frame),
        }).catch(error => logger.warn('Interaction acknowledgement retained for retry', error));
    });
    return () => {
        stopped = true;
        offStep();
        offAgent();
        offEnd();
        environment();
        interactions();
        for (const id of prepared.keys())
            discard(id);
    };
}
//# sourceMappingURL=prompt-context.js.map