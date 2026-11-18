# 阶段 1 缩小方案：M3 改为「收口并发版」

- 级别：大改（改阶段规划和完成标准、涉及发布流程）
- 状态：已确认

## 目标与外部变化

M2 复测第 5 类没达到门槛，按 M1 评审定下的规则在 M3 开始前转为 B（`docs/decisions.md:153-157`）。这份方案把 `docs/product.md:302-314` 的原 M3 换成一个小得多的 M3：**不再动第一层的代码，只把 M2 的成果验证、打包、发版**。原 M3 里属于第二层的事交给阶段 2a，其余的砍掉或推迟。

主人能看到的变化：

- 阶段 1 以发布 **0.2.0** 结束。先发预发布版 `0.2.0-rc.1`（版本号带 `-` 时走 npm `next` 标签、GitHub Release 标为预发布，`.github/workflows/release.yml:83-84,104-105`），在隔离环境里用 DSH 的更新按钮从 npm 安装的 0.1.8 升级、在真实副本上演练回退，都通过后再发正式版。
- **注意**：预发布也会把它的冻结提交推成远端 `main`（`release.yml:90-98`，没有只限正式版的条件），而远端 `main` 是 GitHub 安装方式的默认分支。按现有说明，GitHub 安装应先切换到 npm（`docs/github-updates.md:14-18`）；主人的日常安装来源需要先确认，见拍板点 6。
- 主要场景（原生聊天、记忆、桌宠、Room、QQ）保持可用。M2 已拍板的行为变化写进更新说明：模块没加载时设置页把它的能力行显示为「不可用」，Desktop 缺席而绑定就绪时不再显示「已停用」（`docs/decisions.md:129-133`）；历史瘦身对无法分类的已保存输入保护整轮，Life 没加载时 Life 轮次不瘦身（`docs/decisions.md:147-151`）。
- 对仓库外的代码：包的导出路径、`files`、`imports` 和 `cordis.patch.yml` 与 `v0.1.8` 相同，变化在 `createCore()` 返回的 `PetCoreHost` 上（`src/core/index.ts:38-52`）：`host.native` 删除了 `lifeAdmission`、`roomAdmission`、`channelBoundary`、`playbackEvidence`，`memoryEnabledForNewSessions` 改成方法（旧写法 `if (host.native.memoryEnabledForNewSessions)` 在 JS 里会把函数当真值），另有 `scopeFor` → `nativeScopeFor`、`resolveScope` → `resolveNativeScope`，新增 `sourceTable`、`toolTable`、`registerPlaybackEvidence`（`src/core/native/conversation.ts:84-129`）；`./contracts` 新增登记表类型（`src/contracts/index.ts:9`）。这是发 0.2.0 而不是 0.1.9 的原因（`decisions.md:135-139`）。
- `product.md` 的阶段规划、阶段 1 完成标准、一句话 MVP 和典型修改目标按下文改写；`decisions.md` 加一条决定。

## 范围变化

整体是一次**缩小**。新增的工作只有两项，代价如下：发版多一个预发布步骤（多发一个版本号，主人多操作一次工作流）；已知问题 5 的修复成为 2a 的前置批（原来没有排期）。G2 要求的四个问题：

**1. 替换或延期了什么。** 原 M3 每一项的去向：

