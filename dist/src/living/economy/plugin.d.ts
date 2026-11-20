import { LivingView, type LivingPorts, type RecordCommandEffect } from '../index.js';
import type { Context } from '@deepseek-ai/cordis';
import type { PetCoreHost, WorkspaceTarget } from '../../core/index.js';
import type { PlannedActivity } from '../../contracts/behavior.js';
import type { WorldCommands } from '../../contracts/living.js';
import type { RoomEconomyPort } from '../body/room.js';
import { EconomyStore } from './store.js';
import type { EconomyConfigurationPatch, ItemUse } from './types.js';
import type { CompanionFact, CompanionFactActor } from '../../contracts/interaction.js';
type TradeKind = Exclude<NonNullable<PlannedActivity['economy']>['type'], 'consume'>;
export declare const economyStateToolDeclaration: {
    name: string;
    sources: readonly ("life" | "owner" | "review")[];
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
    private readonly living;
    private readonly inFlight;
    constructor(ctx: Context, host: PetCoreHost, ports?: LivingPorts | LivingView);
    private assertOpen;
    protectedDirectory(): string | undefined;
    private retainedGarden;
    private bodyRequiresDatabase;
    /** Initialization is schema preparation only: no allowance, gifts or goals. */
    prepare(target: WorkspaceTarget, legacyFile?: string, initializing?: boolean): EconomyStore;
    private bound;
    private use;
    private gardenClock;
    committedGardenAt(workspaceId: string): number | undefined;
    gardenPort(workspaceId: string, legacyFile?: string, recordReadingEffect?: RecordCommandEffect): RoomEconomyPort;
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
    walletView(workspaceId: string): import("../../contracts/living.js").WalletView;
    worldSnapshot(workspaceId: string): Promise<import("../../contracts/living.js").WorldSnapshot>;
    readonly worldCommands: Pick<WorldCommands, TradeKind>;
    private worldTrade;
    pendingFacts(workspaceId: string): Promise<CompanionFact[]>;
    readFacts(workspaceId: string, ids: readonly string[]): Promise<CompanionFact[]>;
    acknowledgeFacts(workspaceId: string, ids: readonly string[]): Promise<void>;
    private notifyFacts;
    ownerAction(workspaceId: string, action: any, requestId: string, signal: AbortSignal, validate?: () => void, trustedActor?: CompanionFactActor, recordEffect?: RecordCommandEffect): Promise<{
        execution?: import("../../contracts/behavior.js").PlannedExecution | undefined;
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
    stopAdmission(): void;
    settled(): Promise<void>;
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
export {};
