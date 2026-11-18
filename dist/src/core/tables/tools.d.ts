import { type CompanionToolDeclaration, type CompanionToolSource, type TableRegistration } from '../../contracts/tables.js';
export declare class CompanionToolTable {
    private readonly table;
    register(declaration: CompanionToolDeclaration): TableRegistration;
    get(name: string): CompanionToolDeclaration | undefined;
    list(source: CompanionToolSource): CompanionToolDeclaration[];
}
