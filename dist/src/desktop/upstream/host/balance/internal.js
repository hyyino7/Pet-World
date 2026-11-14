/**
 * 余额取数的内部工具（host 半侧）：网络策略、响应校验与金额处理。
 *
 * 只给 ./providers/* 使用，不含服务商知识，也不负责注册与路由。
 * 统一 20s 超时加 3 次重试：目标端点多为境外，实测会间歇性超时。
 * 依赖全局 fetch；始终成立：必填字段缺失或非法一律抛错，绝不静默当 0。
 *
 * @module dsh-pet/src/host/balance/internal
 */
/** 单次抓取超时（ms）。 */
const FETCH_TIMEOUT_MS = 20_000;
/** 单次抓取失败后的重试次数（间隔 0.8s）。 */
const RETRIES = 3;
/** 发起一次带超时的 fetch；失败抛错，是否重试由调用方决定。 */
async function fetchOnce(url, key) {
    return fetch(url, {
        headers: { Authorization: 'Bearer ' + key, 'User-Agent': 'dsh-pet-balance' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
}
/** 带重试地抓取；全部失败时抛出最后一次错误。 */
export async function fetchWithRetry(url, key) {
    let last;
    for (let i = 0; i <= RETRIES; i++) {
        try {
            return await fetchOnce(url, key);
        }
        catch (e) {
            last = e;
            if (i < RETRIES)
                await new Promise((r) => setTimeout(r, 800));
        }
    }
    throw last instanceof Error ? last : new Error(String(last));
}
/** 必填数值：无法数值化或非有限数时抛错，不静默当 0。 */
export function num(value, what) {
    const n = Number(value);
    if (!Number.isFinite(n))
        throw new Error('dsh-pet: 余额数据非法字段 ' + what);
    return n;
}
/** 必填字符串：非空才通过，否则抛错。 */
export function str(value, what) {
    if (typeof value !== 'string' || value.length === 0)
        throw new Error('dsh-pet: 余额数据非法字段 ' + what);
    return value;
}
/** 可选数值：缺失、空或非法时返回 undefined（必填字段用 num）。 */
export function looseNum(value) {
    if (value === undefined || value === null || value === '')
        return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}
/** 取普通对象：非对象、数组或 null 返回 undefined。 */
export function obj(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value
        : undefined;
}
/**
 * 归一重置时间：字符串原样返回，数字时间戳自动识别秒/毫秒。
 * 0、负数与非法值返回 undefined —— 报文里空闲窗口的 resetAt: 0 是占位，不是 1970 年。
 */
function resetTime(value) {
    if (typeof value === 'string')
        return value.length > 0 ? value : undefined;
    const n = looseNum(value);
    if (n === undefined || n <= 0)
        return undefined;
    const ms = n < 1_000_000_000_000 ? n * 1000 : n; // 1e12 以下按秒级时间戳、以上按毫秒级
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
/** 解析限额窗口；形态不认识时返回 undefined，该窗口按不存在处理。 */
export function readWindow(value) {
    const w = obj(value);
    if (!w)
        return undefined;
    const used = looseNum(w.used);
    const cap = looseNum(w.cap);
    if (used === undefined || cap === undefined || cap <= 0)
        return undefined;
    // 下界夹到 0：负用量无意义，按未消耗读；上界不夹，超额如实报 >100%。
    return { percent: Math.max(0, (used / cap) * 100), capUsd: cap, resetsAt: resetTime(w.resetAt) };
}
/** 拼查询串：跳过未定义参数（如取不到的 orgId 不硬塞空值）。 */
export function queryString(params) {
    const pairs = Object.entries(params).filter(([, v]) => v !== undefined);
    return pairs.length > 0 ? '?' + pairs.map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&') : '';
}
/**
 * 账号金额收敛为两位小数字符串：平台回传保留服务端精度的原始串（如 `9.9902690000000000`），
 * 直接展示会与官方路由的 `¥8.79` 风格不一致；非法值仍抛错，不伪造 0。
 */
export function money(value, what) {
    const raw = str(value, what);
    const n = Number(raw);
    if (!Number.isFinite(n))
        throw new Error('dsh-pet: 账号余额金额非法 ' + what);
    return n.toFixed(2);
}
/**
 * 两个金额串相加，按整数分计算后保留两位小数，避免二进制浮点误差在金额上显形。
 */
export function sumMoney(a, b) {
    return ((Math.round(Number(a) * 100) + Math.round(Number(b) * 100)) / 100).toFixed(2);
}
