import type { CapabilityStatus, Revision, ServiceCall } from './common.js';
/** Workspace-owned identity; native DSH owns conversations and execution. */
export interface CompanionIdentity {
    companionId: string;
    revision: Revision;
    displayName: string;
    character: string;
    ownerActorId: string;
}
export interface AttentionPolicy {
    revision: Revision;
    quiet: boolean;
}
/** The owner editor's explicit binding, including an intentional local/unbound
 * state. Preferences already provide the monotonic revision for ABA changes. */
export interface WorkspaceEditScope {
    preferencesRevision: Revision;
    workspaceId: string | null;
    storageId: string | null;
}
export interface CoreService {
    getIdentity: ServiceCall<Record<string, never>, CompanionIdentity>;
    reviseIdentity: ServiceCall<{
        expectedScope: WorkspaceEditScope;
        expectedRevision: Revision;
        displayName: string;
        character: string;
    }, CompanionIdentity>;
    getPolicy: ServiceCall<Record<string, never>, AttentionPolicy>;
    listCapabilities: ServiceCall<Record<string, never>, readonly CapabilityStatus[]>;
}
