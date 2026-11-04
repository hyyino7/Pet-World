import type {
  ArtifactRef, ModuleId, OperationReceipt, OwnedStateSnapshot, Page, PageRequest,
  Revision, ServiceCall, WithdrawalGuard,
} from './common.js';

export interface ExportRecord {
  exportId: string; revision: Revision; receipt: OperationReceipt; artifact: ArtifactRef | null;
}
export interface BackupRecord {
  backupId: string; revision: Revision; receipt: OperationReceipt;
  companionId: string; scopeId: string; manifest: ArtifactRef | null;
  snapshots: readonly OwnedStateSnapshot[]; resources: readonly ArtifactRef[];
  completeness: 'pending' | 'full' | 'partial';
  coverage: readonly {
    module: ModuleId; state: 'included' | 'stateless' | 'not_implemented' | 'unavailable';
    reason: string | null;
  }[];
}
export interface RestoreStep {
  stepId: string; module: ModuleId; importPlanId: string | null;
  expectedStateRevision: Revision | null; quiescenceId: string | null;
  state: 'pending' | 'prepared' | 'quiesced' | 'importing' | 'completed' | 'failed' | 'unknown';
  operationId: string | null;
}
export interface RestoreRecord {
  restoreId: string; revision: Revision; backupId: string;
  companionId: string; scopeId: string; compatible: boolean;
  receipt: OperationReceipt; steps: readonly RestoreStep[];
  withdrawalGuard: WithdrawalGuard | null; preRestoreBackupId: string | null;
  limitations: readonly string[];
}
/** Core-owned durable coordinator. Console is a client, never its state owner. */
export interface MaintenanceService {
  exportCompanion: ServiceCall<{ includeHistory: boolean }, ExportRecord>;
  inspectExport: ServiceCall<{ exportId: string }, ExportRecord>;
  createBackup: ServiceCall<{ destinationRef: string }, BackupRecord>;
  inspectBackup: ServiceCall<{ backupId: string }, BackupRecord>;
  listBackups: ServiceCall<PageRequest, Page<BackupRecord>>;
  reconcileBackup: ServiceCall<{ backupId: string; expectedRevision: Revision }, BackupRecord>;
  prepareRestore: ServiceCall<{ backupId: string }, RestoreRecord>;
  inspectRestore: ServiceCall<{ restoreId: string }, RestoreRecord>;
  listRestores: ServiceCall<PageRequest, Page<RestoreRecord>>;
  applyRestore: ServiceCall<{
    restoreId: string; expectedRevision: Revision; authorizationRef: string;
  }, RestoreRecord>;
  reconcileRestore: ServiceCall<{ restoreId: string; expectedRevision: Revision }, RestoreRecord>;
  cancelRestore: ServiceCall<{ restoreId: string; expectedRevision: Revision }, RestoreRecord>;
}
