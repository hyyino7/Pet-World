import { BODY_ACTIONS } from './behavior.js';

export const FACT_DOMAINS = {
  body: { ...BODY_ACTIONS, visit: true, go: true, place: true, sick: true, heal: true },
  economy: { purchase: true, sale: true, 'money-grant': true, 'item-gift': true, 'reading-import': true },
} as const;
export type FactDomain = keyof typeof FACT_DOMAINS;
type FactType<Domain extends FactDomain> = keyof (typeof FACT_DOMAINS)[Domain];
export type BodyFactType = FactType<'body'>;
export type EconomyFactType = FactType<'economy'>;
export const FACT_DOMAIN_NAMES = Object.keys(FACT_DOMAINS) as readonly FactDomain[];

export function isFactDomain(value: unknown): value is FactDomain {
  return typeof value === 'string' && Object.hasOwn(FACT_DOMAINS, value);
}

export function factDomainOf(id: string): FactDomain | undefined {
  return FACT_DOMAIN_NAMES.find(domain => id.startsWith(`${domain}:`));
}

const FACT_ACTORS = { owner: true, companion: true, system: true } as const;
type FactActorKind = keyof typeof FACT_ACTORS;
export const FACT_ACTOR_NAMES = Object.keys(FACT_ACTORS) as readonly FactActorKind[];

/** Committed domain facts, not user messages, model decisions or animation receipts. */
export interface CompanionFactActor {
  kind: FactActorKind;
  id: string;
  channel: string;
  sessionId?: string;
}

interface FactFields {
  version: 1;
  id: string;
  requestId: string;
  occurredAt: string;
  actor: CompanionFactActor;
  result: {
    status: 'completed' | 'failed' | 'unchanged';
    summary: string;
    before?: Record<string, number>;
    after?: Record<string, number>;
  };
  operationId?: string;
}

declare const legacyFactType: unique symbol;
/** 原样读取历史记录中的未登记字符串。新事实写入时只用所属领域的已登记类型。 */
export type LegacyFactType = string & { readonly [legacyFactType]: true };

export type CompanionFact = {
  [Domain in FactDomain]: FactFields & { domain: Domain; type: FactType<Domain> | LegacyFactType };
}[FactDomain];

export type NewCompanionFact = {
  [Domain in FactDomain]: FactFields & { domain: Domain; type: FactType<Domain> };
}[FactDomain];

/** 校验原生会话准入所需的字段。历史 type 可以未知或缺失。 */
export function isValidFactEnvelope(fact: CompanionFact): boolean {
  return fact.version === 1 && typeof fact.id === 'string' && typeof fact.requestId === 'string' && isFactDomain(fact.domain)
    && fact.actor && FACT_ACTOR_NAMES.includes(fact.actor.kind) && typeof fact.actor.id === 'string' && fact.actor.id.length > 0
    && typeof fact.actor.channel === 'string' && typeof fact.result?.summary === 'string' && Number.isFinite(Date.parse(fact.occurredAt));
}

/** Each domain remains the authority. Consumers only acknowledge committed IDs. */
export interface CompanionFactSource {
  pendingFacts(workspaceId: string): Promise<CompanionFact[]>;
  readFacts(workspaceId: string, ids: readonly string[]): Promise<CompanionFact[]>;
  acknowledgeFacts(workspaceId: string, ids: readonly string[]): Promise<void>;
}