| 原 M3 的项（`product.md:306-312`） | 去向 | 理由 |
| --- | --- | --- |
| 初始化表：把 Core 写死的容器改成各模块登记 | **砍掉**。`core/initialization.ts` 的 2 条 R1 改为长期例外。已有的 `registerInitializer` 登记口保留，照旧供 Economy、Memory Bank、近期账本使用（`src/core/workspace.ts:183-187`、`src/economy/plugin.ts:222-229`） | 难点在语义：容器改由模块登记后，部分加载时新装、启动检查、显式重做、回退旧版分别该怎么做，都要重新定（`decisions.md:123-127`）。现在 Core 在显式初始化时一次建好 13 个目录、桌宠配置、Life 控制文件和情绪文件（`src/core/initialization.ts:8-10,67-79`），启动时一起校验（`:41-65`）。这个行为简单可靠，B 不为了清 2 条违规去改它 |
| 提示词与历史投影表：工具结果的历史概览 | **已完成**，不再列 | M2 已改由工具声明的 `historyOverview` 派生（`docs/architecture.md:78`，`src/core/native/history-maintenance.ts:12-19`） |
| 提示词与历史投影表：段登记、状态快照退休、召回策略改成表 | **砍掉**，现行做法保留 | 现有 `registerWorldPrompt`（`src/core/native/prompt.ts:91`）、动态段退休（`prompt.ts:25-55`）、召回每轮替换（`architecture.md:361`）都能用。召回策略是 M2 方案明确留给 M3 的（M2 方案拍板点 2，`git show 5bab853^:docs/plans/m2-layer1-tables.md` 第 39 行），一并砍出重构，记进 `ideas/inbox.md` 交给重构后的「大模型使用细则」（`~/Developer/project-design/ideas/her-world-llm-usage/`） |
| Memory 不再订阅 `pet/life.review`，改为向下调用 | **推迟到 2a** | 两条违规都在 `src/memory/batch.ts`（`:14` 订阅，`:93` 读 `petLife`）；事件由 `src/life/plugin.ts:201-203` 的 `afterReview` 发出。2a 改的时候要保住回顾开关、home 资格复核、工作区切换和停用语义，继续用 `installMemoryBatch` 的调度，不能改成回顾完立即压缩 |
| 记录库读 Life 的活动记录 | **推迟到 2a** | `src/core/records.ts:31-42` 的 `dates()`、`journal()` 直接用 `createLifeStore`，搜索也走 `dates()`（`:111-121`），上游构造器还会建目录（`vendor/dsh-world/lib/life/lifeStore.js:126-132`）。2a 一起处理日期、日记里的活动内容、Life 关闭后的历史查询、时区和旧路径 |
| 共享 home 身份记录的归属写进架构 | **已完成**，不再列 | `docs/architecture.md:180` 已写明归第一层，迁移放 2a |
| 组装契约 5.9：隐含契约变成契约测试 | **推迟到 2a，作为 2a 的第一批**，范围按 `architecture.md:398` 全部保留 | 包括工具限制早于 schema 解析、`environment` 先于 `interactions`、`chatpet.interactions` 段名和原样 JSON、事实确认晚于日志落盘、替换只在打开的请求里，以及预设名／会话前缀／渠道目录承担的路由恢复协议、「home 身份」和「Life 在运行」是两个判定。这些保护的正是 2a 要搬的事实准备，先写测试再搬。复用 `test:native-context`（`scripts/checks/check-native-context.mjs`）和历史维护测试，只补没覆盖的项 |
| 组装契约 5.9：各段的类别、可见性、准备依赖、有效期、预算、超时、退休声明，`order` 全局唯一 | **砍出重构**，记进 `ideas/inbox.md` | 没有可见收益，预算本来就只度量不截断（`decisions.md:63-67`）；第 6 类的读码基线是 1–2 个文件（`product.md:108`），但原目标还想统一预算、有效期和 guest 可见性，这部分一并放弃，由大模型使用细则以后再议 |
| 上下文段清单（按需交付表格，`product.md:282`） | **改到 2a 开始前交付，主人确认**；只列契约测试需要的列（名字、顺序号、来源、条件、测试），不填预算；段数以实际加载组合为准 | 跟着契约测试走 |
| 全仓问题：`CoreStore` 的 `records.kind` 带类型、拥有者提供存储端口 | **推迟到阶段 3**，跟着数据搬迁方案定（搬迁可选，见拍板点 5） | 端口的价值在 kind 搬出 Core 数据库时。注意 2a 要搬的 `economy.initialized:*` 是 Core 的 `meta` 键，不是 `records.kind`（`src/economy/plugin.ts:79-80`、`arch/storage.json:34`），2a 照常为它做拥有者端口，但不算承接这一项。在端口落地前，第一层没有按拥有者隔离写权限，这个缺口照现状接受 |
| 全仓问题：错误码单一定义；设置页回复保留 `effect`、`retry` | **推迟到阶段 3**，并入设置 RPC 声明 | 即已知问题 3（`product.md:222`）。改回复形状会改控制台客户端看到的接口；错误码联合（`src/core/storage.ts:10` 对 `src/contracts/common.ts:19-21`）在高风险文件里，和调用方接口一起验收 |
| 全仓问题：DSH 原生事件由第一层统一投影 | **砍掉** | 接受各模块各自订阅原生事件及其维护成本。R3 只拦未声明或方向错误的订阅（`scripts/arch/lib/rules.mjs:71-81`），不等于统一投影；但再加一层投影是第一层大改，B 跳过 |
| R5 存储句柄对第一层生效 | **砍出阶段 1**；R5 继续只报告 | 同 `records.kind` 一项，跟着阶段 3 的搬迁方案再定 |
| R6 第一层新写模块各带测试 | **不适用** | 阶段 1 不再新写第一层模块；2a 新写的第二层模块照 `architecture.md:133,490` 各带一条 |
| 登记完成屏障（`decisions.md:141-145`） | **推迟，不排期** | M2 没找到可用的宿主接点。现在没登记的来源返回 `unclaimed` 并拒绝，和 0.1.8 一样；2a、阶段 3 的验收继续覆盖「未登记即拒绝」和不同装载顺序。等 DSH 提供接点，或观察到启动窗口里有输入被误拒时再议 |
| 回退后「找回新版期间聊天」 | **推迟出阶段 1**，记进 `ideas/inbox.md` | 原定是 P1 之后单独的可选恢复步骤（`decisions.md:27-31`），M2 没做（`product.md:298`），不是 MVP 必需 |
| 新版在真实数据副本上的完整演练 | **保留** | MVP 要求能回退 |
| 打包验证 | **保留**，按实际安装路径写清（见新 M3 的 C 批） | MVP 要求能从 0.1.8 升级；M2 改了 `PetCoreHost`，仓库外的用法要核实（`decisions.md:137`） |
| 发一个版本 | **保留** | MVP 要求能发版 |

