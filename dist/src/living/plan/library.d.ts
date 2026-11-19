export interface LifePreferences {
    wake: string;
    review: string;
    dailyBudget: number | null;
    compactAfterReview: boolean | null;
    planningRepairAttempts: number | null;
}
export declare const defaultLifePreferences: LifePreferences;
export declare function parseLifePreferences(raw: unknown): LifePreferences;
