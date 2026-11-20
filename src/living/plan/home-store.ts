import {closeSync, fsyncSync, openSync} from 'node:fs';
import {markHomeArrival} from '#dsh-world/life/home';
import type {LifeStore} from '#dsh-world/life/lifeStore';
import type {LifeState} from '#dsh-world/life/types';
import type {CoreWorkspace, HomeBinding} from '../../core/workspace.js';

function mirrorId(state: LifeState, id: string | undefined) {
  if (id === undefined) delete state.homeSessionId;
  else state.homeSessionId = id;
}

export function createHomeStore(raw: LifeStore, directory: string, workspace: CoreWorkspace, scope: HomeBinding, changed: () => void) {
  const home = () => workspace.readCompanionHome(scope);
  const views = new WeakMap<LifeState, {id?: string; hidden?: LifeState['greeting']}>();
  let current: LifeState | undefined;
  function project(state: LifeState) {
    const record = home(), id = state.homeSessionId;
    const hidden = record?.arrivalPending || id !== record?.sessionId ? state.greeting : undefined;
    views.set(state,{id,hidden});
    if (hidden) delete state.greeting;
    mirrorId(state, record?.sessionId);
    return state;
  }
  function refreshRaw(state: LifeState) {
    const view = views.get(state);
    const projectedId = state.homeSessionId, projectedGreeting = state.greeting;
    if (view) {
      mirrorId(state, view.id);
      if (view.hidden && !state.greeting) state.greeting = view.hidden;
    }
    try { raw.refresh(state); }
    catch (error) {
      mirrorId(state, projectedId);
      if (projectedGreeting) state.greeting = projectedGreeting;
      else delete state.greeting;
      throw error;
    }
  }
  function refresh(state: LifeState) {
    refreshRaw(state);
    return project(state);
  }
  function applyArrival(sessionId: string): boolean {
    const record = home();
    if (record?.sessionId !== sessionId) return false;
    if (!record.arrivalPending) return true;
    const state = raw.read(), moved = state.homeSessionId !== sessionId;
    if (moved || !state.greeting) {
      delete state.homeSessionId;
      raw.write(markHomeArrival(state,sessionId));
    }
    const fd = openSync(directory,'r');
    try { fsyncSync(fd); } finally { closeSync(fd); }
    workspace.writeCompanionHome(scope,record,{sessionId});
    if (current) refresh(current);
    if (moved) changed();
    return true;
  }
  return {
    applyArrival,
    refresh: () => { if (current) refresh(current); },
    sessionId: () => current?.homeSessionId,
    store: {...raw,
      read: () => current = project(raw.read()),
      refresh,
      write(state: LifeState) {
        const record = home();
        if (record?.arrivalPending) applyArrival(record.sessionId);
        const moved = raw.read().homeSessionId !== record?.sessionId;
        refreshRaw(state);
        if (moved) delete state.greeting;
        mirrorId(state,record?.sessionId);
        raw.write(state);
        project(state);
        if (moved) changed();
      },
    },
  };
}
