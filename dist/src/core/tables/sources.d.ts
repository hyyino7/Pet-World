import type { SessionPolicyRow, SourceAdapter, SourceAdmission, SourceClassificationResult, SourceInput, TableRegistration } from '../../contracts/tables.js';
type NativeSourceAdapter<Selected> = SourceAdapter<Selected> & {
    isGuest?(sessionId: string): boolean;
};
export declare class SourceAdapterTable<Selected = unknown> {
    private readonly table;
    register(adapter: NativeSourceAdapter<Selected>): TableRegistration;
    isGuest(sessionId: string): boolean;
    classify(message: SourceInput['message']): SourceClassificationResult;
    policyRows(): SessionPolicyRow[];
    admit(input: SourceInput): SourceAdmission<Selected>;
}
export {};
