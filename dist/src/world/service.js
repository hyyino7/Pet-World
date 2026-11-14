import * as modules from './index.js';
/** Native component service. A feature that needs a conversation resolves the
 * current binding at the time of use, including after moving or restoring it. */
export function createWorldService(host, registry) {
    return {
        modules,
        sessionStatus(session) {
            return host.workspace.sessionStatus(session, registry());
        },
    };
}
//# sourceMappingURL=service.js.map