import { randomUUID } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { checkContent, checkQuota, normalizeQzoneConfig, shouldForceWake } from '#feiyu-room/qzone';
import { durableWrite } from '#dsh-world/life/lifeStore';
import { privateDeviceDirectory } from './bridge.js';
const defaults = { enabled: false, times: ['13:00', '21:30'], dailyMax: 10 };
function preferences(raw) {
    const s = raw;
    if (!s || typeof s.enabled !== 'boolean' || !Number.isSafeInteger(s.dailyMax) || s.dailyMax < 1 || s.dailyMax > 50
        || !Array.isArray(s.times) || !s.times.length || s.times.length > 20 || s.times.some(t => typeof t !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))
        || new Set(s.times).size !== s.times.length)
        throw Error('QQ 空间时间或日限额无效');
    return { enabled: s.enabled, times: [...s.times].sort(), dailyMax: s.dailyMax };
}
const config = (s) => normalizeQzoneConfig({ ...s, checkpoints: s.times.map((at, i) => ({ at, min: i + 1 })) });
/** Posts are reserved durably before submitting to the platform. A crash or
 * ambiguous response leaves an uncertain item which will never be retried. */
export function createQzoneLedger(dataDirectory, accountId, clock = Date.now) {
    if (!/^\d{1,24}$/.test(accountId))
        throw Error('请先指定 QQ 帐号');
    const file = join(privateDeviceDirectory(dataDirectory, 'qzone-' + accountId), 'published.json');
    function read() {
        const stat = lstatSync(file, { throwIfNoEntry: false });
        if (!stat)
            return { settings: { ...defaults, times: [...defaults.times] }, drafts: [], posts: [] };
        if (!stat.isFile() || stat.nlink !== 1)
            throw Error('QQ 空间草稿存储不可用');
        const state = JSON.parse(readFileSync(file, 'utf8'));
        if (!Array.isArray(state.drafts) || !Array.isArray(state.posts))
            throw Error('QQ 空间草稿存储不可用');
        state.settings = preferences(state.settings);
        return state;
    }
    function save(s) { durableWrite(file, JSON.stringify(s)); }
    function snapshot() {
        const s = read();
        return { ...s, quota: checkQuota({ state: s, cfg: config(s.settings), now: clock() }) };
    }
    async function publish(content, recentTexts, send) {
        const s = read(), cfg = config(s.settings), now = clock();
        const draft = s.drafts.find(d => d.text === content && d.status === 'pending');
        if (!draft)
            throw Error('只能发布主人已登记的待发公开草稿');
        const checked = checkContent(content, { cfg, recentTexts });
        if (!checked.ok)
            throw Error('QQ 空间草稿未通过公开内容核对');
        const quota = checkQuota({ state: s, cfg, now });
        if (!quota.ok)
            throw Error(quota.message);
        draft.at = now;
        draft.status = 'uncertain';
        s.posts.push({ id: draft.id, at: now, status: 'uncertain' });
        save(s);
        const result = await send(content);
        if (!result || typeof result !== 'object' || !('tid' in result) || !String(result.tid ?? '').trim())
            throw Error('QQ 空间发布结果待核对');
        const latest = read(), item = latest.drafts.find(d => d.id === draft.id), post = latest.posts.find(p => p.id === draft.id);
        if (item && post) {
            item.status = 'sent';
            post.status = 'sent';
            save(latest);
        }
        return result;
    }
    return {
        manage(operation, input = {}) {
            const s = read();
            if (operation === 'qzoneState')
                return snapshot();
            if (operation === 'qzoneSettings') {
                if (!isDeepStrictEqual(s.settings, input.expected))
                    throw { code: 'STALE_REVISION' };
                s.settings = preferences(input.next);
            }
            else if (operation === 'qzoneDraft') {
                if (typeof input.text !== 'string')
                    throw Error('草稿不能为空');
                const checked = checkContent(input.text, { cfg: config(s.settings) });
                if (!checked.ok || !checked.text)
                    throw Error(checked.message);
                if (s.drafts.some(d => d.text === checked.text && d.status !== 'sent'))
                    throw Error('相同草稿已在队列或发布结果待核对');
                s.drafts.push({ id: randomUUID(), text: checked.text, status: 'pending' });
            }
            else if (operation === 'qzoneRemove') {
                const index = s.drafts.findIndex(d => d.id === input.id && d.status === 'pending');
                if (index < 0)
                    throw Error('只能移除尚未发送的草稿');
                s.drafts.splice(index, 1);
            }
            else
                throw Error('未知的 QQ 空间操作');
            save(s);
            return snapshot();
        },
        publish,
        async tick(recentTexts, send) {
            const s = read(), cfg = config(s.settings), now = clock();
            if (!s.settings.enabled || !shouldForceWake({ state: s, cfg, now }).due || !checkQuota({ state: s, cfg, now }).ok)
                return;
            const next = s.drafts.find(d => d.status === 'pending');
            if (next)
                await publish(next.text, recentTexts, send);
        },
    };
}
//# sourceMappingURL=group-qzone.js.map