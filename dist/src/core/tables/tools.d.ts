import { COMPANION_TOOL_SOURCES, type CompanionToolDeclaration, type CompanionToolSource, type RegistrationLease, type TableRegistration } from '../../contracts/tables.js';
export declare class CompanionToolTable {
    private readonly table;
    private readonly extensions;
    /** Register an extension before registering tools that grant access to it. */
    registerSource(source: Exclude<CompanionToolSource, typeof COMPANION_TOOL_SOURCES[number]>): TableRegistration;
    /** Built-in sources have no lease; an absent extension has no admission. */
    sourceLease(source: CompanionToolSource): RegistrationLease | null | undefined;
    register(declaration: CompanionToolDeclaration): TableRegistration;
    get(name: string): CompanionToolDeclaration | undefined;
    getRegistration(name: string): {
        declaration: CompanionToolDeclaration;
        lease: RegistrationLease;
    } | undefined;
    list(source: CompanionToolSource): CompanionToolDeclaration[];
}
