/** Inventory only. Legacy payloads are never copied, parsed or discarded here. */
export declare function legacyChannelFiles(deviceDirectory: string): {
    path: string;
    bytes: number;
}[];
export declare function companionChannelDirectory(root: string, deviceDirectory: string): string;