**2. 当前闭环怎么验收。** 从真实入口走一遍（G9）：在隔离的已安装 DSH 里用 npm 装好 0.1.8 并绑定真实数据副本 → 用插件详情页的更新按钮升到 `0.2.0-rc.1`（跳过迁移，验证直接升级）→ 在 DSH 原生聊天里说话，换一个会话问前面聊过的事能召回 → 打开桌宠、Room 看到她的状态 → 换回 0.1.8 → 恢复备份 → 旧版照常聊天和召回。迁移和回退另按 D 批演练。

**3. 原完成标准还算不算数。** 原 M3 的完成标准整体作废，由新 M3 的标准替换。阶段 1 整体完成标准逐条处理：

| 原标准（`product.md:318-323`） | 处理 |
| --- | --- |
| 行为清单中与第一层相关的全部条目全绿，其余没有退步 | **保留**（M2 后 52 条全绿，`product.md:298`） |
| 检查脚本对第一层源码全绿（home 记录例外除外）；全仓违规固定成基线，只减不增 | **前半句作废，后半句保留**。改成：第一层剩余 23 条违规每条都有去向，写进 `product.md`；全仓基线只减不增（81 → 60 已兑现） |
| 迁移与回退在真实数据副本上演练通过 | **保留**，用候选安装包重做，证据边界见 D 批 |
| 已安装环境里能从 0.1.8 升级，也能回退 | **保留**，按 C、D 批的具体检查项 |
| 典型修改对比表已更新一次，主人确认「第一层的重写值得继续」 | **改成**：对比表已更新（M2 复测已完成），主人确认按 B 进入阶段 2 |
| 会话策略表、上下文段清单已在各自里程碑前交付；R8 词表重复只减不增 | **改成**：会话策略表已交付并经主人确认（`6b0dcb3`）；上下文段清单移到 2a 开始前；R8 只减不增保留 |

一句话 MVP（`product.md:30`）也要改：去掉「用新写法重写首个替换单位」，改成「立起三层边界和自动检查，第一层改用登记口（能力状态、来源适配、工具声明），跑通备份、迁移、回退，从 0.1.8 升级到新版后聊天和记忆照常可用，行为清单逐条通过」。

**4. 对应哪个已确认的用户场景。** 发版和升级对应核心场景 5「在 DSH 的插件详情页一键更新」；升级后聊天和记忆可用对应场景 1；桌宠、Room 对应场景 2；QQ 冒烟只覆盖场景 4 的一部分，微信和语音这次不单独验（`product.md:14-18`）。这次没有新增职责。

## 原 M3 完成标准里的矛盾，以及新的完成标准

**矛盾。** 原 M3 要求「R1–R4 对第一层源码全绿」（`product.md:307`），但第一层剩下的违规大多是第二层的东西还留在第一层：Core 读 `petBehavior / petLife / petEconomy` 准备事实和环境段，而「事实的准备、验证、确认搬入第二层」写在 2a（`product.md:344`）；`companion-settings.ts` 读 Desktop 的外观解析，而设置字段声明写在阶段 3（`product.md:375`）。照字面，M3 要么提前做 2a 和阶段 3 的事，要么不可能全绿。

**解法。** 不再要求阶段 1 第一层全绿，改成「每条有去向、去向按阶段兑现」。第一层 23 条（`arch/baseline/rules.json`，按 `arch/layers.json` 归层：Core 19 + Memory 4，即 R1 7、R2 15、R3 1）的去向：

