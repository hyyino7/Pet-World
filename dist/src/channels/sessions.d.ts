import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { UserMessage } from '@deepseek-ai/dsh-llm';
import { type SpeakerIdentity } from '#dsh-world/ecosystem/shared/identity';
import type { PetCoreHost } from '../core/index.js';
import type { NativeSourceContext } from '../core/native/conversation.js';
import type { SourceAdapter } from '../contracts/tables.js';
interface Options {
    dataDirectory: string;
    ownerHome(): Promise<Agent>;
    identityAllowed(identity: SpeakerIdentity): boolean;
    ownerIdentity(identity: SpeakerIdentity): boolean;
    active(): boolean;
}
interface ChannelSourceContext extends NativeSourceContext {
    sessionId: string;
    message: UserMessage;
}
interface ChannelAdmission {
    guest(sessionId: string): boolean;
    ownerActorId(): string;
    admit(sessionId: string, message: UserMessage): 'owner' | 'guest' | undefined;
}
export declare function createChannelSourceAdapter(routes: ChannelAdmission): SourceAdapter<ChannelSourceContext> & {
    isGuest(sessionId: string): boolean;
};
/** World owns per-conversation session recovery. Native workspace membership
 * stores the routing association, including across process restarts. */
export declare function createChannelHomes(ctx: Context, host: PetCoreHost, options: Options): {
    open(supplied: SpeakerIdentity, expectedSessionId?: string): Promise<Agent>;
    owns: (id: string) => boolean;
    identityFor: (id: string) => SpeakerIdentity | undefined;
    allowsReply: (id: string, supplied: SpeakerIdentity) => boolean;
    /** Adapter-only capability for the one retry of an actually admitted QQ input.
     * Source-kind text alone never grants native or guest admission. */
    replyNudge(id: string, original: UserMessage, message: UserMessage): () => void;
    stop(): void;
};
export {};
