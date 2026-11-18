import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { RegistrationLease } from '../contracts/tables.js';
interface SourceFileGuardAccess {
    readonly lease?: RegistrationLease;
    key(): string | undefined;
    check(tool: string, path: string): void;
}
/** DSH resolves paths. Recheck the registration and access before native dispatch. */
export declare function installSourceFileGuard(ctx: Context, getAccess: (agent: Agent) => SourceFileGuardAccess | undefined): () => void;
export {};
