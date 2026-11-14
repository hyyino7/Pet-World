import { CONTRACT_VERSION } from '../contracts/version.js';
import { reject, text } from './storage.js';
/** In-process host capability. Serialized RequestContext values never convey authority. */
export class CoreAuthority {
    companionId;
    scopeId;
    issued = new WeakMap();
    constructor(companionId, scopeId) {
        this.companionId = companionId;
        this.scopeId = scopeId;
    }
    client(principal) {
        const grant = structuredClone(principal);
        return Object.freeze({ request: (requestId) => {
                text(requestId, 'requestId', 256);
                const actor = Object.freeze({ ...grant.actor });
                const context = Object.freeze({ contractVersion: CONTRACT_VERSION, requestId,
                    companionId: this.companionId, scopeId: this.scopeId, actor });
                this.issued.set(context, grant);
                return context;
            } });
    }
    verify(context, operation) {
        const grant = this.issued.get(context);
        if (!grant || context.companionId !== this.companionId || context.scopeId !== this.scopeId)
            reject('UNAUTHORIZED', 'Request context was not issued by this Core host');
        if (!grant.operations.includes(operation) && !grant.operations.includes('*'))
            reject('UNAUTHORIZED', `Principal cannot call ${operation}`);
        return grant;
    }
    owner(context, operation, ownerActorId) {
        const grant = this.verify(context, operation);
        if (grant.actor.kind !== 'owner' || grant.actor.id !== ownerActorId)
            reject('UNAUTHORIZED', 'Owner authority required');
        return grant;
    }
}
//# sourceMappingURL=authority.js.map