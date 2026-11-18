import type { SessionPolicyRow, SourceAdapter, SourceAdmission, SourceClassificationResult, SourceInput, TableRegistration } from '../../contracts/tables.js';
export declare class SourceAdapterTable<Selected = unknown> {
    private readonly table;
    register(adapter: SourceAdapter<Selected>): TableRegistration;
    classify(message: SourceInput['message']): SourceClassificationResult;
    policyRows(): SessionPolicyRow[];
    admit(input: SourceInput): SourceAdmission<Selected>;
}
