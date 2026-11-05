import type {
  AdmissionRef, CapabilityId, CapabilityStatus, ChannelBindingRef, ChannelRef, EvidenceSource,
  MemoryViewStamp, MessagePart, OperationReceipt, Page, PageRequest, Revision, ServiceCall, Timestamp,
} from './common.js';

export interface CompanionIdentity {
  companionId: string; revision: Revision; displayName: string;
  character: string; ownerActorId: string;
}
export interface ChannelBinding {
  bindingId: string; revision: Revision; channel: ChannelRef;
  transportAccountRef: string; transportAccountId: string;
  ownerActorId: string; ownerExternalId: string;
  state: 'paired' | 'suspended' | 'revoked';
}
export interface IncomingMessage {
  channel: ChannelRef; binding: ChannelBindingRef; externalMessageId: string; senderId: string;
  receivedAt: Timestamp; parts: readonly MessagePart[];
  replyToExternalMessageId?: string;
}
export type ConversationMessage = {
  messageId: string; channel: ChannelRef; binding: ChannelBindingRef; sender: 'owner' | 'companion';
  sourceId: string; hostTurnId?: string; createdAt: Timestamp;
} & (
  | { visibility: 'available'; parts: readonly MessagePart[]; memoryView: MemoryViewStamp | null }
  | { visibility: 'withheld'; parts: readonly []; memoryView: null;
      reason: 'ineligible' | 'memory_unavailable' }
);
export interface Commitment {
  commitmentId: string; revision: Revision; requestedOutcome: string;
  sourceIds: readonly string[];
  state: 'open' | 'in_progress' | 'waiting' | 'completed' | 'cancelled';
  nextAction: string | null; waitingReason: string | null;
  dueAt?: Timestamp; resultSourceIds: readonly string[];
}
export interface CommitmentProgress {
  progressId: string; commitmentId: string; revision: Revision; executionId: string;
  kind: 'created' | 'updated' | 'progress' | 'result' | 'interrupted';
  summary: string; sourceIds: readonly string[]; recordedAt: Timestamp;
}
export interface ConversationTurn {
  activity: ActivitySnapshot; reply: ConversationMessage | null;
  contact: ContactSnapshot | null; commitments: readonly Commitment[];
  progress: readonly CommitmentProgress[];
}
export interface ActivityProposal {
  proposalId: string; owner: 'owner' | 'companion'; commitmentId?: string;
  capability: CapabilityId; action: string; purpose: string;
  desiredOutcome: string; stoppingCondition: string;
  sourceIds: readonly string[]; notBefore?: Timestamp;
}
export interface ActivitySnapshot {
  activityId: string; proposal: ActivityProposal; receipt: OperationReceipt;
  checkpointArtifactId?: string;
}
export type DeliveryOutcome =
  | { state: 'pending' | 'attempting'; attemptId?: string }
  | { state: 'gateway_confirmed'; attemptId: string; externalMessageId: string }
  | { state: 'unknown'; attemptId: string; reason: string }
  | { state: 'failed'; attemptId?: string; reason: string };
