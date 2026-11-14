// Scoped Pet adapter for the original World WeChat module (MIT).
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { SpeakerIdentity } from '../ecosystem/shared/identity.js';
import type { createWechatModule as original } from '../ecosystem/wechat/index.js';
export declare function createWechatModule(deps: Parameters<typeof original>[0] & {
    dataDirectory?: string;
    toolAllowed(agent: Agent, name: string, args?: unknown): boolean;
    acceptBody(body: Record<string,unknown> | undefined): Record<string,unknown>;
    reachAllowed(accountId:string,chatId:string):boolean;
    canReply(identity: SpeakerIdentity, sessionId:string):boolean;
    receive(identity: SpeakerIdentity, ask: () => Promise<{id:string}>): Promise<{id?:string;text?:string;duplicate?:boolean}>;
}): ReturnType<typeof original> & {reach(identity:SpeakerIdentity,sessionId:string,text:string):Promise<void>};
