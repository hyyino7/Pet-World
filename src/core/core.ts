import { CONTRACT_VERSION } from '../contracts/version.js';
import type {
  AdmissionRef, CapabilityStatus, ChannelRef, EvidenceSource, ModuleId, OperationReceipt,
  RequestContext, ServiceCall,
} from '../contracts/common.js';
import type {
  ActivitySnapshot, AttentionPolicy, ChannelBinding, Commitment, CompanionIdentity,
  ContactSnapshot, ConversationMessage, CoreService, DeliveryAttempt, DeliveryAttemptReceipt, CommitmentProgress,
} from '../contracts/core.js';
import { conversationOptions, type ConversationOptions } from './options.js';
import { sourceClosure, type HistoryGuard } from './history.js';
import { CoreAuthority, type Principal } from './authority.js';
import { canonical, check, CoreStore, digest, id, integer, now, reject, Rejection, revision, text, timestamp } from './storage.js';

export interface CoreConfig {
  dataDir: string; companionId: string; scopeId: string; ownerActorId: string;
  displayName: string; character: string;
  conversation?: Partial<ConversationOptions>;
  memory?: import('../memory/client.js').MemoryConfig;
}
export type StoredActivity = ActivitySnapshot & { createdAt: string; inputMessageId?: string };
type StoredAttempt = { attempt: DeliveryAttempt; receipt: DeliveryAttemptReceipt | null };
const operation = (operationId: string, state: OperationReceipt['state'] = 'accepted'): OperationReceipt =>
  ({ operationId, state, revision: 1, evidenceSourceIds: [] });
const terminal = (state: OperationReceipt['state']): boolean => ['completed', 'cancelled', 'failed'].includes(state);

export function channel(value: ChannelRef): void {
  check(value && ['desktop', 'qq', 'dsh'].includes(value.kind), 'Invalid channel'); text(value.sceneId, 'sceneId', 256);
}
export function parts(value: readonly import('../contracts/common.js').MessagePart[]): void {
  check(Array.isArray(value) && value.length > 0 && value.length <= 64, 'Invalid message parts');
  for (const part of value) {
    check(part && ['text', 'asset'].includes(part.kind), 'Invalid message part');
    if (part.kind === 'text') text(part.text, 'message text');
    else { text(part.altText, 'asset altText'); text(part.asset.artifactId, 'artifactId', 256); text(part.asset.contentDigest, 'contentDigest', 128); text(part.asset.mediaType, 'mediaType', 128); }
  }
}
export class CoreRuntime {
  readonly store: CoreStore;
  readonly authority: CoreAuthority;
  readonly core: CoreService;
  readonly owner: ReturnType<CoreAuthority['client']>;
  readonly internal: ReturnType<CoreAuthority['client']>;
  readonly bootId = id('boot');
  readonly defaultConversation: Readonly<ConversationOptions>;
  get conversation(): Readonly<ConversationOptions> {
    return this.store.get<import('./preferences.js').CorePreferences>('preferences', 'current')?.conversation ?? this.defaultConversation;
  }
  files?: import('./workspace.js').CoreWorkspace;
  nativeIngress?: { sessionId: string; turn: number; memory?: boolean; life?: boolean; television?: boolean };
  fileEffect = false;
  private historyGuard: HistoryGuard | null = null;
  private stopped = false;
  onChange: (kind: string, value: unknown) => void = () => {};
  onFreshReply: (message: ConversationMessage) => void = () => {};
  onProgress: (progress: CommitmentProgress) => void = () => {};
  onCancel: (activityId: string) => void = () => {};
  capabilities: () => CapabilityStatus[] = () => this.baseCapabilities();

