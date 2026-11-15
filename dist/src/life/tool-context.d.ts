/** Keep the complete accepted intent, activity IDs, execution receipt and all
 * remaining steps. Only duplicated storage identity and bookkeeping are omitted. */
export declare function planOverview<T extends {
    plan: object | null;
}>(state: T): (T & {
    view: string;
}) | (T & {
    plan: {
        [x: string]: unknown;
    };
    view: string;
    details: {
        tool: string;
        view: string;
    };
});
