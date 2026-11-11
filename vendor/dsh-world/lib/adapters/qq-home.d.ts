import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { type SpeakerIdentity } from '../ecosystem/shared/identity.ts';
import type { LifeTimers } from '../life/alarmTimer.ts';
import { type ChannelContextMessage } from '../ecosystem/shared/context.ts';
import { type InWorld } from '../worldScope.ts';
/** A first turn also gets snapshots, the skill catalog, her persona and recall, and often runs past three minutes. */
export declare const QQ_REPLY_TIMEOUT_MS: number;
/**
 * One home, serialized QQ requests; each caller receives only its own final answer. The same shape as the WeChat
 * home, except that QQ has no outbox: the caller sends the answer straight back.
 */
export declare function createQqHome(deps: {
    ctx: Context;
    home(identity: SpeakerIdentity): Promise<Agent>;
    voiceEnabled?():boolean;
    groupMaterial?(input: {identity: SpeakerIdentity; text: string; sessionId: string}): string | Promise<string>;
    inWorld?: InWorld;
    timers?: LifeTimers;
}): {
    ask: (text: string, suppliedIdentity: SpeakerIdentity, suppliedContext?: ChannelContextMessage[], groupMode?: 'v1'|'v2') => Promise<{
        id: string;
        text: string;
        nudged: boolean;
    }>;
    stop: () => void;
};
