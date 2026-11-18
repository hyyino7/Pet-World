import type { CapabilityRegistration, TableRegistration } from '../../contracts/tables.js';
export declare class CapabilityTable {
    private readonly table;
    register(row: CapabilityRegistration): TableRegistration;
    list(): CapabilityRegistration[];
}
