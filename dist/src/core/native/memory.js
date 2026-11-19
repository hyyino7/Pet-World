import { MemoryConnection } from '../../memory/client.js';
import { canonical, check, digest, reject } from '../storage.js';
import { finalReply } from '../upstream/messages.js';
import { readReviewDialogue } from '../review-dialogue.js';
import { preferences } from '../preferences.js';
/** Core-owned durable acknowledgement/source join. Provider owns all decisions. */
export class NativeMemory {
    runtime;
    connection;
    contextBySession = new Map();
    closed = false;
    lastError;
    clear(sessionId) { this.contextBySession.delete(sessionId); }
    unavailable(error) { this.lastError = error instanceof Error ? error.message : String(error); }
    constructor(runtime, config) {
        this.runtime = runtime;
        this.connection = new MemoryConnection(config);
    }
    context(sessionId) {
        const saved = this.contextBySession.get(sessionId);
        if (!saved)
            return '';
        try {
            this.assertBinding(saved.binding);
            return saved.text;
        }
        catch {
            return '';
        }
    }
    binding(expected) {
        const status = this.runtime.files?.status(), workspace = status?.state === 'ready' ? status.target : undefined;
        check(workspace, 'Memory requires the bound native workspace');
        const storageId = this.runtime.files.storageId();
        check(!expected || expected.workspaceId === workspace.id && expected.path === workspace.path && expected.storageId === storageId, 'Memory workspace changed');
        const binding = Object.freeze({ workspaceId: workspace.id, path: workspace.path, storageId, preferencesRevision: preferences(this.runtime).revision });
        this.assertBinding(binding);
        return binding;
    }
    assertBinding(binding) {
        if (this.closed)
            reject('STALE_BINDING', 'Memory has closed');
        const files = this.runtime.files, status = files?.status();
        if (!binding || status?.state !== 'ready' || status.target?.id !== binding.workspaceId
            || status.target.path !== binding.path || files?.storageId() !== binding.storageId
            || preferences(this.runtime).revision !== binding.preferencesRevision)
            reject('STALE_BINDING', 'Memory Bank changed during the operation');
    }
    connect(workspace, binding) {
        this.assertBinding(binding);
        const owner = this.runtime.store.meta('memory-configured-directory-owner');
        if (!owner)
            this.runtime.store.setMeta('memory-configured-directory-owner', { id: binding.storageId, path: workspace.path });
        // The explicit directory can be a legacy Bank below the original workspace.
        // Binding an ancestor of that workspace must never select the descendant's Bank.
        return this.connection.start({ companionId: this.runtime.config.companionId, scopeId: this.runtime.config.scopeId, bankId: binding.storageId }, workspace.path, !owner || owner.id === binding.storageId);
    }
    async ownerBank(workspaceId) {
        const files = this.runtime.files;
        const bound = files?.status();
        if (!files || bound?.state !== 'ready' || bound.target?.id !== workspaceId)
            reject('STALE_BINDING', 'Open the archive in the current workspace');
        const binding = this.binding(), bankId = binding.storageId;
        const settings = files.companionSettings();
        await this.connect(bound.target, binding);
        this.assertBinding(binding);
        return { bankId, settings, binding };
    }
    /** Owner archive reads use the same Bank and eligibility rules as chat.
     * Browsing has no chat session and does not record conversation dependencies. */
    async findForOwner(workspaceId, query) {
        const { bankId, settings, binding } = await this.ownerBank(workspaceId);
        const limit = settings.memoryRecallCount;
        const { records } = await this.connection.call('recall', { query, limit }, bankId);
        this.assertBinding(binding);
        const dependencies = { sources: records.flatMap(row => row.dependencies.sources),
            memories: records.flatMap(row => row.dependencies.memories) };
        if (records.length && await this.connection.validate(dependencies, bankId) !== 'eligible')
            reject('INELIGIBLE', 'Archive results changed during retrieval');
        this.assertBinding(binding);
        return { items: records.map(({ memory }) => ({
                id: memory.id, excerpt: memory.content.slice(0, settings.memoryRecallBlockChars),
            })), limit };
    }
    async readForOwner(workspaceId, memoryId) {
        const { bankId, binding } = await this.ownerBank(workspaceId);
        const row = await this.connection.call('read', { memory_id: memoryId }, bankId);
        this.assertBinding(binding);
        if (await this.connection.validate(row.dependencies, bankId) !== 'eligible')
            reject('INELIGIBLE', 'This archive record is no longer available');
        this.assertBinding(binding);
        return { id: row.memory.id, content: row.memory.content, dialogue: (row.conversation ?? []).map(({ role, text }) => ({
                role: role === 'user_statement' ? 'user' : role === 'agent_inference' ? 'assistant' : 'source', text,
            })) };
    }
    async dialogueForDay(workspaceId, sessionIds, input) {
        const { bankId, binding } = await this.ownerBank(workspaceId);
        const page = await readReviewDialogue(this.runtime, bankId, sessionIds, input, async (ids) => { this.assertBinding(binding); const decision = await this.connection.validate({ sources: ids.map(id => ({ id, revision: '1' })), memories: [] }, bankId); this.assertBinding(binding); return decision; }, ids => this.capture(ids, binding));
        this.assertBinding(binding);
        return page;
    }
    async materialize(sources, binding) {
        this.assertBinding(binding);
        const missing = sources.filter(source => !this.runtime.store.get('source', source.id));
        const excerpts = await this.connection.call('materialize', { sources: missing }, binding.storageId);
        this.assertBinding(binding);
        for (const excerpt of excerpts) {
            const existing = this.runtime.store.get('source', excerpt.sourceId);
            check(!existing || existing.text === excerpt.text, 'Provider source identity changed content');
            // This is validated provider-owned source text, not an independently authored
            // source/version. Its full evidence ancestry stays with the Memory port.
            if (!existing)
                this.runtime.store.put('source', excerpt.sourceId, { sourceId: excerpt.sourceId,
                    text: excerpt.text, actorId: excerpt.actorId, recordedAt: new Date().toISOString(),
                    origin: 'external_content', rootSourceIds: [] });
            this.runtime.store.put('memory-provider-source', excerpt.sourceId, { revision: excerpt.revision });
            this.runtime.store.put('memory-ack', excerpt.sourceId, { sourceId: excerpt.sourceId, observationId: excerpt.observationId });
        }
    }
    async contextFor(query, binding, includeRecent = false, excludeSources = [], excludeMemories = []) {
        this.assertBinding(binding);
        const identity = this.runtime.identity();
        const user = this.runtime.store.get('profile', 'current')?.text ?? '';
        const allowance = this.runtime.conversation.maxContextChars - identity.displayName.length - identity.character.length - user.length;
        check(allowance > 0, 'No Memory context allowance remains');
        const context = await this.connection.call('context', {
            query, max_chars: allowance, limit: this.runtime.files.companionSettings().memoryRecallCount, include_recent: includeRecent,
            exclude_sources: excludeSources, exclude_memories: excludeMemories, block_chars: this.runtime.files.companionSettings().memoryRecallBlockChars,
        }, binding.storageId);
        this.assertBinding(binding);
        // The original provider packs its own candidates. This is only the Core's
        // exact JavaScript character boundary, not another selection/budget engine.
        check(context.text.length <= allowance, 'Provider Memory context exceeds the configured character allowance');
        return context;
    }
    async capture(sourceIds, binding) {
        this.assertBinding(binding);
        const bankId = binding.storageId;
        for (const sourceId of sourceIds) {
            const provider = this.runtime.store.get('memory-provider-source', sourceId);
            if (provider) {
                await this.connection.validate({ sources: [{ id: sourceId, revision: provider.revision }], memories: [] }, bankId);
                this.assertBinding(binding);
                continue;
            }
            if (this.runtime.store.get('memory-ack', sourceId)) {
                // A durable acknowledgement already joins this exact immutable source.
                // Revalidate it through the provider; replaying observe here would
                // re-run consolidation and mutate a just-recalled episode's version.
                await this.connection.validate({ sources: [{ id: sourceId, revision: '1' }], memories: [] }, bankId);
                this.assertBinding(binding);
                continue;
            }
            const work = this.runtime.store.get('memory-source-work', sourceId);
            if (!work || work.workspaceId !== bankId) {
                // Enabling Memory must not silently backfill pre-install personal logs.
                // Original native records remain in DSH; records without observed-source work are not silently backfilled.
                continue;
            }
            const source = this.runtime.store.require('source', sourceId);
            // The source itself is durable pending work until this ack is persisted.
            // Replays after either side restarts use the same provider source key.
            const ack = await this.connection.call('observe', {
                source_id: sourceId, revision: '1', content: source.text, actor_id: source.actorId,
                source_kind: work.sourceKind ?? (source.origin === 'owner_statement' ? 'user_statement' : source.origin === 'model_interpretation' ? 'agent_inference' : 'system'),
                attribution: work.attribution,
                ...(source.eventTime?.from ? { occurred_at: source.eventTime.from } : {}),
                conversation_context: work.sourceKind === 'user_statement' || source.origin === 'model_interpretation' || source.origin === 'owner_statement',
                roots: source.rootSourceIds.map(id => ({ id, revision: '1' })),
            }, bankId);
            this.assertBinding(binding);
            this.runtime.store.put('memory-ack', sourceId, { sourceId, observationId: ack.observationId });
            const pending = this.runtime.store.get('memory-source-work', sourceId);
            if (pending)
                this.runtime.store.put('memory-source-work', sourceId, { ...pending, state: 'acknowledged', observationId: ack.observationId });
        }
    }
    async prepare(sessionId, expected) {
        const binding = this.binding(expected), bankId = binding.storageId;
        await this.connect({ id: binding.workspaceId, path: binding.path }, binding);
        this.assertBinding(binding);
        this.runtime.store.put('memory-session', sessionId, { workspaceId: bankId, path: binding.path, archived: false });
        const pending = this.runtime.store.all('memory-source-work')
            .filter(work => work.workspaceId === bankId && work.state === 'queued');
        await this.capture(pending.map(work => work.sourceId), binding);
        this.assertBinding(binding);
        this.lastError = undefined;
        return binding;
    }
    needsArchive(sessionId, workspaceId, path) {
        const record = this.runtime.store.get('memory-session', sessionId);
        const target = this.runtime.files?.status().target;
        return !!record && target?.id === workspaceId && target.path === path && record.workspaceId === this.runtime.files.storageId() && !record.archived;
    }
    async archive(sessionId, workspaceId, path, events) {
        const belongs = () => {
            const status = this.runtime.files?.status();
            return status?.state === 'ready' && status.target?.id === workspaceId && status.target.path === path;
        };
        if (!belongs() || !this.needsArchive(sessionId, workspaceId, path))
            return;
        const binding = this.binding(), bankId = binding.storageId;
        const sources = [];
        let turnStart = 0;
        for (const [index, event] of events.entries()) {
            if (event.type === 'turn/start')
                turnStart = index;
            let sourceId;
            if (event.type === 'user/message' && event.data.source.kind === 'user')
                sourceId = this.runtime.store.get('native-user-source', digest([sessionId, event.data.id]));
            else if (event.type === 'turn/end' && event.data.reason.kind === 'completed') {
                const candidate = 'result:native:' + digest([sessionId, event.data.turn]);
                if (this.runtime.store.get('source', candidate)?.text === finalReply(events.slice(turnStart, index + 1), event.data.turn))
                    sourceId = candidate;
            }
            if (sourceId && this.runtime.store.get('memory-source-work', sourceId)?.workspaceId === this.runtime.files.storageId())
                sources.push(sourceId);
        }
        await this.connect({ id: workspaceId, path }, binding);
        this.assertBinding(binding);
        await this.capture(sources, binding);
        this.assertBinding(binding);
        await this.connection.call('archive', { session_id: sessionId, sources }, bankId);
        this.assertBinding(binding);
        this.runtime.store.put('memory-session', sessionId, { workspaceId: bankId, path, archived: true });
    }
    async recall(sessionId, query, includeRecent, binding) {
        this.assertBinding(binding);
        this.clear(sessionId);
        const projected = await this.contextFor(query, binding, includeRecent, includeRecent ? this.runtime.store.get('native-visible-sources', sessionId) ?? [] : [], includeRecent ? this.runtime.store.get('native-visible-memories', sessionId) ?? [] : []);
        const sources = projected.records.flatMap(record => record.dependencies.sources);
        await this.materialize(sources, binding);
        this.assertBinding(binding);
        this.contextBySession.set(sessionId, { text: projected.text, binding });
        return sources.map(source => source.id);
    }
    async detail(memoryId, binding) {
        this.assertBinding(binding);
        const result = await this.connection.call('read', { memory_id: memoryId }, binding.storageId);
        this.assertBinding(binding);
        check(await this.connection.validate(result.dependencies, binding.storageId) === 'eligible', 'Memory detail is stale');
        this.assertBinding(binding);
        await this.materialize(result.dependencies.sources, binding);
        // The owning Bank returns and validates its actual versioned sources. Core
        // does not build another eligibility graph over those provider records.
        const sources = [...new Set(result.dependencies.sources.map(source => source.id))];
        await this.capture(sources, binding);
        this.assertBinding(binding);
        return { text: canonical(result), sources };
    }
    async close() { this.closed = true; this.contextBySession.clear(); await this.connection.close(); }
}
//# sourceMappingURL=memory.js.map