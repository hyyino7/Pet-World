import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { createSystemMessage, createUserMessage, type ContextFormed } from '@deepseek-ai/dsh-llm';
import type { Session } from '@deepseek-ai/dsh-session';
import { joinContextSections } from '@deepseek-ai/dsh-system-prompt';
import { reassembleOnChange } from '#dsh-world/worldScope';

// dsh-agent-loop supplies this upstream message source at runtime.
declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap { 'runtime-context': { kind: 'runtime-context' } & ContextFormed }
}

const previousSections = new Set(['chatpet.identity', 'chatpet.user', 'chatpet.memory-policy', 'chatpet.expression',
  'chatpet.expression-guide', 'chatpet.memory']);
// Any remaining section must pick up a removed sibling's pending change when
// an optional component is unloaded between two turns of the same Agent.
const restart = new WeakMap<Agent, symbol>();
const admitted = new WeakMap<Agent, symbol>();
const dynamicValues = new WeakMap<Agent, Map<string,string>>();

/** Retire only this adapter's superseded operational views, retaining every
 * original native event and all other producers' context sections. Keeping the
 * latest equal snapshot avoids needless prefix edits between unchanged steps.
 * This is positional native projection, not a summary or a memory deletion. */
export function retireDynamicContext(agent: Agent, turn: number, step: number): void {
  const values=dynamicValues.get(agent);if(!values)return;
  const session=agent.session;
  const nodes=[...session.surface.nodes].flatMap(seq=>{
    const event=session.eventAt(seq);
    return event?.type==='user/message' && event.data.source.kind==='runtime-context' && event.data.source.form==='snapshot'
      && event.data.source.sections.some(section=>values.has(section.name)) ? [event] : [];
  });
  const latest=nodes.at(-1);
  const current=[...values].filter(([,text])=>text);
  const retainedOtherSections=new Set([...session.surface.nodes].flatMap(seq=>{
    const event=session.eventAt(seq);
    if(event?.type!=='user/message'||event.data.source.kind!=='runtime-context'||event.data.source.form!=='snapshot')return [];
    return event.data.source.sections.some(section=>values.has(section.name))?[]:[JSON.stringify(event.data.source.sections)];
  }));
  for(const event of nodes) {
    const source=event.data.source;
    if(source.kind!=='runtime-context'||source.form!=='snapshot')continue;
    const owned=source.sections.filter(section=>values.has(section.name));
    if(event===latest && owned.length===current.length && current.every(([name,text])=>owned.some(section=>section.name===name && section.text===text)))continue;
    let sections=source.sections.filter(section=>!values.has(section.name));
    // A full native snapshot also repeats other producers' unchanged sections.
    // Retain their exact content once; never drop a distinct contribution.
    const signature=JSON.stringify(sections);
    if(retainedOtherSections.has(signature))sections=[];
    else retainedOtherSections.add(signature);
    const intent={surfaceOp:{op:'replace' as const,startSeq:event.seq,endSeq:event.seq},sourceEventSeqs:[event.seq]};
    if(sections.length)session.append('user/message',createUserMessage({source:{...source,sections},content:[{type:'text',text:joinContextSections(sections)}]}),intent);
    else session.append('system/message',{turn,step,message:createSystemMessage('')},intent);
  }
}

/** Replace each surviving legacy snapshot at its original position, retaining
 * other producers' sections and the complete original event in the native log.
 * Like World's retireRecall, run in agent/request while a native step is open. */
export function retireLegacyPrompt(session: Session, turn: number, step: number, bound: boolean): void {
  for (const seq of [...session.surface.nodes]) {
    const event = session.eventAt(seq);
    if (event?.type !== 'user/message') continue;
    const { source } = event.data;
    if (source.kind !== 'runtime-context' || source.form !== 'snapshot') continue;
    const sections = source.sections.filter(section =>
      !previousSections.has(section.name) && (bound || !section.name.startsWith('chatpet.')));
    if (sections.length === source.sections.length) continue;
    const intent = { surfaceOp: { op: 'replace' as const, startSeq: seq, endSeq: seq }, sourceEventSeqs: [seq] };
    if (sections.length) {
      session.append('user/message', createUserMessage({
        source: { ...source, sections }, content: [{ type: 'text', text: joinContextSections(sections) }],
      }), intent);
    } else {
      session.append('system/message', { turn, step, message: createSystemMessage('') }, intent);
    }
  }
}

