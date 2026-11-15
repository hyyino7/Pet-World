/** Read-only model projections. Full views and all domain/runtime state stay
 * unchanged; navigation IDs, needs, restrictions and operation outcomes survive. */
type View = Record<string, any>;
export declare const stateViewParameter: {
    readonly type: "string";
    readonly enum: readonly ["overview", "full"];
    readonly description: "Autonomous turns default to overview; full returns the original complete state.";
};
export declare const factIdsParameter: {
    readonly type: "array";
    readonly items: {
        readonly type: "string";
    };
    readonly description: "Read 1–16 original committed interaction receipts by their exact fact IDs, including before/after values.";
};
export declare function roomOverview(state: View): View;
export declare function gardenOverview(state: View): View;
export {};
