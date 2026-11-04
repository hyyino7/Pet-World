import type {
  ArtifactRef, EvidenceSource, MemoryDependencies, MemoryFence, MemoryUseLease,
  MemoryUsePurpose, MemoryVersionRef, MemoryViewMaterial, MemoryViewStamp,
  OperationReceipt, Page, PageRequest, RestoreStepPermit, Revision, ServiceCall,
  SourceVersionRef, Timestamp, WithdrawalGuard,
} from './common.js';

export interface MemoryRecord {
  memoryId: string; revision: Revision; subjectId: string; text: string;
  fence: MemoryFence;
  sourceVersions: readonly SourceVersionRef[]; derivedFromVersions: readonly MemoryVersionRef[];
  support: 'direct' | 'inferred';
  state: 'current' | 'superseded' | 'retracted' | 'expired' | 'conflicted';
  freshness: 'current' | 'stale';
  validFrom?: Timestamp; validUntil?: Timestamp;
}
export type MemoryEdit =
  | { kind: 'assert'; subjectId: string; text: string; sourceVersions: readonly SourceVersionRef[];
      derivedFromVersions: readonly MemoryVersionRef[];
      support: MemoryRecord['support']; validFrom?: Timestamp; validUntil?: Timestamp }
  | { kind: 'correct' | 'supersede'; memoryId: string; expectedRevision: Revision;
      derivedFromVersions: readonly MemoryVersionRef[];
      text: string; sourceVersions: readonly SourceVersionRef[]; validFrom?: Timestamp; validUntil?: Timestamp }
  | { kind: 'expire' | 'retract'; memoryId: string; expectedRevision: Revision;
      sourceVersions: readonly SourceVersionRef[]; reason: string };
export interface MemoryProposal {
  proposalId: string; revision: Revision; basis: MemoryDependencies;
  edits: readonly MemoryEdit[]; state: 'proposed' | 'committed' | 'rejected' | 'stale';
}
export interface RecallResult {
  records: readonly MemoryRecord[];
  sourceIds: readonly string[]; traceId: string; truncated: boolean;
  coverage: 'complete_for_query' | 'partial' | 'unknown';
  dependencies: MemoryDependencies;
}
export interface SourceStatus {
  sourceId: string; revision: Revision; state: 'active' | 'withdrawn';
  evidencePresent: boolean; fence: MemoryFence;
}
export interface WithdrawalReceipt {
  withdrawalId: string; fence: MemoryFence; operation: OperationReceipt;
  recallBlocked: true; activeUseIds: readonly string[]; purgePending: boolean;
}
export type SourceObservationReceipt =
  | { source: SourceStatus & { state: 'active' }; processingId: string; state: 'recorded' | 'duplicate' }
  | { source: SourceStatus & { state: 'withdrawn' }; processingId: null; state: 'blocked' };
export interface MemoryService {
  observe: ServiceCall<{ source: EvidenceSource }, SourceObservationReceipt>;
  inspectSource: ServiceCall<{ sourceId: string }, SourceStatus>;
  getFence: ServiceCall<Record<string, never>, MemoryFence>;
  propose: ServiceCall<{
    basis: MemoryDependencies; edits: readonly MemoryEdit[];
  }, MemoryProposal>;
  commit: ServiceCall<{ proposalId: string; expectedRevision: Revision }, {
    proposalId: string; memoryIds: readonly string[]; committedFence: MemoryFence;
  }>;
  recall: ServiceCall<{
    query: string; purpose: 'owner_reply' | 'reader' | 'life' | 'inspection';
    maxRecords: number; tokenLimit: number; at?: Timestamp;
    minimumFence?: MemoryFence;
  }, RecallResult>;
  inspect: ServiceCall<{ memoryId: string }, {
    current: MemoryRecord; history: readonly MemoryRecord[]; sources: readonly EvidenceSource[];
    dependencies: MemoryDependencies;
  }>;
  list: ServiceCall<PageRequest & { subjectId?: string }, Page<MemoryRecord>>;
  withdraw: ServiceCall<({
    target: { kind: 'source'; sourceId: string }; expectedRevision: Revision | null;
  } | {
    target: { kind: 'memory'; memoryId: string }; expectedRevision: Revision;
  }) & { expectedEpoch: string; reason: string }, WithdrawalReceipt>;
  inspectWithdrawal: ServiceCall<{ withdrawalId: string }, WithdrawalReceipt>;
  prepareView: ServiceCall<{
    viewId: string; material: MemoryViewMaterial; dependencies: MemoryDependencies;
  }, MemoryViewStamp>;
  validateView: ServiceCall<{ view: MemoryViewStamp }, {
    decision: 'eligible' | 'ineligible' | 'unknown'; currentFence: MemoryFence;
    invalidSourceIds: readonly string[]; invalidMemoryIds: readonly string[];
  }>;
  beginUse: ServiceCall<{
    view: MemoryViewStamp; operationId: string; purpose: MemoryUsePurpose; maxDurationMs: number;
  }, MemoryUseLease>;
  finishUse: ServiceCall<{
    leaseId: string; outcome: 'handed_off' | 'aborted' | 'unknown';
  }, OperationReceipt>;
  inspectUse: ServiceCall<{ leaseId: string }, {
    lease: MemoryUseLease; state: 'active' | 'finished' | 'expired' | 'unknown';
  }>;
  exportWithdrawalGuard: ServiceCall<{ restoreId: string }, WithdrawalGuard>;
  applyWithdrawalGuard: ServiceCall<{
    guard: WithdrawalGuard; permit: RestoreStepPermit;
  }, { fence: MemoryFence; operation: OperationReceipt }>;
  inspectProcessing: ServiceCall<{ processingId: string }, {
    state: 'queued' | 'running' | 'committed' | 'failed' | 'stale';
    proposalId?: string; reason?: string;
  }>;
  exportView: ServiceCall<{ includeHistory: boolean }, ArtifactRef>;
}
