import { lastAssistantStreamChunk } from '@deepseek-ai/dsh-llm';
import { digest } from '../core/storage.js';
import { speakerIdentity } from '#dsh-world/ecosystem/shared/identity';
const empty = { requests: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, unreported: 0 };
export function channelUsage(ctx, host, storageId, allowed) {
    const originals = new Map(), store = host.workspace.runtime.store;
    const key = (channel, accountId) => digest([storageId, channel, accountId]);
    const read = (channel, accountId) => store.get('channel-usage', key(channel, accountId)) ?? { ...empty };
    const stop = ctx.on('session/event', (session, event) => {
        if (event.type === 'turn/start' || event.type === 'turn/end') {
            originals.delete(session.id);
            return;
        }
        if (event.type === 'user/message' && event.data.source.kind === 'user') {
            originals.delete(session.id);
            if (!('identity' in event.data.source))
                return;
            let id;
            try {
                id = speakerIdentity(event.data.source.identity);
            }
            catch {
                return;
            }
            if (allowed(session.id, id))
                originals.set(session.id, id);
            return;
        }
        const id = originals.get(session.id);
        if (!id || !allowed(session.id, id) || event.type !== 'assistant/message' && event.type !== 'assistant/attempt')
            return;
        const usage = event.type === 'assistant/message' ? event.data.usage : lastAssistantStreamChunk(event.data.stream, 'usage')?.usage;
        const entry = digest([storageId, session.id, event.seq]);
        store.transaction(() => {
            if (store.get('channel-usage-event', entry))
                return;
            store.put('channel-usage-event', entry, true);
            const total = read(id.channel, id.accountId);
            total.requests++;
            if (usage) {
                total.inputTokens += usage.inputTokens;
                total.outputTokens += usage.outputTokens;
                total.cacheReadTokens += usage.cacheReadTokens ?? 0;
            }
            else
                total.unreported++;
            store.put('channel-usage', key(id.channel, id.accountId), total);
        });
    });
    return { read, stop };
}
//# sourceMappingURL=usage.js.map