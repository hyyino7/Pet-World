import type { CoreRuntime, StoredActivity } from './core.js';
import type { CoreExecution, NativeRunResult } from './execution.js';
import type { ChannelBinding } from '../contracts/core.js';
import type { EvidenceSource, Result } from '../contracts/common.js';
import type { UserMessage } from '@deepseek-ai/dsh-session';
import { matterTools } from './matters.js';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import { canonical, check, digest, id, now, reject, Rejection } from './storage.js';

interface Work {
  sessionId: string; turn: number; executionId: string; activityId: string; messageId: string;
  release(): void; dependencies: Set<string>; identityRevision: number; steps: number; toolCalls: number;
  timer: ReturnType<typeof setTimeout>; cancel(): void; inspect(): Promise<NativeRunResult>;
}
const unwrap = <T>(result: Result<T>): T => { if (!result.ok) throw new Rejection(result.error); return result.value; };
/** Observe and govern the existing native Agent. Never creates or submits a second model turn. */
export class CoreNative {
  private readonly active = new Map<string, Work>();
  private closing = false;
  constructor(readonly runtime: CoreRuntime, readonly execution: CoreExecution) {
    const cancel = runtime.onCancel;
    runtime.onCancel = activityId => { cancel(activityId); for (const work of this.active.values()) if (work.activityId === activityId) work.cancel(); };
  }
  manages(sessionId: string): boolean { return this.active.has(sessionId); }
  historyEligible(sessionId: string): boolean {
    const history = this.runtime.store.get<string[]>('native-history', sessionId);
    return !history || this.runtime.historyReady() && this.runtime.eligible(history);
  }
  async begin(sessionId: string, turn: number, messages: readonly UserMessage[], signal: AbortSignal,
    lifecycle: { cancel(): void; inspect(): Promise<NativeRunResult> }): Promise<void> {
    check(!this.closing, 'Core is stopping');
    this.runtime.files?.synchronize('native.begin');
    check(this.runtime.files?.status().state === 'ready', 'Initialize and bind the Chatpet workspace first');
    const history = this.runtime.store.get<string[]>('native-history', sessionId) ?? [];
    check(this.historyEligible(sessionId), 'Native history is no longer eligible; open a fresh scoped session');
    let work = this.active.get(sessionId);
    check(!work || work.turn === turn, 'Previous native turn has not settled');
    const inputs = messages.filter(message => message.role === 'user' && message.source.kind === 'user');
    if (!work && inputs.length === 0) reject('DISABLED', 'Native background work requires explicit Core admission');
    let release: (() => void) | undefined;
    if (!work) release = await this.execution.holdNative(signal);
    try {
      if (signal.aborted) throw new Rejection({ code: 'CANCELLED', message: 'Native admission cancelled', effect: 'none', retry: 'never' });
      const unknown = this.runtime.store.all<StoredActivity>('activity').find(activity => activity.activityId.startsWith('native-work:') && activity.receipt.state === 'unknown');
      if (unknown) throw new Rejection({ code: 'OUTCOME_UNKNOWN', message: 'Reconcile the previous native turn before starting another', effect: 'unknown', retry: 'reconcile', operationId: unknown.activityId });
      const target = { channel: { kind: 'dsh' as const, sceneId: sessionId }, transportAccountRef: 'dsh.native', transportAccountId: sessionId, ownerExternalId: this.runtime.config.ownerActorId };
      let binding = this.runtime.store.all<ChannelBinding>('binding').find(value => value.channel.kind === 'dsh' && value.channel.sceneId === sessionId);
      if (!binding) binding = unwrap(await this.runtime.core.bindChannel(this.runtime.owner.request(id('native-pair')), { ...target, expectedRevision: null, pairingProofRef: this.runtime.issuePairingProof(target) }));
      check(binding.state === 'paired', 'Native channel binding was revoked');
      for (const message of inputs) {
        this.runtime.nativeIngress = { sessionId, turn };
        let pending: ReturnType<typeof this.runtime.core.receiveMessage>;
        try {
          pending = this.runtime.core.receiveMessage(this.runtime.owner.request(id('native-input')),  {
            channel: target.channel, binding: { bindingId: binding.bindingId, revision: binding.revision }, externalMessageId: message.id,
            senderId: this.runtime.config.ownerActorId, receivedAt: now(), parts: message.content.map(part => part.type === 'text'
              ? { kind: 'text' as const, text: part.text } : { kind: 'text' as const, text: '[Native attachment; its original bytes remain in the DSH session]' }),
          }, { signal });
        } finally { this.runtime.nativeIngress = undefined; }
        const accepted = unwrap(await pending!);
        if (!work) {
          const executionId = this.execution.attachNative(accepted.operation.operationId, sessionId, message.id, turn);
          work = { sessionId, turn, executionId, activityId: accepted.operation.operationId, messageId: message.id, release: release!,
            dependencies: new Set(history), identityRevision: this.runtime.identity().revision, steps: 0, toolCalls: 0,
            timer: setTimeout(lifecycle.cancel, this.runtime.conversation.maxDurationMs), ...lifecycle };
          this.active.set(sessionId, work); release = undefined;
        }
        work.dependencies.add(accepted.sourceId);
        this.runtime.store.put('native-history', sessionId, [...work.dependencies]);
      }
      check(work, 'Native turn has no accepted owner input');
      if (++work!.steps > this.runtime.conversation.maxSteps) reject('DISABLED', 'Core model-step limit reached');
      this.validate(sessionId);
    } catch (error) { release?.(); throw error; }
  }
  validate(sessionId: string): void {
    const work = this.active.get(sessionId); check(work, 'Native turn is not admitted');
    this.runtime.files?.synchronize('native.validate');
    check(this.runtime.files?.status().state === 'ready', 'Managed workspace is unavailable');
    check(!this.runtime.store.meta('quiescence') && this.runtime.identity().revision === work!.identityRevision, 'Identity or admission changed');
    const activity = this.runtime.store.require<StoredActivity>('activity', work!.activityId);
    check(activity.receipt.state === 'running', 'Native activity stopped');
    check(this.runtime.eligible([...work!.dependencies]), 'Native execution sources are ineligible');
  }
  guardTool(sessionId: string): void {
    this.validate(sessionId); const work = this.active.get(sessionId)!;
    if (++work.toolCalls > this.runtime.conversation.maxToolCalls) reject('DISABLED', 'Core tool-call limit reached');
  }
  tools(sessionId?: string): ToolDefinition[] {
    const template = matterTools(this.runtime, { executionId: '', activityId: '', sessionId: sessionId ?? '', sourceIds: [] });
    return template.map(tool => ({ ...tool, execute: async (args, exec) => {
      const actualSession = sessionId ?? exec.agent?.id;
      check(actualSession, 'Matter tools require an admitted native agent');
      this.validate(actualSession!); const work = this.active.get(actualSession!)!;
      const actual = matterTools(this.runtime, { executionId: work.executionId, activityId: work.activityId, sessionId: actualSession!,
        sourceIds: [...work.dependencies], dependencies: work.dependencies }).find(value => value.name === tool.name)!;
      return actual.execute(args, exec);
    } }));
  }
  observeTool(sessionId: string, eventId: string, body: unknown): void {
    const work = this.active.get(sessionId); if (!work) return;
    const sourceId = `native-tool:${digest([sessionId, eventId])}`;
    const source: EvidenceSource = { sourceId, origin: 'external_content', actorId: this.runtime.config.companionId,
      recordedAt: now(), locator: `dsh:${sessionId}:${eventId}`, rootSourceIds: this.runtime.store.require<StoredActivity>('activity', work.activityId).proposal.sourceIds,
      text: canonical(body).slice(0, this.runtime.conversation.maxContextChars) };
    this.runtime.store.put('source', sourceId, source); work.dependencies.add(sourceId);
    this.runtime.store.put('execution-dependencies', work.executionId, [...work.dependencies]);
    this.runtime.store.put('native-history', sessionId, [...work.dependencies]);
  }
  context(): { identity: string; user: string } {
    this.runtime.files?.synchronize('native.context');
    check(this.runtime.files?.status().state === 'ready', 'Chatpet workspace is not ready');
    const identity = this.runtime.identity(), user = this.runtime.store.get<{ text: string }>('profile', 'current')?.text ?? '';
    const budget = this.runtime.conversation.maxContextChars;
    const profile = `${identity.displayName}\n${identity.character}`;
    check(profile.length + user.length <= budget, 'Profile exceeds Core context budget; shorten the managed files or increase the limit');
    return { identity: profile, user };
  }
  finish(sessionId: string, result: NativeRunResult): void {
    const work = this.active.get(sessionId); if (!work) return;
    try { this.execution.settleNative(work.executionId, result); }
    finally { clearTimeout(work.timer); this.active.delete(sessionId); work.release(); }
  }
  async end(sessionId: string): Promise<void> { const work = this.active.get(sessionId); if (work) this.finish(sessionId, await work.inspect()); }
  async close(): Promise<void> {
    this.closing = true;
    for (const work of this.active.values()) work.cancel();
    await Promise.all([...this.active.values()].map(work => this.end(work.sessionId)));
  }
}
