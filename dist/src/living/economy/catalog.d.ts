import type { CatalogItem, EconomyConfiguration, ReadingContent } from './types.js';
export declare const ORIGINAL_READINGS: readonly ReadingContent[];
export declare function defaultEconomyConfiguration(): EconomyConfiguration;
export declare function isWritableCatalogKey(id: string): boolean;
/** Old owner-entered return values remain in storage until an explicit edit,
 * but only game rules price sales and new crop yields. Existing cropProfile
 * receipts remain in Garden and are deliberately not rewritten here. */
export declare function effectiveEconomyConfiguration(saved: EconomyConfiguration): EconomyConfiguration;
export declare function economyCatalog(configuration: EconomyConfiguration, readings?: readonly ReadingContent[]): CatalogItem[];