| 违规 | 条数 | 去向 |
| --- | ---: | --- |
| `src/core/companion-foundation.ts:179,202,207,228,233,247` 读 `petBehavior / petLife / petEconomy`（R2，其中 `:179,202,207,233,247` 各两个目标） | 11 | 2a：事实准备、`environment` 和 `interactions` 段搬入第二层 |
| `src/core/companion-foundation.ts:141` 读 `petBehavior`（R2）：`chatpet.foundation` 模板里「有没有身体」的条件 | 1 | 2a：改用已有登记（如能力状态表）判断，不再读服务 |
| `src/core/plugin.ts:6` import `life/album-tools`（R1）；`:42` 读 `petRoom`、`:43` 读 `petLife`（R2） | 3 | 2a：相册工具已登记到工具声明表（`src/life/album-tools.ts:29`），2a 把挂载和门控搬到第二层。要保住现状：Life 没加载时普通聊天仍能用相册，电视画面和 Life home 仍被隔离；门控改用来源声明，不照搬 `petRoom` 读取（否则变成第二层读第三层） |
| `src/core/native/memory.ts:7` import `life/review-dialogue`（R1） | 1 | 2a：只搬家。`src/life/review-dialogue.ts:1-7` 只依赖第一层和 vendor，唯一调用方是 `core/native/memory.ts:96` |
| `src/memory/batch.ts:14` 订阅 `pet/life.review`（R3）；`:93` 读 `petLife`（R2） | 2 | 2a：回顾完成时 Life 向下调用 Memory，调度语义不变（见上） |
| `src/core/companion-settings.ts:2` import `desktop/appearance`（R1） | 1 | 阶段 3：设置字段声明，要保住 Desktop 缺席时的解析和已有设置 |
| `src/core/initialization.ts:5` import `life/library`（R1）；`:12` 按安装根加载 `vendor/dsh-pet` 的 JSONC 读取器（R1，无法静态判定） | 2 | **长期例外**：前者是真实的跨层依赖，因初始化表已砍而保留；后者是检查器解析不了的 vendor 加载 |
| `src/memory/client.ts` 两处动态 import `vendor/mnemosyne`（R1，无法静态判定；基线记为 `:53,54`，当前源码在 `:55,56`） | 2 | **长期例外**：现在按构建产物位置定位包根加载上游引擎，包内运行由 `pnpm run check:package` 验证（`scripts/checks/check-runtime-package.mjs`） |

所以：阶段 1 结束时第一层 23 条；**2a 结束时第一层目标只剩 5 条**；阶段 3 若做设置字段声明则剩 4 条长期例外。长期例外留在基线里，不改成放行规则，每个阶段末按 G8 复核。这些数字是各阶段的完成线，到时以实际扫描为准。共享 home 记录的旧例外属于 R5，不在这 23 条里，仍在 2a 清。

**新 M3：收口并发版**

| 做什么 | 完成标准 |
| --- | --- |
| A. 发版准备（Codex） | `docs/release/notes.md` 改写成 0.2.0 的中文更新说明：主要场景不变；M2 已拍板的行为变化；`PetCoreHost` 的接口变化及替代写法；直接升级、迁移、回退怎么做。`v0.1.8..main` 的兼容面逐项核对结果（`package.json` 的 `exports / files / imports`、`cordis.patch.yml`、Cordis 服务名、配置字段、Bundle ID、`PetCoreHost` 字段）写进本方案「执行结果」，不另建报告文件。`pnpm run verify`（含 `check:package` 的归档和包内运行检查）、`pnpm run build && pnpm run test:behavior-list` 全绿 |
| B. 文档收口（Claude） | 把 B 之后的现状写进 `docs/architecture.md` 第 0、2.2、5.1、5.9、5.10、7.4、9、10 节（初始化表改为「保留 `registerInitializer`，不再把写死的容器改成登记」；提示词表剩余部分砍掉；P2c 改写；目录名只在第二层合并时定）；`product.md` 的成功标准、总表和 MVP 一致；`AGENTS.md` 里指向 5.10 的入口说明不再承诺已砍的部分 |
| C. 预发布与打包验证（主人） | 推送 `main`（另行确认）后发 `0.2.0-rc.1`。在隔离的已安装 DSH 里：起点是 **npm 安装的 0.1.8**；用更新按钮（勾选预发布）装上 RC 并实际激活，插件名、Bundle ID、入口、服务名、配置字段正常；用合成或临时数据跑 `pnpm run test:native-services`、`test:native-room`、`test:native-channel-homes`，验证 DSH 原生接缝（这三条从源码检出加载 `dist/src`，证明的是接缝，不证明更新按钮装对了包）；盘点主人已安装环境里有没有别的插件或脚本用到 `her-world/core` 的被删字段，有就在隔离环境验证它的实际入口 |
| D. 真实副本演练（主人，独立设备，复用 M1 流程，`docs/development.md:113`） | 源码检出固定在 RC 的提交。① 直接升级：0.1.8 → RC，不跑迁移，聊天、跨会话召回、桌宠、Room 正常。② 迁移：0.1.8 上停写，`companion-migrate.mjs plan` → `run --backup <新目录>`，通过后升级到 RC 正常使用。③ 回退：在同一设备同一路径**先换回与备份指纹一致的 0.1.8**，确认 DSH 和写入者已退出，再 `companion-backup.mjs restore --installation … --backup … --before <新目录>`，最后启动旧版：聊天和召回正常；升级后新增的聊天回退后看不到；送达和额度回执保留；升级前已撤回的记忆仍不可见；伙伴身份和便携存储 ID 升级前后不变（隔离机的 DSH 工作区 ID 可以不同）。④ 崩溃续做：真实副本上无法可靠控制断点，证据用合成副本上的 `tests/migrate/crash.test.mjs`（按合成步骤控制断点）加 M1 已通过的真实副本续做记录，并在执行结果里写明这个边界。Agent 只看原因代码、退出码、`restored` 字段和主人回报的通过与否，恢复命令的原始输出留在本机 |
| E. 正式发版（主人） | 在 RC 冻结后的 `main` 上发 `0.2.0`；核对正式版与 RC 的源码差异只有版本元数据；门禁全绿；在隔离环境用更新按钮装一次正式包确认能激活，再升级日常机器。0.1.8 的安装包和回退步骤留好 |

