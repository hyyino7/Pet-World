import type { IncomingMessage, ServerResponse } from 'node:http';
import { type Bridge } from './bridge.ts';
/** A local app hands her partner's words to her home. */
export declare function bridgeRoute(prefix: string, bridge: () => Bridge | undefined, allowedHosts?: readonly string[]): {
    kind: "exact";
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
/** Asks for one compaction of her home, held behind her running turn. */
export declare function compactRoute(prefix: string, bridge: () => Bridge | undefined, request: () => string | undefined, allowedHosts?: readonly string[]): {
    kind: "exact";
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
