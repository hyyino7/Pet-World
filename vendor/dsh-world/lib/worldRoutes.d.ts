import type { IncomingMessage, ServerResponse } from 'node:http';
export declare const WORLDS_PATH = "/dsh-world/worlds";
export declare const validWorldId: (id: string) => boolean;
export declare const worldPath: (id: string) => string;
export declare function worldListRoute(worlds: ReadonlyMap<string, readonly string[]>): {
    kind: "exact";
    path: string;
    handler(req: IncomingMessage, res: ServerResponse): void;
};
