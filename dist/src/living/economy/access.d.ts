import type { Context } from '@deepseek-ai/cordis';
/** This is a native file-tool guard, not an operating-system security boundary.
 * Installed DSH 0.2.2-rc.2 exposes whole-workspace write grants, without excluded roots.
 * Arbitrary process execution and other plugin capabilities can bypass it. */
export declare const economyAccessBoundary: {
    mode: "bounded";
    detail: string;
};
/** Reuse DSH's own filesystem and current-directory resolution before its
 * monotonic guard. No replacement filesystem, assistant runtime or exec policy.
 * The owner RPC writes through the Economy owner and never calls file tools. */
export declare function installEconomyAccessGuard(ctx: Context, protectedPaths: () => readonly string[] | undefined, onCleanup: (stop: () => Promise<void>) => void): void;
