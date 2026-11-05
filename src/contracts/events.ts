import type { CapabilityStatus, ContractVersion, MemoryFence, ModuleId, OperationReceipt, Revision, Timestamp } from './common.js';
import type { ConversationMessage, DeliveryOutcome, CommitmentProgress } from './core.js';

/** Observation DTOs for host events/helper transport, not a new event bus. */
export interface ProductEventMap {
  'capability.changed': CapabilityStatus;
  'binding.changed': { bindingId: string; revision: Revision; state: 'paired' | 'suspended' | 'revoked' };
  'conversation.presented': ConversationMessage;
  'activity.changed': { activityId: string; receipt: OperationReceipt };
  'commitment.progress': CommitmentProgress;
  'delivery.changed': { contactId: string; outcome: DeliveryOutcome; revision: Revision };
  'memory.changed': { memoryIds: readonly string[]; sourceIds: readonly string[]; fence: MemoryFence };
  'memory.withdrawn': { withdrawalId: string; fence: MemoryFence };
  'resource.changed': { artifactId: string; revision: Revision };
  'maintenance.changed': { kind: 'export' | 'backup' | 'restore'; recordId: string; revision: Revision };
  'life.changed': { pursuitId: string; revision: Revision };
  'body.changed': { commandId: string; receipt: OperationReceipt };
  'configuration.changed': { module: ModuleId; revision: Revision };
}
export type ProductEvent = {
  [K in keyof ProductEventMap]: {
    contractVersion: ContractVersion; eventId: string; bootId: string; cursor: string;
    companionId: string; scopeId: string; occurredAt: Timestamp;
    kind: K; payload: ProductEventMap[K];
  }
}[keyof ProductEventMap];
