import { BODY_ACTIONS } from './behavior.js';
export const FACT_DOMAINS = {
    body: { ...BODY_ACTIONS, visit: true, go: true, place: true, sick: true, heal: true },
    economy: { purchase: true, sale: true, 'money-grant': true, 'item-gift': true, 'reading-import': true },
};
export const FACT_DOMAIN_NAMES = Object.keys(FACT_DOMAINS);
export function isFactDomain(value) {
    return typeof value === 'string' && Object.hasOwn(FACT_DOMAINS, value);
}
export function factDomainOf(id) {
    return FACT_DOMAIN_NAMES.find(domain => id.startsWith(`${domain}:`));
}
const FACT_ACTORS = { owner: true, companion: true, system: true };
export const FACT_ACTOR_NAMES = Object.keys(FACT_ACTORS);
/** 校验原生会话准入所需的字段。历史 type 可以未知或缺失。 */
export function isValidFactEnvelope(fact) {
    return fact.version === 1 && typeof fact.id === 'string' && typeof fact.requestId === 'string' && isFactDomain(fact.domain)
        && fact.actor && FACT_ACTOR_NAMES.includes(fact.actor.kind) && typeof fact.actor.id === 'string' && fact.actor.id.length > 0
        && typeof fact.actor.channel === 'string' && typeof fact.result?.summary === 'string' && Number.isFinite(Date.parse(fact.occurredAt));
}
//# sourceMappingURL=interaction.js.map