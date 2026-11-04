/** Product contract draft 0.2. Types only; runtime validation is still required. */
export type ContractVersion = '0.2';
export type Timestamp = string;
export type Revision = number;
export type ModuleId = 'core' | 'memory' | 'life' | 'desktop' | 'qq' | 'bilibili' | 'console';
export type CapabilityId =
  | 'core.conversation' | 'core.commitments' | 'core.activities' | 'core.delivery'
  | 'core.resources' | 'core.maintenance'
  | 'execution.native' | 'memory.lifecycle' | 'life.pursuits'
  | 'desktop.presentation' | 'desktop.body' | 'desktop.room'
  | 'channel.qq' | 'content.bilibili' | 'console.operations';

export interface RequestContext {
  contractVersion: ContractVersion;
  requestId: string;
  companionId: string;
  scopeId: string;
  actor: { kind: 'owner' | 'companion' | 'system' | 'external'; id: string };
}

/** Local cancellation is advisory until the operation's actual receipt confirms it. */
export interface CallOptions { signal?: AbortSignal; deadline?: Timestamp }

type RejectedCode = 'INVALID_ARGUMENT' | 'UNAUTHORIZED' | 'NOT_FOUND'
  | 'NOT_IMPLEMENTED' | 'DISABLED' | 'INCOMPATIBLE' | 'CONFLICT'
  | 'STALE_REVISION' | 'STALE_BINDING' | 'INELIGIBLE' | 'EXPIRED_USE' | 'LIMIT_REACHED';
export type ContractError = { message: string; operationId?: string } & (
  | { code: RejectedCode; effect: 'none'; retry: 'never' | 'refresh' }
  | { code: 'UNAVAILABLE' | 'TIMED_OUT' | 'CANCELLED' | 'INTERNAL';
      effect: 'none'; retry: 'never' | 'same_request' }
  | { code: 'UNAVAILABLE' | 'TIMED_OUT' | 'CANCELLED' | 'INTERNAL';
      effect: 'partial'; retry: 'never' | 'reconcile' }
  | { code: 'OUTCOME_UNKNOWN' | 'UNAVAILABLE' | 'TIMED_OUT' | 'CANCELLED' | 'INTERNAL';
      effect: 'unknown'; retry: 'reconcile' }
);
export type Result<T> = { ok: true; value: T } | { ok: false; error: ContractError };
export type ServiceCall<Input, Output> = (
  context: RequestContext, input: Input, options?: CallOptions,
) => Promise<Result<Output>>;

export type CapabilityState = 'not_implemented' | 'disabled' | 'initializing'
  | 'ready' | 'degraded' | 'unavailable' | 'incompatible' | 'stopping';
export type CapabilityStatus = {
  id: CapabilityId;
  owner: ModuleId;
  contractVersion: ContractVersion;
} & (
  | { state: 'not_implemented'; reason: string; supportedOperations: readonly [] }
  | { state: Exclude<CapabilityState, 'not_implemented'>;
      reason: string | null; supportedOperations: readonly string[] }
);

export type OperationState = 'accepted' | 'running' | 'waiting' | 'completed'
  | 'cancel_requested' | 'cancelled' | 'failed' | 'unknown';
export interface OperationReceipt {
  operationId: string;
  state: OperationState;
  revision: Revision;
  evidenceSourceIds: readonly string[];
  waitingReason?: string;
  failure?: ContractError;
}
export interface AdmissionRef { activityId: string; revision: Revision }
export interface PageRequest { cursor?: string; limit: number }
export interface Page<T> { items: readonly T[]; nextCursor: string | null }
/** Immutable content owned by the Core resource service, scoped by RequestContext. */
export interface ArtifactRef { artifactId: string; mediaType: string; contentDigest: string }
export type MessagePart = { kind: 'text'; text: string }
  | { kind: 'asset'; asset: ArtifactRef; altText: string };
export interface ChannelRef { kind: 'desktop' | 'qq' | 'dsh'; sceneId: string }
export interface ChannelBindingRef { bindingId: string; revision: Revision }