**主人的验收动作**：日常机器装 0.2.0 正常用，聊天、记忆、桌宠、Room、QQ 都正常。回退只在 D 的隔离副本上验证，不在日常机器上做（回退会丢掉新版期间的聊天，`decisions.md:29`）。日常升级不附带跑元数据迁移（理由见拍板点 4）。

**停止条件**：打包验证或真实副本演练失败两轮，停下来整理事实交给独立会话分析，不发正式版；发现必须改第一层代码才能发版，停下来升级对齐，不在 M3 里顺手改。候选包内容要改时发 `rc.2`；同一冻结提交遇到发布或下载超时，用 **Re-run failed jobs** 续跑（`docs/github-updates.md:50-55`）。

**新的阶段 1 整体完成标准**

- [ ] 行为清单中与第一层相关的全部条目全绿，其余条目没有退步。
- [ ] 全仓违规基线接入门禁，条目比阶段开始时只减不增；第一层剩余违规每条在 `product.md` 有去向。
- [ ] 真实数据副本上用候选安装包演练直接升级、迁移、回退通过；崩溃续做的证据边界写明。
- [ ] 隔离的已安装环境里能从 npm 的 0.1.8 升级到 0.2.0 并激活，也能回退；三条原生检查通过。
- [ ] 发布 0.2.0。
- [ ] 典型修改对比表已更新，主人确认按 B 进入阶段 2。
- [ ] 会话策略表已交付并经主人确认；R8 词表重复只减不增。

## B 现在具体指什么，以及对阶段 2–4 的影响

B 的原文（`product.md:274`）：保留检查和棘轮、概念统一，在原结构上治理；只重写第二层的合并，跳过第一层的大改。M2 已经在第一层落了三个登记口：来源适配表（会话策略的 9 行由它登记）、能力状态表、工具声明表（`architecture.md:79-83`）。所以 B 现在是：

- **第一层：M2 的状态就是终点。** 三个登记口和已有的 `registerInitializer` 保留并继续用；不再新建初始化表、提示词表；不把 `core/` 等目录搬进 `kernel/`。第一层只会因为 2a 把第二层的东西搬走而变干净，不再为第一层本身做重写。
- **第二层：照原计划合并**（这是 B 唯一保留的重写），并接手原 M3 里属于第二层的事。
- **第三层：原地治理，不重写模块。** 用登记口和共用小包清违规，不再「逐个模块收口重写」。
- **检查、棘轮、行为清单、迁移骨架、G1–G9 全部保留**，G8 每个阶段末照旧复盘。

**阶段 2a（合并，行为不变）**：原完成标准（`product.md:339-350`）全部保留（包括 `economy.initialized` 搬出时保住「缺库拒绝、不让旧钱包复活」的现有判断，`src/economy/plugin.ts:70-90`），另加：

- 第一批是安全网，开始前单独写方案：5.9 隐含契约的契约测试（范围见上）；上下文段清单（主人确认）；修已知问题 5（只读检查写源库附属文件，`product.md:224`，在高风险目录）；定迁移的版本过渡——完成的日志会挡住新的 `run`（`scripts/migrate/runner.mjs:26-31`），存储清单按完全相等比较，更新 `dataVersions` 后旧清单可能在加锁前就报 `manifest-mismatch`（`scripts/migrate/context.mjs:22-30`），恢复还会把旧的 `migration.lock` 一起带回来（`tests/migrate/normal.test.mjs:46-54`），所以要同时定日志归档、旧清单过渡和每轮新备份的边界。
- 接手第一层 18 条违规（见上表），以及第二层读第三层的 4 条（`src/life/plugin.ts:131,180,288,294`），2a 结束时第一层目标只剩 5 条，第二层 R1–R4 全绿（原标准）。
- 记录库对 Life 活动记录的读取改为第二层提供的只读接口（范围见上）。
- 第二层的目录名在 2a 方案里定；第一层、第三层不改目录。

