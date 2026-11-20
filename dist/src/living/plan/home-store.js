import { closeSync, fsyncSync, openSync } from 'node:fs';
import { markHomeArrival } from '#dsh-world/life/home';
function mirrorId(state, id) {
    if (id === undefined)
        delete state.homeSessionId;
    else
        state.homeSessionId = id;
}
export function createHomeStore(raw, directory, workspace, scope, changed) {
    const home = () => workspace.readCompanionHome(scope);
    const views = new WeakMap();
    let current;
    function project(state) {
        const record = home(), id = state.homeSessionId;
        const hidden = record?.arrivalPending || id !== record?.sessionId ? state.greeting : undefined;
        views.set(state, { id, hidden });
        if (hidden)
            delete state.greeting;
        mirrorId(state, record?.sessionId);
        return state;
    }
    function refreshRaw(state) {
        const view = views.get(state);
        const projectedId = state.homeSessionId, projectedGreeting = state.greeting;
        if (view) {
            mirrorId(state, view.id);
            if (view.hidden && !state.greeting)
                state.greeting = view.hidden;
        }
        try {
            raw.refresh(state);
        }
        catch (error) {
            mirrorId(state, projectedId);
            if (projectedGreeting)
                state.greeting = projectedGreeting;
            else
                delete state.greeting;
            throw error;
        }
    }
    function refresh(state) {
        refreshRaw(state);
        return project(state);
    }
    function applyArrival(sessionId) {
        const record = home();
        if (record?.sessionId !== sessionId)
            return false;
        if (!record.arrivalPending)
            return true;
        const state = raw.read(), moved = state.homeSessionId !== sessionId;
        if (moved || !state.greeting) {
            delete state.homeSessionId;
            raw.write(markHomeArrival(state, sessionId));
        }
        const fd = openSync(directory, 'r');
        try {
            fsyncSync(fd);
        }
        finally {
            closeSync(fd);
        }
        workspace.writeCompanionHome(scope, record, { sessionId });
        if (current)
            refresh(current);
        if (moved)
            changed();
        return true;
    }
    return {
        applyArrival,
        refresh: () => { if (current)
            refresh(current); },
        sessionId: () => current?.homeSessionId,
        store: { ...raw,
            read: () => current = project(raw.read()),
            refresh,
            write(state) {
                const record = home();
                if (record?.arrivalPending)
                    applyArrival(record.sessionId);
                const moved = raw.read().homeSessionId !== record?.sessionId;
                refreshRaw(state);
                if (moved)
                    delete state.greeting;
                mirrorId(state, record?.sessionId);
                raw.write(state);
                project(state);
                if (moved)
                    changed();
            },
        },
    };
}
//# sourceMappingURL=home-store.js.map