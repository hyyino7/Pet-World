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
//# sourceMappingURL=interaction.js.map