export class OutsideWorldError extends Error {
    constructor() { super('会话不在世界工作区内'); this.name = 'OutsideWorldError'; }
}
/** The agent, if it is (still) in her world; without a predicate every agent is. */
export function admit(inWorld, agent) {
    if (inWorld && !inWorld(agent.session))
        throw new OutsideWorldError();
    return agent;
}
/** The same scope check controls step admission and execution; older hosts ignore the registration condition. */
export function registerScopedTool(agent, tool, inside, left) {
    const register = agent.ctx.tools.register.bind(agent.ctx.tools);
    return register({ ...tool, execute: (args, exec) => {
            if (!inside()) {
                left?.();
                throw new OutsideWorldError();
            }
            return tool.execute(args, exec);
        } }, { when: inside });
}
/**
 * DSH 0.2.2 selects tools before prompt assembly, so synchronize at turn start and between steps as well.
 * The assembly check still catches membership changes while a request is being prepared.
 */
export function reassembleOnChange(ctx, sync) {
    const beforeStep = ctx.on('session/event', (session, event) => {
        if (event.type !== 'turn/start' && event.type !== 'step/end')
            return;
        const agent = ctx.get('agents')?.get(session.id);
        if (agent)
            sync(agent);
    });
    const assemble = ctx.on('system-prompt/assemble', (_assembly, context, next) => context.agent && sync(context.agent) ? context.agent.ctx.systemPrompt.assemble(context) : next());
    return () => { beforeStep(); assemble(); };
}
