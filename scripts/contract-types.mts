import { CONTRACT_VERSION } from '../src/contracts/version.js';
// Compile-only examples of the draft boundary; never starts a provider or host.
import type {
  ArtifactRef, CapabilityStatus, ConsoleService, ContractError, ConversationMessage, DeliveryAttempt,
  DeliveryTarget, ExecutionPort, MaintenanceService, MemoryService, MemoryUseLease,
  MemoryViewStamp, OperationReceipt, ProductEvent, ResourceService, Result,
  SendRequest, SourceObservationReceipt, StateMaintenancePort,
} from '../src/contracts/index.js';

const deferred: CapabilityStatus = {
  id: 'desktop.room', owner: 'desktop', contractVersion: CONTRACT_VERSION,
  state: 'not_implemented', reason: 'Renderer deferred', supportedOperations: [],
};
const unsupported: Result<OperationReceipt> = {
  ok: false,
  error: { code: 'NOT_IMPLEMENTED', effect: 'none', retry: 'never', message: 'Room deferred' },
};
const uncertain: ContractError = {
  code: 'OUTCOME_UNKNOWN', effect: 'unknown', retry: 'reconcile', message: 'Inspect the receipt',
};
// @ts-expect-error An unknown side effect cannot prescribe an automatic retry.
const blindRetry: ContractError = { code: 'OUTCOME_UNKNOWN', effect: 'unknown', retry: 'same_request', message: 'Retry' };
// @ts-expect-error A timeout with unknown effects also needs reconciliation.
const uncertainTimeout: ContractError = { code: 'TIMED_OUT', effect: 'unknown', retry: 'same_request', message: 'Retry' };
// @ts-expect-error A deferred capability cannot advertise working operations.
const fakeCapability: CapabilityStatus = { id: 'desktop.room', owner: 'desktop', contractVersion: CONTRACT_VERSION, state: 'not_implemented', reason: 'Deferred', supportedOperations: ['interact'] };
// @ts-expect-error Acceptance needs an operation identity, revision and evidence list.
const incompleteReceipt: OperationReceipt = { state: 'accepted' };
// @ts-expect-error Native execution cannot omit admission, context and finite allowance.
const unadmittedRun: Parameters<ExecutionPort['start']>[1] = { bindingId: 'binding', input: 'Read' };
// @ts-expect-error An event kind cannot carry another event family's payload.
const mismatchedEvent: ProductEvent = { contractVersion: CONTRACT_VERSION, eventId: 'e', bootId: 'b', cursor: '1', companionId: 'fish', scopeId: 'owner', occurredAt: '2026-11-04T00:00:00Z', kind: 'memory.withdrawn', payload: { contactId: 'c', revision: 1, outcome: { state: 'pending' } } };

const view: MemoryViewStamp = {
  viewId: 'view', materialDigest: 'sha256:material',
  dependencies: { fence: { epoch: 'bank-generation', revision: 4 },
    sources: [{ sourceId: 'source', revision: 1 }], memories: [] },
};
const use: MemoryUseLease = {
  leaseId: 'lease', viewId: view.viewId, materialDigest: view.materialDigest,
  fence: view.dependencies.fence, operationId: 'activity', purpose: 'model_admission',
  expiresAt: '2026-11-04T00:01:00Z',
};
const guardedExecution: Parameters<ExecutionPort['start']>[1] = {
  admission: { activityId: 'activity', revision: 1 }, bindingId: 'binding', input: 'Read',
  allowance: { maxSteps: 1, maxToolCalls: 1, maxDurationMs: 1000, allowedToolIds: [] },
  context: { projectionId: 'projection', sourceIds: ['source'], sections: [], tokenLimit: 100,
    truncated: false, memoryView: view }, memoryUse: use,
};
// @ts-expect-error Derived execution context cannot omit its memory-use lease.
const staleExecution: Parameters<ExecutionPort['start']>[1] = { ...guardedExecution, memoryUse: null };

const withdrawUnobservedSource: Parameters<MemoryService['withdraw']>[1] = {
  target: { kind: 'source', sourceId: 'not-ingested' }, expectedRevision: null,
  expectedEpoch: 'bank-generation', reason: 'Forget',
};
// @ts-expect-error Source withdrawal needs a known revision or explicit absent-source precondition.
const blindWithdrawal: Parameters<MemoryService['withdraw']>[1] = { target: { kind: 'source', sourceId: 'source' }, reason: 'Forget' };
// @ts-expect-error A source revision cannot be reused across a Bank-generation change.
const epochlessWithdrawal: Parameters<MemoryService['withdraw']>[1] = { target: { kind: 'source', sourceId: 'source' }, expectedRevision: 1, reason: 'Forget' };