**阶段 2b（概念统一）**：保留（B 原文明确保留概念统一）。完成标准里「典型修改 4 到 8 中与第二层有关的几项」改成「第 8 类（照料动作、事实领域）」，因为第 4 类已达标、第 5 类不再追、第 6 类不设目标。

**阶段 3（改为「第三层原地治理」）**：草案改成——

- 运维操作表、语音接口、图片共用小包落地；阶段 3 方案开始前，像第一层一样给第三层每条基线违规（控制台 12 条、读 `petVoice` 的 5 条、Voice 引用 Desktop 上游实现、Desktop 读 Room 和动态路径、R3 一条等）定好去向，能清的清，清不了的写明长期例外。
- 设置字段声明和设置 RPC 声明（含已知问题 3、错误码单一定义、`core/companion-settings.ts:2`、第 7 类和 5b），阶段 3 方案时按收益再评估一次。
- 原草案里的这些保留：Room 传输契约一份、`lifeDates` 一类端点名保留为兼容适配、典型修改 2、3 实测达标、R7 全部通过（对应成功标准「外围模块能整个关掉」）、整份行为清单全绿、每个模块完成各发一个版本、原停止条件。
- 槽位与素材分离、Desktop/Channels 协议的显式声明：保留为草案，阶段 3 方案时按收益逐项定。
- 数据搬迁：见拍板点 5。

**阶段 4（收尾）**：B 下没有新旧两套目录要删，所以改成：删已不用的旧适配；旧入口和旧服务名照旧以已安装配置不再引用为前提才删；前后对比总表**照实记录**（第 4 类达标、第 5 类未达标、第 6 类不设目标，其余按各自目标判）；体检（`skill-govern-stage`），按 G8 复核检查规则和长期例外。

**典型修改目标**（`product.md:101-110`）：

- 第 4 类：已达标，不变。
- 第 5 类：目标和判定都不改，仍记「未达标」；B 下不再为它改第一层，阶段 4 照实记录。
- 第 6 类：段声明已砍，目标改为「不设目标」，不再复测。
- 第 7 类：留在阶段 3，阶段 3 方案时再评估。
- 第 1、2、3、8 类：不变。

## 改动范围

- 这一步是：只改文档和发版说明，不改业务代码。
- 允许修改（这份方案拍板后，Claude 提交）：
  - `docs/decisions.md` — 加一条「阶段 1 缩小方案」，并写明登记完成屏障、召回策略、找回新版期间聊天的改期
  - `docs/product.md` — 一句话 MVP；M2 标题改为已完成；M3 改写；阶段 1 整体完成标准；第一层违规去向表；阶段 2–4 草案；典型修改目标列；「按需交付的表格」里上下文段清单的时间和列
  - `docs/plans/stage1-narrow.md` — 本方案（M3 执行期间的依据，M3 合并时删除）
  - `~/Developer/project-design/ideas/inbox.md` — 记下砍出重构的三项（段声明与预算、召回策略、找回新版期间聊天）
- 允许修改（M3 执行时）：
  - `docs/release/notes.md` — Codex，A 批
  - `docs/architecture.md`、`AGENTS.md` 的入口说明 — Claude，B 批
  - `docs/development.md` — 只在发版步骤需要补说明时改
- 必须复用：
  - `.github/workflows/release.yml` 的预发布路径
  - `pnpm run verify` 里的 `check:package`（`scripts/checks/check-runtime-package.mjs`）
  - `scripts/migrate/companion-migrate.mjs` 的 `plan / status / run / --resume` 和 `scripts/companion-backup.mjs restore`（`docs/development.md:84-111`）
  - M1 的独立设备演练流程（`docs/development.md:113`）和 `tests/migrate/` 下的 `normal`、`compatibility`、`settlement`、`crash` 测试
- 不做：任何 `src/` 改动；`package.json` 的 `exports / files / imports`；发布流程文件；推送和发版本身由主人操作。

## 特殊情况

