import type { Context } from '@deepseek-ai/cordis';
import { foldConsumedWork, type Agent, type AgentHandle } from '@deepseek-ai/dsh-agent';
import type { SessionEvent, SessionId, UserMessage } from '@deepseek-ai/dsh-session';
import type {} from '@deepseek-ai/dsh-system-prompt';
import type {} from '@deepseek-ai/dsh-tools';
import type { NativeDriver, NativeRunResult } from './execution.js';
import { isAbsolute } from 'node:path';
import { check, integer, text } from './storage.js';
import { finalReply } from './upstream/messages.js';

/** Pure log reconciliation, shared by live completion and cold inspection. */
export function nativeResult(events: readonly SessionEvent[], messageId: string): NativeRunResult {
  const inputIndex = events.findIndex(event => event.type === 'user/message' && event.data.id === messageId);
  if (inputIndex < 0) {
    // A pre-step failure can consume this input before a user/message exists.
    // Each Core binding owns exactly one submitted prompt; use the native consumed-work fold.
    const queued = events.findIndex(event => event.type === 'agent/inbox/spliced' && event.data.inserted.some(message => message.id === messageId));
    if (queued >= 0) {
      const consumed = foldConsumedWork(events.slice(queued));
      if (consumed.droppedUnrun) return { state: 'cancelled', text: '', hostTurnIds: [], reason: 'Native inbox confirms unrun work was dropped' };
      if (consumed.end) {
        const reason = consumed.end.data.reason.kind;
        if (['error', 'blocked', 'aborted'].includes(reason)) return { state: reason === 'aborted' ? 'cancelled' : 'failed', text: '',
          hostTurnIds: [String(consumed.end.data.turn)], reason: `Native work ended before its first step: ${reason}` };
      }
    }
    return { state: 'unknown', text: '', hostTurnIds: [], reason: 'Native log does not prove that this input entered a turn' };
  }
  const turnStart = events.slice(0, inputIndex + 1).reverse().find(event => event.type === 'turn/start');
  if (!turnStart || turnStart.type !== 'turn/start') return { state: 'unknown', text: '', hostTurnIds: [], reason: 'Input has no owned turn boundary' };
  const turn = turnStart.data.turn;
  const end = events.slice(inputIndex).find(event => event.type === 'turn/end' && event.data.turn === turn);
  const hostTurnIds = [String(turn)];
  if (!end || end.type !== 'turn/end') return { state: 'unknown', text: '', hostTurnIds, reason: 'Owned native turn has no terminal receipt' };
  const text = finalReply(events.slice(inputIndex), turn);
  if (end.data.reason.kind === 'completed') return { state: 'completed', hostTurnIds, text };
  if (end.data.reason.kind === 'aborted') return { state: 'cancelled', hostTurnIds, text: '', reason: 'Native turn confirms cancellation' };
  if (['error', 'blocked', 'max-tokens'].includes(end.data.reason.kind)) return { state: 'failed', hostTurnIds, text: '', reason: `Native turn ended: ${end.data.reason.kind}` };
  return { state: 'unknown', hostTurnIds, text: '', reason: `Native turn ended: ${end.data.reason.kind}` };
}

