import { COMPANION_FEELINGS } from '../contracts/emotion.js';
/** Shared semantic names; displays choose their own existing assets. */
export const companionFeelings = COMPANION_FEELINGS;
export const feelingLabels = {
    happy: '开心', calm: '平静', sweet: '甜蜜', heartache: '心疼', worry: '担心', sad: '难过', jealous: '吃醋', anger: '生气', boredom: '无聊',
};
export function behaviorPresentation(home, expression) {
    const her = home?.her;
    const feelings = (home?.emotion?.feelings ?? []).filter((value) => companionFeelings.includes(value));
    const base = { activity: her?.activity || her?.kind || '安静地待着', feelings,
        emotionLabel: home?.emotion?.label || feelings.map((value) => feelingLabels[value]).join('、'), ...(expression ? { expression } : {}) };
    if (!her)
        return { ...base, action: 'idle', exclusive: false };
    if (her.asleep)
        return { ...base, action: 'sleep', exclusive: true };
    if (her.walking || her.kind === 'walk')
        return { ...base, action: 'walk', exclusive: true };
    if (['eat', 'react_happy', 'react_pout', 'idle_look'].includes(her.kind))
        return { ...base, action: her.kind, exclusive: true };
    if (!['idle', 'play'].includes(her.kind))
        return { ...base, action: 'activity', exclusive: true, fallback: true };
    if (expression?.action)
        return { ...base, action: 'expression', exclusive: true };
    const feeling = ['anger', 'boredom', ...companionFeelings].find(value => feelings.includes(value));
    return feeling ? { ...base, action: 'emotion/' + feeling, exclusive: true,
        fallback: !['happy', 'anger', 'boredom'].includes(feeling) } : { ...base, action: 'idle', exclusive: false };
}
//# sourceMappingURL=presentation.js.map