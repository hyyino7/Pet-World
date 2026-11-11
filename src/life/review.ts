import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools';
import { fileURLToPath } from 'node:url';
import type { PetCoreHost } from '../core/index.js';
import { check } from '../core/storage.js';
import { registerWorldPrompt } from '../core/world-prompt.js';
import { readSelfPrompt, trackLifeWriting, type ReviewScope } from './review-writing.js';
export { readLifeWriting, type ReviewScope } from './review-writing.js';

// Only the daily review section is adapted. World supplies the original alarm
// text and fallback for every other section.
export const REVIEW_ALARM_FILE = fileURLToPath(new URL('../../../locale/life/review-alarm.md', import.meta.url));

export function installLifeReview(ctx: Context, host: PetCoreHost, getScope: () => ReviewScope | undefined) {
  const prepared = new WeakMap<Agent, {workspaceId: string; text: string}>();
  registerWorldPrompt(ctx, 'chatpet.life.self', 35, agent => {
    const scope = getScope(), saved = prepared.get(agent);
    return scope && scope.running!==false && saved?.workspaceId === scope.id && ctx.petWorld.sessionStatus(agent.session)?.state === 'ready' ? saved.text : '';
  }, async agent => {
    prepared.delete(agent);
    const scope = getScope();
    if (!scope || scope.running===false || ctx.petWorld.sessionStatus(agent.session)?.state !== 'ready') return;
    const text = await readSelfPrompt(host, scope, agent.id, false);
    if (text && getScope()?.id === scope.id) prepared.set(agent, {workspaceId: scope.id, text});
  }, async agent => {
    const saved = prepared.get(agent);
    if (!saved) return;
    const scope = getScope();
    check(scope?.id === saved.workspaceId && await readSelfPrompt(host, scope, agent.id, true) === saved.text,
      'Life writing changed during native step admission');
  });
  trackLifeWriting(ctx, host, getScope);
  const tool = defineTool({
    name: 'read_review_dialogue',
    description: '回顾某个本地日期工作区里当前允许读取的聊天原文。user 是伙伴说的话，assistant 是助手的回复。返回 nextOffset 时可继续读取。partial 表示部分来源无法核实。',
    parameters: {day: {type: 'string', required: true}, offset: {type: 'integer'}},
    output: {schema: {type: 'string'}, render: (_args, value) => [{type: 'text', text: value}]},
    execute: async ({day, offset}, exec) => {
      const scope = getScope(), id = exec.agent?.id;
      check(id && scope && scope.isHome(id), 'The Life home is unavailable');
      const memory = host.native.memoryFor(id);
      check(memory && host.native.manages(id), 'Review requires an admitted Memory conversation');
      check(typeof day === 'string' && day.length === 10, 'Expected a local date');
      const page = await memory.dialogueForDay(scope.id, scope.sessionIds, {day, timeZone: scope.timeZone, offset});
      const current = getScope();
      check(current?.id === scope.id && current.isHome(id) && page.items.every(line => current.sessionIds.includes(line.sessionId)),
        'Review workspace changed');
      await host.native.useSources(id, page.items.map(line => line.id));
      check(getScope()?.isHome(id), 'Life paused during the read');
      return JSON.stringify(page);
    },
  });
  const tools = ctx.tools as unknown as {register(value: ToolDefinition, options: {when(context: {agent?: Agent}): boolean}): () => void};
  tools.register(tool, {when: ({agent}) => Boolean(agent && getScope()?.isHome(agent.id) && host.native.memoryFor(agent.id))});
}
