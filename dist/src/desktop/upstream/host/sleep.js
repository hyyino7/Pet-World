/**
 * 睡觉状态（host 半侧内存态）：睡下的宠物从自动来源里摘出去，并拒绝手动触发。
 *
 * 与占用锁（./lock）同一层：都是「这只宠物此刻不归日常流程管」的会话状态，重启即空、不进配置。
 * 区别：锁是第三方租约、有 TTL；睡觉是用户意图、没有期限，只有唤醒才结束。
 * 不负责渲染：叶子里的三段动画名是渲染端唯一真相，播放与时机由前端执行。
 * 必须始终成立：进睡时三段名字一起写定；醒来只清状态，不留半套。
 * @module dsh-pet/src/host/sleep
 */
/** 文案池收窄：非数组、非字符串项一律丢弃（配置已校验，这里只防手工改坏的文件）。 */
function textPool(value) {
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item !== '') : [];
}
/**
 * 从池里随机挑一句；空池返回 undefined，调用方据此不弹气泡。
 *
 * 默认文案只存在于内置配置 `assets/config.jsonc`：合并层对缺失/非法字段都回落到它，
 * 所以正常安装下池永远非空。真的空了说明配置损坏——这时宁可不说话，也不在代码里再抄一份文案。
 */
export function pickSleepText(pool) {
    return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : undefined;
}
/** 把条目配置里的睡觉文案收窄成可用池（合并层已填好默认值，这里只做类型收窄）。 */
export function sleepTextsOf(conf) {
    return {
        start: textPool(conf.sleepStartTexts),
        end: textPool(conf.sleepEndTexts),
        refuse: textPool(conf.sleepRefuseTexts),
    };
}
/** 池子收窄：非数组、非字符串项一律丢弃（配置已校验，这里只防手工改坏的文件）。 */
function strings(value) {
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item !== '') : [];
}
/**
 * 从成品 `animations.sleep` 里挑一套：外层整套随机，三段各自在候选数组里随机挑一个。
 *
 * 三段必须来自同一套（否则蹲着入睡、趴着醒来），所以整轮挑选只有一次随机数决定套。
 * @param animations - 成品动画配置（可能来自任何一个条目）。
 * @param roll - 随机源，测试注入固定值。
 * @returns 选中的三段名字；没有可用套时 null（调用方据此拒绝入睡）。
 */
export function pickSleepNames(animations, roll = Math.random) {
    const conf = animations && typeof animations === 'object' ? animations : {};
    const sets = Array.isArray(conf.sleep) ? conf.sleep : [];
    const usable = [];
    for (const set of sets) {
        if (!set || typeof set !== 'object')
            continue;
        const entry = set;
        const start = strings(entry.start);
        const loop = strings(entry.loop);
        const end = strings(entry.end);
        if (!start.length || !loop.length || !end.length)
            continue;
        usable.push({
            start: start[Math.floor(roll() * start.length)],
            loop: loop[Math.floor(roll() * loop.length)],
            end: end[Math.floor(roll() * end.length)],
        });
    }
    if (!usable.length)
        return null;
    return usable[Math.floor(roll() * usable.length)];
}
/** 睡觉状态表（一个插件实例一个；进程内内存态，宿主重启即醒）。 */
export class SleepStore {
    constructor(opts) {
        this.sets = new Map();
        this.onChange = opts?.onChange ?? (() => { });
    }
    /** 这只宠物此刻是否在睡。 */
    sleeping(petId) {
        return this.sets.has(petId);
    }
    /** 本次睡觉挑中的那套名字；没睡时 null。 */
    setOf(petId) {
        return this.sets.get(petId) ?? null;
    }
    /**
     * 进睡。已经在睡时保持原套、不重写叶子——重复调用（接口被连点、命令与菜单同时触发）
     * 不该把动画从头放一遍。
     * @returns 这次是否真的进入了睡觉状态。
     */
    enter(petId, set) {
        if (this.sets.has(petId))
            return false;
        this.sets.set(petId, set);
        this.onChange(petId, { sleeping: true, ...set });
        return true;
    }
    /**
     * 醒来。
     * @returns 这次是否真的从睡眠状态退出（没在睡 = 幂等空操作）。
     */
    wake(petId) {
        if (!this.sets.delete(petId))
            return false;
        this.onChange(petId, { sleeping: false });
        return true;
    }
    /** 全部唤醒（插件卸载 / 桌面 Helper 重启路径）：否则渲染端要一直停在睡姿。 */
    wakeAll() {
        for (const petId of [...this.sets.keys()])
            this.wake(petId);
    }
    /** 当前是否有任意宠物在睡（余额全局拉取据此决定要不要整拍跳过）。 */
    anySleeping() {
        return this.sets.size > 0;
    }
    /** 在睡的宠物 id（测试与日志用；顺序不保证）。 */
    ids() {
        return [...this.sets.keys()];
    }
}
