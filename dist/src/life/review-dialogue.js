import { localDayStart } from '#dsh-world/memoryStore';
import { normalizeFind, normalizeRead } from '#dsh-world/memory';
import { formatLocalTime } from '#dsh-world/timeContext';
import { check } from '../core/storage.js';
/** Per-observation enrollment and original message identity come from Core. The
 * Bank decides what is still readable on each page, including excerpt withdrawals.
 * No second daily text archive is created. */
export async function readReviewDialogue(runtime, bank, sessionIds, input, validate, captureQueued) {
    const { query, limit: rows } = normalizeFind({ query: input.query }, input.timeZone);
    const { offset, limit: chars } = normalizeRead({ ref: 'dialogue', offset: input.offset });
    if (input.day !== undefined)
        check(localDayStart(input.day, input.timeZone), 'Invalid local day');
    const candidates = [];
    const queued = [];
    let coverage = 'eligible';
    for (const sessionId of new Set(sessionIds)) {
        const session = runtime.store.get('memory-session', sessionId);
        if (session?.workspaceId !== bank)
            continue;
        for (const id of runtime.store.get('native-session-sources', sessionId) ?? []) {
            const source = runtime.store.get('source', id);
            if (!source || (source.origin !== 'owner_statement' && source.origin !== 'model_interpretation'))
                continue;
            const work = runtime.store.get('memory-source-work', id);
            if (work?.workspaceId !== bank)
                continue;
            const time = formatLocalTime(new Date(source.recordedAt), input.timeZone);
            if ((input.day && time.slice(0, 10) !== input.day) || (query && !source.text.includes(query)))
                continue;
            if (!runtime.store.get('memory-ack', id)) {
                if (work.state !== 'queued') {
                    coverage = 'partial';
                    continue;
                }
                queued.push(id);
            }
            candidates.push({ id, sessionId, time: source.recordedAt, role: source.origin === 'owner_statement' ? 'user' : 'assistant', text: source.text });
        }
    }
    if (queued.length)
        await captureQueued(queued);
    candidates.sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
    const items = [];
    let position = 0, length = 0, nextOffset;
    for (const line of candidates) {
        const decision = await validate([line.id]);
        if (decision !== 'eligible') {
            if (decision === 'unknown')
                coverage = 'partial';
            continue;
        }
        const points = Array.from(line.text);
        if (offset >= position + points.length) {
            position += points.length;
            continue;
        }
        const start = Math.max(0, offset - position);
        if (items.length === rows || length === chars) {
            nextOffset = position + start;
            break;
        }
        const end = Math.min(points.length, start + chars - length);
        items.push({ ...line, time: formatLocalTime(new Date(line.time), input.timeZone), text: points.slice(start, end).join('') });
        length += end - start;
        if (end < points.length) {
            nextOffset = position + end;
            break;
        }
        position += points.length;
    }
    check(await validate(items.map(line => line.id)) === 'eligible', 'Dialogue sources changed during the read');
    return { items, nextOffset, coverage };
}
//# sourceMappingURL=review-dialogue.js.map