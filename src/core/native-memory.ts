import type { CoreRuntime } from './core.js';
import type { EvidenceSource } from '../contracts/common.js';
import { MemoryConnection, type Dependencies, type MemoryConfig, type RecalledMemory, type Decision } from '../memory/client.js';
import { canonical, check, digest, reject } from './storage.js';
import { sourceClosure } from './history.js';
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import { finalReply } from './upstream/messages.js';
import { readReviewDialogue, type DialogueQuery } from '../life/review-dialogue.js';

/** Core-owned durable acknowledgement/source join. Provider owns all decisions. */
export class NativeMemory {
  readonly connection: MemoryConnection;
  private readonly decisions = new Map<string, Decision>();
  private readonly contextBySession = new Map<string, string>();
  lastError?: string;
  clear(sessionId: string): void { this.contextBySession.delete(sessionId);this.runtime.store.put('native-memory-view',sessionId,{sources:[],memories:[]}); }
  unavailable(error: unknown): void { this.lastError=error instanceof Error?error.message:String(error); }
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
    this.checkBank(workspaceId,bankId);
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
  /** Public read-only eligibility seam for module-owned derived material. */
  async validateMaterial(workspaceId: string, dependencies: Dependencies): Promise<Decision> {
    try {
      const {bankId} = await this.ownerBank(workspaceId);
      const result = await this.connection.validate(dependencies,bankId);
      this.checkBank(workspaceId,bankId);
      return result;
    } catch {return 'unknown';}
  }
  /** Join module-owned, already versioned material to the ordinary native view.
   * The caller owns a scoped native session; this read creates no execution or whole-chat lease. */
  async useMaterial(sessionId: string, workspaceId: string, dependencies: Dependencies): Promise<string[]> {
    const {bankId} = await this.ownerBank(workspaceId);
    check(await this.connection.validate(dependencies,bankId) === 'eligible', 'Derived material is unavailable or stale');
    await this.materialize(dependencies.sources);
    this.checkBank(workspaceId,bankId);
    const previous = this.runtime.store.get<Dependencies>('native-memory-view',sessionId) ?? {sources:[],memories:[]};
    const unique = <T>(items: T[]) => [...new Map(items.map(item => [canonical(item),item])).values()];
    this.runtime.store.put('native-memory-view',sessionId, {
      sources:unique([...previous.sources,...dependencies.sources]), memories:unique([...previous.memories,...dependencies.memories]),
    });
    const closure = sourceClosure(this.runtime,dependencies.sources.map(source => source.id));
    await this.capture(closure);
    this.checkBank(workspaceId,bankId);
    return closure;
  }
  /** Legacy state has IDs but no saved versions. A later update cannot validate
   * an old reason: require the current record to predate that state, then use
   * the provider's current dependency/version decision rather than trusting IDs. */
  async validateMemoryIds(workspaceId: string, ids: readonly string[], asOf?: number): Promise<Decision> {
    return (await this.resolveMemoryMaterial(workspaceId,ids,asOf)).decision;
  }
  async resolveMemoryMaterial(workspaceId: string, ids: readonly string[], asOf?: number): Promise<{decision:Decision;dependencies:Dependencies}> {
    const dependencies: Dependencies = {sources:[],memories:[]};
    if (!ids.length) return {decision:'eligible',dependencies};
    if (!Number.isFinite(asOf) || ids.length > 256 || ids.some(id => typeof id !== 'string' || !id)) return {decision:'unknown',dependencies};
    try {
      const {bankId} = await this.ownerBank(workspaceId);
      for (const memoryId of new Set(ids)) {
        const row = await this.connection.call<RecalledMemory & {memory:{updated_at?:string}}>('read',{memory_id:memoryId},bankId);
        const updatedAt = typeof row.memory.updated_at === 'string' ? Date.parse(row.memory.updated_at) : NaN;
        if (!Number.isFinite(updatedAt)) return {decision:'unknown',dependencies};
        if (updatedAt > asOf!) return {decision:'ineligible',dependencies};
        dependencies.sources.push(...row.dependencies.sources);
        dependencies.memories.push(...row.dependencies.memories);
      }
      const decision = await this.connection.validate(dependencies,bankId);
      this.checkBank(workspaceId,bankId);
      return {decision,dependencies};
    } catch {return {decision:'unknown',dependencies};}
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
  async capture(sourceIds: readonly string[], expectedBankId?: string): Promise<void> {
    const workspaceId = expectedBankId ?? this.runtime.files?.storageId();
    check(workspaceId && this.runtime.files?.storageId()===workspaceId,'Memory Bank changed during capture');
    for (const sourceId of sourceIds) {
      const provider = this.runtime.store.get<{ revision: string }>('memory-provider-source', sourceId);
      if (provider) {
        this.decisions.set(sourceId, await this.connection.validate({ sources: [{ id: sourceId, revision: provider.revision }], memories: [] },workspaceId));
        continue;
      }
      if (this.runtime.store.get('memory-ack', sourceId)) {
        // A durable acknowledgement already joins this exact immutable source.
        // Revalidate it through the provider; replaying observe here would
        // re-run consolidation and mutate a just-recalled episode's version.
        this.decisions.set(sourceId, await this.connection.validate({ sources: [{ id: sourceId, revision: '1' }], memories: [] },workspaceId));
        continue;
      }
      const work = this.runtime.store.get<{ workspaceId: string; sourceKind?:string; attribution?:Record<string,unknown> }>('memory-source-work', sourceId);
      if (!work || work.workspaceId !== workspaceId) {
        // Enabling Memory must not silently backfill pre-install personal logs.
        // Original native records remain in DSH; records without observed-source work are not silently backfilled.
        this.decisions.set(sourceId, 'unknown');
        continue;
      }
      const source = this.runtime.store.require<EvidenceSource>('source', sourceId);
      // The source itself is durable pending work until this ack is persisted.
      // Replays after either side restarts use the same provider source key.
      const ack = await this.connection.call<{ observationId: string; decision: Decision }>('observe', {
        source_id: sourceId, revision: '1', content: source.text, actor_id: source.actorId,
        source_kind: work.sourceKind ?? (source.origin === 'owner_statement' ? 'user_statement' : source.origin === 'model_interpretation' ? 'agent_inference' : 'system'),
        attribution:work.attribution,
        conversation_context: work.sourceKind==='user_statement' || source.origin === 'model_interpretation' || source.origin === 'owner_statement',
        roots: source.rootSourceIds.map(id => ({ id, revision: '1' })),
      },workspaceId);
      check(this.runtime.files?.storageId()===workspaceId,'Memory Bank changed during capture');
      this.runtime.store.put('memory-ack', sourceId, { sourceId, observationId: ack.observationId });
      const pending = this.runtime.store.get<Record<string, unknown>>('memory-source-work', sourceId);
      if (pending) this.runtime.store.put('memory-source-work', sourceId, { ...pending, state: 'acknowledged', observationId: ack.observationId });
      this.decisions.set(sourceId, ack.decision);
    }
  }
  async prepare(sessionId: string, expected?: {workspaceId:string;path:string;storageId:string}): Promise<void> {
    const status=this.runtime.files?.status(), workspace=status?.state==='ready'?status.target:undefined;
    check(workspace,'Memory requires the bound native workspace');
    const bankId=this.runtime.files!.storageId();
    check(!expected || expected.workspaceId===workspace!.id && expected.path===workspace!.path && expected.storageId===bankId,'Memory workspace changed');
    await this.connect(workspace!);this.checkBank(workspace!.id,bankId);
    this.runtime.store.put('memory-session',sessionId,{workspaceId:bankId,path:workspace!.path,archived:false});
    const pending=this.runtime.store.all<{sourceId:string;workspaceId:string;state:string}>('memory-source-work')
      .filter(work=>work.workspaceId===bankId && work.state==='queued');
    await this.capture(pending.map(work=>work.sourceId),bankId);
    this.checkBank(workspace!.id,bankId);this.lastError=undefined;
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
    const sources: string[]=[];
    let turnStart=0;
    for(const [index,event] of events.entries()) {
      if(event.type==='turn/start')turnStart=index;
      let sourceId:string|undefined;
      if(event.type==='user/message' && event.data.source.kind==='user')sourceId=this.runtime.store.get<string>('native-user-source',digest([sessionId,event.data.id]));
      else if(event.type==='turn/end' && event.data.reason.kind==='completed') {
        const candidate='result:native:'+digest([sessionId,event.data.turn]);
        if(this.runtime.store.get<EvidenceSource>('source',candidate)?.text===finalReply(events.slice(turnStart,index+1),event.data.turn))sourceId=candidate;
      }
      if(sourceId && this.runtime.store.get<{workspaceId:string}>('memory-source-work',sourceId)?.workspaceId===this.runtime.files!.storageId())sources.push(sourceId);
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
    this.runtime.store.put('native-memory-view',sessionId,{sources,memories});
    this.contextBySession.set(sessionId, projected.text);
    await this.materialize(sources);
    return sources.map(source=>source.id);
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
  async close(): Promise<void> { await this.connection.close(); }
}
