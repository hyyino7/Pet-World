import type { SessionPolicyRow, SourceAdapter, SourceAdmission, SourceInput, TableRegistration } from '../../contracts/tables.js';
export declare class SourceAdapterTable<Selected = unknown> {
    private readonly table;
    register(adapter: SourceAdapter<Selected>): TableRegistration;
    policyRows(): SessionPolicyRow[];
    admit(input: SourceInput): SourceAdmission<Selected>;
}
