import { defineTool, type ToolDefinition, type ToolRunContext } from '@deepseek-ai/dsh-tools';
import type { Commitment, CommitmentProgress } from '../contracts/core.js';
import type { EvidenceSource } from '../contracts/common.js';
import type { CoreRuntime, StoredActivity } from './core.js';
import { sourceClosure } from './history.js';
import { canonical, check, id, integer, now, reject, revision, text, timestamp } from './storage.js';

export const MATTER_TOOLS = Object.freeze(['pet_matter_list', 'pet_matter_read', 'pet_matter_create', 'pet_matter_update', 'pet_matter_progress', 'pet_matter_finish']);
/** Tool registration/output pattern adapted from dsh-world life/tools.ts and dot memory-tools.js.
 * Ownership, semantics and grants are ours; upstream personas/keyword extractors are not used.
 * See THIRD_PARTY_NOTICES.md for pinned sources and MIT notices.
 */
const output = { schema: { type: 'string' as const },
  render: (_args: unknown, value: string) => [{ type: 'text' as const, text: value }] };
const requiredText = { type: 'string' as const, required: true as const };
const expectedRevision = { type: 'integer' as const, required: true as const };

/** A narrow execution-scoped delegation, never an owner RequestContext or arbitrary tool dispatcher. */
export function matterTools(runtime: CoreRuntime, binding: { executionId: string; sessionId: string; activityId: string; sourceIds: readonly string[]; dependencies?: Set<string>; ordinary?: boolean; validate?(): void }): ToolDefinition[] {
  const permittedSources = binding.dependencies ?? new Set(binding.ordinary ? binding.sourceIds : sourceClosure(runtime, binding.sourceIds));
  const include = (sourceIds: readonly string[]) => {
    for (const sourceId of binding.ordinary ? sourceIds : sourceClosure(runtime, sourceIds)) permittedSources.add(sourceId);
    if(!binding.ordinary)runtime.store.put('execution-dependencies', binding.executionId, [...permittedSources]);
  };
  const admit = (exec: ToolRunContext) => {
    if (exec.agent?.id !== binding.sessionId) reject('UNAUTHORIZED', 'Tool belongs to another admitted execution');
    if (exec.signal.aborted) reject('DISABLED', 'Execution cancellation was requested');
    binding.validate?.();
    if(binding.ordinary)return;
    const activity = runtime.store.require<StoredActivity>('activity', binding.activityId);
    if (activity.receipt.state !== 'running' || runtime.store.meta('quiescence')) reject('DISABLED', 'Execution is no longer admitted');
    if (!runtime.eligible([...permittedSources])) reject('INELIGIBLE', 'Execution sources are no longer eligible');
  };
  const load = (commitmentId: string) => {
    const matter = runtime.store.require<Commitment>('commitment', commitmentId);
    if (!binding.ordinary && !runtime.eligible([...matter.sourceIds, ...matter.resultSourceIds])) reject('INELIGIBLE', 'Matter sources are not eligible');
    return matter;
  };
  const mutate = (name: string, args: unknown, exec: ToolRunContext, apply: () => { commitment: Commitment; progress: CommitmentProgress; resultSource?: EvidenceSource }) => {
    admit(exec);
    const value = runtime.store.mutate(`execution:${binding.executionId}`, name, String(exec.callId), args, apply);
    // A retried call returns its original operation, rather than duplicating progress or completion.
    include([...value.commitment.sourceIds, ...value.commitment.resultSourceIds]);
    try { runtime.onProgress(value.progress); runtime.onChange('matter.changed', { commitmentId: value.commitment.commitmentId, revision: value.commitment.revision }); } catch { /* Observer failure cannot undo a committed operation. */ }
    return canonical(value);
  };
  const progress = (matter: Commitment, kind: CommitmentProgress['kind'], summary: string, roots = [...permittedSources]): CommitmentProgress => {
    text(summary, 'progress summary');
    const record: CommitmentProgress = { progressId: id('progress'), commitmentId: matter.commitmentId, revision: matter.revision,
      executionId: binding.executionId, kind, summary, sourceIds: roots, recordedAt: now() };
    runtime.store.put('commitment-progress', record.progressId, record);
    runtime.store.put('commitment', matter.commitmentId, matter); return record;
  };
  return [
    defineTool({ name: MATTER_TOOLS[0], description: '创建或选择事项前，先查看用户已有的事项。不要仅凭孤立关键词推断任务，也不要为普通聊天创建事项。',
      parameters: { limit: { type: 'integer' } }, output, execute: async ({ limit = 50 }, exec) => {
        admit(exec); integer(limit, 'limit', 1, 200);
        const all = runtime.store.all<Commitment>('commitment').filter(m => binding.ordinary || runtime.eligible([...m.sourceIds, ...m.resultSourceIds]));
        const selected = all.slice(-limit);
        include(selected.flatMap(m => [...m.sourceIds, ...m.resultSourceIds]));
        return canonical({ commitments: selected, truncated: all.length > limit });
      } }),
    defineTool({ name: MATTER_TOOLS[1], description: '读取事项当前状态、已记录进度和实际保存的分析结果。缺少结果不能证明工作已经完成。',
      parameters: { commitmentId: requiredText }, output, execute: async ({ commitmentId }, exec) => {
        admit(exec); const commitment = load(commitmentId);
        include([...commitment.sourceIds, ...commitment.resultSourceIds]);
        const records = runtime.store.all<CommitmentProgress>('commitment-progress').filter(p => p.commitmentId === commitmentId && (binding.ordinary || runtime.eligible(p.sourceIds)));
        return canonical({ commitment, progress: records.slice(-runtime.conversation.maxHistoryMessages || records.length),
          results: commitment.resultSourceIds.map(sourceId => {
            const source = runtime.store.require<EvidenceSource>('source', sourceId);
            return { sourceId, origin: source.origin, text: source.text.slice(0, runtime.conversation.maxContextChars), truncated: source.text.length > runtime.conversation.maxContextChars };
          }) });
      } }),
    defineTool({ name: MATTER_TOOLS[2], description: '只有用户确实要求取得某个结果或持续工作时才创建持久事项。结合完整对话理解，有歧义时询问。用用户的语言描述目标和具体下一步。',
      parameters: { requestedOutcome: requiredText, nextAction: requiredText, dueAt: { type: 'string' } }, output,
      execute: async (args, exec) => mutate(MATTER_TOOLS[2], args, exec, () => {
        text(args.requestedOutcome, 'requestedOutcome'); text(args.nextAction, 'nextAction'); if (args.dueAt) timestamp(args.dueAt);
        const commitment: Commitment = { commitmentId: id('commitment'), revision: 1, requestedOutcome: args.requestedOutcome,
          sourceIds: [...permittedSources], state: 'open', nextAction: args.nextAction, waitingReason: null, resultSourceIds: [], ...(args.dueAt ? { dueAt: args.dueAt } : {}) };
        return { commitment, progress: progress(commitment, 'created', args.requestedOutcome) };
      }) }),
    defineTool({ name: MATTER_TOOLS[3], description: '根据用户要求或实际工作状态更新已有事项。设为 waiting 时说明具体缺少的依赖。不要在这里报告完成；完成应使用 finish 并提供实质结果和证据。',
      parameters: { commitmentId: requiredText, expectedRevision, state: { type: 'string', enum: ['open', 'in_progress', 'waiting', 'cancelled'], required: true },
        nextAction: { type: 'string' }, waitingReason: { type: 'string' }, requestedOutcome: { type: 'string' }, summary: requiredText }, output,
      execute: async (args, exec) => mutate(MATTER_TOOLS[3], args, exec, () => {
        const commitment = load(args.commitmentId); revision(commitment.revision, args.expectedRevision);
        if (args.requestedOutcome !== undefined) { text(args.requestedOutcome, 'requestedOutcome'); commitment.requestedOutcome = args.requestedOutcome; }
        if (args.state === 'waiting') text(args.waitingReason, 'waitingReason');
        if (args.nextAction !== undefined) text(args.nextAction, 'nextAction');
        commitment.state = args.state; commitment.nextAction = args.nextAction ?? null; commitment.waitingReason = args.waitingReason ?? null;
        commitment.sourceIds = [...new Set([...commitment.sourceIds, ...permittedSources])]; commitment.revision++;
        return { commitment, progress: progress(commitment, 'updated', args.summary) };
      }) }),
    defineTool({ name: MATTER_TOOLS[4], description: '用用户的语言记录实际执行的具体步骤或中间分析发现。不编造活动、百分比、工具结果或外部操作。',
      parameters: { commitmentId: requiredText, expectedRevision, summary: requiredText, nextAction: requiredText }, output,
      execute: async (args, exec) => mutate(MATTER_TOOLS[4], args, exec, () => {
        const commitment = load(args.commitmentId); revision(commitment.revision, args.expectedRevision);
        if (['completed', 'cancelled'].includes(commitment.state)) reject('CONFLICT', 'Matter is terminal; explicitly revise it before adding progress');
        text(args.nextAction, 'nextAction'); commitment.state = 'in_progress'; commitment.nextAction = args.nextAction; commitment.waitingReason = null; commitment.revision++;
        return { commitment, progress: progress(commitment, 'progress', args.summary) };
      }) }),
    defineTool({ name: MATTER_TOOLS[5], description: '保存对所提供材料的已完成分析，包括实质结果和支持结论的来源 ID。此工具不执行或证明外部操作。核对用户条件并说明局限。收到成功回执后才能声称事项已记录为完成，并向用户给出实际结果。',
      parameters: { commitmentId: requiredText, expectedRevision, result: requiredText,
        evidenceSourceIds: { type: 'array', items: { type: 'string' } } }, output,
      execute: async (args, exec) => mutate(MATTER_TOOLS[5], args, exec, () => {
        const commitment = load(args.commitmentId); revision(commitment.revision, args.expectedRevision); text(args.result, 'analysis result');
        if (['completed', 'cancelled'].includes(commitment.state)) reject('CONFLICT', 'Matter is already terminal');
        const evidenceSourceIds=args.evidenceSourceIds ?? (binding.ordinary?[...permittedSources]:[]);
        check(binding.ordinary || evidenceSourceIds.length > 0, 'A result needs supporting sources');
        for (const sourceId of evidenceSourceIds) if (!permittedSources.has(sourceId)) reject('UNAUTHORIZED', 'Evidence was not admitted or read in this execution');
        const resultSource: EvidenceSource = { sourceId: id('analysis'), origin: 'model_interpretation', actorId: runtime.config.companionId,
          recordedAt: now(), text: args.result, rootSourceIds: [...new Set([...permittedSources, ...evidenceSourceIds])] };
        runtime.store.put('source', resultSource.sourceId, resultSource);
        commitment.state = 'completed'; commitment.nextAction = null; commitment.waitingReason = null; commitment.revision++;
        commitment.resultSourceIds = [resultSource.sourceId];
        return { commitment, resultSource, progress: progress(commitment, 'result', args.result, [...permittedSources, resultSource.sourceId]) };
      }) }),
  ];
}
