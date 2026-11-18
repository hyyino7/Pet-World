import type { SessionPolicyRow, SourceAdapter, SourceAdmission, SourceClassificationResult, SourceInput, TableRegistration } from '../../contracts/tables.js';
type NativeSourceAdapter<Selected> = SourceAdapter<Selected> & {
    isGuest?(sessionId: string): boolean;
    beforeFirstStep?(): Promise<void>;
};
export declare class SourceAdapterTable<Selected = unknown> {
    private readonly table;
    register(adapter: NativeSourceAdapter<Selected>): TableRegistration;
    isGuest(sessionId: string): boolean;
    beforeFirstStep(current: () => boolean): Promise<boolean>;
    classify(message: SourceInput['message']): SourceClassificationResult;
    policyRows(): SessionPolicyRow[];
    admit(input: SourceInput): SourceAdmission<Selected>;
}
export {};
