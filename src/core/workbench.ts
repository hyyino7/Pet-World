import type { CoreRuntime, StoredActivity } from './core.js';
import type { Commitment, CommitmentProgress, ActivitySnapshot } from '../contracts/core.js';
import type { EvidenceSource, ServiceCall } from '../contracts/common.js';
import { text } from './storage.js';

export interface WorkbenchSnapshot {
  matters: readonly Commitment[]; activities: readonly (ActivitySnapshot & { executionId: string | null })[];
  omittedMatters: number; omittedActivities: number; withheldMatters: number; withheldActivities: number;
}
export interface MatterDetail {
  matter: Commitment; progress: readonly CommitmentProgress[]; results: readonly EvidenceSource[];
  omittedProgress: number;
}
export interface WorkbenchService {
  snapshot: ServiceCall<Record<string, never>, WorkbenchSnapshot>;
  matter: ServiceCall<{ commitmentId: string }, MatterDetail>;
}
/** Read-only Core projections for its authenticated owner UI; no second store. */
export function createWorkbench(runtime: CoreRuntime): WorkbenchService {
  return {
    snapshot: runtime.call('workbench.snapshot', false, () => {
      const allMatters = runtime.store.all<Commitment>('commitment'), allActivities = runtime.store.all<StoredActivity>('activity');
      const matters = allMatters;
      const activities = allActivities.filter(value => runtime.eligible(value.proposal.sourceIds));
      const executions = runtime.store.all<{ executionId: string; activityId: string }>('execution');
      return { matters: matters.slice(-25).reverse(), omittedMatters: Math.max(0, matters.length - 25),
        withheldMatters: allMatters.length - matters.length, withheldActivities: allActivities.length - activities.length,
        activities: activities.slice(-25).reverse().map(value => ({ activityId: value.activityId, proposal: value.proposal,
          receipt: value.receipt, executionId: executions.find(execution => execution.activityId === value.activityId)?.executionId ?? null })),
        omittedActivities: Math.max(0, activities.length - 25) };
    }, true),
    matter: runtime.call('workbench.matter', false, input => {
      text(input.commitmentId, 'commitmentId', 256);
      const matter = runtime.store.require<Commitment>('commitment', input.commitmentId);
      const progress = runtime.store.all<CommitmentProgress>('commitment-progress')
        .filter(value => value.commitmentId === matter.commitmentId);
      return { matter, progress: progress.slice(-100), omittedProgress: Math.max(0, progress.length - 100),
        results: matter.resultSourceIds.map(sourceId => runtime.store.require<EvidenceSource>('source', sourceId)) };
    }, true),
  };
}
