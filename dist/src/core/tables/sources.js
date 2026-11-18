import { RegistrationTable } from './registry.js';
function guardBranch(branch, context, lease) {
    const { toolPolicy, fileAccess, memoryObservation } = branch;
    const { install, allows } = toolPolicy ?? {};
    const { input, reply } = memoryObservation ?? {};
    return {
        ...branch,
        toolPolicy: toolPolicy && {
            denial: toolPolicy.denial,
            install: install && lease.guard(agent => install.call(toolPolicy, agent, context, lease)),
            allows: allows && lease.guard(execution => allows.call(toolPolicy, execution, context, lease)),
        },
        fileAccess: fileAccess && lease.guard((tool, path) => fileAccess.call(branch, tool, path, context, lease)),
        memoryObservation: memoryObservation && {
            input: input && lease.guard(() => input.call(memoryObservation, context)),
            reply: reply && lease.guard(() => reply.call(memoryObservation, context)),
        },
    };
}
export class SourceAdapterTable {
    table = new RegistrationTable({
        order: adapter => adapter.order,
        overlaps: (left, right) => left.sources.some(source => right.sources.includes(source)),
    });
    register(adapter) {
        return this.table.register(adapter.id, {
            ...adapter, sources: [...adapter.sources], branches: { ...adapter.branches }, admit: adapter.admit.bind(adapter),
            classify: adapter.classify?.bind(adapter),
            isGuest: adapter.isGuest?.bind(adapter),
            beforeFirstStep: adapter.beforeFirstStep?.bind(adapter),
        });
    }
    isGuest(sessionId) {
        return this.table.entries().some(({ value, lease }) => lease.isCurrent() && value.isGuest?.(sessionId) === true && lease.isCurrent());
    }
    async beforeFirstStep(current) {
        for (const { value, lease } of this.table.entries()) {
            if (!lease.isCurrent() || !value.beforeFirstStep)
                continue;
            if (!current())
                return false;
            await value.beforeFirstStep();
            if (!lease.isCurrent() || !current())
                return false;
        }
        return current();
    }
    classify(message) {
        for (const { value: adapter, lease } of this.table.entries()) {
            if (!lease.isCurrent() || !adapter.sources.includes(message.source.kind))
                continue;
            try {
                const branch = adapter.classify?.(message);
                if (branch === undefined || !lease.isCurrent())
                    continue;
                if (!Object.hasOwn(adapter.branches, branch))
                    return { kind: 'failed', adapterId: adapter.id };
                const { historyProjection } = adapter.branches[branch];
                return { branch, historyProjection: historyProjection && { ...historyProjection }, lease };
            }
            catch {
                return { kind: 'failed', adapterId: adapter.id };
            }
        }
    }
    policyRows() {
        return this.table.entries().flatMap(({ value }) => [
            ...Object.values(value.branches).map(branch => branch.policyRow), ...(value.policyRows ?? []),
        ]).sort((left, right) => left.row - right.row);
    }
    admit(input) {
        for (const { value: adapter, lease } of this.table.entries()) {
            if (!lease.isCurrent() || !adapter.sources.includes(input.message.source.kind))
                continue;
            try {
                const decision = adapter.admit(input);
                lease.assertCurrent();
                if (decision.kind === 'unclaimed')
                    continue;
                if (decision.kind !== 'accepted')
                    return decision;
                if (!Object.hasOwn(adapter.branches, decision.branch)) {
                    throw new Error(`Unknown branch from source adapter ${adapter.id}: ${decision.branch}`);
                }
                const branch = guardBranch(adapter.branches[decision.branch], decision.context, lease);
                return { ...decision, branch, lease };
            }
            catch (error) {
                return { kind: 'failed', error };
            }
        }
        return { kind: 'unclaimed' };
    }
}
//# sourceMappingURL=sources.js.map