import type { BehaviorSnapshot } from './behavior.js';
export interface InventoryItem {
    itemId: string;
    quantity: number;
    reserved: number;
    available: number;
}
export interface ReadingBookmark {
    itemId: string;
    version: string;
    offset: number;
    updatedAt: number;
}
export interface WalletView {
    readonly balance: number;
    readonly inventory: readonly Readonly<InventoryItem>[];
    readonly reading: readonly Readonly<{
        itemId: string;
        version: string;
        bookmark: Readonly<ReadingBookmark> | null;
    }>[];
}
export interface WorldSnapshot {
    readonly workspaceId: string;
    readonly storageId: string;
    readonly body: {
        readonly available: true;
        readonly snapshot: Readonly<BehaviorSnapshot>;
    } | {
        readonly available: false;
    };
    readonly wallet: WalletView | null;
}
/** Invalidate the previous snapshot. This signal is not a persistence receipt. */
export type WorldChanged = Pick<WorldSnapshot, 'workspaceId' | 'storageId'>;
