import { emptyHomeState, normalizeHomeState } from '#feiyu-home';
import { normalizeRoomState } from '#feiyu-room/room-state';
/** A renderable starting state, not a record of earlier eating or sleeping.
 * Reuse the scene's valid coordinates/pose. Unconsumed numeric needs are only
 * technical simulation baselines; no time-of-day story, route or event is seeded.
 */
export function initialBodyState(now = Date.now()) {
    const state = emptyHomeState(now);
    Object.assign(state, {
        needs: { hunger: 0, thirst: 0, energy: 1, bladder: 0, pain: 0 },
        kind: 'idle', activity: '尚未开始活动',
        asleep: false, sleepPending: false, walking: false,
        route: null, dwell: null, command: null, freeTarget: null,
        nextDecisionAt: 0, lastInteractionAt: 0,
        lamp: false, bedsideWater: false,
        visits: 0, lastVisitAt: 0, eventLog: [], lastEventAt: {},
        visitors: { ...normalizeRoomState(undefined, now), lamp: false },
    });
    return normalizeHomeState(state, now);
}
//# sourceMappingURL=initial-state.js.map