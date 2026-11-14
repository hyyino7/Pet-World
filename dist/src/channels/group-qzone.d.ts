export interface QzoneSettings {
    enabled: boolean;
    times: string[];
    dailyMax: number;
}
type Status = 'pending' | 'sent' | 'uncertain';
export interface QzoneDraft {
    id: string;
    text: string;
    status: Status;
    at?: number;
}
type Send = (content: string) => Promise<unknown>;
/** Posts are reserved durably before submitting to the platform. A crash or
 * ambiguous response leaves an uncertain item which will never be retried. */
export declare function createQzoneLedger(dataDirectory: string, accountId: string, clock?: () => number): {
    manage(operation: string, input?: Record<string, unknown>): {
        quota: {
            ok: boolean;
            message?: string;
            todayCount: number;
            remaining: number;
        };
        settings: QzoneSettings;
        drafts: QzoneDraft[];
        posts: {
            id: string;
            status: Status;
            at: number;
        }[];
    };
    publish: (content: string, recentTexts: readonly string[], send: Send) => Promise<object & Record<"tid", unknown>>;
    tick(recentTexts: readonly string[], send: Send): Promise<void>;
};
export {};
