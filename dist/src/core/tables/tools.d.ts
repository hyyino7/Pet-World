import { COMPANION_TOOL_SOURCES, type CompanionToolDeclaration, type CompanionToolSource, type TableRegistration } from '../../contracts/tables.js';
export declare class CompanionToolTable {
    private readonly table;
    private readonly extensions;
    /** Register an extension before registering tools that grant access to it. */
    registerSource(source: Exclude<CompanionToolSource, typeof COMPANION_TOOL_SOURCES[number]>): TableRegistration;
    register(declaration: CompanionToolDeclaration): TableRegistration;
    get(name: string): CompanionToolDeclaration | undefined;
    list(source: CompanionToolSource): CompanionToolDeclaration[];
}
