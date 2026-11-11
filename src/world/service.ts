import type { PetCoreHost } from '../core/index.js';
import * as modules from './index.js';

type SessionStatus = PetCoreHost['workspace']['sessionStatus'];
type WorkspaceRegistry = Parameters<SessionStatus>[1];

/** Native component service. A feature that needs a conversation resolves the
 * current binding at the time of use, including after moving or restoring it. */
export function createWorldService(host: PetCoreHost, registry: () => WorkspaceRegistry) {
  return {
    modules,
    sessionStatus(session: Parameters<SessionStatus>[0]) {
      return host.workspace.sessionStatus(session, registry());
    },
  };
}

export type PetWorld = ReturnType<typeof createWorldService>;
