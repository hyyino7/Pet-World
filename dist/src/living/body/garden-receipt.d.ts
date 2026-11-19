/** Only program-owned caretaker fields may enter this projection. Historical
 * source bytes, owner text, plan goals and companion dialogue stay unchanged. */
export declare function gardenReceiptText(text: string): string;
/** Copy only typed garden event/display fields; never normalize the saved Body. */
export declare function gardenHomeProjection<T extends {
    activity?: string;
    eventLog?: {
        type: string;
        text: string;
    }[];
}>(state: T): T;
/** Garden's current view can retain old receipts after an update. Keep the raw
 * domain archive intact while presenting the same role-neutral result. */
export declare function gardenReceiptProjection<T extends {
    care?: {
        status: string;
        receipts?: {
            message: string;
        }[];
        recent?: {
            message: string;
        }[];
    };
}>(garden: T): T;
