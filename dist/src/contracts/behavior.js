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
export const PLAN_KINDS = {
    hold: { target: false, executable: false },
    room: { target: true, executable: false },
    move: { target: true, executable: true },
    garden: { target: false, executable: true },
    body: { target: false, executable: true },
    economy: { target: false, executable: true },
    read: { target: false, executable: true },
};
const planKindNames = Object.keys(PLAN_KINDS);
export function isPlanKind(kind) {
    return typeof kind === 'string' && planKindNames.includes(kind);
}
export const PLAN_ECONOMY_OPERATIONS = { buy: true, sell: true, consume: true };
export const PLAN_ECONOMY_OPERATION_NAMES = Object.keys(PLAN_ECONOMY_OPERATIONS);
export function isPlanEconomyOperation(value) {
    return typeof value === 'string' && PLAN_ECONOMY_OPERATION_NAMES.includes(value);
}
export const PLAN_GARDEN_OPERATIONS = {
    visit: { branch: 'noFields', order: 1 },
    till: { branch: 'plot', order: 1 },
    plant: { branch: 'plotAndCrop', order: 1 },
    water: { branch: 'plot', order: 2 },
    fertilize: { branch: 'plot', order: 3 },
    harvest: { branch: 'plot', order: 4 },
    sell: { branch: 'cropTrade', order: 1 },
    buySeed: { branch: 'cropTrade', order: 2 },
    buyCompost: { branch: 'quantity', order: 1 },
};
export const PLAN_GARDEN_OPERATION_NAMES = Object.keys(PLAN_GARDEN_OPERATIONS);
export function isPlanGardenOperation(value) {
    return PLAN_GARDEN_OPERATION_NAMES.includes(value);
}
export const READING_STATES = { unread: true, offered: true, confirmed: true };
export const BODY_METRICS = {
    hunger: 'ceiling',
    thirst: 'ceiling',
    energy: 'floor',
    bladder: 'ceiling',
    pain: 'none',
};
export const BODY_METRIC_NAMES = Object.keys(BODY_METRICS);
export function isBodyMetric(value) {
    return Object.hasOwn(BODY_METRICS, value);
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