import type { EconomySnapshot, LedgerEntry } from './types.js';
/** All catalog choices remain discoverable, including descriptions, prices,
 * effects and disabled items. Empty stock and duplicate configuration/history
 * are available through full/paged queries, never removed from the owner. */
export declare function economyOverview<T extends EconomySnapshot & {
    ledger: LedgerEntry[];
}>(state: T): Omit<T, "migration" | "configuration" | "ledger" | "inventory"> & {
    view: string;
    configurationRevision: number;
    inventory: import("./types.js").InventoryItem[];
    stockNote: string;
    ledgerCount: number;
    details: {
        tool: string;
        view: string;
    };
};
export declare function economyPage<T extends EconomySnapshot & {
    ledger: LedgerEntry[];
}>(state: T, section: 'catalog' | 'ledger', offset?: number, limit?: number): {
    revision: number;
    section: "catalog" | "ledger";
    items: import("./types.js").CatalogItem[] | LedgerEntry[];
    nextOffset: number | null;
    total: number;
};