const target: DeliveryTarget = {
  channel: { kind: 'qq', sceneId: 'owner' }, binding: { bindingId: 'binding', revision: 3 },
  transportAccountRef: 'gateway-connection', transportAccountId: 'gateway-account',
  recipientExternalId: 'owner-account',
};
const attempt: DeliveryAttempt & { memoryView: MemoryViewStamp } = {
  contactId: 'contact', attemptId: 'attempt', target, createdAt: '2026-11-04T00:00:00Z',
  parts: [{ kind: 'text', text: 'Result' }], memoryView: view,
};
const guardedSend: SendRequest = { attempt, memoryUse: { ...use, operationId: 'attempt', purpose: 'delivery' } };
// @ts-expect-error Sending derived content needs a lease even with a valid route.
const staleSend: SendRequest = { attempt, memoryUse: null };
// @ts-expect-error A channel alone cannot identify an admitted delivery target.
const mutableTarget: DeliveryTarget = { channel: { kind: 'qq', sceneId: 'owner' } };

const artifact: ArtifactRef = { artifactId: 'asset', mediaType: 'text/plain', contentDigest: 'sha256:content' };
const scopedRead: Parameters<ResourceService['readArtifact']>[1] = {
  artifact, offset: 0, maxBytes: 1024,
  access: { kind: 'ordinary', purpose: 'inspection', memoryUse: null },
};
// @ts-expect-error Resource reads need an explicit access purpose and authorization path.
const unscopedRead: Parameters<ResourceService['readArtifact']>[1] = { artifact, offset: 0, maxBytes: 1024 };
// @ts-expect-error Maintenance access cannot omit its trusted transaction authorization.
const unauthorizedRead: Parameters<ResourceService['readArtifact']>[1] = { artifact, offset: 0, maxBytes: 1024, access: { kind: 'maintenance', purpose: 'restore', transactionId: 'restore' } };

const ownerImport: Parameters<StateMaintenancePort['applyImport']>[1] = {
  importPlanId: 'import', expectedStateRevision: 3,
  permit: { restoreId: 'restore', stepId: 'step', module: 'memory',
    quiescenceId: 'quiesced', authorizationRef: 'verified-permit' },
};
const coreRestore: Parameters<MaintenanceService['applyRestore']>[1] = {
  restoreId: 'restore', expectedRevision: 1, authorizationRef: 'verified-owner-action',
};
// @ts-expect-error The Console presentation port does not own restore transactions.
type ConsoleCannotOwnRestore = ConsoleService['applyRestore'];
// @ts-expect-error State import needs the Core restore step and quiescence permit.
const uncoordinatedImport: Parameters<StateMaintenancePort['applyImport']>[1] = { importPlanId: 'import', expectedStateRevision: 3, authorizationRef: 'owner-action' };
// @ts-expect-error A restore cannot discard its expected transaction revision.
const blindRestore: Parameters<MaintenanceService['applyRestore']>[1] = { restoreId: 'restore', authorizationRef: 'owner-action' };

// @ts-expect-error A tombstoned source cannot start another extraction job.
const resurrectedSource: SourceObservationReceipt = { state: 'blocked', processingId: 'new-job', source: { sourceId: 'source', revision: 2, state: 'withdrawn', evidencePresent: false, fence: { epoch: 'bank-generation', revision: 5 } } };
// @ts-expect-error Withheld history cannot return its old text as a preview.
const leakingHistory: ConversationMessage = { messageId: 'message', channel: { kind: 'qq', sceneId: 'owner' }, binding: { bindingId: 'binding', revision: 3 }, sender: 'companion', sourceId: 'source', createdAt: '2026-11-04T00:00:00Z', visibility: 'withheld', reason: 'ineligible', memoryView: null, parts: [{ kind: 'text', text: 'Old withdrawn text' }] };

export type DraftBoundaryExamples = typeof deferred | typeof unsupported | typeof uncertain
  | typeof guardedExecution | typeof withdrawUnobservedSource | typeof guardedSend
  | typeof scopedRead | typeof ownerImport | typeof coreRestore;
