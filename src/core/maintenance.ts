import type { BackupRecord, ExportRecord, MaintenanceService, RestoreRecord } from '../contracts/maintenance.js';
import type { ModuleId, ModulePort } from '../contracts/common.js';
import type { Commitment } from '../contracts/core.js';
import type { CoreRuntime, StoredActivity } from './core.js';
import type { CoreResources } from './resources.js';
import { bytesDigest, canonical, check, id, now, reject, revision, timestamp, unavailable } from './storage.js';

/** C1 maintenance: durable local Core snapshots; guarded restore stays unavailable. */
export class CoreMaintenance {
  readonly port: MaintenanceService;
  readonly module: ModulePort;
  constructor(readonly runtime: CoreRuntime, readonly resources: CoreResources) {
    const store = runtime.store;
    this.port = {
      exportCompanion: runtime.call('maintenance.exportCompanion', true, input => {
        check(typeof input.includeHistory === 'boolean', 'Invalid includeHistory');
        if (input.includeHistory) unavailable('Memory eligibility and export provider are required for history export');
        const exportId = id('export');
        const all = store.all<Commitment>('commitment');
        const commitments = all.filter(m => runtime.eligible([...m.sourceIds, ...m.resultSourceIds]));
        const artifact = resources.publish(Buffer.from(canonical({ format: 'codex-pet.owner-export', version: 1,
          identity: runtime.identity(), policy: runtime.policy(), commitments, withheldCommitmentCount: all.length - commitments.length })),
        'application/json', 'export', 'core', { module: 'core', recordId: exportId }).ref;
        const record: ExportRecord = { exportId, revision: 1, receipt: runtime.receipt(exportId, 'completed'), artifact };
        store.put('export', exportId, record); return record;
      }, true),
      inspectExport: runtime.call('maintenance.inspectExport', false, input => store.require<ExportRecord>('export', input.exportId), true),
      createBackup: runtime.call('maintenance.createBackup', true, input => {
        check(input.destinationRef === 'core.local', 'Only the scoped core.local backup destination is supported');
        const backupId = id('backup');
        // Read a transactionally consistent domain snapshot. Never overwrite receipt/control ledgers on restore.
        const domain = Object.fromEntries(['identity', 'policy', 'commitment', 'source', 'conversation'].map(kind => [kind, store.all(kind)]));
        const artifact = resources.publish(Buffer.from(canonical({ format: 'codex-pet.core-state', schema: 1,
          companionId: runtime.config.companionId, scopeId: runtime.config.scopeId, domain })),
        'application/json', 'backup', 'core', { module: 'core', recordId: backupId }).ref;
        const snapshot = { kind: 'snapshot' as const, module: 'core' as const, snapshotId: id('snapshot'), formatId: 'codex-pet.core-state',
          schemaVersion: '1', companionId: runtime.config.companionId, scopeId: runtime.config.scopeId, artifact,
          watermark: now(), pendingOperationIds: this.pending() };
        const absent: ModuleId[] = ['memory', 'life', 'desktop', 'qq', 'bilibili', 'voice', 'console'];
        const record: BackupRecord = { backupId, revision: 1, companionId: runtime.config.companionId, scopeId: runtime.config.scopeId,
          receipt: runtime.receipt(backupId, 'completed'), manifest: null, snapshots: [snapshot], resources: [artifact], completeness: 'partial',
          coverage: [{ module: 'core', state: 'included', reason: 'Core domain snapshot only; native logs, protected ledgers and other artifact bytes are outside this backup' },
            ...absent.map(module => ({ module, state: 'not_implemented' as const, reason: 'Provider absent' }))] };
        record.manifest = resources.publish(Buffer.from(canonical(record)), 'application/json', 'backup', 'core', { module: 'core', recordId: backupId }).ref;
        store.put('backup', backupId, record); return record;
      }, true),
      inspectBackup: runtime.call('maintenance.inspectBackup', false, input => store.require<BackupRecord>('backup', input.backupId), true),
      listBackups: runtime.call('maintenance.listBackups', false, input => store.page(store.all<BackupRecord>('backup'), input), true),
      reconcileBackup: runtime.call('maintenance.reconcileBackup', false, input => {
        const value = store.require<BackupRecord>('backup', input.backupId); revision(value.revision, input.expectedRevision);
        for (const artifact of [...value.resources, ...(value.manifest ? [value.manifest] : [])]) {
          resources.inspect(artifact);
          if (bytesDigest(resources.bytes(artifact.artifactId)) !== artifact.contentDigest) reject('INCOMPATIBLE', 'Backup artifact integrity check failed');
        }
        return value;
      }, true),
      prepareRestore: runtime.call('maintenance.prepareRestore', true, input => {
        const backup = store.require<BackupRecord>('backup', input.backupId);
        const restoreId = id('restore');
        const result: RestoreRecord = { restoreId, revision: 1, backupId: backup.backupId, companionId: backup.companionId,
          scopeId: backup.scopeId, compatible: false, receipt: { ...runtime.receipt(restoreId, 'waiting'), waitingReason: 'Restore prerequisites are unavailable' },
          steps: [], withdrawalGuard: null, preRestoreBackupId: null,
          limitations: ['Memory withdrawal guard is unavailable', 'Cross-module freeze/import coordinator is not implemented', 'Backup is a partial Core snapshot; protected receipts, native logs and resource bytes are not restorable from it'] };
        store.put('restore', restoreId, result); return result;
      }, true),
      inspectRestore: runtime.call('maintenance.inspectRestore', false, input => store.require<RestoreRecord>('restore', input.restoreId), true),
      listRestores: runtime.call('maintenance.listRestores', false, input => store.page(store.all<RestoreRecord>('restore'), input), true),
      applyRestore: runtime.call('maintenance.applyRestore', false, input => {
        const record = store.require<RestoreRecord>('restore', input.restoreId); revision(record.revision, input.expectedRevision);
        unavailable('Restore is disabled until withdrawal guard, freeze and protected-ledger preservation are implemented');
      }, true),
      reconcileRestore: runtime.call('maintenance.reconcileRestore', false, input => {
        const record = store.require<RestoreRecord>('restore', input.restoreId); revision(record.revision, input.expectedRevision); return record;
      }, true),
      cancelRestore: runtime.call('maintenance.cancelRestore', true, input => {
        const record = store.require<RestoreRecord>('restore', input.restoreId); revision(record.revision, input.expectedRevision);
        if (record.receipt.state !== 'cancelled') { record.revision++; record.receipt = { ...record.receipt, state: 'cancelled', revision: record.receipt.revision + 1 }; store.put('restore', record.restoreId, record); }
        return record;
      }, true),
    };
    this.module = {
      health: runtime.call('health', false, () => this.health()),
      describeState: runtime.call('describeState', false, () => ({ mode: 'owned', formatId: 'codex-pet.core-state', schemaVersion: '1', revision: null })),
      exportState: runtime.call('exportState', false, () => unavailable('Use maintenance.createBackup for the partial Core snapshot; full owner snapshots await C3'), true),
      prepareImport: runtime.call('prepareImport', false, () => unavailable('Guarded import is not implemented'), true),
      applyImport: runtime.call('applyImport', false, () => unavailable('Guarded import is not implemented'), true),
      quiesce: runtime.call('quiesce', true, input => {
        timestamp(input.deadline); check(['disable', 'shutdown', 'upgrade', 'restore'].includes(input.reason), 'Invalid quiescence reason');
        const value = { quiescenceId: id('quiescence'), module: 'core' as const, admissionClosed: true, stateRevision: null,
          unresolvedOperationIds: this.pending() };
        store.setMeta('quiescence', value); return value;
      }, true),
      resumeFromQuiescence: runtime.call('resumeFromQuiescence', true, input => {
        const current = store.meta<{ quiescenceId: string }>('quiescence');
        if (!current || current.quiescenceId !== input.quiescenceId) reject('CONFLICT', 'Quiescence does not match');
        check(input.expectedStateRevision === null, 'Core has no aggregate revision yet');
        store.setMeta('quiescence', null); return this.health();
      }, true),
    };
  }
  private pending(): string[] { return this.runtime.store.all<StoredActivity>('activity').filter(x => !this.runtime.isTerminal(x.receipt.state)).map(x => x.activityId); }
  private health() { return { module: 'core' as const, capabilities: this.runtime.capabilities(), pendingOperationIds: this.pending(), observedAt: now() }; }
}
