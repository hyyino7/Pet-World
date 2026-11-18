import type { CapabilityStatus, ServiceCall } from '../contracts/common.js';
import type { AttentionPolicy, CompanionIdentity, CoreService } from '../contracts/core.js';
import type { CapabilityRegistration } from '../contracts/tables.js';
import { CoreAuthority } from './authority.js';
import { type ConversationOptions } from './options.js';
import { CoreStore } from './storage.js';
import { CapabilityTable } from './tables/capabilities.js';
export interface CoreConfig {
    dataDir: string;
    companionId: string;
    scopeId: string;
    ownerActorId: string;
    displayName: string;
    character: string;
    conversation?: Partial<ConversationOptions>;
    memory?: import('../memory/client.js').MemoryConfig;
}
/** Companion configuration and native integration storage. DSH owns execution. */
export declare class CoreRuntime {
    readonly config: CoreConfig;
    readonly store: CoreStore;
    private readonly authority;
    readonly owner: ReturnType<CoreAuthority['client']>;
    readonly core: CoreService;
    readonly bootId: string;
    readonly defaultConversation: Readonly<ConversationOptions>;
    files?: import('./workspace.js').CoreWorkspace;
    fileEffect: boolean;
    private stopped;
    onChange: (operation: string, value: unknown) => void;
    readonly capabilityTable: CapabilityTable;
    readonly capabilityStatuses: Partial<Record<CapabilityStatus['id'], () => ReturnType<CapabilityRegistration['status']> | undefined>>;
    capabilities: () => CapabilityStatus[];
    constructor(config: CoreConfig);
    private validateIdentity;
    identity(): CompanionIdentity;
    policy(): AttentionPolicy;
    get conversation(): Readonly<ConversationOptions>;
    /** Configuration API authority, compare-and-set and request deduplication. */
    call<I, O>(name: string, write: boolean, fn: (input: I) => O): ServiceCall<I, O>;
    private registerBaseCapabilities;
    close(): void;
}
