import type { DeliveryAttempt, DeliveryAttemptReceipt, DeliveryTarget, IncomingMessage } from './core.js';
import type { ChannelRef, MemoryUseLease, MemoryViewStamp, MessagePart, Revision, ServiceCall } from './common.js';

export interface OwnerBinding {
  bindingId: string; revision: Revision; channel: ChannelRef;
  coreBindingId: string | null;
  coreBindingRevision: Revision | null;
  gatewayAccountId: string; ownerExternalId: string;
  state: 'unpaired' | 'paired' | 'disconnected' | 'account_changed';
}
/** Port for the Core delivery gate; direct calls still require runtime authorization. */
export type SendRequest =
  | { attempt: DeliveryAttempt & { memoryView: null }; memoryUse: null }
  | { attempt: DeliveryAttempt & { memoryView: MemoryViewStamp }; memoryUse: MemoryUseLease };
export interface ChannelTransport {
  send: ServiceCall<SendRequest, DeliveryAttemptReceipt>;
  reconcile: ServiceCall<{
    contactId: string; attemptId: string; target: DeliveryTarget;
  }, DeliveryAttemptReceipt>;
}
export interface QQService extends ChannelTransport {
  getBinding: ServiceCall<Record<string, never>, OwnerBinding | null>;
  pairOwner: ServiceCall<{
    gatewayAccountId: string; ownerExternalId: string; pairingProofRef: string;
    expectedRevision: Revision | null;
  }, OwnerBinding>;
  unpairOwner: ServiceCall<{ bindingId: string; expectedRevision: Revision }, OwnerBinding>;
  normalizeIncoming: ServiceCall<{
    gatewayEventId: string; gatewayAccountId: string; senderId: string;
    externalMessageId: string; parts: readonly MessagePart[];
    receivedAt: string; sceneId: string;
  }, IncomingMessage>;
}
