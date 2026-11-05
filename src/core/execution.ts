import type { ExecutionBinding, ExecutionPort, ExecutionSnapshot, ExecutionStartRequest } from '../contracts/execution.js';
import type { ChannelBinding, ContactSnapshot, ConversationMessage, Commitment, CommitmentProgress } from '../contracts/core.js';
import type { EvidenceSource, OperationReceipt } from '../contracts/common.js';
import type { CoreRuntime, StoredActivity } from './core.js';
import { check, digest, id, integer, now, reject, revision, text } from './storage.js';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import { dialogueContext, type DialogueContext } from './history.js';
import { matterTools, MATTER_TOOLS } from './matters.js';
import { createSerialDelivery } from './upstream/serial-delivery.js';

export interface NativeRunResult {
  state: 'completed' | 'cancelled' | 'failed' | 'unknown';
  hostTurnIds: readonly string[]; text: string; reason?: string;
}
/** An adapter to DSH, not a second Agent runtime. Test drivers must identify themselves. */
export interface NativeDriver {
  readonly kind: 'dsh' | 'test';
  run(input: { sessionId: string; messageId: string; text: string; character: string;
    maxSteps: number; maxDurationMs: number; signal: AbortSignal;
    context?: string; tools?: readonly ToolDefinition[]; maxToolCalls?: number; validate?: () => void }): Promise<NativeRunResult>;
  inspect(sessionId: string, messageId: string): Promise<NativeRunResult>;
  /** Read an existing UI session without resuming, clearing or owning its inbox. */
  inspectObserved?(sessionId: string, messageId: string): Promise<NativeRunResult>;
  close(): Promise<void>;
}
interface StoredExecution extends ExecutionSnapshot {
  activityId: string; messageId: string; requestDigest: string;
  dialogue?: DialogueContext;
}

