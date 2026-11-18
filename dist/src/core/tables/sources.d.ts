import type { SessionPolicyRow, SourceAdapter, SourceAdmission, SourceClassificationResult, SourceInput, TableRegistration } from '../../contracts/tables.js';
import { CompanionToolTable } from './tools.js';
type NativeSourceAdapter<Selected> = SourceAdapter<Selected> & {
    isGuest?(sessionId: string): boolean;
    beforeFirstStep?(): Promise<void>;
};
export declare class SourceAdapterTable<Selected = unknown> {
    private readonly tools;
    private readonly table;
    private readonly admissions;
    constructor(tools?: CompanionToolTable);
    private admissionLease;
    register(adapter: NativeSourceAdapter<Selected>): TableRegistration;
    isGuest(sessionId: string): boolean;
    beforeFirstStep(current: () => boolean): Promise<boolean>;
    classify(message: SourceInput['message']): SourceClassificationResult;
    policyRows(): SessionPolicyRow[];
    admit(input: SourceInput): SourceAdmission<Selected>;
}
export {};