  constructor(readonly config: CoreConfig) {
    this.defaultConversation = conversationOptions(config.conversation);
    for (const key of ['companionId', 'scopeId', 'ownerActorId', 'displayName', 'character'] as const) text(config[key], key);
    this.store = new CoreStore(config.dataDir);
    this.authority = new CoreAuthority(config.companionId, config.scopeId);
    this.owner = this.authority.client({ module: 'core', actor: { kind: 'owner', id: config.ownerActorId }, operations: ['*'] });
    this.internal = this.authority.client({ module: 'core', actor: { kind: 'system', id: 'core-runtime' }, operations: ['*'] });
    try {
      this.store.transaction(() => {
        const identity = this.store.get<CompanionIdentity>('identity', 'current');
        if (identity && (identity.companionId !== config.companionId || identity.ownerActorId !== config.ownerActorId || this.store.meta('scope') !== config.scopeId))
          reject('INCOMPATIBLE', 'Stored identity/scope does not match host configuration');
        if (!identity) {
          this.store.put('identity', 'current', { companionId: config.companionId, revision: 1,
            displayName: config.displayName, character: config.character, ownerActorId: config.ownerActorId });
          this.store.setMeta('scope', config.scopeId);
          this.store.put('policy', 'current', { revision: 1, quiet: false, autonomyPaused: true, proactiveChannel: null,
            autonomousLimits: { maxConcurrentRuns: 1, maxStepsPerRun: 4, maxToolCallsPerRun: 0,
              maxDurationMsPerRun: 60_000, maxDailyRuns: 0, maxDailyTokens: 0, maxDailyContacts: 0 } } satisfies AttentionPolicy);
        }
        // Restart is not proof of completion, cancellation, or delivery failure.
        for (const activity of this.store.all<StoredActivity>('activity')) {
          if (['running', 'cancel_requested'].includes(activity.receipt.state)) {
            activity.receipt = { ...activity.receipt, revision: activity.receipt.revision + 1,
              state: 'unknown', waitingReason: 'Process restarted; reconcile owned native log' };
            this.store.put('activity', activity.activityId, activity);
          } else if (activity.receipt.state === 'accepted' && activity.inputMessageId) {
            activity.receipt = { ...activity.receipt, revision: activity.receipt.revision + 1,
              state: 'waiting', waitingReason: 'Prior-boot input requires owner resubmission or Memory eligibility; it was not replayed' };
            this.store.put('activity', activity.activityId, activity);
          }
        }
        for (const contact of this.store.all<ContactSnapshot>('contact')) {
          if (contact.outcome.state === 'attempting') {
            contact.outcome = { state: 'unknown', attemptId: contact.outcome.attemptId!, reason: 'Process restarted after attempt reservation' };
            contact.revision++; this.store.put('contact', contact.intent.contactId, contact);
          }
        }
      });
      this.core = this.createService();
    } catch (error) { this.store.close(); throw error; }
  }

