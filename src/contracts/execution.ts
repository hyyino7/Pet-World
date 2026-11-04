import type {
  AdmissionRef, ArtifactRef, ChannelRef, ContextSection, MemoryUseLease,
  MemoryViewStamp, OperationReceipt, ServiceCall,
} from './common.js';

export interface ExecutionBinding {
  bindingId: string; hostSessionId: string; purpose: 'owner' | 'home' | 'reader';
  revision: number;
  memoryContext: MemoryViewStamp | null;
}
export interface ContextProjection {
  projectionId: string; sourceIds: readonly string[];
  sections: readonly ContextSection[];
  tokenLimit: number; truncated: boolean;
  memoryView: MemoryViewStamp | null;
}
export interface RunAllowance {
  maxSteps: number; maxToolCalls: number; maxDurationMs: number;
  allowedToolIds: readonly string[];
}
export interface ExecutionSnapshot {
  executionId: string; binding: ExecutionBinding; receipt: OperationReceipt;
  hostTurnIds: readonly string[]; resultArtifacts: readonly ArtifactRef[];
}
export type ExecutionStartRequest = {
  admission: AdmissionRef; bindingId: string; input: string;
  channel?: ChannelRef; allowance: RunAllowance;
} & (
  | { context: ContextProjection & { memoryView: null }; memoryUse: null }
  | { context: ContextProjection & { memoryView: MemoryViewStamp }; memoryUse: MemoryUseLease }
);
/** Internal Core-owned port. Only admitted work may reach native DSH execution. */
export interface ExecutionPort {
  bind: ServiceCall<{
    purpose: ExecutionBinding['purpose']; previousBindingId?: string;
    expectedRevision?: number;
  }, ExecutionBinding>;
  start: ServiceCall<ExecutionStartRequest, ExecutionSnapshot>;
  inspect: ServiceCall<{ executionId: string }, ExecutionSnapshot>;
  interrupt: ServiceCall<{ executionId: string; reason: string }, OperationReceipt>;
  reconcile: ServiceCall<{ executionId: string }, ExecutionSnapshot>;
}
