import { localDayStart } from '#dsh-world/memoryStore';
import { normalizeFind, normalizeRead } from '#dsh-world/memory';
import { formatLocalTime } from '#dsh-world/timeContext';
import type { EvidenceSource } from '../contracts/common.js';
import type { CoreRuntime } from '../core/core.js';
import { check } from '../core/storage.js';
import type { Decision } from '../memory/client.js';

export interface DialogueQuery { day?: string; timeZone: string; query?: string; offset?: number }
export interface DialogueLine {
  id: string; sessionId: string; time: string; role: 'user' | 'assistant'; text: string;
}

/** Per-observation enrollment and original message identity come from Core. The
 * Bank decides what is still readable on each page, including excerpt withdrawals.
 * No second daily text archive is created. */
export async function readReviewDialogue(runtime: CoreRuntime, bank: string, sessionIds: readonly string[],
  input: DialogueQuery, validate: (ids: string[]) => Promise<Decision>, captureQueued: (ids: string[]) => Promise<void>) {
  const { query, limit: rows } = normalizeFind({query: input.query}, input.timeZone);
  const { offset, limit: chars } = normalizeRead({ref: 'dialogue', offset: input.offset});
  if (input.day !== undefined) check(localDayStart(input.day, input.timeZone), 'Invalid local day');
  const candidates: DialogueLine[] = [];
  const queued: string[] = [];
  let coverage: 'eligible' | 'partial' = 'eligible';
  for (const sessionId of new Set(sessionIds)) {
    const session = runtime.store.get<{workspaceId: string}>('memory-session', sessionId);
    if (session?.workspaceId !== bank) continue;
    for (const id of runtime.store.get<string[]>('native-session-sources', sessionId) ?? []) {
      const source = runtime.store.get<EvidenceSource>('source', id);
      if (!source || (source.origin !== 'owner_statement' && source.origin !== 'model_interpretation')) continue;
      const work = runtime.store.get<{workspaceId: string; state: string}>('memory-source-work', id);
      if (work?.workspaceId !== bank) continue;
      const time = formatLocalTime(new Date(source.recordedAt), input.timeZone);
      if ((input.day && time.slice(0, 10) !== input.day) || (query && !source.text.includes(query))) continue;
      if (!runtime.store.get('memory-ack', id)) {
        if (work.state !== 'queued') { coverage = 'partial'; continue; }
        queued.push(id);
      }
      candidates.push({id, sessionId, time: source.recordedAt, role: source.origin === 'owner_statement' ? 'user' : 'assistant', text: source.text});
    }
  }
  if (queued.length) await captureQueued(queued);
  candidates.sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  const items: DialogueLine[] = [];
  let position = 0, length = 0, nextOffset: number | undefined;
  for (const line of candidates) {
    const decision = await validate([line.id]);
    if (decision !== 'eligible') {
      if (decision === 'unknown') coverage = 'partial';
      continue;
    }
    const points = Array.from(line.text);
    if (offset >= position + points.length) { position += points.length; continue; }
    const start = Math.max(0, offset - position);
    if (items.length === rows || length === chars) { nextOffset = position + start; break; }
    const end = Math.min(points.length, start + chars - length);
    items.push({...line, time: formatLocalTime(new Date(line.time), input.timeZone), text: points.slice(start, end).join('')});
    length += end - start;
    if (end < points.length) { nextOffset = position + end; break; }
    position += points.length;
  }
  check(await validate(items.map(line => line.id)) === 'eligible', 'Dialogue sources changed during the read');
  return {items, nextOffset, coverage};
}