/**
 * Scoped prompt placement and request-series refresh adapted from dsh-world
 * 0.7.4 (promptSection.ts, worldScope.ts and runtime.ts, MIT). The caller's
 * reader supplies the bound Repo's content and returns '' outside its scope.
 */
export interface WorldPromptRegistration {
  (): void;
  /** Share the same per-Agent section map across native preset waterfalls. */
  attach(scope: Context): void;
}

export function registerWorldPrompt(
  ctx: Context, name: string, order: number, read: (agent: Agent) => string,
  prepare?: (agent: Agent) => Promise<void>,
  admit?: (agent: Agent) => Promise<void>,
  dynamic = false,
): WorldPromptRegistration {
  const entries = new Map<Agent, { text: string; dispose: () => void }>();
  function sync(agent: Agent): boolean {
    const text = read(agent);
    if(dynamic) {
      let values=dynamicValues.get(agent);
      if(!values)dynamicValues.set(agent,values=new Map());
      values.set(name,text);
    }
    const entry = entries.get(agent);
    if (text === (entry?.text ?? '')) return false;
    if (entry && !text) {
      entry.dispose();
      entries.delete(agent);
    } else if (entry) entry.text = text;
    else {
      const contribution = {
        name, order, interpolate: false,
        text: (context: {agent?: Agent}) => context.agent === agent ? entries.get(agent)?.text ?? '' : '',
      };
      const dispose = dynamic ? agent.ctx.systemPrompt.context({...contribution,required:true})
        : agent.ctx.systemPrompt.section(contribution);
      entries.set(agent, { text, dispose });
    }
    if (!dynamic) restart.set(agent, Symbol());
    return true;
  }
  const scopes = new Map<Context, () => void>();
  let stopped = false;
  const attach = (scope: Context) => {
    if (stopped || scopes.has(scope)) return;
    const offAssembly = reassembleOnChange(scope, sync);
    // The native loop assembles the system prompt before agent/pre-step. A
    // scoped asynchronous reader must finish before the original sync listener
    // selects sections, then join its scoped material after the native step starts.
    const offPrepare = prepare && scope.on('system-prompt/assemble', async (_assembly, context, next) => {
      if (context.agent) await prepare(context.agent);
      return next();
    }, {prepend: true, global: true});
    const offPreStep = scope.on('agent/pre-step', async ({ agent }, next) => {
      const decision = await next();
      if (admit && decision.kind === 'enter') await admit(agent);
      const pending = restart.get(agent);
      if (decision.kind !== 'enter' || !pending) return decision;
      admitted.set(agent, pending);
      return { ...decision, startsRequestSeries: true };
    }, {global: true});
    // A cancelled admission may finish before DSH records a request. Keep the
    // restart pending so a retry can still replace the prior in-history prompt.
    const offAdmission = scope.on('session/event', (session, event) => {
      if (event.type !== 'assistant/message') return;
      const agent = ctx.agents.get(session.id);
      if (agent && restart.get(agent) === admitted.get(agent)) restart.delete(agent);
    }, {global: true});
    const offAgent = scope.on('agent/disposed', ({ agent }) => {
      entries.get(agent)?.dispose();
      entries.delete(agent);
    }, {global: true});
    const detach = () => {
      if (!scopes.delete(scope)) return;
      offPrepare?.(); offAssembly(); offPreStep(); offAdmission(); offAgent();
    };
    scopes.set(scope, detach);
    scope.effect(() => detach);
  };
  const dispose = Object.assign(() => {
    if (stopped) return;
    stopped = true;
    for (const detach of [...scopes.values()]) detach();
    for (const [agent, entry] of entries) {
      entry.dispose();
      if(dynamic)dynamicValues.get(agent)?.set(name,'');
      if (!dynamic) restart.set(agent, Symbol());
    }
    entries.clear();
  }, {attach});
  attach(ctx);
  ctx.effect(() => dispose);
  return dispose;
}

/** DSH owns durable tail snapshots and admission. Operational data is never
 * rendered into the leading system prompt. */
export function registerWorldContext(
  ctx: Context, name: string, order: number, read: (agent: Agent) => string,
  prepare?: (agent: Agent) => Promise<void>,
): WorldPromptRegistration {
  return registerWorldPrompt(ctx,name,order,read,prepare,undefined,true);
}