- **不迁移直接升级**：运行时不读迁移器写的 `.chatpet/data/storage-manifest.json`（`src/` 里没有引用；迁移器按 `arch/storage.json` 计算它，`scripts/migrate/context.mjs:9-30`）。Core 启动仍读 `.chatpet/manifest.json` 并核对（`src/core/workspace.ts:417-433`），这部分 M2 没改格式。但「不读」不等于「直接升级一定能用」，所以 D 批①单独验证直接升级。
- **迁移命令需要源码检出**：npm 包里有备份 CLI，没有 `scripts/migrate/`、`arch/storage.json` 和原生检查脚本（`package.json:41-83`）。C、D 都在固定提交的源码检出里跑，`--installation` 传指向隔离绑定的安装回执。
- **已知问题 5**：`plan / status`、`run` 的锁外预检和部分拒绝路径会在源 Core 目录生成 `core.sqlite-wal/-shm`，第一次绑定读取还发生在停写探测之前（`scripts/lib/repo-storage.mjs:15-25`、`scripts/migrate/runner.mjs:34-56`）。目前只有附属文件写入的证据，没有业务记录被改的证据。所以元数据迁移只在 D 批的隔离副本上跑，日常升级不跑；真实副本上仍按现有停写、备份和退出条件执行，不因为这个问题跳过停写检查。
- **回退**：恢复器先核对当前安装包的字节指纹，通过后才备份当前数据并恢复（`scripts/lib/offline-backup.mjs:109-129,270-277,391-394`），它不替你换回旧包。新版期间的聊天、已送达消息、已消耗额度不可回退（`architecture.md:457-458`）。断言按恢复器的真实行为，不比较整目录逐字节相同（`architecture.md:460`）。
- **仓库外用到被删字段的代码**：C 批盘点；发现了就停下来对齐，不加兼容字段（`decisions.md:139` 放弃过这个选项）。
- **预发布推进远端 `main`**：见拍板点 6。另外 82 个本地提交（`origin/main...HEAD` 为 `0 / 82`）要先推送，推送前另行说明影响，等主人确认。
- **`test:native-memory` 跑不通**（已知问题 7，`product.md:226`）：不在 M3 修。`test:native-services` 覆盖跨会话召回、provider 重启和普通纠正/撤回（`scripts/checks/check-native-services.mjs:93-146`），但代替不了 `native-memory` 的故障注入和更细的撤回路径；真实 Bank 里已撤回记录迁移后仍不可见，靠 D 批③由主人在隔离环境核对。

## 概念与扩展检查

- **新增或修改的概念**：没有新增。第一层「五张表」改成「三个已落地的登记口（来源适配含会话策略行、能力状态、工具声明）+ 已有的 `registerInitializer` + 运维操作表（阶段 3）」；初始化表（把写死容器改成登记）、提示词表的段登记部分作废；5.9 只留隐含契约的契约测试。`architecture.md` 相关各节在 M3 B 批同步改。
- **拥有者**：M3 不变。共享 home 身份记录仍归第一层，迁移仍在 2a。
- **新增词表**：没有。
- **复用的已有声明**：工具声明表（相册工具 2a 搬家时继续用）、来源适配表、能力状态表、`registerInitializer`。
- **层间接口**：M3 内不变。0.2.0 对仓库外的变化只有 M2 已拍板的 `PetCoreHost` 变化。整份方案对 2a、阶段 3 的影响（Life 向下调用 Memory、记录库的只读接口、相册工具挂载搬家）会改层间调用，到时各自的方案按 G2 再审。
- **为什么需要、对应哪个场景**：没有新增职责；发版对应核心场景 5，见「范围变化」第 4 点。
- **R8 核对**：本方案不改代码。挑刺时 Codex 实跑 `pnpm run check:arch -- --report`：R1–R4 60 条、R8 1061 条，两份基线均新增 0、消失 0。

## 拍板记录

1. **新 M3 的范围** — 推荐：只做发版收口，不改第一层代码（上文 A–E）。理由：一个版本只装一个交付单位（`product.md:74`），0.2.0 就是「M2 的成果」；第一层剩下的小项和第二层合并绑在一起，放 2a 改一次。备选：M3 顺手做 Memory 事件改调用和 `review-dialogue` 搬家，三条都清掉的话第一层在阶段 1 降到 20 条，但 0.2.0 多带一处回顾调度路径的变化。决定：按推荐（主人 2026-11-18）。
2. **第一层的完成标准** — 推荐：阶段 1 改为「23 条每条有去向」，2a 结束时第一层目标只剩 5 条，其中 4 条是长期例外（初始化 2、Memory 引擎加载 2），按 G8 每阶段复核。备选：不设第一层目标，只要求全仓只减不增。决定：按推荐（主人 2026-11-18）。
3. **初始化表** — 推荐：不再把 Core 写死的容器改成登记，2 条违规作长期例外；已有的 `registerInitializer` 照旧。备选：推迟到 2a，让第二层登记自己的文件，但要先定部分加载时新装、启动检查、显式重做、回退四种语义并加合成演练。决定：按推荐（主人 2026-11-18）。
4. **已知问题 5（迁移只读检查写源库附属文件）** — 推荐：不挡 0.2.0。元数据迁移只在 D 批的隔离副本上跑，日常升级不跑；作为 2a 第一批修（2a 有第一次真正的数据迁移）。备选：M3 先修再发版，要动高风险目录 `scripts/lib/repo-storage.mjs`、`scripts/migrate/`。决定：按推荐（主人 2026-11-18）。
5. **阶段 3 的数据搬迁** — 推荐逐项定：
   - Channels 五类记录：**暂留 Core 数据库**。现有恢复器专门保护这些回执（`scripts/lib/offline-backup.mjs:309,409-420`），搬出要连带改高风险的备份恢复流程。
   - `desktop-session`：**降为可选**，阶段 3 方案时看便携和恢复上有没有实际收益再定。
   - 浏览器里的经济待确认请求：**保留在阶段 3**，仍按「先导出、核对后清除」（`architecture.md:462-466`）。它现在只在浏览器 `localStorage` 里（`src/console/client.js:449-476`），服务端备份覆盖不到，丢了无法恢复，这是三项里唯一和数据安全有关的。

   备选：三项都保留为阶段 3 完成标准。决定：按推荐（主人 2026-11-18）。
