import { createSystemMessage, createUserMessage } from '@deepseek-ai/dsh-llm';
/** dsh-world 0.7.4 runtime.ts: select once per native turn or after compaction, admit
 * ahead of new input, and retire old recall nodes only inside an open step.
 * The authoritative material here is the existing scoped Mnemosyne projection. */
export class WorldRecall {
    sessions = new WeakMap();
    refresh(session, bank, firstStep) {
        let state = this.sessions.get(session);
        if (!state || state.bank !== bank) {
            state = { bank, loaded: false };
            this.sessions.set(session, state);
        }
        return !state.loaded || firstStep;
    }
    compacted(session) {
        const state = this.sessions.get(session);
        if (state)
            state.loaded = false;
    }
    prepare(session, text) {
        const state = this.sessions.get(session);
        const message = text ? createUserMessage({ source: { kind: 'chatpet-recall', form: 'recall', bank: state.bank }, content: [{ type: 'text', text }] }) : undefined;
        state.replacement = { id: message?.id };
        return message;
    }
    request(session, turn, step, admitted) {
        const state = this.sessions.get(session);
        if (admitted && !state?.replacement)
            return;
        for (const seq of [...session.surface.nodes]) {
            const event = session.eventAt(seq);
            if (event?.type !== 'user/message' || event.data.source.kind !== 'chatpet-recall'
                || admitted && event.data.id === state?.replacement?.id)
                continue;
            session.append('system/message', { turn, step, message: createSystemMessage('') }, {
                surfaceOp: { op: 'replace', startSeq: seq, endSeq: seq }, sourceEventSeqs: [seq],
            });
        }
        if (admitted && state) {
            state.loaded = true;
            delete state.replacement;
        }
        else
            this.sessions.delete(session);
    }
}
//# sourceMappingURL=world-recall.js.map