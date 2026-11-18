import type { Context } from '@deepseek-ai/cordis';
import type { PetCoreHost, WorkspaceTarget } from '../core/index.js';
import type { RoomEconomyPort } from '../behavior/room.js';
import { EconomyStore } from './store.js';
import type { EconomyConfigurationPatch, ItemUse } from './types.js';
import type { CompanionFact, CompanionFactActor } from '../contracts/interaction.js';
export declare const economyStateToolDeclaration: {
    name: string;
    sources: readonly ("owner" | "life" | "review")[];
    historyOverview(_args: unknown, value: unknown): (Omit<import("./types.js").EconomySnapshot & {
        ledger: import("./types.js").LedgerEntry[];
    }, "configuration" | "migration" | "ledger" | "inventory"> & {
        view: string;
        configurationRevision: number;
        inventory: import("./types.js").InventoryItem[];
        stockNote: string;
        ledgerCount: number;
        details: {
            tool: string;
            view: string;
        };
    }) | undefined;
};
/** One synchronous ledger per active Core binding. Body owns effect receipts;
 * this service owns money/items and never creates another assistant runtime. */
export declare class CompanionEconomy {
    private readonly ctx;
    readonly host: PetCoreHost;
    private current?;
    private closed;
    constructor(ctx: Context, host: PetCoreHost);
    protectedDirectory(): string | undefined;
    private retainedGarden;
    private bodyRequiresDatabase;
    /** Initialization is schema preparation only: no allowance, gifts or goals. */
    prepare(target: WorkspaceTarget, legacyFile?: string, initializing?: boolean): EconomyStore;
    private bound;
    private use;
    gardenPort(workspaceId: string, legacyFile?: string): RoomEconomyPort;
    snapshot(workspaceId: string, validate?: () => void): Promise<{
        workspaceId: string;
        ledger: import("./types.js").LedgerEntry[];
        configurationVersion: string;
        access: {
            readonly mode: "bounded";
            readonly detail: "余额与物品由程序结算。原生文件工具防误改；同一系统账户的命令和其他插件仍可访问文件。";
        };
        storageId: string;
        companionId: string;
        revision: number;
        balance: number;
        inventory: import("./types.js").InventoryItem[];
        catalog: import("./types.js").CatalogItem[];
        configuration: import("./types.js").EconomyConfiguration;
        bookmarks: import("./types.js").ReadingBookmark[];
        pendingUses: ItemUse[];
        migration: {
            kind: "new" | "legacy-garden";
            sourcePath?: string;
            sourceHash?: string;
            importedAt: number;
        };
    }>;
    pendingFacts(workspaceId: string): Promise<CompanionFact[]>;
    readFacts(workspaceId: string, ids: readonly string[]): Promise<CompanionFact[]>;
    acknowledgeFacts(workspaceId: string, ids: readonly string[]): Promise<void>;
    private notifyFacts;
    ownerAction(workspaceId: string, action: any, requestId: string, signal: AbortSignal, validate?: () => void, trustedActor?: CompanionFactActor): Promise<{
        execution?: import("../contracts/behavior.js").PlannedExecution | undefined;
        workspaceId: string;
        ledger: import("./types.js").LedgerEntry[];
        configurationVersion: string;
        access: {
            readonly mode: "bounded";
            readonly detail: "余额与物品由程序结算。原生文件工具防误改；同一系统账户的命令和其他插件仍可访问文件。";
        };
        storageId: string;
        companionId: string;
        revision: number;
        balance: number;
        inventory: import("./types.js").InventoryItem[];
        catalog: import("./types.js").CatalogItem[];
        configuration: import("./types.js").EconomyConfiguration;
        bookmarks: import("./types.js").ReadingBookmark[];
        pendingUses: ItemUse[];
        migration: {
            kind: "new" | "legacy-garden";
            sourcePath?: string;
            sourceHash?: string;
            importedAt: number;
        };
    }>;
    settings(workspaceId: string, expectedVersion: string, next: EconomyConfigurationPatch, requestId: string, signal: AbortSignal, validate?: () => void): Promise<{
        workspaceId: string;
        ledger: import("./types.js").LedgerEntry[];
        configurationVersion: string;
        access: {
            readonly mode: "bounded";
            readonly detail: "余额与物品由程序结算。原生文件工具防误改；同一系统账户的命令和其他插件仍可访问文件。";
        };
        storageId: string;
        companionId: string;
        revision: number;
        balance: number;
        inventory: import("./types.js").InventoryItem[];
        catalog: import("./types.js").CatalogItem[];
        configuration: import("./types.js").EconomyConfiguration;
        bookmarks: import("./types.js").ReadingBookmark[];
        pendingUses: ItemUse[];
        migration: {
            kind: "new" | "legacy-garden";
            sourcePath?: string;
            sourceHash?: string;
            importedAt: number;
        };
    }>;
    close(): void;
}
export declare const name = "22-Economy";
export declare const inject: string[];
declare module '@deepseek-ai/cordis' {
    interface Context {
        petEconomy: CompanionEconomy;
    }
    interface Events {
        'pet/economy.fact'(workspaceId: string): void;
    }
}
export declare function apply(ctx: Context): void;
