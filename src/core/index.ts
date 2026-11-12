import { CoreNative } from './native.js';
import { NativeMemory } from './native-memory.js';
import { createWorkbench } from './workbench.js';
import { CoreWorkspace } from './workspace.js';
import { createPreferences } from './preferences.js';
import { CONTRACT_VERSION } from '../contracts/version.js';
import type { CapabilityStatus, ServiceCall } from '../contracts/common.js';
import type { IncomingMessage, ConversationTurn } from '../contracts/core.js';
import { CoreRuntime, type CoreConfig } from './core.js';
import { CoreExecution, type NativeDriver } from './execution.js';
import { CoreMaintenance } from './maintenance.js';
import { CoreResources } from './resources.js';
import type { HistoryGuard } from './history.js';

/** Composition root. The operator and module-client issuers are trusted host capabilities. */
export function createCore(config: CoreConfig, driver: NativeDriver | null = null) {
  const runtime = new CoreRuntime(Object.freeze({ ...config }));
  const workspace = new CoreWorkspace(runtime); runtime.files = workspace;
  const execution = new CoreExecution(runtime, driver);
  const native = new CoreNative(runtime, execution);
  if (config.memory) native.memory = new NativeMemory(runtime, config.memory);
  const resources = new CoreResources(runtime);
  const maintenance = new CoreMaintenance(runtime, resources);
  runtime.capabilities = () => {
    const base = runtime.baseCapabilities();
    if (native.memory) {
      const memory = base.find(capability => capability.id === 'memory.lifecycle')!;
      const active = native.memory.connection.lifecycle === 'ready';
      memory.state = !native.memoryEnabledForNewSessions ? 'disabled' : active ? 'ready' : 'degraded';
      memory.reason = !native.memoryEnabledForNewSessions ? 'Memory is disabled for subsequent turns; native chat remains available'
        : active ? 'Shared Bank available for per-turn observation and recall'
        : `Memory configured; provider ${native.memory.connection.lifecycle}, starts on demand. Chat continues without recall on failure.`;
      memory.supportedOperations = active ? ['observe', 'recall', 'correct', 'withdraw', 'validate', 'recover'] : [];
    }
    const conversation = base.find(x => x.id === 'core.conversation')!;
    if (driver?.kind === 'dsh') {
      conversation.state = workspace.status().state === 'ready' ? 'ready' : 'unavailable';
      conversation.reason = 'Native DSH owns ordinary conversation execution; Memory availability does not gate chat';
    }
    const extra: CapabilityStatus[] = [
      { id: 'execution.native', owner: 'core', contractVersion: CONTRACT_VERSION,
        state: driver?.kind === 'dsh' ? 'ready' : 'unavailable', reason: driver?.kind === 'test' ? 'Test driver is not native DSH acceptance' : driver ? null : 'Native host absent',
        supportedOperations: driver ? ['bind', 'start', 'inspect', 'interrupt', 'reconcile'] : [] },
      { id: 'core.resources', owner: 'core', contractVersion: CONTRACT_VERSION, state: 'degraded',
        reason: 'Ordinary immutable resources ready; derived material needs Memory', supportedOperations: Object.keys(resources.port) },
      { id: 'core.maintenance', owner: 'core', contractVersion: CONTRACT_VERSION, state: 'degraded',
        reason: 'Legacy online snapshots and owner export; full scoped file recovery is available through the offline dafeiyu-backup command',
        supportedOperations: Object.keys(maintenance.port).filter(x => x !== 'applyRestore') },
    ];
    return [...base, ...extra];
  };
  const chat: ServiceCall<IncomingMessage, ConversationTurn> = async (context, input, options) => {
    const admitted = await runtime.core.receiveMessage(context, input, options);
    if (!admitted.ok) return admitted;
    try {
      await execution.drain();
      return runtime.core.getConversationTurn(context, { activityId: admitted.value.operation.operationId }, options);
    } catch {
      return { ok: false, error: { code: 'OUTCOME_UNKNOWN', message: 'Conversation outcome needs reconciliation', effect: 'unknown', retry: 'reconcile', operationId: admitted.value.operation.operationId } };
    }
  };
  return {
    services: { core: Object.freeze({ ...runtime.core, ...maintenance.module }), execution: execution.port,
      resources: resources.port, maintenance: maintenance.port, preferences: createPreferences(runtime), workspace: workspace.port,
      workbench: createWorkbench(runtime) },
    operator: { request: runtime.owner.request, issuePairingProof: runtime.issuePairingProof.bind(runtime) },
    connectModule: runtime.connectModule.bind(runtime),
    observe: (observer: typeof runtime.onChange) => { runtime.onChange = observer; },
    observeFreshReplies: (observer: typeof runtime.onFreshReply) => { runtime.onFreshReply = observer; },
    observeProgress: (observer: typeof runtime.onProgress) => { runtime.onProgress = observer; },
    setHistoryGuard: (guard: HistoryGuard | null) => runtime.setHistoryGuard(guard),
    chat,
    workspace, native,
    drain: () => execution.drain(), idle: () => execution.idle(),
    close: async () => {
      try { await native.close(); await execution.close(); }
      finally { try { await native.memory?.close(); } finally { runtime.close(); } }
    },
  };
}
export type PetCoreHost = ReturnType<typeof createCore>;
export type { CoreConfig } from './core.js';
export type { NativeDriver, NativeRunResult } from './execution.js';
export type { HistoryGuard } from './history.js';
export type { ConversationOptions } from './options.js';

export type { CorePreferences, PreferencesService, WorkspaceTarget } from './preferences.js';
export type { WorkspaceStatus, WorkspaceService } from './workspace.js';
export type { WorkbenchSnapshot, MatterDetail, WorkbenchService } from './workbench.js';