export class CoreExecution {
  readonly port: ExecutionPort;
  private readonly running = new Map<string, { controller: AbortController; done: Promise<void> }>();
  private drainTask: Promise<void> | null = null;
  private drainRequested = false;
  private closing = false;
  private readonly delivery = createSerialDelivery();
  constructor(readonly runtime: CoreRuntime, readonly driver: NativeDriver | null) {
    runtime.onCancel = activityId => {
      for (const [executionId, run] of this.running) {
        if (runtime.store.require<StoredExecution>('execution', executionId).activityId === activityId) run.controller.abort();
      }
    };
    this.port = {
      bind: runtime.call('execution.bind', true, input => {
        check(['owner', 'home', 'reader'].includes(input.purpose), 'Invalid binding purpose');
        if (input.previousBindingId) {
          const previous = runtime.store.require<ExecutionBinding>('execution-binding', input.previousBindingId);
          revision(previous.revision, input.expectedRevision!);
        }
        const binding: ExecutionBinding = { bindingId: id('execution-binding'), hostSessionId: id('pet-session'), purpose: input.purpose, revision: 1, memoryContext: null };
        runtime.store.put('execution-binding', binding.bindingId, binding); return binding;
      }, true),
      start: async (context, input, options) => {
        // The transaction stores the exact intent before any native creation or input handoff.
        const result = await runtime.call<ExecutionStartRequest, ExecutionSnapshot>('execution.start', true, value => this.prepare(value), true)(context, input, options);
        if (result.ok) {
          result.value = this.snapshot(runtime.store.require<StoredExecution>('execution', result.value.executionId));
          if (!this.running.has(result.value.executionId) && result.value.receipt.state === 'running') this.launch(result.value.executionId, input);
        }
        return result;
      },
      inspect: runtime.call('execution.inspect', false, input => this.snapshot(runtime.store.require<StoredExecution>('execution', input.executionId)), true),
      interrupt: async (context, input, options) => {
        const result = await runtime.call<typeof input, OperationReceipt>('execution.interrupt', true, value => {
          const execution = runtime.store.require<StoredExecution>('execution', value.executionId); text(value.reason, 'reason');
          const activity = runtime.store.require<StoredActivity>('activity', execution.activityId);
          if (!runtime.isTerminal(activity.receipt.state)) {
            activity.receipt = { ...activity.receipt, state: 'cancel_requested', revision: activity.receipt.revision + 1, waitingReason: value.reason };
            runtime.store.put('activity', activity.activityId, activity);
          }
          return activity.receipt;
        }, true)(context, input, options);
        if (result.ok) {
          this.running.get(input.executionId)?.controller.abort();
          const record = runtime.store.require<StoredExecution>('execution', input.executionId);
          runtime.onCancel(record.activityId);
        }
        return result;
      },
      reconcile: async (context, input, options) => {
        const inspected = await this.port.inspect(context, input, options);
        if (!inspected.ok || this.running.has(input.executionId) || runtime.isTerminal(inspected.value.receipt.state)) return inspected;
        if (!this.driver) return { ok: false, error: { code: 'UNAVAILABLE', message: 'Native host is absent', effect: 'none', retry: 'same_request' } };
        const record = runtime.store.require<StoredExecution>('execution', input.executionId);
        try {
          const inspect = record.executionId.startsWith('native:') ? this.driver.inspectObserved?.bind(this.driver) : this.driver.inspect.bind(this.driver);
          if (!inspect) reject('DISABLED', 'Read-only native observation is unavailable');
          const result = await inspect!(record.binding.hostSessionId, record.messageId);
          this.settle(input.executionId, result, false);
          return this.port.inspect(context, input, options);
        } catch {
          return { ok: false, error: { code: 'OUTCOME_UNKNOWN', message: 'Owned native log could not be reconciled', effect: 'unknown', retry: 'reconcile', operationId: input.executionId } };
        }
      },
    };
  }
  private snapshot(record: StoredExecution): ExecutionSnapshot {
    const activity = this.runtime.store.require<StoredActivity>('activity', record.activityId);
    return { executionId: record.executionId, binding: record.binding, receipt: activity.receipt,
      hostTurnIds: record.hostTurnIds, resultArtifacts: record.resultArtifacts };
  }
  private prepare(input: ExecutionStartRequest): ExecutionSnapshot {
    const { runtime } = this;
    if (!this.driver || this.closing) reject('DISABLED', 'Native execution host is absent or stopping');
    text(input.input, 'execution input');
    const activity = runtime.store.require<StoredActivity>('activity', input.admission.activityId);
    const binding = runtime.store.require<ExecutionBinding>('execution-binding', input.bindingId);
    const previous = runtime.store.all<StoredExecution>('execution').find(x => x.activityId === activity.activityId);
    if (previous) {
      if (previous.requestDigest !== digest(input)) reject('CONFLICT', 'Activity already has another execution intent');
      return this.snapshot(previous);
    }
    revision(activity.receipt.revision, input.admission.revision);
    if (activity.receipt.state !== 'accepted') reject('CONFLICT', 'Activity is not runnable');
    if (activity.proposal.owner !== 'owner' || activity.proposal.capability !== 'core.conversation') reject('DISABLED', 'Only owner conversation is enabled');
    if (activity.proposal.notBefore && Date.parse(activity.proposal.notBefore) > Date.now()) reject('DISABLED', 'Activity is not due');
    if (runtime.store.meta('quiescence')) reject('DISABLED', 'Core admission is quiesced');
    if (input.context.memoryView !== null || input.memoryUse !== null) reject('INELIGIBLE', 'Memory provider is absent');
    // Core projects its own scoped history. Callers cannot inject arbitrary recalled material.
    check(input.context.sections.length === 0 && input.context.sourceIds.length === 0, 'Caller-supplied context requires the Memory view/use protocol');
    integer(input.context.tokenLimit, 'context tokenLimit', 1, 8192);
    check(input.input === activity.proposal.desiredOutcome, 'Execution input must match the admitted immutable input');
    check(!runtime.store.all<StoredExecution>('execution').some(x => x.binding.bindingId === binding.bindingId), 'Native bindings are single-use; Core owns bounded dialogue continuity');
    // Owner capacity is separate from paused/zero autonomous allowances.
    integer(input.allowance.maxSteps, 'maxSteps', 1, runtime.conversation.maxSteps);
    integer(input.allowance.maxDurationMs, 'maxDurationMs', 1, runtime.conversation.maxDurationMs);
    integer(input.allowance.maxToolCalls, 'maxToolCalls', 0, runtime.conversation.maxToolCalls);
    check(Array.isArray(input.allowance.allowedToolIds) && input.allowance.allowedToolIds.every(name => MATTER_TOOLS.includes(name)), 'Only scoped Core matter tools are supported');
    if (runtime.store.all<StoredActivity>('activity').some(x => ['running', 'cancel_requested', 'unknown'].includes(x.receipt.state))) reject('LIMIT_REACHED', 'Another run is active or unresolved');
    const record: StoredExecution = { executionId: id('execution'), activityId: activity.activityId,
      messageId: id('native-input'), requestDigest: digest(input), binding, receipt: activity.receipt, hostTurnIds: [], resultArtifacts: [],
      dialogue: dialogueContext(runtime, activity.inputMessageId) };
    if (!runtime.eligible([...activity.proposal.sourceIds, ...record.dialogue!.sourceIds])) reject('INELIGIBLE', 'Dialogue sources are not eligible');
    // Mark the uncertainty window before calling the native API. Never replay this automatically after restart.
    activity.receipt = { ...activity.receipt, state: 'running', revision: activity.receipt.revision + 1 };
    record.receipt = activity.receipt;
    runtime.store.put('activity', activity.activityId, activity); runtime.store.put('execution', record.executionId, record);
    runtime.store.put('execution-dependencies', record.executionId, [...new Set([...activity.proposal.sourceIds, ...record.dialogue!.sourceIds])]);
    return this.snapshot(record);
  }
  private launch(executionId: string, input: ExecutionStartRequest): void {
    if (this.running.has(executionId) || !this.driver) return;
    const record = this.runtime.store.require<StoredExecution>('execution', executionId);
    const controller = new AbortController();
    const done = this.delivery.send(async () => {
      try {
        const identity = this.runtime.identity();
        const activity = this.runtime.store.require<StoredActivity>('activity', record.activityId);
        const sourceIds = [...new Set([...activity.proposal.sourceIds, ...(record.dialogue?.sourceIds ?? [])])];
        const dependencies = new Set(sourceIds);
        const validate = () => {
          if (!this.runtime.eligible([...dependencies])) reject('INELIGIBLE', 'Dialogue sources are no longer eligible');
          const current = this.runtime.store.require<StoredActivity>('activity', record.activityId);
          if (current.receipt.state !== 'running' || this.runtime.store.meta('quiescence')) reject('DISABLED', 'Execution admission is closed');
          if (this.runtime.identity().revision !== identity.revision) reject('STALE_REVISION', 'Identity changed during execution');
          if (activity.inputMessageId) {
            const message = this.runtime.store.require<ConversationMessage>('conversation', activity.inputMessageId);
            const binding = this.runtime.store.require<ChannelBinding>('binding', message.binding.bindingId);
            if (binding.state !== 'paired' || binding.revision !== message.binding.revision) reject('STALE_BINDING', 'Owner channel binding changed during execution');
          }
        };
        validate();
        const tools = input.allowance.maxToolCalls === 0 ? [] : matterTools(this.runtime, { executionId, sessionId: record.binding.hostSessionId, activityId: record.activityId, sourceIds, dependencies })
          .filter(tool => input.allowance.allowedToolIds.includes(tool.name));
        const result = await this.driver!.run({ sessionId: record.binding.hostSessionId, messageId: record.messageId,
          text: input.input, character: `${identity.displayName}\n${identity.character}`, maxSteps: input.allowance.maxSteps,
          maxDurationMs: input.allowance.maxDurationMs, signal: controller.signal, context: record.dialogue?.text,
          tools, maxToolCalls: input.allowance.maxToolCalls, validate });
        this.settle(executionId, result);
      } catch {
        this.settle(executionId, { state: 'unknown', hostTurnIds: [], text: '', reason: 'Native execution failed across a handoff boundary; reconcile before continuing' });
      }
    }).finally(() => this.running.delete(executionId));
    this.running.set(executionId, { controller, done });
  }
  /** Share the existing owner execution lane with a turn driven by native DSH UI. */
  holdNative(signal: AbortSignal): Promise<() => void> {
    return new Promise((resolve, rejectPromise) => {
      let entered = false;
      const aborted = () => { if (!entered) rejectPromise(new Error('Native admission cancelled')); };
      signal.addEventListener('abort', aborted, { once: true });
      void this.delivery.send(async () => {
        if (signal.aborted) { signal.removeEventListener('abort', aborted); rejectPromise(new Error('Native admission cancelled')); return; }
        entered = true; signal.removeEventListener('abort', aborted);
        await new Promise<void>(release => resolve(release));
      });
    });
  }
  attachNative(activityId: string, sessionId: string, messageId: string, turn: number): string {
    const executionId = `native:${digest([sessionId, turn])}`;
    this.runtime.store.transaction(() => {
      const previous = this.runtime.store.get<StoredExecution>('execution', executionId);
      if (previous) return;
      const activity = this.runtime.store.require<StoredActivity>('activity', activityId);
      const binding: ExecutionBinding = { bindingId: `native-binding:${sessionId}`, hostSessionId: sessionId, purpose: 'owner', revision: 1, memoryContext: null };
      this.runtime.store.put('execution-binding', binding.bindingId, binding);
      this.runtime.store.put('execution', executionId, { executionId, activityId, messageId, requestDigest: digest([sessionId, turn]), binding,
        receipt: activity.receipt, hostTurnIds: [String(turn)], resultArtifacts: [] } satisfies StoredExecution);
    });
    return executionId;
  }
  settleNative(executionId: string, result: NativeRunResult, fresh = true): void { this.settle(executionId, result, fresh); }
  private settle(executionId: string, result: NativeRunResult, publishFresh = true): void {
    const { runtime } = this;
    let freshReply: ConversationMessage | null = null;
    const interruptions: CommitmentProgress[] = [];
    runtime.store.transaction(() => {
      const record = runtime.store.require<StoredExecution>('execution', executionId);
      const activity = runtime.store.require<StoredActivity>('activity', record.activityId);
      if (runtime.isTerminal(activity.receipt.state)) return;
      const sourceIds: string[] = [];
      const roots = [...new Set([...activity.proposal.sourceIds, ...(record.dialogue?.sourceIds ?? []), ...(runtime.store.get<string[]>('execution-dependencies', executionId) ?? []),
        ...runtime.store.all<import('../contracts/core.js').CommitmentProgress>('commitment-progress').filter(p => p.executionId === executionId).flatMap(p => p.sourceIds)])];
      if (result.state === 'completed' && !runtime.eligible(roots)) result = { ...result, state: 'failed', text: '', reason: 'Result withheld because its source dependencies are no longer eligible' };
      if (result.state === 'completed' && result.text) {
        const source: EvidenceSource = { sourceId: `result:${executionId}`, origin: 'model_interpretation', actorId: runtime.config.companionId,
          recordedAt: now(), rootSourceIds: roots, text: result.text };
        runtime.store.put('source', source.sourceId, source); sourceIds.push(source.sourceId);
        if (activity.inputMessageId) {
          const incoming = runtime.store.require<ConversationMessage>('conversation', activity.inputMessageId);
          freshReply = { messageId: `reply:${executionId}`, sourceId: source.sourceId,
            channel: incoming.channel, binding: incoming.binding, sender: 'companion', createdAt: now(),
            visibility: 'available', memoryView: null, parts: [{ kind: 'text', text: result.text }],
            ...(result.hostTurnIds[0] ? { hostTurnId: result.hostTurnIds[0] } : {}) } satisfies ConversationMessage;
          runtime.store.put('conversation', freshReply.messageId, freshReply);
          runtime.store.put('reply-anchor', freshReply.messageId, incoming.messageId);
          const binding = runtime.store.require<ChannelBinding>('binding', incoming.binding.bindingId);
          if (publishFresh && binding.state === 'paired' && binding.revision === incoming.binding.revision) {
            const contact: ContactSnapshot = { intent: { contactId: `contact:${executionId}`, parts: freshReply.parts,
              sourceIds: [source.sourceId], purpose: 'reply', replyToMessageId: incoming.messageId,
              expectedBinding: incoming.binding, memoryView: null }, revision: 1, outcome: { state: 'pending' },
              target: { channel: binding.channel, binding: incoming.binding, transportAccountRef: binding.transportAccountRef,
                transportAccountId: binding.transportAccountId, recipientExternalId: binding.ownerExternalId } };
            runtime.store.put('contact', contact.intent.contactId, contact);
            runtime.store.put('reply-contact', freshReply.messageId, contact.intent.contactId);
            runtime.store.put('contact-boot', contact.intent.contactId, runtime.bootId);
          } else freshReply = null;
        }
      }
      activity.receipt = { operationId: activity.activityId, revision: activity.receipt.revision + 1,
        state: result.state, evidenceSourceIds: sourceIds, ...(result.reason ? { waitingReason: result.reason } : {}) };
      if (result.state !== 'completed') {
        const touched = new Set(runtime.store.all<CommitmentProgress>('commitment-progress').filter(p => p.executionId === executionId).map(p => p.commitmentId));
        for (const commitmentId of touched) {
          const matter = runtime.store.require<Commitment>('commitment', commitmentId);
          if (matter.state === 'completed' || matter.state === 'cancelled') continue;
          matter.state = 'waiting'; matter.waitingReason = result.reason ?? result.state; matter.revision++;
          const progress: CommitmentProgress = { progressId: id('progress'), commitmentId, revision: matter.revision, executionId,
            kind: 'interrupted', summary: matter.waitingReason, sourceIds: roots, recordedAt: now() };
          runtime.store.put('commitment', commitmentId, matter); runtime.store.put('commitment-progress', progress.progressId, progress); interruptions.push(progress);
        }
      }
      record.hostTurnIds = result.hostTurnIds; record.receipt = activity.receipt;
      runtime.store.put('execution', executionId, record); runtime.store.put('activity', activity.activityId, activity);
    });
    if (freshReply) { try { runtime.onFreshReply(freshReply); } catch { /* Presentation is not a delivery receipt. */ } }
    for (const progress of interruptions) { try { runtime.onProgress(progress); } catch { /* Durable progress remains queryable. */ } }
    try { runtime.onChange('execution.settled', { bootId: runtime.bootId, executionId }); } catch { /* Advisory invalidation. */ }
  }
  /** Explicit host wake; input persistence succeeds even when no native host is available. */
  drain(): Promise<void> {
    if (this.closing || !this.driver) return Promise.resolve();
    this.drainRequested = true;
    if (this.drainTask) return this.drainTask;
    this.drainTask = (async () => {
      do { this.drainRequested = false; await this.drainQueue(); }
      while (this.drainRequested && !this.closing);
    })().finally(() => { this.drainTask = null; });
    return this.drainTask;
  }
  private async drainQueue(): Promise<void> {
    try {
      while (!this.closing) {
        const activity = this.runtime.store.all<StoredActivity>('activity').find(x => x.receipt.state === 'accepted' && x.inputMessageId);
        if (!activity) break;
        const client = this.runtime.owner;
        const binding = await this.port.bind(client.request(id('bind-request')), { purpose: 'owner' });
        if (!binding.ok) break;
        const started = await this.port.start(client.request(id('start-request')), {
          admission: { activityId: activity.activityId, revision: activity.receipt.revision }, bindingId: binding.value.bindingId,
          input: activity.proposal.desiredOutcome, allowance: { maxSteps: this.runtime.conversation.maxSteps,
            maxToolCalls: this.runtime.conversation.maxToolCalls, maxDurationMs: this.runtime.conversation.maxDurationMs, allowedToolIds: MATTER_TOOLS },
          context: { projectionId: id('projection'), sourceIds: [], sections: [], tokenLimit: 4096, truncated: false, memoryView: null }, memoryUse: null,
        });
        if (!started.ok) break;
        await this.running.get(started.value.executionId)?.done;
        const current = this.runtime.store.require<StoredActivity>('activity', activity.activityId);
        if (current.receipt.state === 'unknown') break;
      }
    } finally { /* Queue ownership is released by the shared drain task. */ }
  }
  async idle(): Promise<void> { await Promise.all([...this.running.values()].map(x => x.done)); }
  async close(): Promise<void> {
    this.closing = true;
    for (const run of this.running.values()) run.controller.abort();
    await this.drainTask; await this.idle(); await this.driver?.close();
  }
}
