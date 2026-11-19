import type { CompanionFact, CompanionFactSource } from '../../contracts/interaction.js';
/** Materialize original references even when another native consumer has already
 * acknowledged them. Pending discovery and immutable fact reads are distinct. */
export declare function readFactReferences(workspaceId: string, refs: readonly Pick<CompanionFact, 'domain' | 'id'>[], sourceFor: (domain: CompanionFact['domain']) => CompanionFactSource | undefined, validate: () => void): Promise<CompanionFact[]>;