  /** Trusted host setup only. Never expose this issuer as a tool or network route. */
  connectModule(module: 'desktop' | 'qq' | 'life' | 'memory' | 'bilibili' | 'voice' | 'console') {
    const reads = ['getIdentity', 'getPolicy', 'listCapabilities', 'listConversation', 'getConversationTurn', 'listCommitments', 'listCommitmentProgress'];
    const grants: Record<typeof module, string[]> = {
      desktop: [...reads, 'receiveMessage'], qq: [...reads, 'receiveMessage', 'reportDelivery', 'listDeliveryAttempts'],
      life: [...reads, 'admitActivity', 'getActivity'], memory: ['getSource', 'recordSource'],
      bilibili: ['recordSource'], voice: ['getIdentity'], console: reads,
    };
    return this.authority.client({ module, actor: { kind: 'system', id: `module:${module}` }, operations: grants[module] });
  }
  identity(): CompanionIdentity { return this.store.require('identity', 'current'); }
  policy(): AttentionPolicy { return this.store.require('policy', 'current'); }
  setHistoryGuard(guard: HistoryGuard | null): void {
    if (guard) this.store.setMeta('history.guardRequired', true);
    this.historyGuard = guard;
  }
  historyReady(): boolean { return this.historyGuard !== null || this.store.meta('history.guardRequired') !== true; }
  eligible(sourceIds: readonly string[]): boolean {
    try {
      const roots = sourceClosure(this, sourceIds);
      if (this.historyGuard) return this.historyGuard.inspect(roots) === 'eligible';
      return this.store.meta('history.guardRequired') !== true;
    } catch { return false; }
  }
  visible(message: ConversationMessage): boolean {
    return message.visibility === 'available' && message.memoryView === null && this.eligible([message.sourceId]);
  }
  replyDelivery(messageId: string): string {
    const contactId = this.store.get<string>('reply-contact', messageId);
    return contactId ? this.store.get<ContactSnapshot>('contact', contactId)?.outcome.state ?? 'unknown' : 'not_confirmed';
  }
  view(message: ConversationMessage): ConversationMessage {
    if (this.visible(message)) return message;
    return { messageId: message.messageId, channel: message.channel, binding: message.binding, sender: message.sender,
      sourceId: message.sourceId, createdAt: message.createdAt, visibility: 'withheld', parts: [], memoryView: null,
      reason: this.historyGuard ? 'ineligible' : 'memory_unavailable' };
  }
  receipt = operation;
  isTerminal = terminal;
  call<I, O>(name: string, write: boolean, fn: (input: I, context: RequestContext, principal: Principal) => O,
    ownerOnly = false): ServiceCall<I, O> {
    return async (context, input, options) => {
      this.fileEffect = false;
      try {
        if (this.stopped) reject('DISABLED', 'Core has stopped');
        const principal = ownerOnly ? this.authority.owner(context, name, this.config.ownerActorId) : this.authority.verify(context, name);
        if (options?.signal?.aborted) throw new Rejection({ code: 'CANCELLED', message: 'Call cancelled before admission', effect: 'none', retry: 'never' });
        if (options?.deadline) { timestamp(options.deadline); if (Date.parse(options.deadline) <= Date.now()) throw new Rejection({ code: 'TIMED_OUT', message: 'Call deadline expired', effect: 'none', retry: 'never' }); }
        this.files?.synchronize(name);
        this.fileEffect = false;
        canonical(input);
        check(input !== null && typeof input === 'object' && !Array.isArray(input), 'Expected request object');
        if (write && this.store.meta('quiescence') && !['resumeFromQuiescence', 'cancelActivity', 'execution.interrupt', 'reportDelivery'].includes(name)) reject('DISABLED', 'Core is quiesced; new writes are closed');
        const run = () => {
          const value = fn(input, context, principal);
          if (write) this.store.setMeta('stateRevision', (this.store.meta<number>('stateRevision') ?? 0) + 1);
          return value;
        };
        const result = write ? this.store.mutate(`${principal.module}:${principal.actor.kind}:${principal.actor.id}`, name, context.requestId, input, run) : run();
        // Advisory native observation follows commit; listener failure cannot undo it.
        if (write) { try { this.onChange(name, { bootId: this.bootId, revision: this.store.meta('stateRevision') }); } catch { /* Observers query durable state. */ } }
        if (name === 'cancelActivity') {
          const receipt = result as OperationReceipt;
          if (receipt.state === 'cancel_requested') { try { this.onCancel(receipt.operationId); } catch { /* Native state remains reconcilable. */ } }
        }
        // All handlers are synchronous; no foreign service is awaited inside a transaction.
        return { ok: true, value: structuredClone(result) };
      } catch (error) {
        return { ok: false, error: this.fileEffect ? { code: 'OUTCOME_UNKNOWN', message: 'Workspace file changed; refresh to reconcile the acknowledged state', effect: 'unknown', retry: 'reconcile' } : error instanceof Rejection ? error.detail : error instanceof TypeError
          ? { code: 'INVALID_ARGUMENT', message: 'Malformed request object', effect: 'none', retry: 'never' }
          : { code: 'INTERNAL', message: 'Core operation failed; inspect local diagnostics', effect: 'none', retry: 'never' } };
      }
    };
  }
  issuePairingProof(target: { channel: ChannelRef; transportAccountRef: string; transportAccountId: string; ownerExternalId: string }): string {
    channel(target.channel);
    for (const value of [target.transportAccountRef, target.transportAccountId, target.ownerExternalId]) text(value, 'pairing target', 256);
    const proof = id('pairing');
    this.store.put('pairing', proof, { target, expiresAt: Date.now() + 300_000, used: false });
    return proof;
  }
  evidence(ids: readonly string[]): void {
    check(Array.isArray(ids) && ids.length <= 256, 'Invalid evidence list');
    for (const sourceId of ids) this.store.require('source', sourceId);
  }
  private admit(input: Parameters<CoreService['admitActivity']>[1], context: RequestContext): AdmissionRef {
    text(input.proposalId, 'proposalId', 256); text(input.action, 'action', 256);
    text(input.purpose, 'purpose'); text(input.desiredOutcome, 'desiredOutcome'); text(input.stoppingCondition, 'stoppingCondition');
    check(['owner', 'companion'].includes(input.owner), 'Invalid activity owner'); this.evidence(input.sourceIds);
    if (input.notBefore) timestamp(input.notBefore);
    if (input.commitmentId) this.store.require('commitment', input.commitmentId);
    if (input.owner === 'owner' && context.actor.kind !== 'owner') reject('UNAUTHORIZED', 'Only the owner can propose owner work');
    if (input.owner === 'companion') reject('DISABLED', 'Autonomous execution awaits native token accounting acceptance');
    const status = this.capabilities().find(x => x.id === input.capability);
    if (!status || status.state !== 'ready') reject('DISABLED', `Capability ${input.capability} is not ready`);
    const previous = this.store.get<StoredActivity>('activity', input.proposalId);
    if (previous) {
      if (digest(previous.proposal) !== digest(input)) reject('CONFLICT', 'Proposal ID reused with different proposal');
      return { activityId: previous.activityId, revision: previous.receipt.revision };
    }
    const activity: StoredActivity = { activityId: input.proposalId, proposal: input,
      receipt: operation(input.proposalId), createdAt: now() };
    this.store.put('activity', activity.activityId, activity);
    return { activityId: activity.activityId, revision: 1 };
  }
  private createService(): CoreService {
    return {
      getIdentity: this.call('getIdentity', false, () => this.identity()),
      reviseIdentity: this.call('reviseIdentity', true, input => {
        const value = this.identity(); revision(value.revision, input.expectedRevision);
        text(input.displayName, 'displayName', 256); text(input.character, 'character');
        const result = { ...value, revision: value.revision + 1, displayName: input.displayName, character: input.character };
        this.files?.write('identity', result);
        this.store.put('identity', 'current', result); return result;
      }, true),
      bindChannel: this.call('bindChannel', true, input => {
        channel(input.channel);
        const proof = this.store.require<{ target: unknown; expiresAt: number; used: boolean }>('pairing', input.pairingProofRef);
        const target = { channel: input.channel, transportAccountRef: input.transportAccountRef,
          transportAccountId: input.transportAccountId, ownerExternalId: input.ownerExternalId };
        if (proof.used || proof.expiresAt <= Date.now() || digest(proof.target) !== digest(target)) reject('UNAUTHORIZED', 'Pairing proof does not authorize this exact target');
        const previous = this.store.all<ChannelBinding>('binding').find(x => digest(x.channel) === digest(input.channel));
        if (previous) revision(previous.revision, input.expectedRevision!);
        else check(input.expectedRevision === null, 'New binding requires null revision');
        const value: ChannelBinding = { ...target, ownerActorId: this.config.ownerActorId,
          bindingId: previous?.bindingId ?? id('binding'), revision: (previous?.revision ?? 0) + 1, state: 'paired' };
        this.store.put('binding', value.bindingId, value); this.store.put('pairing', input.pairingProofRef, { ...proof, used: true });
        return value;
      }, true),
      listChannelBindings: this.call('listChannelBindings', false, input => this.store.page(this.store.all<ChannelBinding>('binding'), input), true),
      revokeChannelBinding: this.call('revokeChannelBinding', true, input => {
        const value = this.store.require<ChannelBinding>('binding', input.bindingId); revision(value.revision, input.expectedRevision);
        value.state = 'revoked'; value.revision++; this.store.put('binding', value.bindingId, value); return value;
      }, true),
      receiveMessage: this.call('receiveMessage', true, (input, context, principal) => {
        channel(input.channel); parts(input.parts); text(input.externalMessageId, 'externalMessageId', 256); timestamp(input.receivedAt);
        const binding = this.store.require<ChannelBinding>('binding', input.binding.bindingId);
        if (binding.state !== 'paired' || binding.revision !== input.binding.revision || digest(binding.channel) !== digest(input.channel)) reject('STALE_BINDING', 'Incoming message binding is stale');
        if (input.senderId !== binding.ownerExternalId) reject('UNAUTHORIZED', 'Incoming sender is not the paired owner');
        const module: ModuleId = input.channel.kind === 'dsh' ? 'core' : input.channel.kind;
        if (principal.module !== module) reject('UNAUTHORIZED', 'Wrong channel adapter');
        const key = digest([binding.bindingId, input.externalMessageId]);
        const { receivedAt: _receivedAt, ...immutableEnvelope } = input;
        const previous = this.store.get<{ digest: string; messageId: string; sourceId: string; operation: OperationReceipt }>('incoming', key);
        if (previous) {
          if (previous.digest !== digest(immutableEnvelope)) reject('CONFLICT', 'External message ID reused with different content');
          return { messageId: previous.messageId, sourceId: previous.sourceId, operation: this.store.require<StoredActivity>('activity', previous.operation.operationId).receipt, duplicate: true };
        }
        // The authenticated adapter supplies attribution. Text is never parsed for authority.
        const messageId = id('message'), sourceId = id('source'), activityId = this.nativeIngress ? `native-work:${digest({sessionId:this.nativeIngress.sessionId,turn:this.nativeIngress.turn})}` : id('activity');
        const source: EvidenceSource = { sourceId, origin: this.nativeIngress?.television ? 'external_content' : this.nativeIngress?.life ? 'virtual_action' : 'owner_statement',
          actorId: this.nativeIngress?.television ? 'chatpet-room-tv' : this.nativeIngress?.life ? this.config.companionId : this.config.ownerActorId,
          recordedAt: now(), eventTime: { from: input.receivedAt, precision: 'exact' }, rootSourceIds: [],
          text: input.parts.map(p => p.kind === 'text' ? p.text : p.altText).join('\n') };
        this.store.put('source', sourceId, source);
        if (this.nativeIngress?.memory === false) this.store.put('native-independent-source',sourceId,true);
        if (this.nativeIngress && (this.nativeIngress.memory ?? Boolean(this.config.memory))) this.store.put('memory-source-work', sourceId, {
          sourceId, workspaceId: this.files?.storageId(), state: 'queued', observationId: null,
        });
        this.store.put('conversation', messageId, { messageId, sourceId, channel: input.channel, binding: input.binding,
          sender: this.nativeIngress?.television ? 'room_tv' : 'owner', createdAt: now(), parts: input.parts, memoryView: null, visibility: 'available' } satisfies ConversationMessage);
        const nativePrevious = this.nativeIngress ? this.store.get<StoredActivity>('activity', activityId) : undefined;
        if (nativePrevious && this.isTerminal(nativePrevious.receipt.state)) reject('CONFLICT', 'Native turn already ended');
        const activity: StoredActivity = { activityId, createdAt: nativePrevious?.createdAt ?? now(), inputMessageId: messageId,
          proposal: { proposalId: activityId, owner: 'owner', capability: 'core.conversation', action: 'reply',
            purpose: this.nativeIngress?.television ? 'Comment on a shared television frame' : this.nativeIngress?.life ? 'Continue the companion Life session' : 'Respond to the paired owner', desiredOutcome: source.text, stoppingCondition: 'One native turn settles', sourceIds: [...new Set([...(nativePrevious?.proposal.sourceIds ?? []), sourceId])] },
          receipt: input.parts.some(p => p.kind !== 'text')
            ? { ...operation(activityId, 'waiting'), waitingReason: 'Asset interpretation is not implemented; text input remains available' }
            : this.nativeIngress ? { ...operation(activityId, 'running'), revision: (nativePrevious?.receipt.revision ?? 0) + 1 } : operation(activityId) };
        this.store.put('activity', activityId, activity);
        this.store.put('incoming-envelope', messageId, input);
        const result = { messageId, sourceId, duplicate: false, operation: activity.receipt };
        this.store.put('incoming', key, { ...result, digest: digest(immutableEnvelope) }); return result;
      }),
      listConversation: this.call('listConversation', false, input => {
        if (input.channel) channel(input.channel);
        const values = this.store.all<ConversationMessage>('conversation').filter(x => !input.channel || digest(x.channel) === digest(input.channel)).map(x => this.view(x));
        return this.store.page(values, input);
      }),
      getConversationTurn: this.call('getConversationTurn', false, input => {
        const activity = this.store.require<StoredActivity>('activity', input.activityId);
        if (!this.eligible(activity.proposal.sourceIds)) reject('INELIGIBLE', 'Conversation input is no longer eligible');
        const execution = this.store.all<{ activityId: string; executionId: string }>('execution').find(x => x.activityId === input.activityId);
        const raw = execution ? this.store.get<ConversationMessage>('conversation', `reply:${execution.executionId}`) : undefined;
        const progress = this.store.all<CommitmentProgress>('commitment-progress').filter(x => x.executionId === execution?.executionId && this.eligible(x.sourceIds));
        const ids = new Set(progress.map(x => x.commitmentId));
        const contact = execution ? this.store.get<ContactSnapshot>('contact', `contact:${execution.executionId}`) : undefined;
        return { activity, reply: raw ? this.view(raw) : null, contact: contact && this.eligible(contact.intent.sourceIds) ? contact : null,
          progress, commitments: this.store.all<Commitment>('commitment').filter(x => ids.has(x.commitmentId) && this.eligible([...x.sourceIds, ...x.resultSourceIds])) };
      }),
      recordSource: this.call('recordSource', true, (input, context, principal) => {
        text(input.sourceId, 'sourceId', 256); text(input.text, 'source text'); timestamp(input.recordedAt);
        check(['owner_statement', 'external_content', 'model_interpretation', 'virtual_action', 'external_action'].includes(input.origin), 'Invalid source origin');
        if (input.origin === 'owner_statement' && (context.actor.kind !== 'owner' || input.actorId !== this.config.ownerActorId)) reject('UNAUTHORIZED', 'Owner statements require trusted owner attribution');
        if (input.origin !== 'owner_statement' && input.actorId !== principal.actor.id) reject('UNAUTHORIZED', 'Source actor must match caller');
        this.evidence(input.rootSourceIds);
        const previous = this.store.get<EvidenceSource>('source', input.sourceId);
        if (previous && digest(previous) !== digest(input)) reject('CONFLICT', 'Evidence sources are immutable');
        this.store.put('source', input.sourceId, input); return { sourceId: input.sourceId, duplicate: !!previous };
      }),
      getSource: this.call('getSource', false, (input, context, principal) => {
        if (input.purpose === 'owner_audit') this.authority.owner(context, 'getSource', this.config.ownerActorId);
        else if (input.purpose !== 'memory_processing' || principal.module !== 'memory') reject('UNAUTHORIZED', 'Raw sources are available only to owner audit or the Memory processor');
        return this.store.require<EvidenceSource>('source', input.sourceId);
      }),
      createCommitment: this.call('createCommitment', true, input => {
        text(input.requestedOutcome, 'requestedOutcome'); this.evidence(input.sourceIds); if (input.dueAt) timestamp(input.dueAt);
        const value: Commitment = { commitmentId: id('commitment'), revision: 1, requestedOutcome: input.requestedOutcome,
          sourceIds: input.sourceIds, state: 'open', nextAction: null, waitingReason: null, resultSourceIds: [], ...(input.dueAt ? { dueAt: input.dueAt } : {}) };
        this.store.put('commitment', value.commitmentId, value); return value;
      }, true),
      reviseCommitment: this.call('reviseCommitment', true, input => {
        const value = this.store.require<Commitment>('commitment', input.commitmentId); revision(value.revision, input.expectedRevision);
        check(['open', 'in_progress', 'waiting', 'completed', 'cancelled'].includes(input.state), 'Invalid commitment state');
        for (const [label, field] of Object.entries({ requestedOutcome: input.requestedOutcome, nextAction: input.nextAction, waitingReason: input.waitingReason })) if (field !== undefined && field !== null) text(field, label);
        if (input.dueAt) timestamp(input.dueAt); this.evidence(input.resultSourceIds);
        if (input.state === 'completed') check(input.resultSourceIds.length > 0, 'Completion needs result evidence');
        if (input.state === 'waiting') text(input.waitingReason, 'waitingReason');
        const result: Commitment = { ...value, revision: value.revision + 1, state: input.state, nextAction: input.nextAction,
          waitingReason: input.waitingReason, resultSourceIds: input.resultSourceIds,
          ...(input.requestedOutcome ? { requestedOutcome: input.requestedOutcome } : {}) };
        if (input.dueAt === null) delete result.dueAt; else if (input.dueAt) result.dueAt = input.dueAt;
        this.store.put('commitment', result.commitmentId, result); return result;
      }, true),
      listCommitments: this.call('listCommitments', false, input => this.store.page(this.store.all<Commitment>('commitment').filter(x => !input.state || x.state === input.state), input)),
      listCommitmentProgress: this.call('listCommitmentProgress', false, input => {
        this.store.require('commitment', input.commitmentId);
        return this.store.page(this.store.all<CommitmentProgress>('commitment-progress').filter(x => x.commitmentId === input.commitmentId), input);
      }),
      admitActivity: this.call('admitActivity', true, (input, context) => this.admit(input, context)),
      getActivity: this.call('getActivity', false, input => {
        const activity = this.store.require<StoredActivity>('activity', input.activityId);
        if (!this.eligible(activity.proposal.sourceIds)) reject('INELIGIBLE', 'Activity input is no longer eligible');
        return activity;
      }),
      cancelActivity: this.call('cancelActivity', true, input => {
        const value = this.store.require<StoredActivity>('activity', input.activityId); revision(value.receipt.revision, input.expectedRevision); text(input.reason, 'reason');
        if (terminal(value.receipt.state)) return value.receipt;
        value.receipt = { ...value.receipt, revision: value.receipt.revision + 1,
          state: value.receipt.state === 'accepted' || value.receipt.state === 'waiting' ? 'cancelled' : 'cancel_requested', waitingReason: input.reason };
        this.store.put('activity', value.activityId, value);
        return value.receipt;
      }, true),
      reportActivity: this.call('reportActivity', true, (input, _context, principal) => {
        if (principal.module !== 'core') reject('UNAUTHORIZED', 'Only Core execution can settle activity');
        const value = this.store.require<StoredActivity>('activity', input.admission.activityId);
        revision(value.receipt.revision, input.admission.revision);
        reject('DISABLED', 'Native execution settles its own receipts; client reports are not evidence');
      }),
      requestContact: this.call('requestContact', true, (input, _context, principal) => {
        if (principal.module !== 'core') reject('UNAUTHORIZED', 'Only Core can create contact intent');
        text(input.contactId, 'contactId', 256); parts(input.parts); this.evidence(input.sourceIds);
        if (!this.eligible(input.sourceIds)) reject('INELIGIBLE', 'Contact sources are not eligible');
        if (input.memoryView !== null) reject('INELIGIBLE', 'Memory provider is not bound');
        if (input.purpose !== 'reply') reject('DISABLED', 'Proactive contact is not enabled');
        text(input.replyToMessageId, 'replyToMessageId', 256);
        const message = this.store.require<ConversationMessage>('conversation', input.replyToMessageId);
        check(message.sender === 'owner', 'Reply must target an incoming owner message');
        const binding = this.store.require<ChannelBinding>('binding', message.binding.bindingId);
        if (binding.state !== 'paired' || binding.revision !== message.binding.revision) reject('STALE_BINDING', 'Reply binding has changed');
        if (input.expectedBinding && digest(input.expectedBinding) !== digest(message.binding)) reject('STALE_BINDING', 'Reply expected binding differs');
        if (input.preferredChannel && digest(input.preferredChannel) !== digest(message.channel)) reject('STALE_BINDING', 'A reply cannot migrate channels');
        if (input.expiresAt) { timestamp(input.expiresAt); check(Date.parse(input.expiresAt) > Date.now(), 'Contact already expired'); }
        const previous = this.store.get<ContactSnapshot>('contact', input.contactId);
        if (previous) { if (digest(previous.intent) !== digest(input)) reject('CONFLICT', 'Contact ID reused'); return previous; }
        const result: ContactSnapshot = { intent: input, revision: 1, target: { channel: binding.channel,
          binding: { bindingId: binding.bindingId, revision: binding.revision }, transportAccountRef: binding.transportAccountRef,
          transportAccountId: binding.transportAccountId, recipientExternalId: binding.ownerExternalId }, outcome: { state: 'pending' } };
        this.store.put('contact', input.contactId, result); this.store.put('contact-boot', input.contactId, this.bootId); return result;
      }),
      getContact: this.call('getContact', false, input => {
        const contact = this.store.require<ContactSnapshot>('contact', input.contactId);
        if (!this.eligible(contact.intent.sourceIds)) reject('INELIGIBLE', 'Contact material is no longer eligible');
        return contact;
      }, true),
      prepareDeliveryAttempt: this.call('prepareDeliveryAttempt', true, input => {
        const value = this.store.require<ContactSnapshot>('contact', input.contactId); revision(value.revision, input.expectedRevision);
        if (!this.eligible(value.intent.sourceIds)) reject('INELIGIBLE', 'Contact source eligibility changed');
        if (this.store.get('contact-boot', input.contactId) !== this.bootId) reject('INELIGIBLE', 'Prior-boot reply material needs Memory eligibility before new delivery');
        if (value.outcome.state !== 'pending') reject('CONFLICT', 'Contact already has an attempt; reconcile its outcome');
        if (value.intent.expiresAt && Date.parse(value.intent.expiresAt) <= Date.now()) reject('DISABLED', 'Contact expired');
        check(value.target !== null, 'No delivery target');
        const current = this.store.require<ChannelBinding>('binding', value.target.binding.bindingId);
        if (current.state !== 'paired' || current.revision !== value.target.binding.revision) reject('STALE_BINDING', 'Frozen target has changed; no reroute allowed');
        const envelope = value.intent.replyToMessageId ? this.store.get<Parameters<CoreService['receiveMessage']>[1]>('incoming-envelope', value.intent.replyToMessageId) : undefined;
        const attempt: DeliveryAttempt = { contactId: input.contactId, attemptId: id('attempt'), target: value.target,
          createdAt: now(), parts: value.intent.parts, memoryView: value.intent.memoryView,
          ...(envelope ? { replyToExternalMessageId: envelope.externalMessageId } : {}) };
        value.outcome = { state: 'attempting', attemptId: attempt.attemptId }; value.revision++;
        this.store.put('attempt', attempt.attemptId, { attempt, receipt: null } satisfies StoredAttempt);
        this.store.put('contact', input.contactId, value); return { attempt, contactRevision: value.revision };
      }, true),
      listDeliveryAttempts: this.call('listDeliveryAttempts', false, (input, _context, principal) => {
        const values = this.store.all<StoredAttempt>('attempt').filter(x => x.attempt.contactId === input.contactId);
        if (principal.module !== 'core' && values.some(x => x.attempt.target.channel.kind !== principal.module)) reject('UNAUTHORIZED', 'Wrong transport');
        return this.store.page(values, input);
      }),
      reportDelivery: this.call('reportDelivery', true, (input, _context, principal) => {
        const record = this.store.require<StoredAttempt>('attempt', input.receipt.attemptId);
        if (principal.module !== 'core' && principal.module !== record.attempt.target.channel.kind) reject('UNAUTHORIZED', 'Wrong transport reporter');
        const value = this.store.require<ContactSnapshot>('contact', input.receipt.contactId); revision(value.revision, input.expectedRevision);
        if (record.attempt.contactId !== input.receipt.contactId || digest(record.attempt.target) !== digest(input.receipt.target)) reject('STALE_BINDING', 'Receipt must refer to the original frozen attempt target');
        check(['gateway_confirmed', 'failed', 'unknown'].includes(input.receipt.outcome.state), 'Invalid final delivery outcome');
        check(input.receipt.outcome.attemptId === record.attempt.attemptId, 'Outcome attempt mismatch');
        if (input.receipt.outcome.state === 'gateway_confirmed') text(input.receipt.outcome.externalMessageId, 'gateway message ID', 256);
        else if (input.receipt.outcome.state === 'failed' || input.receipt.outcome.state === 'unknown') text(input.receipt.outcome.reason, 'delivery reason');
        if (record.receipt && record.receipt.outcome.state !== 'unknown' && digest(record.receipt) !== digest(input.receipt)) reject('CONFLICT', 'A terminal transport receipt cannot be rewritten');
        value.outcome = input.receipt.outcome; value.revision++;
        this.store.put('attempt', record.attempt.attemptId, { ...record, receipt: input.receipt });
        this.store.put('contact', value.intent.contactId, value); return value;
      }),
      getPolicy: this.call('getPolicy', false, () => this.policy()),
      setPolicy: this.call('setPolicy', true, input => {
        const current = this.policy(); revision(current.revision, input.expectedRevision);
        check(typeof input.quiet === 'boolean' && typeof input.autonomyPaused === 'boolean', 'Invalid policy flags');
        if (!input.autonomyPaused || input.proactiveChannel !== null) reject('DISABLED', 'Autonomy and proactive routing await acceptance');
        const limits = input.autonomousLimits;
        for (const [key, value] of Object.entries(limits)) integer(value, key, 0, 100_000_000);
        for (const key of Object.keys(current.autonomousLimits)) check(Object.hasOwn(limits, key), `Missing limit ${key}`);
        check(limits.maxConcurrentRuns <= 1 && limits.maxStepsPerRun <= 16 && limits.maxToolCallsPerRun <= 32 && limits.maxDurationMsPerRun <= 300_000, 'Limits exceed Core safety envelope');
        const result: AttentionPolicy = { revision: current.revision + 1, quiet: input.quiet, autonomyPaused: true, proactiveChannel: null, autonomousLimits: limits };
        this.files?.write('policy', result);
        this.store.put('policy', 'current', result); return result;
      }, true),
      listCapabilities: this.call('listCapabilities', false, () => this.capabilities()),
    };
  }
  baseCapabilities(): CapabilityStatus[] {
    const ready = (name: CapabilityStatus['id'], operations: string[]): CapabilityStatus => ({ id: name, owner: 'core', contractVersion: CONTRACT_VERSION, state: 'ready', reason: null, supportedOperations: operations });
    const absent: [CapabilityStatus['id'], ModuleId][] = [['memory.lifecycle', 'memory'], ['life.pursuits', 'life'], ['desktop.presentation', 'desktop'], ['desktop.body', 'desktop'], ['desktop.room', 'desktop'], ['channel.qq', 'qq'], ['content.bilibili', 'bilibili'], ['voice.speech', 'voice'], ['console.operations', 'console']];
    return [ready('core.commitments', ['createCommitment', 'reviseCommitment', 'listCommitments']),
      ready('core.activities', ['admitActivity', 'getActivity', 'cancelActivity']),
      { id: 'core.conversation', owner: 'core', contractVersion: CONTRACT_VERSION, state: 'degraded', reason: 'No native execution host bound', supportedOperations: ['receiveMessage', 'listConversation'] },
      ready('core.delivery', ['requestContact', 'prepareDeliveryAttempt', 'reportDelivery']),
      ...absent.map(([name, owner]): CapabilityStatus => ({ id: name, owner, contractVersion: CONTRACT_VERSION, state: 'not_implemented', reason: 'Provider not implemented or activated', supportedOperations: [] }))];
  }
  close(): void { if (!this.stopped) { this.stopped = true; this.store.close(); } }
}