6. **版本号和发布顺序** — 推荐：先发 `0.2.0-rc.1` 做打包验证和真实副本演练，通过后发 `0.2.0`；前提是主人的日常安装来自 npm（不是 GitHub 安装），接受预发布也会推进远端 `main`、让 GitHub 安装方式先看到 RC。理由：M2 改了 `PetCoreHost`，按 SemVer 升次版本号；DSH 的更新按钮只能装已发布的版本，预发布版不会推给日常的稳定更新（`docs/github-updates.md:11-13`）。备选：直接发 `0.2.0`，在隔离环境升级验证，有问题再发 `0.2.1`。决定：按推荐（主人 2026-11-18）。

## 验收

- 快测（本方案只改文档）：行号抽查；`git diff --stat` 只含允许修改的文件。
- 门禁（M3 A 批）：`pnpm run verify`；`pnpm run build && pnpm run test:behavior-list`。
- 手动（主人）：按新 M3 的 C、D、E 批执行。只回报原因代码、退出码和通过与否。

## 执行结果

- A 批：`docs/release/notes.md` 改为 0.2.0 中文更新说明，本节记录 `v0.1.8..89b3f37` 的兼容面及验证结果。
- `exports` 不变（`package.json:6`），`files` 不变（`package.json:41`），`imports` 不变（`package.json:35`）。
- `cordis.patch.yml` 不变（`cordis.patch.yml:1`）。
- Cordis 服务名不变（`docs/architecture.md:424`、`src/core/plugin.ts:34`、`src/core/native/transcripts.ts:292`）。
- 配置字段不变（`src/core/runtime.ts:10`、`src/core/options.ts:3`、`src/memory/client.ts:5`、`src/core/companion-settings.ts:4`、`src/life/plugin.ts:546`、`src/channels/plugin.ts:119`、`src/voice/plugin.ts:64`）。
- Bundle ID `her-world` 不变（`package.json:2`、`package.json:158`、`scripts/install-dsh.mjs:259`）。
- `PetCoreHost` 顶层字段不变（`src/core/index.ts:36`）。`native` 删 `lifeAdmission`、`roomAdmission`、`channelBoundary`、`playbackEvidence`，改用 `sourceTable.register`、`isGuest` 和 `registerPlaybackEvidence`，并新增 `toolTable`（`src/core/native/conversation.ts:84`、`src/channels/sessions.ts:170`）。
- `scopeFor` / `resolveScope` 改为 `nativeScopeFor` / `resolveNativeScope`（`src/core/native/conversation.ts:90`）。Memory 开关改用 `memoryEnabledForNewSessions()` 和 `setMemoryEnabledForNewSessions(enabled)`（`src/core/native/conversation.ts:125`）。
- `native` 新增 `emotionAllowed`、`captureEmotionFooter`，`tools()` 的项目带 `sources`（`src/core/native/conversation.ts:99`、`src/core/native/conversation.ts:323`）。
- `workspace.runtime` 删 `baseCapabilities()`，由 `capabilityTable` 与 `capabilityStatuses` 提供能力状态（`src/core/runtime.ts:31`）。`native.memory.connection.start()` 的范围字段改为 `bankId`（`src/memory/client.ts:11`、`src/core/native/memory.ts:53`）。`./contracts` 新增登记类型（`src/contracts/index.ts:9`）。
- 临时副本执行 `mise exec -- pnpm run build` 通过；随后 `mise exec -- pnpm run test:behavior-list` 的索引测试 11 条、行为清单 52 条均通过，失败 0 条，含本机回环 Memory 测试。
- 按 A 批此次指示未跑 `verify`。已安装环境的外部调用、真实副本升级与回退留待对应批次验收。

## 审查结论

<Claude 验收时填写必须修的问题>
