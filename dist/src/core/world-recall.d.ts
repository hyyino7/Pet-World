import type { Session, UserMessage } from '@deepseek-ai/dsh-session';
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        'chatpet-recall': {
            kind: 'chatpet-recall';
            form: 'recall';
            bank: string;
        };
    }
}
/** dsh-world 0.7.4 runtime.ts: select once per native turn or after compaction, admit
 * ahead of new input, and retire old recall nodes only inside an open step.
 * The authoritative material here is the existing scoped Mnemosyne projection. */
export declare class WorldRecall {
    private readonly sessions;
    refresh(session: Session, bank: string, firstStep: boolean): boolean;
    compacted(session: Session): void;
    prepare(session: Session, text: string): UserMessage | undefined;
    request(session: Session, turn: number, step: number, admitted: boolean): void;
}
