import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type {} from './plugin.js';
import type {} from '@deepseek-ai/dsh-system-prompt';
import type {} from '@deepseek-ai/dsh-tools';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import { nativeResult } from './dsh-driver.js';
import type { PetCoreHost } from './index.js';

export const name = 'chatpet-agent';
export const inject = ['petCore', 'agents', 'systemPrompt', 'tools'];
interface WorkspaceView { id: string; path: string; sessionIds: readonly string[] }
interface NativeServices {
  get(name: 'workspaceRegistry'): { get(id: string): WorkspaceView | undefined } | undefined;
}
/** Core-owned workspace adapter. Native sessions keep their own preset and Agent. */
export function apply(ctx: Context, host: PetCoreHost = ctx.petCore): void {
  const native = ctx as unknown as NativeServices;
  const agents = new Map<string, Agent>();
  const inputs = new Map<string, string>();
  function inside(agent: Agent): boolean {
    const status = host.workspace.status();
    return status.target !== null
      && !agent.session.header.parentSession && agent.session.header.origin !== 'subagent'
      && Boolean(native.get('workspaceRegistry')?.get(status.target.id)?.sessionIds.includes(agent.id));
  }
  async function inspect(agent: Agent) {
    await agent.whenIdle(); await ctx.sessions.flush(agent.session);
    return nativeResult(agent.session.snapshotEvents(), inputs.get(agent.id) ?? '');
  }
  for (const [name, order] of [['identity', 10], ['user', 20]] as const) {
    ctx.systemPrompt.context({ name: `chatpet.${name}`, order, required: true, interpolate: false,
      text: context => context?.agent && inside(context.agent) ? host.native.context()[name] : '' });
  }
  // Register before the host freezes the step's tool catalog; activate only
  // for root sessions belonging to the explicitly bound native workspace.
  // Activation options are native 0.2.2 API; the retained dev SDK is 0.2.1.
  const tools = ctx.tools as unknown as { register(tool: ToolDefinition, options: { when(context: { agent?: Agent }): boolean }): () => void };
  for (const tool of host.native.tools()) tools.register(tool, {
    when: context => Boolean(context.agent && inside(context.agent) && host.workspace.status().state === 'ready'),
  });
  ctx.tools.guard(exec => {
    try {
      if (!exec.agent) return undefined;
      if (!host.native.historyEligible(exec.agent.id)) return 'Core-derived native history is no longer eligible';
      if (!inside(exec.agent)) return host.native.manages(exec.agent.id) ? 'Execution left the bound workspace' : undefined;
      host.native.guardTool(exec.agent.id);
    } catch { return 'Core admission, source eligibility or execution limit changed'; }
    return undefined;
  });
  ctx.on('agent/pre-step', async (payload, next) => {
    if (!host.native.historyEligible(payload.agent.id)) return { kind: 'reject' };
    if (!inside(payload.agent)) return host.native.manages(payload.agent.id) ? { kind: 'reject' } : next();
    agents.set(payload.agent.id, payload.agent);
    try {
      const input = payload.messages.find(message => message.source.kind === 'user');
      if (input && !inputs.has(payload.agent.id)) inputs.set(payload.agent.id, input.id);
      await host.native.begin(payload.agent.id, payload.turn, payload.messages, payload.signal, {
        cancel: () => payload.agent.cancel({ kind: 'user' }), inspect: () => inspect(payload.agent),
      });
      return next();
    } catch { return { kind: 'reject' }; }
  });
  ctx.on('session/event', (session, event) => {
    const agent = agents.get(session.id); if (!agent) return;
    if (event.type === 'tool/result') host.native.observeTool(session.id, String(event.seq), event.data);
    if (event.type === 'turn/end') {
      host.native.finish(session.id, nativeResult(session.snapshotEvents(), inputs.get(session.id) ?? ''));
      inputs.delete(session.id);
    }
  });
  ctx.on('agent/disposed', ({ agent }) => {
    if (!agents.has(agent.id)) return;
    void host.native.end(agent.id).finally(() => { agents.delete(agent.id); inputs.delete(agent.id); });
  });
  ctx.effect(() => async () => {
    for (const agent of agents.values()) if (inputs.has(agent.id)) agent.cancel({ kind: 'user' });
    await Promise.all([...agents.values()].map(agent => host.native.end(agent.id)));
    agents.clear(); inputs.clear();
  });
}
