import type { CoreRuntime } from './core.js';
import type { EvidenceSource } from '../contracts/common.js';
import { MemoryConnection, type Dependencies, type MemoryConfig, type RecalledMemory, type Decision } from '../memory/client.js';
import { canonical, check, digest, reject } from './storage.js';
import { sourceClosure } from './history.js';
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import type { ChannelBinding } from '../contracts/core.js';
import { finalReply } from './upstream/messages.js';
import { readReviewDialogue, type DialogueQuery } from '../life/review-dialogue.js';

/** Core-owned durable acknowledgement/source join. Provider owns all decisions. */
export class NativeMemory {
  readonly connection: MemoryConnection;
  private readonly decisions = new Map<string, Decision>();
  private readonly contextBySession = new Map<string, string>();
  constructor(readonly runtime: CoreRuntime, config: MemoryConfig) {
    this.connection = new MemoryConnection(config);
    runtime.setHistoryGuard({ inspect: ids => ids.every(id => this.decisions.get(id) === 'eligible' || runtime.store.get<boolean>('native-independent-source',id) === true) ? 'eligible' : 'unknown' });
  }
  context(sessionId: string): string { return this.contextBySession.get(sessionId) ?? ''; }
  private connect(workspace: { id: string; path: string }): Promise<void> {
    const owner = this.runtime.store.meta<{ id: string; path: string }>('memory-configured-directory-owner');
    if (!owner) this.runtime.store.setMeta('memory-configured-directory-owner', { id: this.runtime.files!.storageId(), path: workspace.path });
    // The explicit directory can be a legacy Bank below the original workspace.
    // Binding an ancestor of that workspace must never select the descendant's Bank.
    return this.connection.start({ companionId: this.runtime.config.companionId, scopeId: this.runtime.config.scopeId, workspaceId: this.runtime.files!.storageId() },
      workspace.path, !owner || owner.id === this.runtime.files!.storageId());
  }
  private async ownerBank(workspaceId: string) {
    const files = this.runtime.files;
    const bound = files?.status();
    if (!files || bound?.state !== 'ready' || bound.target?.id !== workspaceId)
      reject('STALE_BINDING', 'Open the archive in the current workspace');
    const bankId = files.storageId();
    const settings = files.companionSettings();
    await this.connect(bound.target);
    return { bankId, settings };
  }
  /** Owner archive reads use the same Bank and eligibility rules as chat.
   * Browsing has no chat session and does not record conversation dependencies. */
  async findForOwner(workspaceId: string, query: string) {
    const { bankId, settings } = await this.ownerBank(workspaceId);
    const limit = settings.memoryRecallCount;
    const { records } = await this.connection.call<{ records: RecalledMemory[] }>('recall', { query, limit }, bankId);
    const dependencies = { sources: records.flatMap(row => row.dependencies.sources),
      memories: records.flatMap(row => row.dependencies.memories) };
    if (records.length && await this.connection.validate(dependencies, bankId) !== 'eligible')
      reject('INELIGIBLE', 'Archive results changed during retrieval');
    return { items: records.map(({ memory }) => ({
      id: memory.id, excerpt: memory.content.slice(0, settings.memoryRecallBlockChars),
    })), limit };
  }
  async readForOwner(workspaceId: string, memoryId: string) {
    const { bankId } = await this.ownerBank(workspaceId);
    const row = await this.connection.call<RecalledMemory>('read', { memory_id: memoryId }, bankId);
    if (await this.connection.validate(row.dependencies, bankId) !== 'eligible')
      reject('INELIGIBLE', 'This archive record is no longer available');
    return { id: row.memory.id, content: row.memory.content, dialogue: (row.conversation ?? []).map(({ role, text }) => ({
      role: role === 'user_statement' ? 'user' : role === 'agent_inference' ? 'assistant' : 'source', text,
    })) };
  }
  async dialogueForDay(workspaceId: string, sessionIds: readonly string[], input: DialogueQuery) {
    const { bankId } = await this.ownerBank(workspaceId);
    const page = await readReviewDialogue(this.runtime, bankId, sessionIds, input,
      ids => this.connection.validate({sources: ids.map(id => ({id, revision: '1'})), memories: []}, bankId),
      ids => { this.checkBank(workspaceId, bankId); return this.capture(ids); });
    this.checkBank(workspaceId, bankId);
    return page;
  }
  private checkBank(workspaceId: string, bankId: string): void {
    const files = this.runtime.files, bound = files?.status();
    if (bound?.state !== 'ready' || bound.target?.id !== workspaceId || files?.storageId() !== bankId)
      reject('STALE_BINDING', 'The conversation workspace changed');
  }
  async sourcesForWriting(workspaceId: string, ids: string[]): Promise<Decision> {
    const { bankId } = await this.ownerBank(workspaceId);
    const sources = ids.map(id => ({id, revision: this.runtime.store.get<{revision: string}>('memory-provider-source', id)?.revision ?? '1'}));
    const decision = await this.connection.validate({sources, memories: []}, bankId);
    this.checkBank(workspaceId, bankId);
    return decision;
  }
  private async materialize(sources: Dependencies['sources']): Promise<void> {
    const missing = sources.filter(source => !this.runtime.store.get('source', source.id));
    const excerpts = await this.connection.call<{ sourceId: string; revision: string; observationId: string; text: string; actorId: string }[]>('materialize', { sources: missing });
    for (const excerpt of excerpts) {
      const existing = this.runtime.store.get<EvidenceSource>('source', excerpt.sourceId);
      check(!existing || existing.text === excerpt.text, 'Provider source identity changed content');
      // This is validated provider-owned source text, not an independently authored
      // source/version. Its full evidence ancestry stays with the Memory port.
      if (!existing) this.runtime.store.put('source', excerpt.sourceId, { sourceId: excerpt.sourceId,
        text: excerpt.text, actorId: excerpt.actorId, recordedAt: new Date().toISOString(),
        origin: 'external_content', rootSourceIds: [] } satisfies EvidenceSource);
      this.runtime.store.put('memory-provider-source', excerpt.sourceId, { revision: excerpt.revision });
      this.runtime.store.put('memory-ack', excerpt.sourceId, { sourceId: excerpt.sourceId, observationId: excerpt.observationId });
    }
  }
  private async contextFor(query: string, reserve = 0, includeRecent = false, excludeSources: string[] = [], excludeMemories: string[] = []) {
    const identity = this.runtime.identity();
    const user = this.runtime.store.get<{ text: string }>('profile', 'current')?.text ?? '';
    const allowance = this.runtime.conversation.maxContextChars - identity.displayName.length - identity.character.length - user.length - reserve;
    check(allowance > 0, 'No Memory context allowance remains');
    const context = await this.connection.call<{ records: RecalledMemory[]; text: string }>('context', {
      query, max_chars: allowance, limit: this.runtime.files!.companionSettings().memoryRecallCount, include_recent: includeRecent,
      exclude_sources: excludeSources, exclude_memories:excludeMemories, block_chars: this.runtime.files!.companionSettings().memoryRecallBlockChars,
    });
    // The original provider packs its own candidates. This is only the Core's
    // exact JavaScript character boundary, not another selection/budget engine.
    check(context.text.length <= allowance, 'Provider Memory context exceeds the configured character allowance');
    return context;
  }
  async reconstruction(sourceIds: string[], reserve: number): Promise<{ text: string; sources: string[]; view: Dependencies }> {
    check(await this.connection.validate({ sources: [], memories: [] }) === 'eligible', 'Memory unavailable; cannot rebuild native context');
    await this.capture(sourceIds);
    check(await this.connection.validate({ sources: sourceIds.map(id => ({ id, revision: '1' })), memories: [] }) === 'eligible', 'Current input is not eligible for context reconstruction');
    const query = sourceIds.map(id => this.runtime.store.require<EvidenceSource>('source', id).text).join('\n');
    const projected = await this.contextFor(query, reserve, true);
    const view = { sources: projected.records.flatMap(record => record.dependencies.sources), memories: projected.records.flatMap(record => record.dependencies.memories) };
    check(await this.connection.validate(view) === 'eligible', 'Reconstructed Memory view is not eligible');
    await this.materialize(view.sources);
    const closure = sourceClosure(this.runtime, [...sourceIds, ...view.sources.map(source => source.id)]);
    await this.capture(closure);
    return { text: projected.text, sources: closure, view };
  }
  commitReconstruction(sessionId: string, rebuilt: { text: string; sources: string[]; view: Dependencies }): void {
    this.runtime.store.put('native-history', sessionId, rebuilt.sources);
    this.runtime.store.put('native-memory-view', sessionId, rebuilt.view);
    this.contextBySession.set(sessionId, rebuilt.text);
  }
  async capture(sourceIds: readonly string[]): Promise<void> {
    const workspaceId = this.runtime.files?.storageId();
    for (const sourceId of sourceIds) {
      const provider = this.runtime.store.get<{ revision: string }>('memory-provider-source', sourceId);
      if (provider) {
        this.decisions.set(sourceId, await this.connection.validate({ sources: [{ id: sourceId, revision: provider.revision }], memories: [] }));
        continue;
      }
      if (this.runtime.store.get('memory-ack', sourceId)) {
        // A durable acknowledgement already joins this exact immutable source.
        // Revalidate it through the provider; replaying observe here would
        // re-run consolidation and mutate a just-recalled episode's version.
        this.decisions.set(sourceId, await this.connection.validate({ sources: [{ id: sourceId, revision: '1' }], memories: [] }));
        continue;
      }
      const work = this.runtime.store.get<{ workspaceId: string }>('memory-source-work', sourceId);
      if (!work || work.workspaceId !== workspaceId) {
        // Enabling Memory must not silently backfill pre-install personal logs.
        // Legacy raw context is preserved, but requires clean reconstruction.
        this.decisions.set(sourceId, 'unknown');
        continue;
      }
      const source = this.runtime.store.require<EvidenceSource>('source', sourceId);
      // The source itself is durable pending work until this ack is persisted.
      // Replays after either side restarts use the same provider source key.
      const ack = await this.connection.call<{ observationId: string; decision: Decision }>('observe', {
        source_id: sourceId, revision: '1', content: source.text, actor_id: source.actorId,
        source_kind: source.origin === 'owner_statement' ? 'user_statement' : source.origin === 'model_interpretation' ? 'agent_inference' : 'system',
        conversation_context: source.origin === 'model_interpretation' || source.origin === 'owner_statement',
        roots: source.rootSourceIds.map(id => ({ id, revision: '1' })),
      });
      this.runtime.store.put('memory-ack', sourceId, { sourceId, observationId: ack.observationId });
      const pending = this.runtime.store.get<Record<string, unknown>>('memory-source-work', sourceId);
      if (pending) this.runtime.store.put('memory-source-work', sourceId, { ...pending, state: 'acknowledged', observationId: ack.observationId });
      this.decisions.set(sourceId, ack.decision);
    }
  }
  async prepare(sessionId: string): Promise<void> {
    this.contextBySession.delete(sessionId);
    const workspace = this.runtime.files?.status().target;
    check(workspace, 'Memory requires the bound native workspace');
    await this.connect(workspace);
    this.runtime.store.put('memory-session', sessionId, { workspaceId: this.runtime.files!.storageId(), path: workspace.path, archived: false });
    const pending = this.runtime.store.all<{ sourceId: string; workspaceId: string; state: string }>('memory-source-work')
      .filter(work => work.workspaceId === this.runtime.files!.storageId() && work.state === 'queued');
    await this.capture(pending.map(work => work.sourceId));
    const history = this.runtime.store.get<string[]>('native-history', sessionId) ?? [];
    await this.capture(history);
    await this.assertEligible(sessionId);
  }
  needsArchive(sessionId: string, workspaceId: string, path: string): boolean {
    const record = this.runtime.store.get<{ workspaceId: string; path: string; archived: boolean }>('memory-session', sessionId);
    const target=this.runtime.files?.status().target;
    return !!record && target?.id===workspaceId && target.path===path && record.workspaceId===this.runtime.files!.storageId() && !record.archived;
  }
  async archive(sessionId: string, workspaceId: string, path: string, events: readonly SessionEvent[]): Promise<void> {
    const belongs = () => {
      const status = this.runtime.files?.status();
      return status?.state === 'ready' && status.target?.id === workspaceId && status.target.path === path;
    };
    if (!belongs() || !this.needsArchive(sessionId, workspaceId, path)) return;
    const binding = this.runtime.store.all<ChannelBinding>('binding').find(item =>
      item.channel.kind === 'dsh' && item.channel.sceneId === sessionId);
    if (!binding) return;
    const sources: string[] = [];
    let turnStart = 0;
    for (const [index, event] of events.entries()) {
      if (event.type === 'turn/start') turnStart = index;
      let sourceId: string | undefined;
      if (event.type === 'user/message' && event.data.source.kind === 'user') {
        const key = digest([binding.bindingId, event.data.id]);
        sourceId = this.runtime.store.get<{ sourceId: string }>('incoming', key)?.sourceId;
      } else if (event.type === 'turn/end' && event.data.reason.kind === 'completed') {
        const id = 'result:native:' + digest([sessionId, event.data.turn]);
        if (this.runtime.store.get<EvidenceSource>('source', id)?.text === finalReply(events.slice(turnStart, index + 1), event.data.turn)) sourceId = id;
      }
      if (sourceId && this.runtime.store.get<{ workspaceId: string }>('memory-source-work', sourceId)?.workspaceId === this.runtime.files!.storageId()) sources.push(sourceId);
    }
    await this.connect({ id: workspaceId, path });
    if (!belongs()) return;
    await this.capture(sources);
    if (!belongs()) return;
    await this.connection.call('archive', { session_id: sessionId, sources });
    if (belongs()) this.runtime.store.put('memory-session', sessionId, { workspaceId: this.runtime.files!.storageId(), path, archived: true });
  }
  async recall(sessionId: string, query: string, includeRecent = false): Promise<string[]> {
    const projected = await this.contextFor(query, 0, includeRecent, includeRecent ? this.runtime.store.get<string[]>('native-visible-sources', sessionId) ?? [] : [], includeRecent ? this.runtime.store.get<string[]>('native-visible-memories',sessionId) ?? [] : []);
    const sources = projected.records.flatMap(record => record.dependencies.sources);
    const memories = projected.records.flatMap(record => record.dependencies.memories);
    const previous = this.runtime.store.get<Dependencies>('native-memory-view', sessionId) ?? { sources: [], memories: [] };
    const unique = <T>(items: T[]) => [...new Map(items.map(item => [canonical(item), item])).values()];
    this.runtime.store.put('native-memory-view', sessionId, { sources: unique([...previous.sources, ...sources]), memories: unique([...previous.memories, ...memories]) });
    this.contextBySession.set(sessionId, projected.text);
    await this.materialize(sources);
    const closure = sourceClosure(this.runtime, sources.map(source => source.id));
    await this.capture(closure);
    return closure;
  }
  async detail(sessionId: string, memoryId: string): Promise<{ text: string; sources: string[] }> {
    const result = await this.connection.call<{ dependencies: Dependencies }>('read', { memory_id: memoryId });
    check(await this.connection.validate(result.dependencies) === 'eligible', 'Memory detail is stale');
    const previous = this.runtime.store.get<Dependencies>('native-memory-view', sessionId) ?? { sources: [], memories: [] };
    const unique = <T>(items: T[]) => [...new Map(items.map(item => [canonical(item), item])).values()];
    this.runtime.store.put('native-memory-view', sessionId, {
      sources: unique([...previous.sources, ...result.dependencies.sources]), memories: unique([...previous.memories, ...result.dependencies.memories]),
    });
    await this.materialize(result.dependencies.sources);
    const sources = sourceClosure(this.runtime, result.dependencies.sources.map(source => source.id));
    await this.capture(sources);
    return { text: canonical(result), sources };
  }
  async assertEligible(sessionId: string): Promise<void> {
    const sources = this.runtime.store.get<string[]>('native-history', sessionId) ?? [];
    // Parallel native calls may publish the first receipt before the next
    // call's admission gate. Acknowledge that durable receipt before inspecting
    // it; never confuse newly queued evidence with provider loss/staleness.
    await this.capture(sources.filter(id => this.runtime.store.get<{ state: string }>('memory-source-work', id)?.state === 'queued'));
    const dependencies = sources.map(id => ({ id,
      revision: this.runtime.store.get<{ revision: string }>('memory-provider-source', id)?.revision ?? '1' }));
    const view = this.runtime.store.get<Dependencies>('native-memory-view', sessionId);
    // Reuse the provider's batch decision. One request per chunk, with a fresh
    // provider-owned graph walk; never cache eligibility across chunks.
    const decision = await this.connection.validate({ sources: [...dependencies, ...(view?.sources ?? [])], memories: view?.memories ?? [] });
    for (const id of sources) this.decisions.set(id, decision === 'eligible' ? 'eligible' : 'unknown');
    if (decision !== 'eligible') {
      this.contextBySession.delete(sessionId);
      check(false, 'Memory/history unavailable or stale; use a fresh scoped native session after recovery');
    }
  }

  async close(): Promise<void> { await this.connection.close(); }
}
