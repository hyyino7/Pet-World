import { createSystemMessage, createUserMessage } from '@deepseek-ai/dsh-llm';
import type { Session, UserMessage } from '@deepseek-ai/dsh-session';

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap { 'chatpet-recall': {kind: 'chatpet-recall'; form: 'recall'; bank: string} }
}
interface Refresh { bank: string; loaded: boolean; lastRequestAt?: number; replacement?: {id?: string} }

/** dsh-world 0.7.4 runtime.ts: select on open, cold turn or compaction, admit
 * ahead of new input, and retire old recall nodes only inside an open step.
 * The authoritative material here is the existing scoped Mnemosyne projection. */
export class WorldRecall {
  private readonly sessions = new WeakMap<Session, Refresh>();
  constructor(private readonly now: () => number = Date.now) {}
  refresh(session: Session, bank: string, firstStep: boolean, hours: number): boolean {
    let state = this.sessions.get(session);
    if (!state || state.bank !== bank) {
      state = {bank, loaded: false};
      this.sessions.set(session, state);
    }
    return !state.loaded || firstStep && state.lastRequestAt !== undefined && this.now() - state.lastRequestAt >= hours * 3_600_000;
  }
  compacted(session: Session) {
    const state = this.sessions.get(session);
    if (state) state.loaded = false;
  }
  prepare(session: Session, text: string): UserMessage | undefined {
    const state = this.sessions.get(session)!;
    const message = text ? createUserMessage({source:{kind:'chatpet-recall', form:'recall', bank:state.bank}, content:[{type:'text',text}]}) : undefined;
    state.replacement = {id:message?.id};
    return message;
  }
  request(session: Session, turn: number, step: number, admitted: boolean) {
    const state = this.sessions.get(session);
    if (admitted && state) state.lastRequestAt = this.now();
    if (admitted && !state?.replacement) return;
    for (const seq of [...session.surface.nodes]) {
      const event = session.eventAt(seq);
      if (event?.type !== 'user/message' || event.data.source.kind !== 'chatpet-recall'
        || admitted && event.data.id === state?.replacement?.id) continue;
      session.append('system/message', {turn, step, message:createSystemMessage('')}, {
        surfaceOp:{op:'replace', startSeq:seq, endSeq:seq}, sourceEventSeqs:[seq],
      });
    }
    if (admitted && state) { state.loaded = true; delete state.replacement; }
    else this.sessions.delete(session);
  }
}
