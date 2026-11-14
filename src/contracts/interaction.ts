/** Committed domain facts, not user messages, model decisions or animation receipts. */
export interface CompanionFactActor {
  kind: 'owner' | 'companion' | 'system';
  id: string;
  channel: string;
  sessionId?: string;
}

export interface CompanionFact {
  version: 1;
  id: string;
  requestId: string;
  domain: 'body' | 'economy';
  type: string;
  occurredAt: string;
  actor: CompanionFactActor;
  result: {
    status: 'completed' | 'failed' | 'unchanged';
    summary: string;
    before?: Record<string, number>;
    after?: Record<string, number>;
  };
  operationId?: string;
}

/** Each domain remains the authority. Consumers only acknowledge committed IDs. */
export interface CompanionFactSource {
  pendingFacts(workspaceId: string): Promise<CompanionFact[]>;
  readFacts(workspaceId: string, ids: readonly string[]): Promise<CompanionFact[]>;
  acknowledgeFacts(workspaceId: string, ids: readonly string[]): Promise<void>;
}
