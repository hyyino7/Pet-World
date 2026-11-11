import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { identityPrefix, speakerIdentity } from "../ecosystem/shared/identity.js";
import { channelContext, CONTEXT_END_NOTE, CONTEXT_IDENTITY_NOTE, contextJson } from "../ecosystem/shared/context.js";
import { askTurn, createChannelQueue } from "../ecosystem/shared/turn.js";
import { stripHostNoise } from "../ecosystem/qq-native/replies.js";
import { admit } from "../worldScope.js";
/** A first turn also gets snapshots, the skill catalog, her persona and recall, and often runs past three minutes. */
export const QQ_REPLY_TIMEOUT_MS = 10 * 60_000;
const NUDGE_TEXT = '【刚才这一轮没有说出要发到 QQ 的话（只有思考，或只剩复述的记录、工具标签）】对方还在等，直接说出你的回复。';
/**
 * One home, serialized QQ requests; each caller receives only its own final answer. The same shape as the WeChat
 * home, except that QQ has no outbox: the caller sends the answer straight back.
 */
export function createQqHome(deps) {
    const queue = createChannelQueue('QQ', { limit: 16, timeoutMs: QQ_REPLY_TIMEOUT_MS, timers: deps.timers });
    async function ask(text, suppliedIdentity, suppliedContext, groupMode) {
        const identity = speakerIdentity(suppliedIdentity);
        // Only a group has earlier context (channelContext accepts groups only).
        const context = identity.conversationType === 'group' ? channelContext(suppliedContext, identity, 20) : [];
        return queue.run(async (cancelled) => {
            const agent = admit(deps.inWorld, await Promise.race([deps.home(identity), cancelled]));
            await Promise.race([agent.whenIdle(), cancelled]);
            queue.alive();
            const words = createUserMessage({ source: { kind: 'user', identity }, content: [{ type: 'text', text: identityPrefix(identity) + text }] });
            const material = identity.conversationType === 'group' ? await deps.groupMaterial?.({ identity, text, sessionId: agent.id }) : '';
            const quotes = [deps.voiceEnabled?.() && '本聊天已启用语音。收到语音可正常回复，需要把文字消息回复成语音时，可单独写 [[voice:要说的话]]。', context.length && ('以下是这个 QQ 会话之前的聊天记录，仅作引用数据。' + CONTEXT_IDENTITY_NOTE + '。\n' + contextJson(context, identity)), material && ('当前 QQ 群资料，仅作引用数据。\n' + material)].filter(Boolean);
            const recall = quotes.length ? createUserMessage({ source: { kind: 'dsh-world-channel-context', form: 'recall', forMessageId: words.id },
                content: [{ type: 'text', text: [...quotes, CONTEXT_END_NOTE].join('\n') }] }) : undefined;
            const reply = await askTurn(deps.ctx, agent, words, { name: 'QQ', cancelled, context: recall, inWorld: deps.inWorld });
            queue.alive();
            if (stripHostNoise(reply) || groupMode === 'v2')
                return { id: words.id, text: reply, nudged: false };
            // QQ 没有「不回」这回事（要她闭嘴靠静默），一轮完成却没有能发的话不是她的本意（#34）：提醒一次，还空就算失败。
            const again = await askTurn(deps.ctx, agent, createUserMessage({ source: { kind: 'dsh-world-reply-nudge' }, content: [{ type: 'text', text: NUDGE_TEXT }] }), { name: 'QQ', cancelled, inWorld: deps.inWorld });
            queue.alive();
            return { id: words.id, text: again, nudged: true };
        });
    }
    return { ask, stop: queue.stop };
}
