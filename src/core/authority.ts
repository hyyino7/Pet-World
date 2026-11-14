import { CONTRACT_VERSION } from '../contracts/version.js';
import type { RequestContext, ModuleId } from '../contracts/common.js';
import { reject, text } from './storage.js';

export interface Principal {
  module: ModuleId; actor: RequestContext['actor']; operations: readonly string[];
}
/** In-process host capability. Serialized RequestContext values never convey authority. */
export class CoreAuthority {
  private readonly issued = new WeakMap<RequestContext, Principal>();
  constructor(private readonly companionId: string, private readonly scopeId: string) {}
  client(principal: Principal): { request: (requestId: string) => RequestContext } {
    const grant = structuredClone(principal);
    return Object.freeze({ request: (requestId: string) => {
      text(requestId, 'requestId', 256);
      const actor = Object.freeze({ ...grant.actor });
      const context: RequestContext = Object.freeze({ contractVersion: CONTRACT_VERSION, requestId,
        companionId: this.companionId, scopeId: this.scopeId, actor });
      this.issued.set(context, grant);
      return context;
    } });
  }
  verify(context: RequestContext, operation: string): Principal {
    const grant = this.issued.get(context);
    if (!grant || context.companionId !== this.companionId || context.scopeId !== this.scopeId)
      reject('UNAUTHORIZED', 'Request context was not issued by this Core host');
    if (!grant.operations.includes(operation) && !grant.operations.includes('*'))
      reject('UNAUTHORIZED', `Principal cannot call ${operation}`);
    return grant;
  }
  owner(context: RequestContext, operation: string, ownerActorId: string): Principal {
    const grant = this.verify(context, operation);
    if (grant.actor.kind !== 'owner' || grant.actor.id !== ownerActorId) reject('UNAUTHORIZED', 'Owner authority required');
    return grant;
  }
}
