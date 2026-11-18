import type {
  AdmittedSourceBranch, RegistrationLease, SessionPolicyRow, SourceAdapter, SourceAdmission,
  SourceBranch, SourceClassificationResult, SourceInput, TableRegistration,
} from '../../contracts/tables.js';
import { RegistrationTable } from './registry.js';
import { CompanionToolTable } from './tools.js';

type NativeSourceAdapter<Selected> = SourceAdapter<Selected> & {
  isGuest?(sessionId: string): boolean;
  beforeFirstStep?(): Promise<void>;
};

function bindToolSource(adapter: RegistrationLease, source: RegistrationLease): RegistrationLease {
  return Object.freeze({
    generation: Symbol('native source admission'),
    isCurrent: () => adapter.isCurrent() && source.isCurrent(),
    assertCurrent() { adapter.assertCurrent(); source.assertCurrent(); },
    guard<Args extends unknown[], Output>(callback: (...args: Args) => Output) {
      return adapter.guard(source.guard(callback));
    },
  });
}

function guardBranch<Selected>(
  branch: SourceBranch<Selected>, context: Selected, lease: RegistrationLease,
): AdmittedSourceBranch {
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

export class SourceAdapterTable<Selected = unknown> {
  private readonly table = new RegistrationTable<NativeSourceAdapter<Selected>>({
    order: adapter => adapter.order,
    overlaps: (left, right) => left.sources.some(source => right.sources.includes(source)),
  });
  private readonly admissions = new WeakMap<RegistrationLease, WeakMap<RegistrationLease, RegistrationLease>>();

  constructor(private readonly tools = new CompanionToolTable()) {}

  private admissionLease(adapter: RegistrationLease, source: RegistrationLease): RegistrationLease {
    let bySource = this.admissions.get(adapter);
    if (!bySource) this.admissions.set(adapter, bySource = new WeakMap());
    let admission = bySource.get(source);
    if (!admission) bySource.set(source, admission = bindToolSource(adapter, source));
    return admission;
  }

  register(adapter: NativeSourceAdapter<Selected>): TableRegistration {
    return this.table.register(adapter.id, {
      ...adapter, sources: [...adapter.sources], branches: { ...adapter.branches }, admit: adapter.admit.bind(adapter),
      classify: adapter.classify?.bind(adapter),
      isGuest: adapter.isGuest?.bind(adapter),
      beforeFirstStep: adapter.beforeFirstStep?.bind(adapter),
    });
  }

  isGuest(sessionId: string): boolean {
    return this.table.entries().some(({ value, lease }) =>
      lease.isCurrent() && value.isGuest?.(sessionId) === true && lease.isCurrent());
  }

  async beforeFirstStep(current: () => boolean): Promise<boolean> {
    for (const { value, lease } of this.table.entries()) {
      if (!lease.isCurrent() || !value.beforeFirstStep) continue;
      if (!current()) return false;
      await value.beforeFirstStep();
      if (!lease.isCurrent() || !current()) return false;
    }
    return current();
  }

  classify(message: SourceInput['message']): SourceClassificationResult {
    for (const { value: adapter, lease } of this.table.entries()) {
      const sources: readonly string[] = adapter.sources;
      if (!lease.isCurrent() || !sources.includes(message.source.kind)) continue;
      try {
        const branch = adapter.classify?.(message);
        if (branch === undefined || !lease.isCurrent()) continue;
        if (!Object.hasOwn(adapter.branches, branch)) return { kind: 'failed', adapterId: adapter.id };
        const { historyProjection } = adapter.branches[branch];
        return { branch, historyProjection: historyProjection && { ...historyProjection }, lease };
      } catch {
        return { kind: 'failed', adapterId: adapter.id };
      }
    }
  }

  policyRows(): SessionPolicyRow[] {
    return this.table.entries().flatMap(({ value }) => [
      ...Object.values(value.branches).map(branch => branch.policyRow), ...(value.policyRows ?? []),
    ]).sort((left, right) => left.row - right.row);
  }

  admit(input: SourceInput): SourceAdmission<Selected> {
    for (const { value: adapter, lease } of this.table.entries()) {
      const sources: readonly string[] = adapter.sources;
      if (!lease.isCurrent() || !sources.includes(input.message.source.kind)) continue;
      try {
        const decision = adapter.admit(input);
        lease.assertCurrent();
        if (decision.kind === 'unclaimed') continue;
        if (decision.kind !== 'accepted') return decision;
        if (!Object.hasOwn(adapter.branches, decision.branch)) {
          throw new Error(`Unknown branch from source adapter ${adapter.id}: ${decision.branch}`);
        }
        const selected = adapter.branches[decision.branch];
        const toolSourceLease = this.tools.sourceLease(selected.toolSource);
        if (toolSourceLease === undefined) {
          return { kind: 'rejected', reason: `Unknown companion tool source: ${selected.toolSource}` };
        }
        const admission = toolSourceLease ? this.admissionLease(lease, toolSourceLease) : lease;
        const branch = guardBranch(selected, decision.context, admission);
        return { ...decision, branch, lease: admission, ...(toolSourceLease && { toolSourceLease }) };
      } catch (error) {
        return { kind: 'failed', error };
      }
    }
    return { kind: 'unclaimed' };
  }
}