export interface ContactIntent {
  contactId: string; parts: readonly MessagePart[]; sourceIds: readonly string[];
  purpose: 'reply' | 'proactive'; replyToMessageId?: string;
  preferredChannel?: ChannelRef; expiresAt?: Timestamp;
  expectedBinding?: ChannelBindingRef;
  memoryView: MemoryViewStamp | null;
}
export interface DeliveryTarget {
  channel: ChannelRef; binding: ChannelBindingRef;
  transportAccountRef: string; transportAccountId: string; recipientExternalId: string;
}
export interface DeliveryAttempt {
  contactId: string; attemptId: string; target: DeliveryTarget;
  createdAt: Timestamp; parts: readonly MessagePart[];
  replyToExternalMessageId?: string; memoryView: MemoryViewStamp | null;
}
export interface DeliveryAttemptReceipt {
  contactId: string; attemptId: string; target: DeliveryTarget;
  outcome: DeliveryOutcome;
}
export interface ContactSnapshot {
  intent: ContactIntent; revision: Revision;
  target: DeliveryTarget | null; outcome: DeliveryOutcome;
}
export interface AttentionPolicy {
  revision: Revision; quiet: boolean; autonomyPaused: boolean;
  proactiveChannel: ChannelRef | null;
  autonomousLimits: {
    maxConcurrentRuns: number; maxStepsPerRun: number;
    maxToolCallsPerRun: number; maxDurationMsPerRun: number;
    maxDailyRuns: number; maxDailyTokens: number; maxDailyContacts: number;
  };
}
export interface CoreService {
  getIdentity: ServiceCall<Record<string, never>, CompanionIdentity>;
  reviseIdentity: ServiceCall<{
    expectedRevision: Revision; displayName: string; character: string;
  }, CompanionIdentity>;
  bindChannel: ServiceCall<{
    channel: ChannelRef; transportAccountRef: string; transportAccountId: string;
    ownerExternalId: string;
    pairingProofRef: string; expectedRevision: Revision | null;
  }, ChannelBinding>;
  listChannelBindings: ServiceCall<PageRequest, Page<ChannelBinding>>;
  revokeChannelBinding: ServiceCall<{
    bindingId: string; expectedRevision: Revision;
  }, ChannelBinding>;
  receiveMessage: ServiceCall<IncomingMessage, {
    messageId: string; sourceId: string; duplicate: boolean; operation: OperationReceipt;
  }>;
  listConversation: ServiceCall<PageRequest & { channel?: ChannelRef }, Page<ConversationMessage>>;
  getConversationTurn: ServiceCall<{ activityId: string }, ConversationTurn>;
  recordSource: ServiceCall<EvidenceSource, { sourceId: string; duplicate: boolean }>;
  getSource: ServiceCall<{
    sourceId: string; purpose: 'memory_processing' | 'owner_audit';
  }, EvidenceSource>;
  createCommitment: ServiceCall<{
    requestedOutcome: string; sourceIds: readonly string[]; dueAt?: Timestamp;
  }, Commitment>;
  reviseCommitment: ServiceCall<{
    commitmentId: string; expectedRevision: Revision;
    requestedOutcome?: string; dueAt?: Timestamp | null;
    state: Commitment['state']; nextAction: string | null; waitingReason: string | null;
    resultSourceIds: readonly string[];
  }, Commitment>;
  listCommitments: ServiceCall<PageRequest & { state?: Commitment['state'] }, Page<Commitment>>;
  listCommitmentProgress: ServiceCall<PageRequest & { commitmentId: string }, Page<CommitmentProgress>>;
  admitActivity: ServiceCall<ActivityProposal, AdmissionRef>;
  getActivity: ServiceCall<{ activityId: string }, ActivitySnapshot>;
  cancelActivity: ServiceCall<{
    activityId: string; expectedRevision: Revision; reason: string;
  }, OperationReceipt>;
  reportActivity: ServiceCall<{
    admission: AdmissionRef; receipt: OperationReceipt; checkpointArtifactId?: string;
  }, ActivitySnapshot>;
  requestContact: ServiceCall<ContactIntent, ContactSnapshot>;
  getContact: ServiceCall<{ contactId: string }, ContactSnapshot>;
  prepareDeliveryAttempt: ServiceCall<{
    contactId: string; expectedRevision: Revision;
  }, { attempt: DeliveryAttempt; contactRevision: Revision }>;
  listDeliveryAttempts: ServiceCall<PageRequest & { contactId: string }, Page<{
    attempt: DeliveryAttempt; receipt: DeliveryAttemptReceipt | null;
  }>>;
  reportDelivery: ServiceCall<{
    expectedRevision: Revision; receipt: DeliveryAttemptReceipt;
  }, ContactSnapshot>;
  getPolicy: ServiceCall<Record<string, never>, AttentionPolicy>;
  setPolicy: ServiceCall<AttentionPolicy & { expectedRevision: Revision }, AttentionPolicy>;
  listCapabilities: ServiceCall<Record<string, never>, readonly CapabilityStatus[]>;
}
