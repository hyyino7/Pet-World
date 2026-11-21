/** 运行中的 waiting 和 completed 在身体画面中与 pending 一起显示为待执行。 */
export function bodyPhaseOf(phase) {
    return phase === 'moving' || phase === 'working' ? phase : 'pending';
}
const mealInsertionAllowed = {
    idle: true, play: true, idle_look: true, react_happy: true, react_pout: true, react_shy: true, react_scare: true,
};
const mealInsertionKinds = Object.keys(mealInsertionAllowed);
/** 吃饭准入使用 homeView 的画面状态，呈现分类器用自己的分类选画面。 */
export function companionBusy(her) {
    return Boolean(her && (her.asleep || her.walking || !mealInsertionKinds.includes(her.kind)));
}
//# sourceMappingURL=activity.js.map