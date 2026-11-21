export const BODY_ACTIONS = {
    command: { role: 1 },
    pet: { role: 2, care: { order: 3, label: '摸摸头' }, feedback: true },
    poke: { role: 3, feedback: true },
    feed: { role: 4, care: { order: 1, label: '免费基础餐食' }, plan: 4, feedback: true },
    water: { role: 5, care: { order: 2, label: '倒杯水' }, plan: 3, feedback: true },
    play: { role: 6, care: { order: 4, label: '一起玩' }, plan: 5, feedback: true },
    talk: { role: 7, feedback: true },
    sleep: { role: 8, care: { order: 5, label: '去睡觉' }, plan: 1 },
    wake: { role: 9, care: { order: 6, label: '叫醒' }, plan: 2 },
    lamp: { role: 10 },
};
export const BODY_ACTION_NAMES = Object.keys(BODY_ACTIONS);
const memberships = BODY_ACTIONS;
function actionsIn(group, orderOf) {
    return BODY_ACTION_NAMES.flatMap(action => {
        const membership = memberships[action][group];
        return membership === undefined ? [] : [{ action: action, order: orderOf(membership) }];
    }).sort((a, b) => a.order - b.order).map(({ action }) => action);
}
export const CARE_ACTIONS = actionsIn('care', care => care.order);
export const ROLE_ACTIONS = actionsIn('role', order => order);
export const PLAN_BODY_ACTIONS = actionsIn('plan', order => order);
export const FEEDBACK_ACTIONS = actionsIn('feedback', () => 0);
export function isCareAction(action) {
    return typeof action === 'string' && CARE_ACTIONS.includes(action);
}
export function isPlanBodyAction(action) {
    return typeof action === 'string' && PLAN_BODY_ACTIONS.includes(action);
}
export class PlannedAdmissionWaitError extends Error {
    wait;
    constructor(wait) {
        super('身体仍在完成主人已安排的活动，完成后继续原计划');
        this.wait = wait;
        this.name = 'PlannedAdmissionWaitError';
    }
}
//# sourceMappingURL=behavior.js.map