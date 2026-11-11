import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session';
import type {} from './plugin.js';
import type {} from '@deepseek-ai/dsh-system-prompt';
import type {} from '@deepseek-ai/dsh-tools';
import type {} from '@deepseek-ai/dsh-llm';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import { nativeResult } from './dsh-driver.js';
import type { PetCoreHost } from './index.js';
import { id } from './storage.js';
import { registerWorldPrompt, retireLegacyPrompt } from './world-prompt.js';
import { WorldRecall } from './world-recall.js';
import type { PetWorld } from '../world/service.js';
declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap { 'chatpet-clean-context': { kind: 'chatpet-clean-context'; form: 'snapshot'; sections: readonly { name: string; text: string }[] } }
}

export const name = 'chatpet-agent';
export const inject = ['petCore', 'petWorld', 'agents', 'systemPrompt', 'tools'];
interface WorkspaceView { id: string; path: string; sessionIds: readonly string[] }
interface NativeServices {
  get(name: 'workspaceRegistry'): { get(id: string): WorkspaceView | undefined; archivedSessionIds: readonly string[] } | undefined;
  sessionPersistence: { open(id: SessionId, access: 'read'): Promise<{read(): Promise<{events: readonly SessionEvent[]}>; close(): Promise<void>}> };
  on(name: 'domain/changed', handler: (change: {domain: string; table: string; value?: {archivedSessionIds?: readonly string[]}}) => void): unknown;
}
/** Core-owned workspace adapter. Native sessions keep their own preset and Agent. */
export function apply(ctx: Context, host: PetCoreHost = ctx.petCore, world: PetWorld = ctx.petWorld): () => Promise<void> {
  const native = ctx as unknown as NativeServices;
  const agents = new Map<string, Agent>();
  const inputs = new Map<string, string>();
  const toolNames = new Map<string, string>();
  function inside(agent: Agent): boolean {
    return world.sessionStatus(agent.session) !== null;
  }
  let archiveTail: Promise<void> = Promise.resolve();
  function syncArchives(publishedIds?: readonly string[]): Promise<void> {
    if (!host.native.memory) return Promise.resolve();
    const run = archiveTail.then(async () => {
      const target = host.workspace.status().target;
      const registry = native.get('workspaceRegistry');
      const view = target && registry?.get(target.id);
      if (!target || !view || target.path !== view.path) return;
      for (const id of publishedIds ?? registry?.archivedSessionIds ?? []) {
        if (!view.sessionIds.includes(id) || host.native.manages(id) ||
            !host.native.memory!.needsArchive(id, target.id, target.path)) continue;
        const live = ctx.sessions.get(id as SessionId);
        if (live && !await ctx.sessions.flush(live)) throw new Error('Cannot archive an unflushed native session');
        const reader = await native.sessionPersistence.open(id as SessionId, 'read');
        try { await host.native.memory!.archive(id, target.id, target.path, (await reader.read()).events); }
        finally { await reader.close(); }
      }
    });
    archiveTail = run.catch(error => ctx.logger('chatpet-memory').warn('Native archive pending; will retry', error));
    return run;
  }
  if (host.native.memory) native.on('domain/changed', change => {
    if (change.domain === 'workspace' && change.table === '' && change.value?.archivedSessionIds?.length)
      void syncArchives(change.value.archivedSessionIds).catch(() => {});
  });
  async function inspect(agent: Agent) {
    await agent.whenIdle(); await ctx.sessions.flush(agent.session);
    return nativeResult(agent.session.snapshotEvents(), inputs.get(agent.id) ?? '');
  }
  const disposePrompt = registerWorldPrompt(ctx, 'chatpet.profile', 10, agent => {
    if (!inside(agent)) return '';
    const { identity, user } = host.native.context();
    const policy = host.native.memoryFor(agent.id)
      ? '自然交流时，主动识别用户明确表达、值得跨会话保留的稳定事实、称呼和偏好；用户无须额外说“记住”。有新的可靠信息时，在本轮用 pet_memory_remember 保存，引用用户的逐字原话作为证据。纠正已有信息先召回再用 pet_memory_correct；遗忘必须遵从用户意图。问候、附和、单次提问、假设和引用材料不应自动成为用户档案。已有相同记忆不要重复保存。不把助手自己的回答当成用户事实，也不承诺未成功的保存。结合近期双方对话延续未结束的话题和已经明确约定的后续交流，不要只按当前一句话的关键词回忆。召回块标有 detail_available 时，用 pet_memory_read 精读当前允许使用的完整记录，再回答细节，无需用户再次要求；不要绕过工具直接读取数据库或备份。普通回答保持自然，无须汇报内部整理过程。'
      : '';
    return [identity, user, policy].filter(Boolean).join('\n\n');
  });
  const recall = new WorldRecall();
  const scanned = new WeakMap<Agent, boolean>();
  ctx.on('agent/request', ({ agent, turn, step }, next) => {
    const bound = inside(agent);
    if (scanned.get(agent) !== bound) {
      retireLegacyPrompt(agent.session, turn, step, bound);
      scanned.set(agent, bound);
    }
    recall.request(agent.session, turn, step, bound && Boolean(host.native.memoryFor(agent.id)));
    return next();
  });
  // Native waterfall guards the real request and every output chunk; no frozen
  // request mutation, extra model call or private Agent runtime is introduced.
  ctx.on('llm/stream', async function* (options, next) {
    if (!options.sessionId || !host.native.manages(options.sessionId) || !host.native.memoryFor(options.sessionId)) { yield* next(); return; }
    await host.native.memory!.assertEligible(options.sessionId);
    for await (const chunk of next()) {
      await host.native.memory!.assertEligible(options.sessionId);
      yield chunk;
    }
  });
  ctx.on('tools/pre-execute', async (exec, next) => {
    if (exec.agent && host.native.manages(exec.agent.id) && host.native.memoryFor(exec.agent.id)) {
      try { await host.native.memory!.assertEligible(exec.agent.id); }
      catch {
        host.native.noteToolDenied(exec.agent.id, exec.name, String(exec.callId));
        return { kind: 'deny', reason: '记忆上下文不可用或已过期，本次调用没有执行。请在干净上下文恢复后检查当前记忆，再决定是否重试。' };
      }
    }
    return next();
  });
  // Register before the host freezes the step's tool catalog; activate only
  // for root sessions belonging to the explicitly bound native workspace.
  // Activation options are native 0.2.2 API; the retained dev SDK is 0.2.1.
  const tools = ctx.tools as unknown as { register(tool: ToolDefinition, options: { when(context: { agent?: Agent }): boolean }): () => void };
  for (const tool of host.native.tools()) tools.register(tool, {
    when: context => Boolean(context.agent && inside(context.agent) && host.workspace.status().state === 'ready'
      && (!tool.name.startsWith('pet_memory_') || host.native.memoryFor(context.agent.id))),
  });
  ctx.tools.guard(exec => {
    const deny = (reason: string) => {
      if (exec.agent) host.native.noteToolDenied(exec.agent.id, exec.name, String(exec.callId));
      return reason;
    };
    try {
      if (!exec.agent) return undefined;
      if (!host.native.historyEligible(exec.agent.id)) return deny('由 Core 管理的原生历史已不允许继续使用');
      if (!inside(exec.agent)) return host.native.manages(exec.agent.id) ? deny('执行已离开绑定工作区') : undefined;
      host.native.guardTool(exec.agent.id);
    } catch { return deny('执行准入、来源可用性或执行限额已变化'); }
    return undefined;
  });
  ctx.on('agent/pre-step', async (payload, next) => {
    if (!inside(payload.agent)) {
      if (host.native.manages(payload.agent.id) || !host.native.historyEligible(payload.agent.id)) return { kind: 'reject' };
      const decision = await next();
      if (decision.kind !== 'enter' || scanned.get(payload.agent) === false) return decision;
      // A resumed session can have a persisted Pet profile in its leading system
      // node even when its new Agent starts outside the Repo.
      const previouslyEnrolled = host.workspace.runtime.store.get<boolean>('native-memory-enabled', payload.agent.id) !== undefined;
      return previouslyEnrolled ? { ...decision, startsRequestSeries: true } : decision;
    }
    await ctx.get('petDesktop')?.features?.restoreImages();
    await ctx.get('petTranscripts')?.restore();
    agents.set(payload.agent.id, payload.agent);
    try {
      if (host.native.memoryFor(payload.agent.id)) {
        await syncArchives();
        try { await host.native.memory!.prepare(payload.agent.id); }
        catch (preparationError) {
          let rebuilt;
          try { rebuilt = await host.native.reconstruct(payload.agent.id); }
          catch (reconstructionError) {
            throw new Error(`Memory preparation: ${preparationError instanceof Error ? preparationError.message : 'failed'}; reconstruction: ${reconstructionError instanceof Error ? reconstructionError.message : 'failed'}`);
          }
          const nodes = [...payload.agent.session.surface.nodes];
          const first = payload.agent.session.snapshotEvents().find(event => event.seq === nodes[0]);
          if (first?.type === 'system/message') nodes.shift(); // DSH owns the leading system-prompt node.
          if (nodes.length) payload.agent.session.append('user/message', {
            id: id('memory-context') as never, role: 'user', source: { kind: 'chatpet-clean-context', form: 'snapshot',
              sections: [{ name: 'chatpet.memory-safety', text: rebuilt.text }] },
            content: [{ type: 'text', text: rebuilt.text }],
          }, { surfaceOp: { op: 'replace', startSeq: nodes[0], endSeq: nodes.at(-1)! }, sourceEventSeqs: nodes });
          rebuilt.commit();
        }
      }
      if (!host.native.historyEligible(payload.agent.id)) return { kind: 'reject' };
      const input = payload.messages.find(message => host.native.acceptsInput(payload.agent.id, message));
      if (input && !inputs.has(payload.agent.id)) inputs.set(payload.agent.id, input.id);
      host.native.useTranscript(payload.agent.id, [...payload.agent.session.surface.nodes], payload.agent.session.snapshotEvents());
      const memory = host.native.memoryFor(payload.agent.id);
      const refresh = Boolean(memory && recall.refresh(payload.agent.session, host.workspace.storageId(), payload.step === 1,
        host.workspace.companionSettings().memoryColdHours));
      await host.native.begin(payload.agent.id, payload.turn, payload.messages, payload.signal, {
        cancel: () => payload.agent.cancel({ kind: 'user' }), inspect: () => inspect(payload.agent),
      }, refresh);
      const decision = await next();
      if (!refresh || !memory || decision.kind !== 'enter') return decision;
      const message = recall.prepare(payload.agent.session, memory.context(payload.agent.id));
      return {...decision, startsRequestSeries: true, messages: message ? [message, ...decision.messages] : decision.messages};
    } catch (error) {
      // Preserve the native error receipt so the owner can inspect why admission
      // failed. A generic rejected step hides provider/configuration failures.
      throw error;
    }
  });
  ctx.on('session/event', (session, event) => {
    if (String(event.type) === 'compaction/end' && !(event.data as {error?: unknown}).error) recall.compacted(session);
    const agent = agents.get(session.id); if (!agent) return;
    if (event.type === 'tool/call') toolNames.set(`${session.id}:${event.data.callId}`, event.data.name);
    if (event.type === 'tool/result') {
      const key = `${session.id}:${event.data.message.toolCallId}`;
      host.native.observeTool(session.id, String(event.seq), event.data, toolNames.get(key)?.startsWith('pet_memory_'));
      toolNames.delete(key);
    }
    if (event.type === 'turn/end') {
      host.native.finish(session.id, nativeResult(session.snapshotEvents(), inputs.get(session.id) ?? ''));
      inputs.delete(session.id);
      if (native.get('workspaceRegistry')?.archivedSessionIds?.includes(session.id)) void syncArchives().catch(() => {});
    }
  });
  ctx.on('agent/disposed', ({ agent }) => {
    if (!agents.has(agent.id)) return;
    void host.native.end(agent.id).finally(() => { agents.delete(agent.id); inputs.delete(agent.id); });
  });
  let stopped: Promise<void> | undefined;
  const stop = () => stopped ??= (async () => {
    for (const agent of agents.values()) if (inputs.has(agent.id)) agent.cancel({ kind: 'user' });
    await Promise.all([...agents.values()].map(agent => host.native.end(agent.id)));
    await archiveTail;
    disposePrompt();
    agents.clear(); inputs.clear();
    toolNames.clear();
  })();
  ctx.effect(() => stop);
  return stop;
}
