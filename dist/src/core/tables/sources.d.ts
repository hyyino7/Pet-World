import type { SessionPolicyRow, SourceAdapter, SourceAdmission, SourceClassification, SourceInput, TableRegistration } from '../../contracts/tables.js';
export declare class SourceAdapterTable<Selected = unknown> {
    private readonly table;
    register(adapter: SourceAdapter<Selected>): TableRegistration;
    classify(message: SourceInput['message']): SourceClassification | undefined;
    policyRows(): SessionPolicyRow[];
    admit(input: SourceInput): SourceAdmission<Selected>;
}
