export declare const FACT_DOMAINS: {
    readonly body: {
        readonly visit: true;
        readonly go: true;
        readonly place: true;
        readonly sick: true;
        readonly heal: true;
        readonly command: {
            readonly role: 1;
        };
        readonly pet: {
            readonly role: 2;
            readonly care: {
                readonly order: 3;
                readonly label: "摸摸头";
            };
            readonly feedback: true;
        };
        readonly poke: {
            readonly role: 3;
            readonly feedback: true;
        };
        readonly feed: {
            readonly role: 4;
            readonly care: {
                readonly order: 1;
                readonly label: "免费基础餐食";
            };
            readonly plan: 4;
            readonly feedback: true;
        };
        readonly water: {
            readonly role: 5;
            readonly care: {
                readonly order: 2;
                readonly label: "倒杯水";
            };
            readonly plan: 3;
            readonly feedback: true;
        };
        readonly play: {
            readonly role: 6;
            readonly care: {
                readonly order: 4;
                readonly label: "一起玩";
            };
            readonly plan: 5;
            readonly feedback: true;
        };
        readonly talk: {
            readonly role: 7;
            readonly feedback: true;
        };
        readonly sleep: {
            readonly role: 8;
            readonly care: {
                readonly order: 5;
                readonly label: "去睡觉";
            };
            readonly plan: 1;
        };
        readonly wake: {
            readonly role: 9;
            readonly care: {
                readonly order: 6;
                readonly label: "叫醒";
            };
            readonly plan: 2;
        };
        readonly lamp: {
            readonly role: 10;
        };
    };
    readonly economy: {
        readonly purchase: true;
        readonly sale: true;
        readonly 'money-grant': true;
        readonly 'item-gift': true;
        readonly 'reading-import': true;
    };
};
export type FactDomain = keyof typeof FACT_DOMAINS;
type FactType<Domain extends FactDomain> = keyof (typeof FACT_DOMAINS)[Domain];
export type BodyFactType = FactType<'body'>;
export type EconomyFactType = FactType<'economy'>;
export declare const FACT_DOMAIN_NAMES: readonly FactDomain[];
export declare function isFactDomain(value: unknown): value is FactDomain;
export declare function factDomainOf(id: string): FactDomain | undefined;
declare const FACT_ACTORS: {
    readonly owner: true;
    readonly companion: true;
    readonly system: true;
};
type FactActorKind = keyof typeof FACT_ACTORS;
export declare const FACT_ACTOR_NAMES: readonly FactActorKind[];
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
export type LegacyFactType = string & {
    readonly [legacyFactType]: true;
};
export type CompanionFact = {
    [Domain in FactDomain]: FactFields & {
        domain: Domain;
        type: FactType<Domain> | LegacyFactType;
    };
}[FactDomain];
export type NewCompanionFact = {
    [Domain in FactDomain]: FactFields & {
        domain: Domain;
        type: FactType<Domain>;
    };
}[FactDomain];
/** 校验原生会话准入所需的字段。历史 type 可以未知或缺失。 */
export declare function isValidFactEnvelope(fact: CompanionFact): boolean;
/** Each domain remains the authority. Consumers only acknowledge committed IDs. */
export interface CompanionFactSource {
    pendingFacts(workspaceId: string): Promise<CompanionFact[]>;
    readFacts(workspaceId: string, ids: readonly string[]): Promise<CompanionFact[]>;
    acknowledgeFacts(workspaceId: string, ids: readonly string[]): Promise<void>;
}
export {};
