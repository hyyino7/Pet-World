import type { RequestContext, ModuleId } from '../contracts/common.js';
export interface Principal {
    module: ModuleId;
    actor: RequestContext['actor'];
    operations: readonly string[];
}
/** In-process host capability. Serialized RequestContext values never convey authority. */
export declare class CoreAuthority {
    private readonly companionId;
    private readonly scopeId;
    private readonly issued;
    constructor(companionId: string, scopeId: string);
    client(principal: Principal): {
        request: (requestId: string) => RequestContext;
    };
    verify(context: RequestContext, operation: string): Principal;
    owner(context: RequestContext, operation: string, ownerActorId: string): Principal;
}
