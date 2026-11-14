import { validClockTime } from '#dsh-world/life/alarm';
export const defaultLifePreferences = {
    wake: '', review: '', dailyBudget: null, compactAfterReview: null, planningRepairAttempts: null,
};
export function parseLifePreferences(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        throw Error('生活设置无效');
    const values = raw;
    const { wake, review, dailyBudget, compactAfterReview } = values;
    // Older workspaces have four fields. Read them without rewriting settings.
    const planningRepairAttempts = values.planningRepairAttempts ?? null;
    if (Object.keys(values).some(key => !['wake', 'review', 'dailyBudget', 'compactAfterReview', 'planningRepairAttempts'].includes(key)) ||
        !(wake === '' || validClockTime(wake)) || !(review === '' || validClockTime(review)) ||
        !(compactAfterReview === null || typeof compactAfterReview === 'boolean') ||
        !(planningRepairAttempts === null || typeof planningRepairAttempts === 'number' && Number.isSafeInteger(planningRepairAttempts) && planningRepairAttempts >= 0) ||
        !(dailyBudget === null || (typeof dailyBudget === 'number' && Number.isFinite(dailyBudget) && dailyBudget > 0))) {
        throw Error('请输入有效的 24 小时时间、每日金额及非负整数补救次数');
    }
    return { wake, review, dailyBudget, compactAfterReview, planningRepairAttempts };
}
//# sourceMappingURL=library.js.map