export interface MemoryFence { epoch: string; revision: Revision }
export interface SourceVersionRef { sourceId: string; revision: Revision }
export interface MemoryVersionRef { memoryId: string; revision: Revision }
export interface MemoryDependencies {
  fence: MemoryFence;
  sources: readonly SourceVersionRef[];
  memories: readonly MemoryVersionRef[];
}
export interface ContextSection {
  kind: 'identity' | 'conversation' | 'commitment' | 'memory' | 'activity'; text: string;
}
export type MemoryViewMaterial =
  | { kind: 'context'; sections: readonly ContextSection[] }
  | { kind: 'message'; parts: readonly MessagePart[] }
  | { kind: 'life_entry'; summary: string; artifact: ArtifactRef | null }
  | { kind: 'artifact'; contentDigest: string; mediaType: string };
export interface MemoryViewStamp {
  viewId: string; materialDigest: string; dependencies: MemoryDependencies;
}
export type MemoryUsePurpose = 'model_admission' | 'presentation' | 'delivery' | 'artifact_read' | 'export';
/** A scoped, bounded lease; possession alone is not authorization. */
export interface MemoryUseLease {
  leaseId: string; viewId: string; materialDigest: string; fence: MemoryFence;
  operationId: string; purpose: MemoryUsePurpose; expiresAt: Timestamp;
}
export interface WithdrawalGuard { guardId: string; fence: MemoryFence; artifact: ArtifactRef }

export interface EvidenceSource {
  sourceId: string;
  origin: 'owner_statement' | 'external_content' | 'model_interpretation'
    | 'virtual_action' | 'external_action';
  recordedAt: Timestamp;
  eventTime?: { from?: Timestamp; to?: Timestamp; precision: 'exact' | 'approximate' | 'unknown' };
  actorId: string;
  locator?: string;
  rootSourceIds: readonly string[];
  text: string;
}

export interface HealthSnapshot {
  module: ModuleId;
  capabilities: readonly CapabilityStatus[];
  pendingOperationIds: readonly string[];
  observedAt: Timestamp;
}
export type OwnedStateSnapshot =
  | { kind: 'stateless'; module: ModuleId }
  | { kind: 'snapshot'; module: ModuleId; snapshotId: string; formatId: string; schemaVersion: string;
      companionId: string; scopeId: string;
      artifact: ArtifactRef; watermark: string; pendingOperationIds: readonly string[] };
export interface QuiescenceReceipt {
  quiescenceId: string; module: ModuleId; admissionClosed: boolean;
  stateRevision: Revision | null; unresolvedOperationIds: readonly string[];
}
export interface RestoreStepPermit {
  restoreId: string; stepId: string; module: ModuleId;
  quiescenceId: string; authorizationRef: string;
}
export interface StateMaintenancePort {
  describeState: ServiceCall<Record<string, never>, {
    mode: 'stateless' | 'owned'; formatId: string | null;
    schemaVersion: string | null; revision: Revision | null;
  }>;
  exportState: ServiceCall<{ snapshotId: string }, OwnedStateSnapshot>;
  prepareImport: ServiceCall<{ restoreId: string; snapshot: OwnedStateSnapshot }, {
    importPlanId: string; compatible: boolean; currentRevision: Revision | null;
    limitations: readonly string[];
  }>;
  applyImport: ServiceCall<{
    importPlanId: string; expectedStateRevision: Revision | null; permit: RestoreStepPermit;
  }, OperationReceipt>;
}
export interface ModulePort extends StateMaintenancePort {
  health: ServiceCall<Record<string, never>, HealthSnapshot>;
  quiesce: ServiceCall<{
    reason: 'disable' | 'shutdown' | 'upgrade' | 'restore'; deadline: Timestamp;
  }, QuiescenceReceipt>;
  resumeFromQuiescence: ServiceCall<{
    quiescenceId: string; expectedStateRevision: Revision | null;
  }, HealthSnapshot>;
}