/** Uses only native registry, scoped policy, inbox, session flush and owned disposers. */
export class DshDriver implements NativeDriver {
  readonly kind = 'dsh' as const;
  private readonly handles = new Set<AgentHandle>();
  constructor(private readonly ctx: Context, private readonly options: {
    cwd: string; provider?: string; model?: string; maxOutputTokens?: number;
  }) {
    check(isAbsolute(options.cwd), 'Native cwd must be absolute');
    if (options.provider !== undefined) text(options.provider, 'native provider', 256);
    if (options.model !== undefined) text(options.model, 'native model', 256);
    integer(options.maxOutputTokens ?? 1024, 'maxOutputTokens', 1, 4096);
    this.options = Object.freeze({ ...options });
  }
  private async flush(agent: Agent): Promise<void> {
    const flushed = await this.ctx.sessions.flush(agent.session);
    if (!flushed) throw new Error('Native session flush was not accepted');
  }
  async run(input: Parameters<NativeDriver['run']>[0]): Promise<NativeRunResult> {
    let handle: AgentHandle;
    try { handle = await this.ctx.agents.create({ sessionId: input.sessionId as SessionId,
      meta: { cwd: this.options.cwd }, signal: input.signal,
      agentOptions: { ...(this.options.provider ? { provider: this.options.provider } : {}),
        ...(this.options.model ? { model: this.options.model } : {}), maxTokens: this.options.maxOutputTokens ?? 1024 },
      setup: (scope, agent) => {
        scope.systemPrompt.context({ name: 'codex-pet.identity', order: 10, required: true, interpolate: false,
          text: input.character });
        scope.systemPrompt.context({ name: 'codex-pet.dialogue', order: 20, required: true, interpolate: false, text: input.context ?? '' });
        scope.systemPrompt.section({ name: 'codex-pet.matter-tools', order: 100, interpolate: false,
          text: 'Interpret the owner’s intent from the full conversation. Use matter tools for requested outcomes and ongoing work, not ordinary chat or quoted commands. Reuse an existing matter when appropriate; ask if intent is ambiguous. Record concrete progress as work happens, store substantive analytical results with source evidence, and wait for successful tool receipts before claiming records changed. A tool call or model turn is not proof of external work. Reply naturally in the owner’s language with the actual result or precise missing dependency. Do not expose internal planning as the final answer.' });
        scope.tools.restrict({ allow: [] });
        const allowed = new Set((input.tools ?? []).map(tool => tool.name));
        for (const tool of input.tools ?? []) scope.tools.register(tool);
        let toolCalls = 0;
        scope.tools.guard(exec => {
          if (exec.agent?.id !== agent.id || !allowed.has(exec.name)) return 'Tool is outside this execution delegation';
          try { input.validate?.(); } catch { return 'Execution eligibility or admission changed'; }
          if (input.signal.aborted || ++toolCalls > (input.maxToolCalls ?? 0)) return 'Execution tool allowance exhausted or cancelled';
          return undefined;
        });
        let steps = 0;
        scope.on('agent/pre-step', async (payload, next) => {
          if (payload.agent.id !== agent.id) return next();
          if (input.signal.aborted || ++steps > input.maxSteps) return { kind: 'reject' };
          try { input.validate?.(); } catch { return { kind: 'reject' }; }
          return next();
        });
      },
    }); } catch {
      return { state: input.signal.aborted ? 'cancelled' : 'failed', text: '', hostTurnIds: [], reason: 'Native preparation failed before owner input handoff' };
    }
    this.handles.add(handle);
    const cancel = () => handle.agent.cancel({ kind: 'user' });
    const timer = setTimeout(cancel, input.maxDurationMs);
    input.signal.addEventListener('abort', cancel, { once: true });
    try {
      if (input.signal.aborted) return { state: 'cancelled', text: '', hostTurnIds: [], reason: 'Cancelled before input handoff' };
      const message: UserMessage = { id: input.messageId as UserMessage['id'], role: 'user',
        source: { kind: 'user' }, content: [{ type: 'text', text: input.text }] };
      handle.agent.followup(message);
      // Persist the inbox handoff as well as the settled turn. A restart never blindly replays it.
      await this.flush(handle.agent);
      await handle.agent.whenIdle();
      await this.flush(handle.agent);
      return nativeResult(handle.agent.session.snapshotEvents(), input.messageId);
    } finally {
      clearTimeout(timer); input.signal.removeEventListener('abort', cancel);
      await handle.dispose(); this.handles.delete(handle);
    }
  }
  async inspect(sessionId: string, messageId: string): Promise<NativeRunResult> {
    // Resume only the exact owned session. Pending inbox work is removed during setup;
    // reconciliation must never wake it or continue an interrupted turn.
    const handle = await this.ctx.agents.resume({ resumeSessionId: sessionId as SessionId,
      setup: (scope, agent) => {
        agent.inbox.clear(); scope.tools.restrict({ allow: [] });
        scope.tools.guard(() => 'Reconciliation never executes tools');
        scope.on('agent/pre-step', async () => ({ kind: 'reject' }));
      },
    });
    this.handles.add(handle);
    try {
      await handle.agent.whenIdle(); await this.flush(handle.agent);
      return nativeResult(handle.agent.session.snapshotEvents(), messageId);
    } finally { await handle.dispose(); this.handles.delete(handle); }
  }
  async inspectObserved(sessionId: string, messageId: string): Promise<NativeRunResult> {
    const native = this.ctx as unknown as { sessionPersistence: {
      open(id: SessionId, access: 'read'): Promise<{ read(): Promise<{ events: readonly SessionEvent[] }>; close(): Promise<void> }>;
    } };
    const handle = await native.sessionPersistence.open(sessionId as SessionId, 'read');
    try { return nativeResult((await handle.read()).events, messageId); }
    finally { await handle.close(); }
  }
  async close(): Promise<void> { await Promise.all([...this.handles].map(handle => handle.dispose())); this.handles.clear(); }
}
