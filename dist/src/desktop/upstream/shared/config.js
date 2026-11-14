/** 显示位置白名单。 */
export const PET_DISPLAYS = ['web', 'desktop', 'both', 'none'];
/** 该宠物是否参与浏览器半侧渲染。 */
export const isWebVisible = (display) => display === 'web' || display === 'both';
/** 该宠物是否参与桌面模式（Electron 透明窗）渲染。 */
export const isDesktopVisible = (display) => display === 'desktop' || display === 'both';
/** 把成品聚合拍平成渲染用宠物列表。
 *  条目级字段（animations / physics / font 等）由所属条目一份、多实例共享；assetRoot 取条目 key，
 *  即素材根。非 main 条目打 extra 标记：文件宠物在设置页不可编辑、保存时排除。 */
export function flattenConfigPets(merged) {
    const out = [];
    for (const [entry, conf] of Object.entries(merged)) {
        const list = Array.isArray(conf?.pets) ? conf.pets : [];
        for (const p of list) {
            out.push({
                ...p,
                animations: conf.animations,
                animationWeights: conf.animationWeights,
                eventsRefreshSec: conf.eventsRefreshSec,
                physics: conf.physics,
                font: conf.font,
                confineToScreen: conf.confineToScreen,
                workStatusTexts: conf.workStatusTexts,
                // 睡觉文案：渲染端要能「睡着时点对话/碎碎念就弹拒绝台词」，所以必须在拍平时带出来
                // （与 workStatusTexts 同一类条目级字段：多实例共享所属条目那一份）。
                sleepStartTexts: conf.sleepStartTexts,
                sleepEndTexts: conf.sleepEndTexts,
                sleepRefuseTexts: conf.sleepRefuseTexts,
                whisperModel: conf.whisperModel,
                chatModel: conf.chatModel,
                // 表情包三件套：右键「配图」菜单要按配置里的清单与顺序分组，客户端不读磁盘，
                // 所以只能在拍平时一并带出；文件是否存在由宿主在生成时校验（见 host/memes 的池判定）。
                memes: conf.memes,
                chatImageEnabled: conf.chatImageEnabled,
                chatAnimationEnabled: conf.chatAnimationEnabled,
                chatImageLimit: conf.chatImageLimit,
                assetRoot: entry,
                extra: entry !== 'main',
            });
        }
    }
    return out;
}
