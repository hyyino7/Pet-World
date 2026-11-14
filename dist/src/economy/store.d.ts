import type { BodyUseProof, CatalogItem, EconomyConfigurationPatch, EconomySnapshot, EconomyStoreOptions, ItemUse, LedgerEntry, ReadingBookmark, ReadingOffer, ReadingOperationStatus, ReadingSegment } from './types.js';
import type { CompanionFact, CompanionFactActor } from '../contracts/interaction.js';
/** One bound SQLite aggregate owns money, every item, garden jobs and their receipts.
 * No CoreStore or assistant is constructed here. The existing Core binding guard
 * and Core JSON/error helpers are reused at this synchronous persistence boundary. */
export declare class EconomyStore {
    private readonly options;
    readonly directory: string;
    readonly databasePath: string;
    private readonly lockPath;
    private readonly markerPath;
    private readonly lockToken;
    private readonly db;
    private readonly databaseFile;
    private closed;
    constructor(options: EconomyStoreOptions);
    private safeFile;
    /** Cheap lease/inode validation for the hot Body adapter path. */
    validate(): void;
    private ensure;
    private transaction;
    private meta;
    private requiredMeta;
    private setMeta;
    private revision;
    private bump;
    private configuration;
    private balance;
    private quantity;
    private setQuantity;
    private allUses;
    private reserved;
    private available;
    private readings;
    private putReading;
    private catalogRows;
    private item;
    private allBookmarks;
    private mutate;
    private recordLedger;
    /** Called only inside the existing request transaction, beside its actual result.
     * Historical requests are not replayed or turned into new experiences. */
    private recordFact;
    pendingFacts(): CompanionFact[];
    /** Delivery acknowledgements do not erase the original committed facts. */
    readFacts(ids: readonly string[]): CompanionFact[];
    acknowledgeFacts(ids: readonly string[]): void;
    private snapshotRow;
    snapshot(_now?: number): EconomySnapshot;
    catalog(): CatalogItem[];
    ledger(input?: {
        limit?: number;
        before?: number;
    }): {
        items: LedgerEntry[];
        nextBefore: number | null;
    };
    purchase(requestId: string, itemId: string, quantity?: number, actor?: CompanionFactActor): EconomySnapshot;
    sell(requestId: string, itemId: string, quantity?: number, actor?: CompanionFactActor): EconomySnapshot;
    grantMoney(requestId: string, amount: number, note?: string, actor?: CompanionFactActor): EconomySnapshot;
    giftItem(requestId: string, itemId: string, quantity?: number, note?: string, actor?: CompanionFactActor): EconomySnapshot;
    configure(requestId: string, patch: EconomyConfigurationPatch, expectedVersion?: number, passive?: boolean): EconomySnapshot;
    importBook(requestId: string, input: {
        itemId: string;
        title: string;
        text: string;
        author?: string;
        format?: 'article' | 'book';
        source?: {
            kind: 'owner-import';
            name: string;
        };
    }, actor?: CompanionFactActor): EconomySnapshot;
    private ownedReading;
    readSegment(itemId: string, input?: {
        segment?: number;
        maxCharacters?: number;
    }): ReadingSegment;
    bookmark(requestId: string, itemId: string, input: {
        version: string;
        offset: number;
    }): ReadingBookmark;
    private readingOperation;
    /** Offers and confirmations are durable actual content-delivery receipts;
     * room movement or an animation never advances a reading bookmark. */
    readOffer(operationId: string, input: {
        itemId: string;
        segment: number;
    }): ReadingOffer;
    confirmReading(operationId: string, receiptToken: string): {
        status: 'confirmed';
        itemId: string;
        segment: number;
    };
    readingStatus(operationId: string, input: {
        itemId: string;
        segment: number;
    }): ReadingOperationStatus;
    beginUse(requestId: string, itemId: string): ItemUse;
    private finishUseInternal;
    finishUse(opId: string, bodyAppliedProof: BodyUseProof): ItemUse;
    /** Unknown or absent Body outcome is intentionally not a cancellation proof. */
    cancelUse(opId: string, bodyNotAppliedProof: BodyUseProof): ItemUse;
    itemUse(opId: string): ItemUse | undefined;
    private gardenOptions;
    private normalize;
    private advance;
    private gardenResources;
    private validateGardenResources;
    private resourceDeltas;
    private importGardenItems;
    private archiveReceipts;
    private saveGardenRow;
    private projectGarden;
    /** Natural growth is projected without spending or committing another wallet.
     * The returned revision is the CAS token for the caretaker's next checkpoint. */
    readGarden(now?: number, passive?: boolean): any;
    private commitGarden;
    writeGarden(state: any, expectedRevision?: any): any;
    applyGarden(action: unknown, requestId: string, now?: number, passive?: boolean): {
        ok: boolean;
        message: string;
        garden: any;
    };
    gardenView(now?: number, passive?: boolean): any;
    close(): void;
}
