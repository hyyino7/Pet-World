# 阶段 2a：合并成第二层「生活世界」（行为不变）

- 级别：大改（跨模块、改数据格式、碰高风险目录）
- 状态：已确认（2026-11-19，主人全部按推荐通过）

本方案覆盖 2a 的全部完成标准（[product.md](../product.md)「2a 合并（行为不变）」），按批次交付。第 1 批的执行提示词随方案一起交给主人；第 2 批按常规流程另写方案；第 3–5 批各有一节「开工前要定的细则」，开工前由 Claude 在本文件补齐、主人过目，不另开方案文件。

行号以 `2128d01` 为准。

## 目标与外部变化

**主人看到的**：聊天、记忆、桌宠、Room、QQ、设置页的功能和界面都不变。变化有四处：

1. **升级多一步迁移**。0.3.0 带两项真实数据迁移（共享 home 身份记录、`economy.initialized` 标记）。升级顺序是：0.2.0 下停 DSH 做一份回退备份 → 启动、在版本页换成 0.3.0 → 设置页显示「需要迁移」→ 停 DSH 跑迁移 → 启动（拍板点 6）。
2. **没迁移时 0.3.0 只开普通聊天**，伙伴的工作区、身份上下文、生活世界都不打开，任何初始化、重新绑定和设置保存都被拒绝（拍板点 6）。
3. **setup 装的伙伴换包后 Core 配置不再丢**；已装的机器有一条正式的搬配置命令（第 2 批）。
4. **三个生活入口（`22-Economy`、`25-Behavior`、`40-Life`）全部卸载时**，第二层提供的东西一起消失：`chatpet.environment`、`chatpet.interactions` 两段，记录库里只有活动没有日记的日期，以及有日记那天正文里的活动部分（拍板点 8）。只卸其中一两个时和现在一样。

**开发者看到的**：`src/behavior`、`src/life`、`src/economy` 合进 `src/living/`（拍板点 1）；三个旧服务名改由同一个常驻实例的三个区提供（拍板点 2）；Core 不再读写 `life.json`，也不再读三个生活服务；第二层有一份对外契约（世界快照、命令、事实流、`world.changed`，拍板点 12）；`check:arch` 多一个受限的「搬家改键」模式（拍板点 5）；迁移工具支持多轮迁移。

## 范围变化

以下几处超出完成标准的字面，或者改变了已有的约定，需要主人确认。都不替换、不延期其他目标，原完成标准全部有效。

| 变化 | 为什么 | 对应拍板点 |
| --- | --- | --- |
| 「需要迁移」模式：0.3.0 遇到未迁移的数据只开普通聊天 | 换包只能经版本页，0.3.0 一定会在未迁移的数据上先启动一次；启动时自动迁移已被否决（decisions.md 2026-11-16） | 6 |
| 三个生活入口全卸载时，第二层提供的段和记录一起消失 | 这些内容归第二层所有；另一种做法是在第一层留兜底 | 8 |
| 相册工具搬进 `src/core/`，而不是完成标准表写的「搬到第二层」 | `life/album-tools.ts` 只依赖第一层和 vendor（`src/life/album-tools.ts:1-11`）；这样 Life 没加载、甚至三个入口全卸载时，普通聊天都能用相册 | 9 |
| Economy 采用证据多一个独立文件 | 标记只搬进 `economy.sqlite` 会让「库丢了旧钱包不能复活」的保护失效 | 10 |
| `life.json.homeSessionId` 由第二层维护成上游运行时需要的镜像 | 上游 Life 运行时自己读写这个字段，vendor 不能改；改写了 architecture.md 第 4 节「生活世界只读」的说法 | 11 |
| 「第二层对外只有四样」在 2a 的落法：新契约定义并实现，旧服务名作为阶段性门面保留，第三层改用新契约放到阶段 3 | 完成标准同时要求「旧服务名门面落地」，第三层的大量读取在阶段 3 才治理 | 12 |
| 基线多一种改法「只改键、不增删」 | 基线身份含文件路径，搬目录会把 653 条 R8 当成新增违规 | 5 |
| Channels 的 Bridge 整理入口同步改成向下调用 | `src/channels/plugin.ts:77-83` 也发 `pet/life.review`；Memory 不再订阅后，`/bridge/compact`（`vendor/dsh-world/lib/ecosystem/bridge/route.js:46-51`）的 202/409 契约要保住 | 无，随 3C |

## 批次总览

| 批 | 内容 | 搬家 / 改逻辑 | 依赖 | 分支 | 单独验收的结果 |
| --- | --- | --- | --- | --- | --- |
| 1A | 旧行为取证：5.9 契约、6.2 入口语义、G9 流程的测试 | 只加测试 | 无 | `codex/2a-1a-evidence` | 新测试进行为清单，固定现状；与已确认契约不符的写成差异清单 |
| 1B | 迁移工具：已知问题 5、多轮迁移、已知问题 7 | 改逻辑（脚本） | 无 | `codex/2a-1b-migration` | 合成副本上能跑第二轮迁移、逐个落盘边界续做；只读命令不再写源库 |
| 2 | 已知问题 8：setup 改装 npm 包、配置走 profile 覆盖、搬配置命令 | 改逻辑（安装脚本） | 无，可与第 1 批并行 | `codex/2a-2-setup` | 换包后配置仍在的行为测试；隔离机实机一次 |
| 3A | 搬家：改键工具 → 三个目录搬进 `src/living/` | 先改检查工具，再只搬家 | 1A | `codex/2a-3a-move` | 行为清单、`verify` 全绿，基线条数不变 |
| 3B | 常驻实例和旧服务名门面；区之间不再查服务名 | 改逻辑 | 3A | `codex/2a-3b-instance` | 1A 的入口测试原样通过；R6、R7 测试 |
| 3C | 清第一层 18 条违规；记录库改读第二层只读接口 | 改逻辑 | 3B | `codex/2a-3c-layer1` | 第一层基线只剩 5 条 |
| 3D | 清 Life 读 `petDesktop / petChannels` 的 4 条 | 改逻辑 | 3C | `codex/2a-3d-outlets` | 第二层基线 0 条 |
| 3E | 第二层对外契约；代码清理 | 改逻辑 | 3D | `codex/2a-3e-contract` | 契约的入口级测试；删除后全绿 |
| 4 | 共享 home 身份记录迁移；「需要迁移」模式 | 改逻辑 + 数据迁移 | 1B、3E | `codex/2a-4-home` | 合成副本演练（含崩溃续做、回退） |
| 5 | `economy.initialized` 迁移；两个 Store 的 `setMeta/close` 去重 | 改逻辑 + 数据迁移 | 4 | `codex/2a-5-economy-marker` | 合成副本演练（含崩溃续做、回退） |
| 6 | 收尾：文档、典型修改 1 度量、G5 表；主人：RC、真实副本演练、发 0.3.0 | 文档 + 主人操作 | 全部 | `codex/2a-6-docs`、度量分支 `codex/m4-measure-1-garden` | 2a 完成标准全部勾上 |

第 3 批的五个小批都改 `src/living/**` 和 `arch/` 下的声明，按顺序做，前一批合并后再开下一批。第 4、5 批共用迁移步骤表、清单版本和「需要迁移」模式，也按顺序做。

**停止条件落到批次上**（product.md:396）：任一批让 `src/living/` 下某个手写文件超过 1500 行、又拆不成内部清晰的区，停下来重新讨论切分（现在最大的 `src/living/body/room.ts` 是 1134 行）；同一条经济或身体相关的行为清单两轮修不好，止损；第 4 或第 5 批的迁移演练失败两轮，不进入 2b；同一个不变量第二次失守，按 G3 提前复盘，记进「故障家族」。

---

## 第 1 批：安全网

### 1A 旧行为取证（只加测试，不改 `src/`）

**这一步是**：只加测试，固定**真实观察到的**现状。测试先按 architecture.md 6.2 和 5.9 的说法写；在当前 `main` 上测不过时，先查是测试写错还是现状和文档不符：

- 测试写错，改测试。
- 现状和 6.2、5.9 的说法不符：断言改成真实行为，在执行结果里列「差异清单」（说法、真实行为、`file:line`）。差异由主人决定是修文档，还是登记成已知问题；1A 不改产品代码。

**用什么夹具**：真实 Cordis 装卸参照 `tests/behavior/garden-clock-continuity.test.ts:112-136` 的写法，真实 DSH 工具和提示词复用 `tests/behavior-list/policy-host.mjs:12-26`。`tests/behavior-list/fixture.mjs` 用服务表、一次性 `inject` 和直接 `.apply()`（`:84-96,154-186`），证明不了三个入口各自的卸载，入口级测试不用它。

**1. 5.9 的七条隐含契约**

放在 `tests/core/context-contracts.test.ts`（新建）。已被门禁测试覆盖的只登记进索引，不重写。

| 契约 | 现在在哪里 | 现有覆盖 | 1A 补什么 |
| --- | --- | --- | --- |
| 工具限制早于 schema 解析 | 入队时安装 `src/core/native/agent.ts:104-115`（选择和安装辅助在 `:66-83`），执行时复查 `:198-209` | `tests/life/life-tool-policy.test.ts:36-48` 已测 schema、可执行性和释放，但不是从真实入队开始 | 从真实 Life 输入入队开始，模型第一次拿到的 schema 已不含名单外工具（参照 `tests/behavior-list/fixture.mjs:203-215` 的顺序） |
| `environment` 先于 `interactions` | `interactions` 读 `environment` 准备的结果（`src/core/companion-foundation.ts:200-248`） | `tests/life/life-core-integration.test.ts:81-130` 间接 | 分开测两种失败：整体准备失败或作用域变化时 `interactions` 为空；只有一个域读失败时另一个域的事实保留 |
| `chatpet.interactions` 段名和投影是确认协议的一部分 | 段名 `src/core/interaction-presentation.ts:4`，协议 `:21-35` | `tests/core/interaction-context.test.ts:18-51`（允许 JSON 键顺序不同） | 段名常量和确认协议不同步时测试失败：按段名找到正文、逐条比较解析后的投影才确认 |
| 事实确认晚于原生日志落盘 | `flush() === true` 才确认（`src/core/interaction-context.ts:12-22`） | `tests/life/life-core-integration.test.ts:104-120`、`tests/behavior-list/native.test.mjs:6` | 已覆盖失败、异常和作用域换代，只登记 |
| 替换只在打开的请求里 | 调用处 `src/core/native/agent.ts:173-183`，召回 `src/core/native/recall.ts:26-44` | `tests/core/dynamic-context.test.ts:12-47`、`tests/core/history-maintenance.test.ts:65-87,124-155` | 已保存的会话日志里旧快照和旧召回原样保留（读会话文件比对） |
| 预设名、会话前缀、渠道目录承担路由与恢复 | guest：前缀选择 `src/channels/sessions.ts:184-198`，预设不符拒绝 `:214-221`；Room：选会话和默认预设 `src/room/chat.ts:71-77,126-145`（Room 没有预设拒绝规则） | `tests/world/world-modules.test.mjs:73`（只测路由） | 重启后按前缀和目录找回同一个 guest 会话、同一个 Room 会话；guest 预设不符时拒绝 |
| 「home 身份」与「Life 在运行」分开 | `src/core/companion-foundation.ts:65-69` 不看 Life；`src/life/plugin.ts:99-125` 只在运行时给 | `tests/core/companion-foundation.test.ts:88` | Life 暂停和卸载时，前台照样打开同一个 home；Life 运行时两者一致 |

`test:native-context`（`scripts/checks/check-native-context.mjs:64-77`）测的是事实确认、环境快照只剩一份、计划和系统提示保留、原回执存在，不逐字比对段正文。1A 把它这几条断言搬成门禁内测试，脚本本身保留。

**2. 6.2 的入口语义**

放在 `tests/behavior-list/entries-lifecycle.test.mjs`（新建），用真实入口（`tests/behavior-list/entries.ts` 导出的 `behaviorPlugin / economyPlugin / lifePlugin`）和假模型，按 Cordis 真实卸载驱动，不用服务替身。每条都断言三个服务名各自在不在。

| 6.2 的待核或「无测试」 | 测试做法 | 源码已能确定的部分 |
| --- | --- | --- |
| 卸载 `40-Life`，同时有原生 Life 轮次和在途持久计划 | 计划步骤正在身体上执行、Life 轮次进行中时卸载：home 轮次被取消，`control.json` 不变，身体回执保留；重新加载后按原 `operationId` 继续 | 卸载走 `stopRuntime(false)`，不暂停计划、不写开关（`src/life/plugin.ts:307-330,531-540`） |
| 显式暂停→再启用，整个周期 Body 缺席 | 卸载 `25-Behavior` → 暂停 → 推进时钟 → 再启用 → 重新加载 `25-Behavior`，记录作物实际长了多久 | **可能和 6.2 的说法不符**：`control.json` 只存当前 `enabled`，Body 缺席时没有地方存两个时间边界；带 `operationId` 的计划暂停还要求 Body（`src/life/plan.ts:281-295`） |
| 单独卸载 `25-Behavior` 后，真实 Life 回顾和钱包操作同时继续 | 卸载后触发一次回顾（假模型写日记），并做一笔赠送和购买；库存投喂报缺执行器 | 三条分支分开（`src/economy/plugin.ts:175-209`、`src/life/plugin.ts:332-356`） |
| 卸载 `22-Economy` 期间作物跨显式暂停边界 | 卸载 Economy → 暂停 → 推进 → 再启用 → 重新加载 Economy，记录实际结算 | **可能和 6.2 的说法不符**：暂停时 Body 读到菜园不可用会跳过结算，可能丢掉启用区间（`src/behavior/room.ts:228-241,401-427`） |
| 卸载 `22-Economy` 或 `25-Behavior` 后的回顾连续性 | 卸载后回顾照常调度和完成（两种卸载各一条） | 无 |
| 显式暂停后在途回顾撤权 | 回顾轮次进行中暂停：记录后续文件读写是否被拒 | **不确定**：暂停只改新输入准入、取消 home，来源登记在卸载时才撤（`src/life/plugin.ts:75-78,475-489`）；文件调用复核的租约、作用域和 home 身份在暂停时可能仍成立（`src/core/life-review-files.ts:25-57`）。现有测试用 `close()` 撤租约，不能外推 |
| 三个入口都卸载（现状基准） | 普通聊天可用；`chatpet.environment` 输出「没有共享身体执行服务」；相册可用；记录库日期含只有活动的日子、日记正文含活动 | 拍板点 8 决定 3C 之后怎么改 |

这组测试在 3B 之后**断言不改**继续通过，就是拍板点 3 新表的验收。

**3. G9 真实流程（L1）**：计划步骤 → 身体 → 经济结算 → 重启恢复

放在 `tests/behavior-list/families.test.mjs` 末尾。用已有的**库存餐食**断点：身体效果先落盘（`effectAppliedAt`），库存结算（`finishFood`）在后（`src/behavior/room.ts:401-454,503-513`、`src/economy/store.ts:435-463`），复用 `tests/life/life-domain-integration.test.ts:55-91` 的结算失败注入。流程：真实 Life 输入 → 假模型用计划工具提交「吃库存里的食物」一步 → 身体执行、效果落盘 → 结算前重启 → 恢复后同一编号补结算，身体效果一次、账本一次，计划自动续到下一步。1A 在旧代码上全绿；3B 合并后同一条通过算 G9 交付；第 4、5 批迁移后复跑。

**4. 索引**：新测试登记进 `tests/behavior-list/index.json`，`l1Stage` 用现有的合法值 `阶段 2`（`tests/behavior-list/index.test.mjs:16`）。

**允许修改**：`tests/core/context-contracts.test.ts`（新）、`tests/behavior-list/entries-lifecycle.test.mjs`（新）、`tests/behavior-list/families.test.mjs`、`tests/behavior-list/entries.ts`（只加导出）、`tests/behavior-list/index.json`。

**不做**：不改 `src/`、`scripts/`；不修测出来的差异。

### 1B 迁移工具（碰高风险目录）

**这一步是**：改逻辑，只改脚本，不改 `src/`。

**1. 已知问题 5：只读路径不再写源库**

- 根因：`inspectRepoBinding` 用只读模式直接打开源 `core.sqlite`（`scripts/lib/repo-storage.mjs:20`），WAL 库只读打开仍会生成 `-wal/-shm`。
- 修法：在 `inspectRepoBinding` 里先把库复制到私有临时目录、打开副本。复制函数写在 `scripts/lib/repo-storage.mjs` 里（它随包发布，`package.json:61-67`，不能依赖不打包的 `scripts/migrate/`），`scripts/migrate/inventory-plan.mjs:18-22` 和 `scripts/migrate/inventory.mjs:12-21` 的两份复制实现改为复用它。复制带 `-wal`，**不带 `-shm`**（现有 `copyDatabase` 会复制 `-shm`，统一时去掉）。
- 有写入者时：普通文件复制得不到 WAL 的一致快照。迁移路径在复制前已经 `assertOffline`；`install-dsh` 等其他调用方按现有停写检查（`assertStopped`）拒绝，在执行结果里列出每个调用方的处理。
- 盘点 `scripts/lib/`、`scripts/migrate/` 其余只读打开 SQLite 的地方（含 `backupPlan` 的间接调用），同样处理或写明理由。
- 测试：沿用已知问题 5 的复现（`plan`、`status`、锁外 `assertOffline`、`manifest-mismatch` 拒绝），断言源目录没有新文件、mtime 不变；双读并发不再报 `ERR_SQLITE_ERROR`。

**2. 多轮迁移**（拍板点 7）

- **日志头带上本轮的契约**：每次 `run` 追加一个新段，头里写本轮的步骤集、每步的源版本和目标版本、绑定（`storageId` 和仓库路径的摘要）、备份地址和哈希。`--resume` 只续最后一段，且当前代码的步骤集必须和头里一致，否则拒绝（新原因码）。上一段所有步骤 `done/skip` 才允许开新段。`status` 按头里的步骤集报告。改 `validateJournal`（`scripts/migrate/runner.mjs:12-25`）、`journal-exists` 判定（`:49,62`）、`migrationStatus`（`:33-38`）。
- **存储清单按步骤推进**：冻结 v1 清单的内容，写进步骤表，不再由 `expectedManifest()` 从仓库登记现取（`scripts/migrate/context.mjs:22-26`）。`0001` 只在清单不存在时写 v1；之后每个数据步骤完成目标后，由运行器把清单推到该步骤的目标版本。「是已知历史清单之一」只用来判断能不能开始，「本轮目标已完成」看步骤自己的 `complete`，两者分开。未知内容仍报 `manifest-mismatch`。
- **四个落盘边界各有决策和测试**：备份已建、头未落盘 → 当作没开始，备份目录留着；数据已提交、清单未推进 → 续做时 `complete` 为真则只推清单；清单已推进、`done` 未落盘 → 续做时记 `skip`；上一段完成、目标后来缺失 → `status` 报告不一致，拒绝开新段。复用 `tests/migrate/crash.test.mjs:9-35` 的 SIGKILL 夹具逐个打断。
- **失败的含义**：失败时目标数据可能已经部分提交，可靠的是「原始数据能从本段已验证的备份恢复」，不承诺「原文件未动」。
- **两份备份**（拍板点 6）：迁移器每段在锁内、第一步之前建一份**同包续做备份**（沿用 `scripts/migrate/runner.mjs:63-71`），它记录的是当时安装的包指纹；回退到旧版本用的是换包前在旧包下做的**回退备份**（现有 `companion-backup`）。1B 在合成环境里把「旧包、旧数据、旧绑定一起恢复」实测一遍，按 architecture.md 7.2 核对原生日志、投影、附件、设备引用，以及送达、额度和花费这些不可回退的状态（恢复器会保留当前的 Life 花费并改写 `life.json`，`scripts/lib/offline-backup.mjs:409-420`）。
- **锁的三个窗口**：(a) 恢复带回的旧锁，按现有规则作陈旧锁接管并记 `lock-takeover`（`scripts/migrate/io.mjs:44-63`），pid 被复用时报 `lock-held`，复用 `scripts/migrate/errors.mjs:5` 已有的说明；(b) 两个进程同时接管陈旧锁，核验和 `unlink` 之间有窗口，补并发拒绝用例并收紧；(c) 恢复器的停写检查不看 `migration.lock`（`scripts/lib/offline-backup.mjs:391-395`），迁移进行中做恢复可能互相覆盖：迁移侧在锁内复核没有恢复在跑，恢复侧的处理写进开工细则（不改 `offline-backup.mjs` 的话，至少在 `companion-backup` 命令入口拒绝）。
- 用一个只在测试里登记的空数据步骤演练整条链路：0.2.0 形状的数据（有完成日志、没有清单两种）→ 第二轮 `run` → 各边界崩溃续做 → 恢复 → 旧锁接管。真实数据步骤在第 4、5 批加。

**3. 已知问题 7：`test:native-memory`**

先修：复现 `Native turn ended: error`、查根因；把过期的旧账断言（`scripts/checks/check-native-memory.mjs:177-180`）改成断言现在真实的记账位置（`src/core/native/conversation.ts:379-399`，写入权威是 Memory provider）。两轮修不好就停：删脚本和 `package.json:96` 的条目，把门禁里没有的断言搬进 `tests/memory/native-memory-flow.test.mjs`（新建），至少包括：纠正和独立保存同一轮都成功、旧提取被拒、纠正后后续轮次可见（`:161-185`）。执行结果列出删了哪些断言、为什么。

**允许修改**：`scripts/lib/repo-storage.mjs`（高风险，只加复制函数并改 `inspectRepoBinding` 的打开方式）、`scripts/migrate/**`（高风险）、`scripts/companion-backup.mjs`（只加迁移锁检查）、`scripts/checks/check-native-memory.mjs`、`package.json` 的 `scripts.test:native-memory`（只在删除时）、`tests/migrate/**`、`tests/memory/native-memory-flow.test.mjs`（新，只在删除时）、`docs/development.md` 的迁移章节。

**不做**：不改 `scripts/lib/offline-backup.mjs`；不加真实数据步骤；不改 `src/`。

**回退**：只改离线脚本，运行时代码不变。出问题 revert 该批提交。新格式的日志被旧脚本读到会报 `journal-invalid`，不会误判；演练只在合成副本上做。

---

## 第 2 批：已知问题 8（常规批次）

按常规流程：Codex 起草、Claude 定稿，单独写 `docs/plans/stage2a-setup-config.md`，主人同意后执行。本方案只定边界：

- setup（`scripts/install-dsh.mjs`）改为安装 npm 包，不再本地打包、把配置写进包内 `cordis.patch.yml`（现状 `scripts/install-dsh.mjs:164-172`）。
- Core 配置写进 profile 层 `cordis.patch.yml` 的覆盖，写法参照 `scripts/prepare-store-switch.mjs:34-37`。`prepare-store-switch.mjs` **不在**包的 `files` 里（`package.json:41-75` 只收 `install-dsh.mjs`），所以正式的搬配置命令推荐作为 `install-dsh.mjs` 的子命令交付，不改 `files`。
- 迁移命令需要 `installation.json` 回执（`scripts/migrate/context.mjs:45-51`）。npm 安装加 profile 覆盖的机器（日常机器就是这样）要有可验证的回执来源：搬配置命令同时写出或校验回执。
- 一条行为测试：setup 装的合成环境 → 走 profile 覆盖解析 → 换成不带 `config` 的 npm 形状包 → `00-Core` 正常启动。
- 主人在隔离环境实机走一次「setup 安装 → 版本页换包」，结束故障家族「换包后 Core 配置仍在」这一轮。

不碰 `src/`、`scripts/migrate/`，可以和第 1 批并行。

---

## 第 3 批：合并主体

### 3A 搬家（先改检查工具，再只搬家）

**第一个提交：改键工具和规则**（拍板点 5）

- `scripts/arch/check.mjs` 加 `--move <对照文件>`，只能和 `--write-baseline` 一起用。对照是「旧路径 → 新路径」。工具把基线里的 `file`、`other.file` 按对照改写；R1 的 `target`（解析后的路径）按对照改写；R1 的 `expression`（相对 import 的表达式）按每个引用方的新位置重新解析，不做字符串替换。改写后的基线必须与新扫描按身份和重复数一一对上（复用 `scripts/arch/lib/ratchet.mjs:11-21` 的 multiset 比对），多一条少一条都拒绝。
- `AGENTS.md` 的禁改规则同提交改成：基线只能用 `--write-baseline` 删条目，或用 `--write-baseline --move` 在纯搬家提交里改键。
- 测试放 `tests/arch/`，复用 `tests/arch/helpers.mjs` 的 `workspace / saveBaseline / check`：纯改名通过；改名同时改了函数体（作用域变了）被拒；对照漏一个文件被拒。

**之后三个提交：按区搬家**（body、plan、economy 各一个，每个提交后都能构建、能跑门禁）

- `src/behavior/*` → `src/living/body/`，`src/life/*` → `src/living/plan/`，`src/economy/*` → `src/living/economy/`。函数体、导出名、作用域不改。
- `arch/layers.json`：三个模块逐步并进一个 `living` 模块（`root: src/living/`）。每个提交后，旧模块名和新模块名的声明都要让扫描通过；第三层模块的 `dependencies` 同步。生成文件条目（`arch/layers.json:95` 一带）跟着 `animation-map.ts` 改路径，生成源 `scripts/build/build-animation-map.mjs:9,55` 同步（按 AGENTS.md，生成文件改生成源）。
- `arch/storage.json`：`owner / containerOwner / writers / locations / moduleIds` 改成 `living`。`dataVersions` 的键 3A **不改**：给 `storage.json` 加一份「数据版本键 → 模块」的对照，`expectedManifest`（`scripts/migrate/context.mjs:22-26`，第 24 行会先因所有者不一致断言失败）和 R5 扫描按对照判定。键名切换放到第 4 批，和第一个数据步骤一起。
- `package.json` `exports` 的三个目标指向 `dist/src/living/...`（高风险，键不变）。
- 引用方逐路径改，范围以执行时的清单为准（只数相对 import 不够，还有直接路径和资源引用）。已知的有：`src/living/plan/review.ts:13` 用 `import.meta.url` 找资源的相对路径；`scripts/build/build-pet-platform.mjs:19`；`scripts/checks/check-runtime-package.mjs:64,154-168` 的包内硬路径；`scripts/checks/check-native-life.mjs:71`；`scripts/lib/check-messaging.mjs:207`；`scripts/fixtures/synthetic-companion.mjs:33`；`scripts/checks/check-room-interactions.cjs:21`；`package.json` 里的测试路径；文档里的旧路径。`tests/behavior`、`tests/life`、`tests/economy` 目录本身不搬。
- 基线：每个搬家提交用 `--write-baseline --move` 改键，条数不变（60 / 1053）。

**提交阈值预先声明**：三个搬家提交都是纯改名加引用行替换，文件数会超过 15；`dist/src/**` 的同步移动和改键后的基线不计入阈值，照常提交。

**允许修改**：`scripts/arch/**`、`tests/arch/**`、`AGENTS.md`（只改基线规则一句）、`src/{behavior,life,economy,living}/**`、其他 `src/` 里的引用行、`scripts/**` 里的引用路径、`arch/layers.json`、`arch/storage.json`、`arch/baseline/*.json`（只经工具）、`scripts/migrate/context.mjs`（只改所有者对照）、`package.json` 的 `exports` 目标和测试路径、文档里的旧路径；`tests/**` 里指向搬走目录的 import 和路径（执行中补充，2026-11-19，Claude 定：只替换路径，不改断言和夹具逻辑）。`scripts/migrate/context.mjs` 不再需要改：1B 已把 v1 清单冻结进步骤表，`expectedManifest()` 不再按所有者断言（`scripts/migrate/context.mjs:24`），「数据版本键 → 模块」的对照只在架构检查需要时加。

**验收**：`pnpm run verify`（它会带打包参数调用包检查，`scripts/checks/verify.mjs:19-23`；单跑 `check:package` 要传安装包路径）、`pnpm run build && pnpm run test:behavior-list` 全绿；`check:arch` 条数不变；逐个文件看补丁，`src/living/**` 只有改名和引用行。

### 3B 常驻实例和旧服务名门面

**这一步是**：改逻辑，外部行为不变（1A 的入口测试断言不改）。

- **实例**（拍板点 2）：`src/living/index.ts` 的 `LivingWorld` 是三个区的登记处。三个入口各自在 `apply` 里把自己的区登记进去、卸载时撤销；区之间通过它拿对方，不再 `ctx.get('petBehavior' | 'petLife' | 'petEconomy')`。
- **用已有的登记表**：登记和撤销复用 `src/core/tables/registry.ts:20-71` 的租约机制：重复登记报错；撤销后旧引用失效，晚到的回调拿不到已撤销的区。
- **可见域**：Cordis 的 `get()` 按服务隔离域查找，只看活跃提供者（`node_modules/@deepseek-ai/cordis/src/reflect.ts:240-256`）。实例的键不能只是 `PetCoreHost`，要加上服务隔离域，保证跨域拿不到别的域的区。开工细则里写清键的构成。
- **每个区留在自己入口的作用域里**：硬 `inject`、`ctx.effect`、定时器和订阅都留在原入口，卸载哪个入口只停哪个区，6.2 矩阵逐格不变。
- **退场顺序**：Cordis 并行清理同级 effect（`node_modules/@deepseek-ai/cordis/src/fiber.ts:712-735`）。每个入口的卸载显式按「先撤登记、再停接单、再 `close()`」，不靠 effect 的先后。
- **门面**：三个入口照旧 `ctx.provide` 旧服务名，提供的仍是各区现在的对象，方法和签名不变（`src/living/economy/plugin.ts:230`、`src/living/body/plugin.ts:347`、`src/living/plan/plugin.ts:554` 的现位置）。
- **事件这一步不动**：`pet/behavior.changed`、`pet/life.changed`、`pet/economy.fact` 的发布和订阅保持现状（Life 对 Body 事件的 `observation` 过滤、通知只入队不回滚已落盘写入，都原样留着；`src/living/plan/plugin.ts:70-85`、`src/living/body/plugin.ts:66-89,195-215`、`src/living/economy/plugin.ts:162-166`）。3B 只替换服务名查找和 `src/living/body/plugin.ts:47,66-85` 的动态 `inject`。区之间的事件改直接调用留给 2b。
- **R6**：`src/living/` 带一条「关闭后不留尾巴」测试，放在 `verify` 收集得到的位置（`tests/**/*.test.mjs` 或 `.test.ts`）：六种实际激活顺序、三种先卸载、同名重挂、旧回调晚到；断言没有残留定时器、订阅和在途 I/O。
- **R7**：卸载生活入口、显式暂停生活、卸载身体入口三种，由 1A 的入口测试覆盖。

**允许修改**：见下面「3B 开工细则」的「允许修改与批次边界」。

#### 3B 开工细则

（Codex 只读起草、Claude 核对行号后定稿，主人 2026-11-19 过目同意；行号以 `27e9232` 为准。）

**实例与可见性**

- `src/living/index.ts` 新建 `LivingWorld`。外层按 `ctx.root`、实际注入的 `ctx.petCore` 对象用 `WeakMap` 取值，内层按 `petBehavior`、`petLife`、`petEconomy` 三个隔离标签逐项 `===` 复用实例。标签取 `ctx[Context.isolate][name]`，入口先按 Cordis 的 `??= Symbol(name)` 补齐根默认标签。首个入口创建，最后一个入口完成清理后释放。`src/core/index.ts:36-47`、`src/core/plugin.ts:20,34`、`node_modules/@deepseek-ai/cordis/src/context.ts:72-78,109-124`、`node_modules/@deepseek-ai/cordis/src/reflect.ts:291-306`、`docs/plans/stage2a-merge.md:389-390`
- 每个区的登记槽按同一根、宿主、目标区和**目标服务自己的标签**索引。读区时只取同标签、租约有效且提供者处于 `FiberState.ACTIVE` 的值。只隔离 `petLife` 时，原标签的 Plan 不可见，仍能读到同标签的 Body 和 Economy。Body 的单写者约束及 Economy 的初始化与库锁照旧。`node_modules/@deepseek-ai/cordis/src/reflect.ts:239-256`、`src/living/body/plugin.ts:20,38-40`、`src/core/workspace.ts:182-187`、`src/living/economy/store.ts:47-63`
- 三个 `apply` 复用 `RegistrationTable` 登记。重复登记报错，`revoke()` 在首次 `await` 前删槽，同名重挂生成新 `Symbol`，旧 `revoke()` 不会删掉新槽。排队前、恢复执行后及写入或发布前核对原调用方和所用区的租约，晚到回调到此为止。`src/core/tables/registry.ts:20-44,66-77`、`tests/core/tables-registry.test.ts:24-74`
- `living.watch()` 在 Body 作用域安装，首次读取当前可见项，再用 Cordis `internal/status` 刷新。按可见租约的变化通知，进出各一次。退出回调带原观察代次，已有新代时丢弃。业务事件仍走原订阅。`node_modules/@deepseek-ai/cordis/src/fiber.ts:587-600`、`node_modules/@deepseek-ai/cordis/src/events.ts:334-341`、`src/living/body/plugin.ts:48,67-85`

**区间调用逐点替换**

`living` 表示当前入口的类型化视图。保留原可选调用、缺席处理和持久化读取路径。`src/living/body/plugin.ts:142-159`、`src/living/economy/plugin.ts:112-121`、`src/living/plan/plugin.ts:499-502`

- `src/living/body/plugin.ts:44` → `!living.get('plan')`，保留 observation 分支。
- `src/living/body/plugin.ts:48` → `living.watch('economy', …)`，进出都调用 `refreshBinding()`。
- `src/living/body/plugin.ts:67` → `living.watch('plan', …)`，进入时同步自治并订阅原 `pet/life.changed`，退出时先退订再排队挂起。
- `src/living/body/plugin.ts:68` → 从 `watch` 通知取 `{ value: life, lease: planLease }`。
- `src/living/body/plugin.ts:70` → 检查 `planLease.isCurrent()` 与同一可见代次，在 `:74` 等待返回后再查一次。
- `src/living/body/plugin.ts:83` → 仅当前缺席通知可以挂起，检查 `living.get('plan')` 仍为空。
- `src/living/body/plugin.ts:143` → `living.get('economy')`，保留权威菜园不可用时报错。
- `src/living/body/plugin.ts:150` → `living.get('plan')?.bodyClockState?.(id) ?? readLifeControl(target.path)`。
- `src/living/body/plugin.ts:152` → `living.get('plan')?.bodyClockState?.(id)`。
- `src/living/body/plugin.ts:301` → `enabled ? living.get('plan')?.bodyClockState?.(workspaceId) : undefined`。
- `src/living/plan/plugin.ts:123` → `living.get('body')?.restState(workspaceId)`。
- `src/living/plan/plugin.ts:194` → `living.get('body')?.promptLine(bound.id)`。
- `src/living/plan/plugin.ts:302` → `plan.control` 的 Body 参数取 `living.get('body')`。
- `src/living/plan/plugin.ts:305` → `living.get('body')?.setAutonomy(this.binding.id, false)`。
- `src/living/plan/plugin.ts:324` → `const behavior = living.get('body')`，同一轮推进使用捕获的租约。
- `src/living/plan/plugin.ts:350` → `plan.control` 的 Body 参数取 `living.get('body')`。
- `src/living/plan/plugin.ts:355` → `living.get(domain)`，沿用事实读取、确认后的代次复核。`src/living/plan/plugin.ts:235-241,357-364`、`src/living/plan/facts.ts:5-19`
- `src/living/plan/plugin.ts:374` → `await living.get('body')?.roomState(workspaceId) ?? null`。
- `src/living/plan/plugin.ts:413` → `plan.commit` 的 Body 参数取 `living.get('body')`。
- `src/living/plan/plugin.ts:458` → `plan.control` 的 Body 参数取 `living.get('body')`。
- `src/living/plan/plugin.ts:466` → `living.get('economy')?.committedGardenAt(bound.id)`。
- `src/living/plan/plugin.ts:500` → `const behavior = living.get('body')`，沿用缺席报错。
- `src/living/economy/plugin.ts:113` → `living.get('plan')?.bodyClockState?.(workspaceId)`。
- `src/living/economy/plugin.ts:120` → `living.get('body')?.gardenClockState?.(workspaceId)`。
- `src/living/economy/plugin.ts:206` → `const body = living.get('body')`，沿用投喂缺席报错。
- `src/living/economy/plugin.ts:223` → `const behavior = living.get('body')`，设置保存前仍先等 Body 快照。
- 第一层调用继续走旧门面，归 3C。`src/core/plugin.ts:43`、`src/core/companion-foundation.ts:139-141,179,202,207,228,233,247`、`src/memory/batch.ts:93`、`docs/plans/stage2a-merge.md:200-211`
- 第三层调用继续走旧门面，包括 PetPlatform 的动态 `inject` 和两处 `get(..., false)`，以及 Room 的硬 `inject` 和属性读。`src/channels/plugin.ts:78,88`、`src/channels/messaging.ts:197`、`src/console/plugin.ts:23,27`、`src/desktop/index.ts:281`、`src/desktop/features.ts:81,123,167`、`src/desktop/platform/plugin.ts:235,366,671,678`、`src/room/plugin.ts:67,103,114,158`

**入口与卸载**

- 每个 `apply` 在启动资源前装好本入口唯一的卸载 `ctx.effect`，用同一幂等清理函数回滚挂载失败。卸载时调用 `revoke()`，在首次等待前同步关准入、停调度及退订，再等待已开始的工作并执行 `close()`。某项清理失败仍执行其余清理并释放实例引用。Cordis 同级 effect 并行执行，顺序由这个回调保证。`src/core/tables/registry.ts:66-71`、`node_modules/@deepseek-ai/cordis/src/fiber.ts:712-735`
- Body 在 `apply` 的 `:355` 接入。`:340-344` 拆出停接单、清物理定时器和退订，再排队做 `suspendAutonomy()`、`flush()`、释放绑定及写者。已进队列的工作在副作用前复核，最终检查点仍可按本域读取活跃 Economy。硬 `inject`、`provide` 锚点分别为 `:348`、`:354`。`src/living/body/plugin.ts:88-109,142-150,340-355`、`src/living/body/room.ts:271-296`
- Plan 在 `apply` 的 `:551` 接入。`:528-537` 先封队列和转发入口、清 tick、撤来源并退订，停止上游调度并取消原生 home 轮次，再等队列、`runtime.settled()` 和已进入的回顾 I/O。卸载走 `stopRuntime(false)`，显式暂停仍走 `true`。硬 `inject`、`provide` 为 `:541`、`:550`。`src/living/plan/plugin.ts:78-94,294-317,474-488,499-552`、`src/living/plan/review.ts:23-34`
- Economy 把 `:275` 的清理前移到 `apply` 起点 `:238-239` 建立。撤登记后关准入，撤 `stopAccess` 和 `stopInitializer`，取消并等文件守卫及跨区请求收尾，再走 `:229` 的同步 `close()` 关库、释锁。硬 `inject`、`provide` 为 `:233`、`:248`。`src/living/economy/plugin.ts:187-249,250-275`、`src/living/economy/access.ts:61-95`、`src/living/economy/store.ts:470`

**R6、R7 与验收**

- 新增 `tests/living/living-lifecycle.test.mjs`，复用 `cordisFixture`。夹具只加可选装载顺序、挂载作用域和 I/O 探针，默认行为及 1A 断言照旧。R7 沿用 Life 卸载、显式暂停和 Body 卸载用例，菜园基准为 2/12。`tests/behavior-list/entries-lifecycle.test.mjs:35-39,207-239,323-354,369-394,681-738`、`docs/plans/stage2a-merge.md:543`、`scripts/checks/verify.mjs:13-16`
- 用真实 `ctx.plugin()` 逐次 `await` 跑三入口六种排列，每种分别让 Body、Plan、Economy 第一个卸载。核对剩余门面对象及行为，同名重挂取得新租约，全部卸载后实例释放。再测同宿主的单项隔离、同标签恢复可见以及不同宿主隔离。`tests/behavior-list/entries-lifecycle.test.mjs:218-236,252,681-709,741-768`、`node_modules/@deepseek-ai/cordis/src/context.ts:109-124`
- 用延迟 Promise 卡住一次 Body 的 `petEmotion.read()`，让它持有旧 Plan 代次，等 Plan 同名重挂后再放行。断言旧回调没有写盘、发布或调新 Plan，旧撤销也不会撤掉新登记。另向已卸载入口投递原事件，断言无新增工作。`src/living/body/plugin.ts:67-85,231-235`、`tests/core/tables-registry.test.ts:32-74`、`tests/regressions/audit-r6-memory-scope.test.mjs:88-94`
- 计数 Body 物理定时器、Plan tick 和上游闹钟的实际句柄，先断言已挂起，再断言卸载区句柄与其 Cordis 订阅归零、推进时钟也不重挂。保留其余区的订阅。`src/living/body/plugin.ts:92-109`、`src/living/plan/plugin.ts:84-90`、`vendor/dsh-world/lib/life/runtime.js:1161-1181`、`node_modules/@deepseek-ai/cordis/src/events.ts:263-279`、`tests/regressions/audit-r6-garden-refresh.test.mjs:140-155,171-176`
- 在原生落盘或读取、Economy 文件解析边界卡住真实入口发起的调用。有信号的断言收到取消，无信号的断言 `dispose()` 等待收尾。卸载完成时断言在途计数、打开的 reader 和 `economy.lock` 均归零，已提交写入保留。`tests/behavior-list/entries-lifecycle.test.mjs:95,142-150,179-203,340-347`、`src/living/plan/plugin.ts:215-233`、`src/living/economy/access.ts:64-85`、`src/living/economy/store.ts:470`

**允许修改与批次边界**

- 实现限 `src/living/index.ts`（新增）、`src/living/body/plugin.ts`、`src/living/plan/plugin.ts`、`src/living/plan/plan.ts`、`src/living/plan/review.ts`、`src/living/economy/plugin.ts`、`src/living/economy/access.ts`。`arch/layers.json:54-61` 删除 `living.reads` 中三个旧名，登记 `internal/status`。构建同步 `dist/src/living/`，按入口登记与逐区替换拆提交。`docs/plans/stage2a-merge.md:188-198,410`、`AGENTS.md:64`
- 测试限 `tests/living/living-lifecycle.test.mjs`、`tests/behavior-list/entries-lifecycle.test.mjs:35-239` 的夹具和 `tests/behavior-list/fixture.mjs:84-96,154-168` 的宿主接线。直接构造对象的夹具显式传邻区读取端口，Cordis 替身在对应域登记，断言沿用原稿。
- 上述夹具接线限 `tests/behavior/behavior-scheduling.test.ts:42-54,82-95`、`tests/behavior/garden-clock-continuity.test.ts:32-35,96-135`、`tests/life/life-body.test.ts:86-98,131,215`、`tests/life/life-clock-intent.test.ts:26-28`、`tests/life/life-core-integration.test.ts:50-51,118-119`、`tests/life/life-desktop-integration.test.ts:29-47`、`tests/life/life-domain-integration.test.ts:39-49`、`tests/life/life-sleep-continuity.test.ts:29-32`。
- 同类接线还包括 `tests/regressions/audit-r5-garden-clock.test.mjs:34-38`、`tests/regressions/mapped-playback-context.test.ts:55-60`、`tests/regressions/mapped-refresh-convergence.test.mjs:46-66`、`tests/regressions/mapped-refused-movement.test.mjs:45-49`、`tests/regressions/mapped-sleeping-inventory.test.mjs:53-54`。
- 三个 `provide` 仍交付原对象及原方法签名。沿用现有事件名、载荷、发布与订阅时机、`observation` 过滤及通知失败后保留落盘回执。第一层治理、第三层出口、新契约、数据迁移和事件改直调分别留给后续批次。`src/living/body/plugin.ts:192-222,354`、`src/living/plan/plugin.ts:73-76,550`、`src/living/economy/plugin.ts:181-185,212,248`、`docs/plans/stage2a-merge.md:194,200-225,408`

**主人拍板**

- 合成夹具接线 — 推荐把 `scripts/fixtures/synthetic-companion.mjs:31-38` 的端口接线一并列入 3B。它直接构造 Body 和 Economy，迁移结算测试复用该入口，应让它继续走真实的跨区结算。改动只在合成夹具接线。`tests/migrate/settlement.test.mjs:7-17,35`、`docs/plans/stage2a-merge.md:198` 决定：按推荐（主人 2026-11-19 过目同意）。

**快测**

- `pnpm run build && node --test tests/behavior-list/{entries-lifecycle,families,domains}.test.mjs tests/living/living-lifecycle.test.mjs dist/tests/core/tables-registry.test.js && pnpm run check:arch`。1A 原断言与 G9 的落盘、重启、补结算一起验收。`docs/plans/stage2a-merge.md:422,430`、`tests/behavior-list/families.test.mjs:125-195`、`package.json:92,125`
- `node --test dist/tests/behavior/{behavior-scheduling,garden-clock-continuity}.test.js dist/tests/life/{life-body,life-clock-intent,life-core-integration,life-desktop-integration,life-domain-integration,life-sleep-continuity}.test.js dist/tests/regressions/mapped-playback-context.test.js tests/regressions/{audit-r5-garden-clock,mapped-refresh-convergence,mapped-refused-movement,mapped-sleeping-inventory}.test.mjs`。合成脚本接线获准后加跑 `node --test tests/migrate/settlement.test.mjs`。`tsconfig.build.json:3-5`、`tests/migrate/settlement.test.mjs:7-17`

### 3C 清第一层 18 条违规

**这一步是**：改逻辑。分四个提交，每个清一组基线条目，同提交用 `--write-baseline` 收紧；搬文件的提交另用 `--move` 改键（`review-dialogue.ts` 带 6 条 R8，`companion-foundation.ts` 涉及 8 条 R8）。

| 组 | 条数 | 做法 |
| --- | ---: | --- |
| `core/companion-foundation.ts` 读三个生活服务 | 12 | `chatpet.environment`、`chatpet.interactions` 连同事实的准备、验证、确认搬进 `src/living/`；段名、顺序号 14/15 不变，段名常量仍用 `src/core/interaction-presentation.ts:4`，继续调用第一层的 `acknowledgePromptFacts`。登记 helper 的准备钩子走 middleware 和作用域（`src/core/native/prompt.ts:125-174`），搬到第二层后要证明 5.9 的事务顺序（准备 → 复核 → 准入 → 请求内替换 → 落盘 → 确认）不变，1A 的契约测试就是验收。确认前的「服务没换」核对（`src/core/companion-foundation.ts:177-179`）改成实例内的区代次核对，Economy 和 Body/Life 的代次、待确认缓存一起核。`chatpet.foundation` 模板里的 `behavior` 条件（`:141`）改为读第二层向 Core 登记的「身体可用」，不新增能力行 |
| `core/plugin.ts` 相册 | 3 | 按拍板点 9：`album-tools.ts` 搬进 `src/core/`（只搬家）。门控：`petLife.isHome` 改为第二层登记的「此会话由 Life 自带相册」判定；`petRoom.watching` 是会话级的，现在的 `sources:['owner']` 替代不了，改为 Room 向 Core 登记的「此会话正在看电视」判定，保住电视和主人接管期间工具 schema 与执行的现状（`src/core/plugin.ts:39-45`、`src/room/chat.ts:82-122`）。按第 4 节，相册工具只拿记录库给的受限句柄，不把可变的 `album.album()` 交出去（`src/living/plan/album-tools.ts:14-29`）；受限句柄的方法以上游 `photoTools` 实际用到的为准 |
| `core/native/memory.ts` import `review-dialogue` | 1 | `review-dialogue.ts` 只依赖第一层和 vendor（`src/living/plan/review-dialogue.ts:1-7`），搬进 `src/core/`，只搬家 |
| `memory/batch.ts` 订阅 `pet/life.review`、读 `petLife` | 2 | Memory 提供向下调用的 `requestReviewCompaction(sessionId)`，接受第二层登记的「仍是运行中的 Life home」判定。Life 回顾完成（`src/living/plan/plugin.ts:201-204`）和 Channels 的 Bridge 整理（`src/channels/plugin.ts:77-83`，`/bridge/compact` 的 202/409 条件不变）改调它。调度语义（有待处理轮次、空闲、重试、最短间隔，`src/memory/batch.ts:89-104`）不变。直接模拟旧事件的门禁测试 `tests/behavior-list/policy-life.test.mjs:124-138,172-177` 同步改成驱动新调用，断言不变 |

另一项：记录库读 Life 活动记录（`src/core/records.ts:31-42` 的 `dates / journal`，直接构造 `createLifeStore`，查询时还会建目录）改为第二层登记的只读接口。只读实现参照上游 `lifeStore` 的只读方法（`vendor/dsh-world/lib/life/lifeStore.js:126-136,213-219`），不建目录。测试覆盖：Life 卸载但另一个区在、只挂 Economy、三个都卸载、重挂。

**允许修改**：`src/core/companion-foundation.ts`、`src/core/plugin.ts`、`src/core/native/memory.ts`、`src/core/records.ts`、`src/core/album-tools.ts`（新，搬入）、`src/core/review-dialogue.ts`（新，搬入）、`src/memory/batch.ts`、`src/room/chat.ts` 或 `src/room/plugin.ts`（只加电视判定的登记）、`src/channels/plugin.ts`（只改 `compact()`）、`src/living/**`、`arch/layers.json`（删 Memory 对 `pet/life.review` 的订阅、Channels 和 Life 对它的发布）、基线（只经工具）、相关测试。

不碰 `src/core/storage.ts`、`src/core/workspace.ts`。

**验收**：第一层基线剩 5 条（`core/companion-settings.ts` 1、`core/initialization.ts` 2、`memory/client.ts` 2）；1A 的契约测试和入口测试全绿。

#### 3C 开工细则

（Codex 只读起草、Claude 核对行号后定稿，主人 2026-11-19 过目同意；行号以 3B 的 `d71d4ef` 为准，3B 返工后 Plan 区行号可能小幅移动，执行时以当时文件为准。）

以 3B 完成后的 `d71d4ef` 为准，复用 `LivingWorld` 的三区租约。本次只读运行了架构报告和内存改键校验。以下按拍板点 8、9、11、13 落实场景 1、3，快测留到实现后执行。`src/living/index.ts:19-85`、`docs/plans/stage2a-merge.md:444-445,476-484`

**第一层现存违规**

`pnpm run check:arch -- --report` 核实第一层 23 条，按违规目标计数。同一行读取两个服务时各计一条。`scripts/arch/check.mjs:7-15`、`package.json:125`

| 组别 | 当前违规 |
| --- | --- |
| 环境与事实 12 条 | R2 `src/core/companion-foundation.ts:141` → `petBehavior` |
| 环境与事实 | R2 `src/core/companion-foundation.ts:179` → `petBehavior`、`petEconomy` |
| 环境与事实 | R2 `src/core/companion-foundation.ts:202` → `petBehavior`、`petLife` |
| 环境与事实 | R2 `src/core/companion-foundation.ts:207` → `petBehavior`、`petLife` |
| 环境与事实 | R2 `src/core/companion-foundation.ts:228` → `petEconomy` |
| 环境与事实 | R2 `src/core/companion-foundation.ts:233` → `petBehavior`、`petLife` |
| 环境与事实 | R2 `src/core/companion-foundation.ts:247` → `petBehavior`、`petLife` |
| 相册 3 条 | R1 `src/core/plugin.ts:6` → `album-tools` |
| 相册 | R2 `src/core/plugin.ts:42` → `petRoom` |
| 相册 | R2 `src/core/plugin.ts:43` → `petLife` |
| 回顾对话 1 条 | R1 `src/core/native/memory.ts:7` → `review-dialogue` |
| 回顾整理 2 条 | R3 `src/memory/batch.ts:14` → `pet/life.review` |
| 回顾整理 | R2 `src/memory/batch.ts:93` → `petLife` |
| 保留 5 条 | R1 `src/core/companion-settings.ts:2` → `desktop/appearance`；R1 `src/core/initialization.ts:5` → `living/plan/library`、`src/core/initialization.ts:12` → 动态加载平台 runtime；R1 `src/memory/client.ts:55` → 动态加载 `memory-process`、`src/memory/client.ts:56` → 动态加载 `memory-client` |

**五个登记口**

新建 `src/core/tables/companion-ports.ts`，由 `CoreNative` 持有，在 Core 原入口绑定消费作用域。五个类型化槽复用 `RegistrationTable` 的 `get`、`lease`、`revoke`。生产方按原 Cordis 根、Core 实例和相应隔离标签判断对 Core 的可见性，读取时核对租约。来源适配、工具声明、能力状态继续各用原表。`src/core/native/conversation.ts:84-97`、`src/core/plugin.ts:33-48`、`src/core/tables/registry.ts:20-42,66-78`、`src/core/tables/sources.ts:45-74`、`src/core/tables/tools.ts:30-56`、`src/core/tables/capabilities.ts:31-47`、`src/living/index.ts:19-27,71-85`

| 登记形状 | 登记和撤销位置 | 缺省 |
| --- | --- | --- |
| `bodyAvailable(): boolean` | Body 在 `src/living/body/plugin.ts:392-397` 的 `provide` 后登记，随区租约在 `src/living/index.ts:139-149` 撤销。判定区是否可见、生效，替换 `src/core/companion-foundation.ts:141` 的 `behavior` 条件。 | `false`，模板省去身体内容，无需新增能力行。 |
| `lifeOwnsAlbum(sessionId: string): boolean` | Plan 在 `src/living/plan/plugin.ts:614-620` 登记 `life.isHome(id)`，随 `src/living/index.ts:139-149` 撤销。运行和归属沿用 `src/living/plan/plugin.ts:118-141`。 | `false`，Core 相册走其余门控。 |
| `watchingTelevision(sessionId: string): boolean` | Room 在 `src/room/plugin.ts:174-177` 与来源登记一起挂载，复用 `Room.watching`，关闭时取消并等在途轮次后撤租约。`src/room/plugin.ts:100,154`、`src/room/chat.ts:87,173-195` | `false`，等同 Room 服务缺席。 |
| `isRunningLifeHome(sessionId: string): boolean` | Plan 同一入口另登记同一个 `life.isHome(id)` 判定，随 Plan 撤销。`src/living/plan/plugin.ts:124-141,614-620`、`src/living/index.ts:139-149` | `false`，回顾标记暂不能触发提前整理，普通批量整理照常判断。 |
| `activityDays(binding): readonly string[]`、`activity(binding, day): readonly ActivityRecord[]` | `LivingWorld` 从 `src/living/index.ts:134-149` 的共同挂载口，在首个可见区成功启动时登记 `src/living/plan/activity-reader.ts` 的只读实现，最后一个可见区撤销时收回。`binding` 含 `workspaceId/path/storageId`。`src/living/index.ts:50-85,139-154` | 两个活动结果均为 `[]`，日期和正文仍由记录库提供日记部分。`src/core/records.ts:31-42,102-115`、`docs/plans/stage2a-merge.md:476` |

记录库在 `dates`、`journal` 和搜索所用的日期查询中按当前绑定取活动读口，保留日期合并、去重、倒序和日记读取后的绑定复核。只读实现参照上游的日期筛选和 JSONL 解析，缺文件返回空，保留非法路径拒绝，读取用 `O_RDONLY/O_NOFOLLOW` 和描述符复核。查询全程不建目录、不实例化 `createLifeStore`。`src/core/records.ts:13-17,31-42,56-63,102-126`、`src/core/record-paths.ts:7-18`、`vendor/dsh-world/lib/life/lifeStore.js:25-58,116-136,213-219`

**环境与事实迁入 `src/living/prompt-context.ts`**

- `src/core/companion-foundation.ts:71-76,145-155` → Core 提供原登记 `ctx` 和原主人作用域检查。继续排除 guest、非就绪、非成员和已归档会话，绑定键仍为 `workspaceId/path/storageId`。`src/living/index.ts:50-85,134-154` 从同一实例的区槽按 Core 标签取视图，首个可见区挂两段，最后一个撤两段，避免随首先挂载的单区退出。
- `src/core/companion-foundation.ts:200-228` → `chatpet.environment` 仍用 `14`。准备先取三区租约，Body 仍先 `snapshot` 再 `promptLine`，Plan 仍用 `currentPlanSummary`，暂停的 Plan 也可给出持久计划。缺 Body 时只要还有可见区，沿用原能力提示。`src/living/plan/plugin.ts:429-444`
- `src/core/companion-foundation.ts:228-248` → Body、Economy 各最多准备 16 条事实，单区读取失败保留另一区结果。准备后及两个段读取时复核作用域、三区代次和同一份 `Agent` 缓存，缺席也参与代次比较。准备合格后继续调用 `host.native.observeFacts`。`chatpet.interactions` 仍用 `15`、`INTERACTION_CONTEXT` 和原 `presentFacts` 投影。`src/core/interaction-presentation.ts:4-16`、`src/core/native/conversation.ts:191-217`、`src/living/index.ts:78-85`
- `src/core/companion-foundation.ts:156-165,200-207,245-248` → 两段继续在原 Core 的原生作用域调用 `registerWorldContext`。环境 `prepare` 在 `system-prompt/assemble` 的前置 middleware 等待完成，再同步读取两段。事实轮次的 `agent/pre-step` hook 保持在原生准入前绑定同一份准备结果，输入准入和 schema 前的工具限制沿用 Core。`src/core/native/prompt.ts:97-117,125-159,179-184`、`src/core/native/agent.ts:104-115,211-241,280-292`
- `src/core/companion-foundation.ts:167-180` → Core 保留 home 的 `turnEnded`，Living 处理同一已完成轮次的事实确认。Core 在 `agent/request` 内退休旧快照和召回，Living 继续调用 `acknowledgePromptFacts`，只按原生有效 surface 的段名和原样事实投影匹配，`flush === true` 后逐源确认。`src/core/native/agent.ts:173-185`、`src/core/native/prompt.ts:25-55`、`src/core/interaction-context.ts:12-22`、`src/core/interaction-presentation.ts:21-33`
- `src/core/companion-foundation.ts:177-180,264-266` → 确认前、落盘后和每源写入前，复核同一实例、绑定、Body／Plan／Economy 租约代次及待确认缓存身份。Body 入队复用 `withLivingCaller`，让队列执行前也复核。代次失效时保留原事实供下一轮重读。卸载和 Agent 销毁清理准备缓存和 hook，旧动态段由已有退休逻辑处理。`src/living/index.ts:78-85,157-167`、`src/living/body/plugin.ts:108-120,311-315`、`src/core/native/prompt.ts:150-174`

**相册门控**

- Core 继续挂载 `pet_*` 相册工具，保留当前绑定、非 guest、就绪检查，以 `lifeOwnsAlbum` 和 `watchingTelevision` 替换两次服务读取。`when`、`execute` 和 `inside` 走同一判定，保留 `manages`、取消和相册身份复核。`sources:['owner']` 继续用于工具声明。`src/core/plugin.ts:38-45`、`src/living/plan/album-tools.ts:14-29`
- 电视从加入 `admission` 到请求收尾持续隐藏 Core 相册 schema，主人接管时仍隐藏，原 `guardDuringTakeover` 继续挡执行。运行中的 Life home 继续用上游无前缀相册，主人接管解除 Life 的轮次限制后仍由 Life 提供。暂停、卸载或三入口全卸载后，合格主人会话恢复 Core 相册。`src/room/chat.ts:87,94-98,118-122,173-195`、`src/core/native/agent.ts:198-209,225-231,243-253`、`src/living/plan/plugin.ts:124-141`、`vendor/dsh-world/lib/life/runtime.js:985-1012`
- `src/core/records.ts:20-30` 提供同一记录库实例的稳定受限句柄，运行时仅暴露 `keep(image, description, tags)`、`list(limit, offset)`、`forget(id)`。Core 和 Life 都用它，继续复用上游的图片读取、取消和读取后 `inside` 复核。Life 在 `src/living/plan/plugin.ts:212` 对 `LifeDeps.photos` 做局部类型适配，其唯一运行时用途是传给 `photoTools`。`vendor/dsh-world/lib/life/photoTools.js:29-49`、`vendor/dsh-world/lib/life/runtime.d.ts:25-33`、`vendor/dsh-world/lib/life/runtime.js:1011`

**回顾整理**

- `CoreNative.requestReviewCompaction(sessionId: string): void` 由 `installMemoryBatch` 接入每个 Core 实例的同步处理函数，停止时撤自己的处理函数。仍只在 `memoryFor(id)` 可用时向 `reviews` 加标记并去重。每秒 tick 才按当前绑定、有待处理轮次、无在途任务、仍是运行中的 Life home、Agent 空闲、`retryAt` 和最短间隔择机运行。标记只替代轮数／闲置触发门槛，未运行、失败或取消时保留，成功消费后清除。`src/core/native/conversation.ts:84-96,125-130`、`src/memory/batch.ts:10-28,89-127`
- Life 保留回顾完成后读取 home、`compactAfterReview` 和 `running()` 三个条件，改调 `host.native.requestReviewCompaction(id)`。Channels 的 `compact()` 保留从旧门面取运行中 home、Bridge 和 Memory 可用、有待处理轮次三个检查，最后改同一调用。`src/living/plan/plugin.ts:218-221`、`vendor/dsh-world/lib/life/runtime.js:655-671`、`src/channels/plugin.ts:77-83`
- `/bridge/compact` 对合法请求仍在可排队时返回 `202`，忙碌仅延后执行。Life／Memory 不可用或无待处理轮次时保留两条原拒绝文案和 `409`。Bridge 缺席的 `503` 及原鉴权照旧。删除 `pet/life.review` 的事件类型及收发声明，其他事件保留原通知方式。`src/channels/plugin.ts:77-83,125-129`、`vendor/dsh-world/lib/ecosystem/bridge/route.js:5-19,46-51`、`src/living/plan/plugin.ts:610-612`、`arch/layers.json:21,60-61,109-110`

**提交顺序与改动范围**

1. **只搬回顾对话**。`src/living/plan/review-dialogue.ts` → `src/core/review-dialogue.ts`，更新 `src/core/native/memory.ts:7` 和 `tests/infrastructure/review-dialogue.test.ts:7` 的 import。清该处 1 条 R1，改 6 个 R8 键。第一层 **23 → 22**。`src/living/plan/review-dialogue.ts:1-7`
2. **只搬相册工具**。`src/living/plan/album-tools.ts` → `src/core/album-tools.ts`，更新 `src/core/plugin.ts:6`、`src/living/plan/tool-policy.ts:9` 的 import 和 `arch/storage.json:44` 的证据路径。清相册 1 条 R1，两个门控留到第 4 提交。**22 → 21**。
3. **第二层接管环境、事实和活动读取**。清上表 `companion-foundation.ts` 的 12 条 R2，活动读取一并交付，当前报告无额外 R1–R4 条目。`arch/layers.json:61` 增迁入的 `agent/pre-step`、`agent/disposed`、`session/event` 订阅。**21 → 9**。`src/core/companion-foundation.ts:141,160-180,200-248`、`src/core/records.ts:31-42`
4. **会话门控与回顾整理直调**。清 `src/core/plugin.ts:42-43` 的两条相册 R2、`src/memory/batch.ts:14,93` 的 R3／R2。**9 → 5**，全仓规则 **60 → 42**。`arch/layers.json:21,60,109`

两个纯搬家提交各在临时源码副本先仅移除对应的旧 import，跑 `pnpm run check:arch -- --write-baseline` 收紧一条 R1，再完成移动及引用重连，跑 `pnpm run check:arch -- --write-baseline --move <对照文件>`。用现有工具生成两份基线，临时状态不提交。内存校验已证实直接跑 `--move` 会因少一条 R1 被拒，两步做法可逐条对上。第 3、4 提交用 `--write-baseline` 收紧，验收 R1–R4 和 R8 均零新增。构建产物与生成基线按项目规则随提交。`scripts/arch/check.mjs:29-47`、`scripts/arch/lib/ratchet.mjs:22-38`、`AGENTS.md:63-64`

- **源码清单**　`src/core/companion-foundation.ts`、`src/core/plugin.ts`、`src/core/native/conversation.ts`、`src/core/native/memory.ts`、`src/core/records.ts`、`src/core/tables/companion-ports.ts`、`src/core/album-tools.ts`、`src/core/review-dialogue.ts`、`src/living/index.ts`、`src/living/prompt-context.ts`、`src/living/plan/activity-reader.ts`、`src/living/body/plugin.ts`、`src/living/plan/plugin.ts`、`src/living/plan/tool-policy.ts`、上述两个搬出路径、`src/memory/batch.ts`、`src/room/plugin.ts`、`src/channels/plugin.ts`（仅 `compact()`）。`docs/plans/stage2a-merge.md:280-291`
- **声明、文档和测试清单**　`arch/layers.json`、`arch/storage.json`（仅相册证据路径）、`arch/baseline/rules.json`、`arch/baseline/vocabulary.json`、`docs/architecture.md`（第 4 节、5.8、5.9.1）、本方案、`tests/infrastructure/review-dialogue.test.ts`、`tests/life/life-core-integration.test.ts`、`tests/living/living-lifecycle.test.mjs`、`tests/behavior-list/entries-lifecycle.test.mjs`、`tests/behavior-list/index.json`、`tests/behavior-list/policy-life.test.mjs`、`tests/behavior-list/policy-room.test.mjs`、`tests/behavior-list/channels.test.mjs`、`tests/behavior-list/fixture.mjs`（仅路由捕获）。`docs/plans/stage2a-merge.md:289,403-406`
- **范围止于 3C**　`src/core/storage.ts`、`src/core/workspace.ts`、vendor、发布和数据格式均排除。共享 home 身份与 `life.json` 镜像继续走现有路径，身份迁移留第 4 批。事件改直调只处理 `pet/life.review`。`src/core/companion-foundation.ts:49-69,89-109`、`docs/plans/stage2a-merge.md:289-291,330,479,484`

**测试与快测**

- 保留 1A 契约和入口断言。`2A1A-17` 按已拍板的全卸载行为更新两段缺席、活动日期及正文断言和索引名称，保留普通回复、相册、日记原文。旧 Life 集成夹具改为驱动三区租约，保留失效和落盘断言。`tests/core/context-contracts.test.ts:24-190`、`tests/behavior-list/entries-lifecycle.test.mjs:751-779`、`tests/behavior-list/index.json:1136-1142`、`tests/life/life-core-integration.test.ts:49-76,106-133`
- 扩展 `2A1A-17`，经记录库实际入口覆盖 Life 卸载但 Body 仍在、只挂 Economy、三个全卸载、重挂。前两种和重挂都能读活动日期、同日活动和日记，全卸载只剩日记，并验证查询缺失活动目录时不创建目录。补 R6 用例，卡住事实准备或原生日志 flush，换绑或卸载重挂后放行，确认旧代不得确认，新轮次可重读并确认。`src/core/records.ts:102-126`、`tests/living/living-lifecycle.test.mjs:61-132`
- `policy-life` 的三处事件注入 `tests/behavior-list/policy-life.test.mjs:125,155,175` 改走 `f.host.native.requestReviewCompaction(id)`，原断言保留。新增运行中 home 接管、暂停、卸载恢复相册的 schema 和执行测试，补电视接管时隐藏及拒绝旧工具、电视结束后恢复。用真实 Channels 路由处理器测试两类 `409` 和忙时 `202` 后空闲整理。`tests/behavior-list/policy-life.test.mjs:70-84,105-178`、`tests/behavior-list/policy-room.test.mjs:59-90`、`tests/behavior-list/fixture.mjs:174-181`、`src/channels/plugin.ts:77-83,125-126`
- 每个提交先跑 `pnpm run build && pnpm run check:arch`。提交 1 跑 `node --test dist/tests/infrastructure/review-dialogue.test.js`，提交 2 跑 `node --test tests/life/tool-declarations.test.mjs dist/tests/life/voice-and-life-library.test.js tests/behavior-list/entries-lifecycle.test.mjs`。`AGENTS.md:49-52`、`package.json:92,125`、`tsconfig.build.json:3-5`
- 提交 3 跑 `node --test dist/tests/core/{context-contracts,interaction-context,companion-foundation}.test.js dist/tests/life/life-core-integration.test.js tests/behavior-list/{entries-lifecycle,families}.test.mjs tests/living/living-lifecycle.test.mjs`。提交 4 加跑 `node --test dist/tests/memory/memory-batch.test.js tests/behavior-list/{policy-life,policy-room,channels}.test.mjs tests/life/tool-declarations.test.mjs`。批末跑 `pnpm run test:life-integration` 并用 `pnpm run check:arch -- --report` 复核只剩指定五条。Memory 用例在允许本机回环的环境运行。`docs/plans/stage2a-merge.md:499`、`package.json:114,125`、`AGENTS.md:49-52`

**需主人拍板**

- 确认上面的四提交拆法，推荐让两次纯搬家各自通过改键检查，再将剩余相册门控与共享 Plan 判定的回顾整理放在同一提交。确认补列第一层登记表、`CoreNative` 接线和相册证据路径，推荐只补这三处，以保住原作用域并让存储证据继续可追溯。其余行为按已拍板项执行。`docs/plans/stage2a-merge.md:278,289,476-484`、`scripts/arch/lib/ratchet.mjs:30-35`、`arch/storage.json:44` 决定：按推荐（主人 2026-11-19 过目同意）。

### 3D 清 Life 读第三层的 4 条

Life 在启动、休息和通知时直接找 Desktop 和 Channels（`src/living/plan/plugin.ts:131,180,285-305`）。改成第二层的登记口：`src/living/` 提供「生活出口」登记，Desktop 和 Channels 在各自入口登记、卸载时撤销。

- 四个回调：暂停 Desktop 自主小功能、恢复、呈现、送达。调用时机、顺序不变；出口缺席时跳过，和现在 `?.` 取不到时一样。
- Desktop 还读 Life 的**持久启用意图**，包括运行时还没就绪的时候（`src/desktop/features.ts:55-89`），登记口要能回答这一点。
- 测试覆盖：Desktop 先装、晚装、单独重载；生活入口全部退出后恢复；呈现失败仍尝试 Channels；两者都不可用时明确失败（参照 `tests/life/life-desktop-integration.test.ts:58-93`）。

**允许修改**：`src/living/**`、`src/desktop/plugin.ts` 或 `src/desktop/features.ts`（只加登记）、`src/channels/plugin.ts`（只加登记）、`arch/layers.json`、基线、相关测试。

**验收**：第二层基线 0 条，`living` 模块 R1–R4 全绿。

#### 3D 开工细则

（Codex 只读起草、Claude 核对行号后定稿，主人 2026-11-20 过目同意。）

3C 合并后，从更新后的 `main` 开 `codex/2a-3d-outlets`。以下行号以 3B 合并后的 `13ae820` 为准。起草时只读运行了架构报告和声明差异校验，构建与快测留到执行时。`docs/plans/stage2a-merge.md:45-52,382-392,530`

**现存违规与调用替换**

`pnpm run check:arch -- --report` 按检查器的模块归属核对，`living` 有 **R1 一条、R2 四条、R3/R4 各零条**。R1 来自动画映射生成源 `scripts/build/build-animation-map.mjs:6`，其 WebM 读时长工具未登记归属。四条 R2 如下。`arch/layers.json:62-64`、`arch/baseline/rules.json:4-13,534-581`、`scripts/arch/lib/rules.mjs:7-9`

| 当前读取 | 新调用与时机 |
| --- | --- |
| `src/living/plan/plugin.ts:158` → `petDesktop` | `publishRest()` 调 Desktop 出口的 `restore()`，沿用 `features?.restore(false)`。显式暂停落盘、发变更通知后，在 `stopRuntime(bound)` 前恢复。卸载仍在 `close()` 中恢复，此时 Plan 租约已撤。`src/living/plan/plugin.ts:545-564,615-626`、`src/living/index.ts:146-152` |
| `src/living/plan/plugin.ts:193` → `petDesktop` | `startRuntime()` 调 Desktop 出口的 `pause()`，在启动条件检查之后、恢复图片转录和解析 home 之前。`src/living/plan/plugin.ts:189-199` |
| `src/living/plan/plugin.ts:317` → `petDesktop` | 通知通过运行中与安静模式检查后，先调 Desktop 出口的 `present(push.text, push.image)`。桌宠不可用时算未呈现，呈现抛错时记原告警并继续送达。`src/living/plan/plugin.ts:314-322` |
| `src/living/plan/plugin.ts:323` → `petChannels` | 随后查 Channels 出口并等待 `reach(bound.id, push)`，桌宠呈现成功也照常尝试。缺席等同 `[]`。桌宠未呈现且渠道无 `fulfilled` 时，沿用「当前没有送达主动消息的渠道」。`src/living/plan/plugin.ts:323-325` |

**登记与撤销**

- 新建 `src/living/outlets.ts`，由第二层提供 `registerLifeOutlet(ctx, host, slot, callbacks)` 和 `lookupLifeOutlet(ctx, host, slot)`。复用 `RegistrationTable` 的登记、查找、代次和撤销，按 Cordis 根、Core 实例及原 `petDesktop`／`petChannels` 可见标签划分。查找仅返回租约有效且提供方 fiber 为 `ACTIVE` 的出口，每次调用现场取。出口随第三层入口存活，三个生活入口全退出时 `LivingWorld` 仍按原规则释放。`src/core/tables/registry.ts:20-42,66-78`、`src/living/index.ts:25-32,54-94`
- Desktop 槽提供 `pause(): void`、`restore(): void`、`present(text: string, sticker?: string): boolean`。在 `src/desktop/plugin.ts:40-43` 取得 `desktop` 并 `provide` 后用 `ctx.effect` 登记，退出撤销本次租约。前两项委托 `features?.pause()`、`features?.restore(false)`，呈现先检查 `presentationAvailable()`，可用才调用 `presentLife()` 并返回 `true`。无槽或无 `features` 时，暂停与恢复直接跳过。`src/desktop/features.ts:125-134,308-312`、`src/desktop/index.ts:56-76,295`
- Channels 槽提供 `reach(workspaceId: string, push: Push): Promise<PromiseSettledResult<string>[]>`。在 `src/channels/plugin.ts:123-125` 的 `provide` 后用 `ctx.effect` 登记，退出撤销本次租约，原 `close()` 继续关闭适配器。直接传原 `push`，保留工具附加的不可枚举 `deliveryId`。`CompanionChannels.reach` 沿用绑定、安静模式和 home 检查，再汇总 Bridge、QQ、微信的送达结果。`src/channels/plugin.ts:85-91,127-131`、`src/channels/bridge.ts:76-90`、`src/channels/messaging.ts:196-219`、`vendor/dsh-world/lib/life/tools.js:27-41`

**Desktop 的持久启用意图**

- `src/desktop/features.ts:80-89` 改调 `outlets.ts` 的 `readLifeEnabled(ctx, host, workspaceId)`。由 `src/living/index.ts` 复用现有 Plan 槽和租约检查，只按 `petLife` 的可见标签找 Plan。现有 `LivingWorld.find()` 匹配三区标签，读口只需要 Plan 的可见性。返回 `plan?.bodyClockState(workspaceId)?.enabled ?? plan?.running() ?? false`。`src/living/index.ts:25-32,44-52,87-94`
- `bodyClockState()` 已优先取当前绑定的已提交意图，绑定尚未装入时读 `readLifeControl()`。因此原生运行时启动失败时，已保存的 `enabled:true` 仍压住自动碎碎念和梦话。Plan 缺席或租约撤销时返回 `false`，桌宠可恢复，磁盘仍保留原意图。Body、Economy 按各自的菜园语义继续复用同一文件读取器。`src/living/plan/plugin.ts:119-149,532-556,615-626`、`src/living/plan/control-file.ts:25-51`、`src/living/body/plugin.ts:172-182`、`src/living/economy/plugin.ts:118-127`
- `src/desktop/index.ts:281-287` 创建 `DesktopFeatures`，另用 `isHome()` 抑制普通回复气泡。`PetPlatform` 经 `restore(true)` 和 `refresh()` 进入同一调度读口。启用意图按工作区读取。3C 的五个登记口供第一层使用，其中 `isRunningLifeHome(sessionId)` 判定运行中的会话归属。`src/desktop/index.ts:89-95`、`src/desktop/platform/plugin.ts:166-192,295-320`、`src/desktop/features.ts:55-64,125-134,265,271-275,295-300`、`docs/plans/stage2a-merge.md:324-332`

**层声明、提交与范围**

- `desktop`、`channels` 的 `dependencies` 已包含 `living`，登记与意图查询都是第三层向下调用。Life 通过本层登记表使用上层交来的回调，符合「向上用事件和登记」。现有 home 读取仍使用 `reads` 中的 `petLife`。沿用三项兼容事件及异步通知，`pet/life.review` 的退休归 3C。`arch/layers.json:54-73,103-110`、`docs/architecture.md:21-36,124-131`、`docs/plans/stage2a-merge.md:567,571`
- 提交 1 补生成源归属。把 `scripts/lib/webm-metadata.mjs` 加入动画映射的 `generated.sources`。内存中按现有扫描器核对，该声明只清这条 R1，R8 无增删。提交 2 切 Desktop 三个调用及启用意图读口。提交 3 切 Channels 送达。每个提交分别构建、跑快测，用 `pnpm run check:arch -- --write-baseline` 同提交收紧，`living` 按模块归属 **5 → 4 → 1 → 0**。`arch/layers.json:62-64`、`scripts/build/build-animation-map.mjs:6,29-34`、`scripts/arch/check.mjs:29-55`、`scripts/arch/lib/ratchet.mjs:22-38`
- 允许修改 `src/living/outlets.ts`（新）、`src/living/index.ts`、`src/living/plan/plugin.ts`、`src/desktop/plugin.ts`、`src/desktop/features.ts`、`src/channels/plugin.ts`、`arch/layers.json`、工具生成的 `arch/baseline/{rules,vocabulary}.json`、下列测试和本方案执行结果。构建产生的 `dist/src/**` 随提交，按项目规则排除于 15 文件、600 行阈值。`docs/plans/stage2a-merge.md:390,573`、`AGENTS.md:60-64`
- 本批止于出口、启用意图读口和上面的生成源声明。呈现、渠道送达和持久格式沿用现有实现。四项对外契约及代码清理归 3E，旧门面迁移归阶段 3，home 身份迁移及发布走原批次。`src/desktop/index.ts:56-76`、`src/channels/plugin.ts:85-91`、`docs/plans/stage2a-merge.md:47-50,394-407,567`

**测试**

- `tests/life/life-desktop-integration.test.ts` 改用真实 Cordis 区租约与出口，保留原生启动失败、显式暂停恢复、只排程一次及待办仍可提醒的断言。`tests/desktop/desktop-features.test.ts`、`tests/regressions/audit-r2-desktop-policy.test.ts` 的 Life 替身改接测试租约，保留调度和在途取消断言。`tests/life/life-desktop-integration.test.ts:34-53,58-102`、`tests/desktop/desktop-features.test.ts:36-42,93-113,140-145`、`tests/regressions/audit-r2-desktop-policy.test.ts:20-32,51-58`
- 在 `tests/behavior-list/entries-lifecycle.test.mjs` 经真实入口新增 Desktop 先装、晚装、单独重载的用例。验收已启用但运行时未就绪时压住自主功能，重载后只调用新出口，同名旧租约及不同隔离标签不可用。再验三生活入口全退后桌宠恢复且 `control.json` 仍为启用，重挂 Life 后重新接管。新增用例登记到 `tests/behavior-list/index.json`。`tests/behavior-list/entries-lifecycle.test.mjs:233-246,751-779`、`tests/living/living-lifecycle.test.mjs:62-126`、`tests/behavior-list/index.json:1135-1142`
- 同文件经运行中 home 的 `reach_out` 新增送达用例。让桌宠在呈现时变为不可用，断言真实 Channels 路径向假 QQ 网关发送且工具报成功。再验桌宠成功时也尝试渠道，以及两出口缺席或均未送达时工具报明确失败。`tests/behavior-list/entries-lifecycle.test.mjs:126-143`、`tests/behavior-list/qq-transport.mjs:3-17`、`src/desktop/index.ts:56-75`、`vendor/dsh-world/lib/life/tools.js:27-41`

**需主人拍板**

- WebM 生成源归属 — 补清 WebM 生成源的 R1。推荐同批拆成独立声明提交，现有生成逻辑无需改动，才能按检查器口径验收第二层零条。若另排批次，3D 只能验收四条 R2，第二层全绿仍待完成。`docs/plans/stage2a-merge.md:390-392`、`arch/layers.json:62-64`、`scripts/build/build-animation-map.mjs:6` 决定：按推荐（主人 2026-11-20 过目同意）。
- Desktop 两个文件和呈现异常 — 推荐明确同时允许 `src/desktop/plugin.ts` 登记和 `src/desktop/features.ts` 切换启用意图读口。前者拥有入口生命周期，后者拥有调度判定。呈现异常推荐统一记原告警并继续 Channels，涵盖可用性探测抛错这一条原先会中断送达的路径。`docs/plans/stage2a-merge.md:386-390`、`src/desktop/plugin.ts:38-47`、`src/desktop/features.ts:80-89`、`src/living/plan/plugin.ts:317-324` 决定：按推荐（主人 2026-11-20 过目同意）。

**快测**

- 每提交跑 `pnpm run build && pnpm run check:arch`，再跑 `node --test dist/tests/core/context-contracts.test.js tests/behavior-list/{index,entries-lifecycle}.test.mjs`。`AGENTS.md:49-52`、`package.json:92,125`、`docs/plans/stage2a-merge.md:581-586`
- 提交 1 加跑 `node --test tests/regressions/webm-metadata.test.mjs`。提交 2 加跑 `node --test dist/tests/life/{life-desktop-integration,life-body}.test.js dist/tests/desktop/desktop-features.test.js dist/tests/regressions/audit-r2-desktop-policy.test.js tests/living/living-lifecycle.test.mjs`。提交 3 加跑 `node --test tests/behavior-list/channels.test.mjs tests/regressions/mapped-channel-path-binding.test.mjs`。批末在允许本机回环的环境跑 `pnpm run test:life-integration`，再用 `pnpm run check:arch -- --report` 复核零条。`tests/regressions/webm-metadata.test.mjs:4`、`tsconfig.build.json:3-4`、`package.json:113-114,125`、`AGENTS.md:52`

### 3E 第二层对外契约和代码清理

**对外契约**（拍板点 12）：

- 在 `src/contracts/` 定义第二层的四样：**世界快照**（沿用 `BehaviorSnapshot`，加钱包只读视图：余额、库存、阅读状态，不含可变句柄）；**命令**（照料、执行计划步骤、阅读确认、购买、出售，每条带请求 ID，错误语义沿用 `ContractError` 的 `effect / retry`）；**事实流**（沿用 `CompanionFactSource`）；**`world.changed`**（只表示「去读快照」，不是落盘回执）。
- 实例实现这四样，由已有门面对象挂出（快照和事实流挂在 `petBehavior`，钱包视图经实例读钱包区；命令沿用各区现有方法），不新增 Cordis 服务名。三个区状态变化时发 `world.changed`。
- 入口级测试：每样各一条，经真实入口驱动；只挂 Economy 时快照的钱包视图可读、身体部分标明不可用。
- 第三层改用新契约、旧门面成员退场，放到阶段 3、4。

**代码清理**：

| 项 | 位置 | 做法 |
| --- | --- | --- |
| 没有调用方 | `desktopRest()`（`src/living/plan/plugin.ts:497-499`） | 删。它是门面类的公开方法，仓库内没有调用方；仓库外的使用在第 6 批隔离环境里和 `PetCoreHost` 一样盘点 |
| 没有调用方 | `EconomyStore.bookmark()`（`src/living/economy/store.ts:304`） | 删；阅读确认走 `src/living/economy/store.ts:316-346` |
| 只剩测试在调用 | `installLifeReviewFileGuard()`（`src/living/plan/review-files.ts:62`，只有 `tests/life/life-review-files.test.ts:70,89` 调） | 删函数；两条测试改为经真实来源分支驱动（通用守卫在 `src/core/native/agent.ts:116-120`），断言不变 |
| 未读参数 | `CompanionRoom.garden()` 的 `_legacyLifeEnabled`（`src/living/body/room.ts:1042`） | 删参数；第四个形参 `now` 前移，传了指定时间的调用和测试同步改，行为不变 |
| 纯转导出 | `src/living/plan/room.ts` | 删，引用方（含 `scripts/checks/check-room-interactions.cjs:21`）改直接引用 |

删旧代码不留兜底。`setMeta/close` 去重放到第 5 批。

#### 3E 开工细则

（Codex 只读起草、Claude 核对行号后定稿，主人 2026-11-20 过目同意。）

3D 合并后，从更新后的 `main` 开 `codex/2a-3e-contract`。源码行号取自 `13ae820`，方案行号已计入当前 3D 细则。开工时把 3C 的 `src/core/tables/companion-ports.ts`、`src/living/prompt-context.ts` 和 3D 的 `src/living/outlets.ts` 纳入引用复查。本批完成场景 2 所需的四项入口契约，快测在实现后执行。`docs/plans/stage2a-merge.md:45-47,322-343,411-421,446-465,581,619,623,639`

**契约与门面**

- 新建 `src/contracts/living.ts`，定义 `WorldSnapshot`、`WalletView`、`WorldCommands`、`WorldChanged`，事实流直接用 `CompanionFactSource`。现有 `index.ts` 汇出 `version/common/core/emotion/behavior/interaction/tables`，加一行类型转导出即可。`./contracts` 继续指向同一个入口，`package.json` 的 `exports` 保持原样。`src/contracts/index.ts:2-9`、`src/contracts/interaction.ts:26-31`、`package.json:6-10,41-42`、`docs/plans/stage2a-merge.md:597`、`AGENTS.md:55-59`
- `WorldSnapshot` 字段为 `workspaceId`、`storageId`、`body`、`wallet`。`body` 为 `{available:true,snapshot:Readonly<BehaviorSnapshot>}` 或 `{available:false}`。`wallet` 为 `WalletView | null`，Economy 缺席时为 `null`，已挂载但读库失败时沿用现有拒绝。快照返回独立数据副本，包括 Body 投影内的嵌套对象。`src/contracts/behavior.ts:34-46`、`src/living/body/plugin.ts:277-287`、`src/living/economy/plugin.ts:93-111,176-179`、`vendor/feiyu-room-template/home-state.js:1704-1735`
- `WalletView` 含 `balance`、只读 `inventory[]`（`itemId/quantity/reserved/available`）、只读 `reading[]`（持有读物的 `itemId/version/bookmark`）。`bookmark` 复用 `ReadingBookmark` 的 `itemId/version/offset/updatedAt`，当前版本尚无确认进度时为 `null`。在 `living.ts` 定义原 `InventoryItem`、`ReadingBookmark`，Economy 从该处导入并转导出。由现有库存、目录版本和书签投影，当前片段的三态继续取 `BehaviorSnapshot.behavior.readingState`。正文、确认 token、Store 和写端口留在所属区。`src/living/economy/types.ts:24-35,59-67`、`src/living/economy/catalog.ts:50-53`、`src/living/economy/store.ts:187-192,318-348`、`src/contracts/behavior.ts:23-32`
- `LivingWorld` 经现有 `LivingView.lookup()` 汇总。`petBehavior.worldSnapshot(workspaceId)` 为主入口，`petEconomy.worldSnapshot(workspaceId)` 委托同一实现，支持仅挂 Economy。Body 复用 `snapshot()` 的队列与时间推进，Economy 复用 `bound()` 和 Store 快照。按门面所属的 Cordis 根、Core 实例和可见标签取区，跨 `await` 与返回前复核 `workspaceId/path/storageId` 和区租约。沿用三个服务名。`src/living/index.ts:19-32,49-94,104-111,143-177`、`src/living/body/plugin.ts:256-259,277-287,392-397`、`src/living/economy/plugin.ts:107-112,176-179,264-274`
- `WorldCommands` 用五个方法签名，均收 `workspaceId` 和必填 `requestId`，复用 `RequestContext.requestId`、`CallOptions.signal` 与 `Result<T>`。各区门面的 `worldCommands` 只挂本区方法，复用原入口的调用准入、绑定复核及队列。`src/contracts/common.ts:11-34`、`src/living/body/plugin.ts:108-120`、`src/living/plan/plugin.ts:105-117`、`src/living/economy/plugin.ts:193-201`

| 命令与门面 | 其余输入、成功值与执行 |
| --- | --- |
| `petBehavior.worldCommands.care` | `action: NonNullable<PlannedActivity['action']> \| 'pet'` → `{changed}`。调用 `act`，传原 `requestId`，由现有入口确定主人归属。`src/contracts/behavior.ts:49-64`、`src/living/body/plugin.ts:20,295-310` |
| `petLife.worldCommands.executePlanStep` | `expectedRevision/planId/stepId` → `{operationId, execution: PlannedExecution \| null}`。在 Plan 串行队列内核对已保存的当前步骤和启用状态，复用 `PersistentLifePlan.advance()`，沿用 `life:${planId}:${stepId}`。`null` 表示该步尚无执行回执。`src/living/plan/plugin.ts:375-402,463-483`、`src/living/plan/plan.ts:326-385,398-440` |
| `petLife.worldCommands.confirmReading` | `expectedRevision/operationId/receiptToken` → `PlannedExecution`。复用 `confirmPlannedReading` 的版本、原片段及 token 核验。原步骤已完成时只核对并返回原回执，推进游标只适用于原步骤仍在当前游标的首次确认。`src/living/plan/plugin.ts:492-520`、`src/living/body/room.ts:701-716`、`src/living/economy/store.ts:327-343` |
| `petEconomy.worldCommands.buy`、`sell` | `itemId/quantity?`（默认 `1`）→ `WalletView`。调用 `ownerAction` 的购买、出售分支，用原 `requestId` 结算并投影当前钱包。`src/living/economy/plugin.ts:193-207,225-226`、`src/living/economy/store.ts:144-150,200-218` |

- Body 和 Economy 沿用请求指纹去重。Plan 两条命令用 `requestId` 关联调用，分别靠原步骤编号、原片段 token 防止重复施效，版本或步骤已换时要求刷新。错误复用 `ContractError`，确定拒绝为 `none/never`，过期为 `none/refresh`，能证明未施效且可用原请求重试时为 `none/same_request`，已知部分施效为 `partial/reconcile`，提交结果无法确认时为 `unknown/reconcile`。仅在错误覆盖整条命令时透传 `Rejection.detail`，避免将后续读取失败误报为未施效。`src/contracts/common.ts:19-31`、`src/core/storage.ts:7-17`、`src/living/body/room.ts:1004-1012`、`src/living/plan/plan.ts:419-455`、`src/living/economy/store.ts:122-150`
- `petBehavior.worldFacts: CompanionFactSource` 经实例聚合 Body、Economy。`pendingFacts` 读取已挂载区并按 `occurredAt/id` 排序，`readFacts` 按原 ID 的域前缀路由并保留输入顺序，复用 `readFactReferences`。`acknowledgeFacts` 先核全部 ID 的所属区和租约，再按区确认，缺区时保留原编号供重试。仅挂 Economy 时已有三个事实方法可直接用。3C 的原生日志 `flush === true` 后才确认的门控继续由现有调用流程负责。`src/living/body/plugin.ts:311-315`、`src/living/body/room.ts:314-324,1033-1042`、`src/living/economy/plugin.ts:180-186`、`src/living/economy/store.ts:160-185`、`src/living/plan/facts.ts:5-24`、`src/living/plan/plugin.ts:418-427`、`src/core/interaction-context.ts:12-22`、`docs/plans/stage2a-merge.md:342-343`

**变更信号与现有读者**

- `WorldChanged` 只带 `workspaceId/storageId`，表示应重读快照。`src/living/index.ts` 声明 Cordis 事件 `world.changed`，在 `living.publishes` 登记同名。实例按绑定合并同一轮微任务内的通知，发送前复核绑定和租约，区装卸在可用性改变后通知。用 `ctx.emit`，发布异常与业务结果隔离，事件无落盘回执语义。`src/living/index.ts:54-94,143-165`、`arch/layers.json:54-61`、`scripts/arch/lib/rules.mjs:71-80`、`docs/architecture.md:211-216`
- Body 复用 `publish()` 的可见投影指纹，活动阶段、可见身体状态、自主状态或阅读呈现变化才通知。Plan 在启停、计划修订、游标或执行回执实际变化时通知，包括自动推进。Economy 在 SQLite `COMMIT` 后按余额、库存与预留、持有读物版本或书签的实际变化通知。重复读、同请求重放、纯时钟检查点和回滚不另发通知。`src/living/body/plugin.ts:222-243,277-287`、`src/living/plan/plugin.ts:327-364,375-402,475-565`、`src/living/plan/plan.ts:174-191,404-446`、`src/living/economy/store.ts:122-150,327-368,439-465`
- `pet/behavior.changed` 继续驱动 Desktop、Room 和 Plan，`pet/life.changed` 继续驱动 Desktop、Channels、Body 和 Plan，`pet/economy.fact` 继续唤醒 Plan 的事实处理。旧事件发出时机、异步通知和重试语义照拍板点 13。`src/desktop/features.ts:55-60`、`src/desktop/platform/plugin.ts:221-241`、`src/room/plugin.ts:54-55`、`src/channels/plugin.ts:127-129`、`src/living/body/plugin.ts:94-106,242`、`src/living/plan/plugin.ts:83-88,399-402`、`src/living/economy/plugin.ts:187-192`、`docs/plans/stage2a-merge.md:623`
- 第三层直读盘点。Desktop 读 `roomState/restState` 和 Life 启用意图、home，3D 将启用意图移到出口读口。Room 读 `roomState/garden/readFacts`。Console 经旧门面读写 Life 和 Economy，Channels 查 Life 的 home，Voice 走自己的音频路由。切换新契约归阶段 3。`src/desktop/platform/plugin.ts:359-368`、`src/desktop/features.ts:80-89,122-124,166-174`、`src/desktop/index.ts:279-282`、`src/room/plugin.ts:64-69,113-125`、`src/console/settings.ts:79-101,218-232`、`src/channels/plugin.ts:77-90`、`src/channels/messaging.ts:196-197`、`src/voice/plugin.ts:36-82`、`docs/plans/stage2a-merge.md:417-421,619`

**五项清理**

| 项 | `src/`、`scripts/`、`tests/` 引用核对和改法 |
| --- | --- |
| `desktopRest()` | 仅定义，直接删。桌宠当前调用 Body 的 `roomAction/act`。用工具收紧 `desktopRest` 对应的 R8 条目，仓库外使用按第 6 批隔离盘点。`src/living/plan/plugin.ts:572-575`、`src/desktop/features.ts:166-174`、`arch/baseline/vocabulary.json:6594,6608`、`docs/plans/stage2a-merge.md:459,558` |
| `EconomyStore.bookmark()` | 仅定义，直接删。保留 `ReadingSegment.bookmark` 字段、已有书签读取和 `confirmReading` 的写入。`src/living/economy/store.ts:300-310,327-343`、`tests/economy/economy-recovery.test.ts:126`、`tests/life/life-domain-integration.test.ts:160` |
| `installLifeReviewFileGuard()` | 两处调用均在测试。删包装与专用 imports，保留 `assertLifeReviewFile` 和访问键。两条集成用例移到 `policy-life.test.mjs`，保留原文件里的纯路径规则测试。`src/living/plan/review-files.ts:1-20,62-70`、`tests/life/life-review-files.test.ts:25-95` |
| `CompanionRoom.garden()` | 删除未读的第三参，把 `now` 前移。实参调整仅四处。脚本保留 `now()`，回退时钟测试保留 `f.start+HOUR`，排队测试两处保留 `f.now`。其他调用继续用原默认时间或旧门面参数。`src/living/body/room.ts:1063-1065`、`src/living/body/plugin.ts:316-325`、`src/living/plan/plugin.ts:593-595`、`scripts/checks/check-room-interactions.cjs:50`、`tests/regressions/audit-r5-garden-clock.test.mjs:124-129`、`tests/life/autonomous-life.test.ts:284-292` |
| `src/living/plan/room.ts` | 仅转导出。唯一引用 `scripts/checks/check-room-interactions.cjs:21` 改为 `../../dist/src/living/body/room.js`。由构建清走旧产物。`src/living/plan/room.ts:1-2`、`scripts/build/clean-build.mjs:1-6` |

回顾两条用例复用 `fixture(t,{policy:true})`，让运行中的 home 收到 `dsh-world-life` 的 `purpose:'review'` 输入，经 `begin/step`、真实 `createLifeSourceAdapter` 和 Core 通用守卫。夹具提供 cwd/路径解析控制和真实 `checkGuards`，沿用同一执行 token 在准备后替换软链或创建历史日记，再复核。用主人消息接管同一轮，保留普通工具权限、相对 cwd、越权及 guest 拒绝、软链复核和历史覆盖拒绝的原断言。`tests/behavior-list/fixture.mjs:148-157,194-219,242-275`、`tests/behavior-list/policy-life.test.mjs:70-101`、`src/living/plan/tool-policy.ts:88-118`、`src/core/native/agent.ts:116-120,241-253`、`src/core/life-review-files.ts:22-60`、`tests/life/life-review-files.test.ts:63-95`

**提交与允许修改的文件**

1. 快照、事实流、通知及三条入口测试。`src/contracts/{living,index}.ts`、`src/living/index.ts`、`src/living/body/plugin.ts`、`src/living/plan/{plugin,plan}.ts`、`src/living/economy/{plugin,store,types}.ts`、`arch/layers.json`、`tests/living/living-lifecycle.test.mjs`。`docs/plans/stage2a-merge.md:450-452`、`tests/living/living-lifecycle.test.mjs:10-24`
2. 五命令及入口测试。`src/contracts/living.ts`、`src/living/index.ts`、`src/living/{body,plan,economy}/plugin.ts`、`tests/living/living-lifecycle.test.mjs`。`src/living/body/plugin.ts:295-310`、`src/living/plan/plugin.ts:375-402,492-520`、`src/living/economy/plugin.ts:193-226`
3. 五项清理。`src/living/plan/{plugin,review-files,room}.ts`、`src/living/body/room.ts`、`src/living/economy/store.ts`、`scripts/checks/check-room-interactions.cjs`、`tests/life/{life-review-files,autonomous-life}.test.ts`、`tests/regressions/audit-r5-garden-clock.test.mjs`、`tests/behavior-list/{fixture,policy-life}.mjs`，其中测试文件名为 `policy-life.test.mjs`。基线由 `--write-baseline` 生成，只收紧条目。`docs/plans/stage2a-merge.md:455-465`、`scripts/arch/check.mjs:29-55`、`AGENTS.md:60-64`
4. 每提交独立构建和快测，控制在 15 文件、600 行内。`dist/src/**` 和工具生成基线随提交，按规则排除计数。本方案只补 3E 执行记录，架构文档由 Claude 在第 6 批归并。第三层切换归阶段 3，旧门面退场归阶段 3、4，区间事件直调归 2b，`setMeta/close` 归第 5 批。`AGENTS.md:49-51,63-64`、`docs/plans/stage2a-merge.md:453,465,535-543,623-625,639`

**入口验收**

四条放在 `tests/living/living-lifecycle.test.mjs`，复用真实 Cordis `cordisFixture` 的 `order/load/unload`、临时绑定、控时和原生工具调用。`tests/living/living-lifecycle.test.mjs:10-24,62-98`、`tests/behavior-list/entries-lifecycle.test.mjs:33-46,105-151,233-277`

- 快照。`order:['economy']` 下经 `petEconomy.worldSnapshot` 读出真实余额、库存和读物版本进度，断言 `body.available === false`。挂上 Body 后经 `petBehavior` 读到原 `BehaviorSnapshot`，验证修改返回副本影响不到权威状态。`tests/behavior-list/entries-lifecycle.test.mjs:233-269`、`src/living/body/plugin.ts:277-287`、`src/living/economy/store.ts:187-192`
- 命令。经三区新门面照料、执行已保存的指定步骤、确认实际发放的原片段、买入和卖出。断言真实回执、游标、书签和钱物变化。重放不重复施效或推进下一步，版本过期返回 `none/refresh`。`tests/behavior-list/entries-lifecycle.test.mjs:263-277`、`tests/life/life-domain-integration.test.ts:122-160`、`src/living/plan/plan-tools.ts:126-132`
- 事实流。实际照料和交易产出两源事实，经 `worldFacts` 列出、按原 ID 读取。在真实原生日志成功 `flush` 后确认，断言待确认项消失且原事实仍能回读。`tests/behavior-list/entries-lifecycle.test.mjs:148-150,268-269,709-711`、`src/core/interaction-context.ts:12-22`、`src/living/economy/store.ts:158-185`
- 通知。订阅真实 `world.changed`，分别驱动三区变化，收到后重读快照。验同批合并、稳定读取不自激、卸载后旧租约不发迟到通知。保留原事件回归断言。`tests/living/living-lifecycle.test.mjs:135-205`、`src/living/body/plugin.ts:222-243`、`src/living/plan/plugin.ts:545-565`、`src/living/economy/plugin.ts:203-226`

**需主人拍板**

- 仅挂 Economy 的读口 — 推荐在 `petEconomy` 增加同一个 `worldSnapshot()`，因为 `petBehavior` 随 Body 才挂出，复用实例读口即可满足只挂钱包的验收。`docs/plans/stage2a-merge.md:451-452`、`src/living/body/plugin.ts:392-397`、`src/living/economy/plugin.ts:264-274` 决定：按推荐（主人 2026-11-20 过目同意）。
- Plan 命令的请求身份 — 推荐 `requestId` 关联调用，效应去重沿用原步骤编号和阅读 token，两条命令都锁定原目标。现有持久回执已经覆盖重试所需的事实，避免为 3E 新增请求账本和数据迁移。`src/living/plan/plan.ts:354-385,398-440`、`src/living/body/room.ts:621-625,705-716`、`src/living/economy/store.ts:327-343` 决定：按推荐（主人 2026-11-20 过目同意）。

**快测**

- 每提交 `pnpm run build && pnpm run check:arch && node --test tests/living/living-lifecycle.test.mjs`。验 `living` 的 R1–R4 为零，R8 无新增。提交 2 加 `node --test dist/tests/life/life-domain-integration.test.js dist/tests/economy/economy-recovery.test.js`。`AGENTS.md:49-51`、`package.json:92,113-114,125`、`tsconfig.build.json:3-4`、`docs/plans/stage2a-merge.md:392,619,639`
- 提交 3 加 `node --test dist/tests/life/{life-review-files,autonomous-life}.test.js dist/tests/economy/economy-recovery.test.js tests/regressions/audit-r5-garden-clock.test.mjs`、`node --test --test-name-pattern='回顾文件守卫|历史补写' tests/behavior-list/policy-life.test.mjs` 和 `node --check scripts/checks/check-room-interactions.cjs`。合并前按原门禁跑 `pnpm run verify` 和 `pnpm run test:behavior-list`。`tests/life/life-review-files.test.ts:63-95`、`tests/life/autonomous-life.test.ts:284-292`、`tests/regressions/audit-r5-garden-clock.test.mjs:124-129`、`scripts/checks/check-room-interactions.cjs:21,50`、`package.json:125-127`

---

## 第 4 批：共享 home 身份记录迁移和「需要迁移」模式

**现状**：home 会话 ID 记在 `life.json` 的 `homeSessionId`。Core 直接读（`src/core/companion-foundation.ts:49-61`），前台新建 home 时经上游 `markHomeArrival` 直接写（`:104-108`）。上游 Life 运行时自己也读写这个字段，并用 `greeting:{at,kind:'arrival'}` 表示「待迎接」，送出后删除（`vendor/dsh-world/lib/life/home.js:6-11`、`vendor/dsh-world/lib/life/runtime.js:316-323,1018-1023`）。

**做法**（拍板点 11）：

- **身份归 Core**：`core.sqlite` 的 `records` 表新 kind `companion-home`，按 `storageId` 一条，只存 `{sessionId}`。经 `host.workspace` 上的读写方法访问，读写时核验 `workspaceId / path / storageId` 和绑定代次。
- **只有一个创建入口**：前台打开 home 已有单飞路径 `resolveCompanionHome()`（`src/core/companion-foundation.ts:71-132`）；上游运行时之后的唤醒、回顾会走自己的 `createHome().open()`，但它建会话用的 `host.createSession` 是我们传进去的（`src/living/plan/plugin.ts:262-267`）。两条路径都改为调用第一层的同一个串行入口：在建会话**之前**取得串行权，建好后先写 Core 记录，再返回。同时进来的第二个调用拿到同一个结果。
- **「待迎接」仍归第二层**：`life.json` 的 `homeSessionId` 和 `greeting` 由第二层维护（上游运行时需要，vendor 不能改）。前台新建 home 时，Core 写完身份，再通知第二层登记的回调写 `markHomeArrival`。第二层不在时（三个入口都没加载），Core 在自己的记录里加一个 `arrivalPending` 标记；第二层下次启动时先写 `greeting`、再清 Core 的标记，已有同一 ID 的 `greeting` 就跳过，不重复迎接。
- **镜像修复**：第二层包装传给上游的 store（上游经 `store.read / refresh / write` 访问，`vendor/dsh-world/lib/life/runtime.js:38,46-47`）。初始 `read` 和每次 `refresh` 把 Core 的身份叠到 `state` 上，`tools.isHome` 等直接读 `state` 的地方看到的就是权威值；`write` 只在 `homeSessionId` 真的变了时才通知（上游按原对象跟踪字段，包装要保留同一个对象）。镜像写失败时卸载照样 `stop / cancel / settled`。四种情况各有测试：Core 已提交、镜像失败；Life 还没装载；镜像和 Core 冲突（以 Core 为准）；旧回调晚到。
- **迁移步骤 `0002-home-identity`**：对当前绑定，`life.json` 有 `homeSessionId` 而 Core 没有记录时复制过去；`greeting` 不动（它本来就在 `life.json`，归第二层）。完成判定：Core 记录等于 `life.json` 的值，或两边都没有。只复制、不删 `life.json` 的字段。Agent 只看步骤的通过与否。
- **`dataVersions` 换键**：这一步把 3A 留下的三个数据版本键换成 `living`，`core` 和 `living` 都升版本，由 1B 的「步骤推进清单」写入。

**「需要迁移」模式**（拍板点 6）：

只改工作区状态挡不住写入：`workspace.initialize` 会绕过一般检查重写绑定、跑各模块初始化、更新清单（`src/core/workspace.ts:230-299`）；身份和策略有独立的写路径（`:313-351`）；设置页把 `pending` 显示成可初始化（`src/console/client.js:1127-1145`）；状态不是 `ready` 时，Her World 的原生会话作用域和完整日志副本都会撤掉（`src/core/native/agent.ts:45-51,211-216`、`src/core/native/transcripts.ts:290-303`）。所以这一批要：

| 情况 | 判定 | 允许 | 拒绝 |
| --- | --- | --- | --- |
| 已初始化的旧存档，没有清单或清单落后 | 绑定就绪、清单版本低于代码要求 | DSH 普通会话（没有伙伴身份上下文和 Her World 历史副本） | 初始化、重新绑定、保存设置、身份和策略写入、所有生活世界和记忆写入 |
| 真正的新装（主人显式初始化） | 没有绑定、没有伙伴数据 | 初始化，直接写最新清单 | 无 |
| 清单内容未知或属于别的伙伴 | 不是任何已知清单 | 同第一行 | 同第一行，原因码不同 |
| 迁移做了一半 | 日志最后一段未完成 | 同第一行 | 同第一行，提示 `--resume` |

- 设置页对这种状态显示「需要迁移」和固定原因码 `migration-required`，不显示初始化按钮。
- 测试：初始化、重新绑定、保存设置三条路径都绕不过；迁移完成后同一进程重新检查即可正常打开（或要求重启，开工细则里定一种）。

**完成后**：Core 对 `life.json` 的读写清零。`arch/storage.json` 的 `home-identity` 条目改成 Core 记录（`arch/storage.json:38`），`life` 条目的 `writers` 去掉 `core`（`:42`）；architecture.md 第 4 节「生活世界只读」改成「身份归第一层，镜像和待迎接归第二层」。现有测试 `tests/core/companion-foundation.test.ts:88-108` 直接断言前台会写 `life.json`，改成断言 Core 记录和第二层镜像，这是这一批唯一预先声明要改的旧断言。

**开工前要定的细则**：实例代次的来源；串行入口放在 `workspace.ts` 还是 `companion-foundation.ts`；「需要迁移」后是重新检查还是重启；`arrivalPending` 的清除时机。

**高风险文件**：`src/core/workspace.ts`（home 记录的读写方法、需要迁移状态、拒绝路径）、`scripts/migrate/**`（新步骤和换键）。`src/core/storage.ts` 预计不用改（`CoreStore` 已有通用 `get / put`，`src/core/storage.ts:168-178`）；执行中发现要改就停下对齐。

**回退**：代码回退 = revert 该批提交。数据回退见拍板点 6 的顺序：用换包前在 0.2.0 下做的回退备份恢复。迁移只复制，回退备份里的 `life.json` 本来就有 `homeSessionId`。

**验收**：合成副本上正常迁移 → 聊天、记忆、home 可用 → 回退 → 0.2.0 可用（旧包、旧数据、旧绑定一起恢复）；四个落盘边界各崩溃一次都能续做；未迁移时三条写路径都被拒；1A 的「home 身份与 Life 在运行分开」契约测试通过；1A 的 G9 流程迁移后复跑通过。

#### 第 4 批开工细则

（Codex 只读起草、Claude 核对行号后定稿，主人 2026-11-20 过目同意。）

3E 合并后从 `main` 开 `codex/2a-4-home`。下文行号取自 3D 合并后的 `6a76e50`。开工时重核 `src/living/plan/plugin.ts`、`src/living/index.ts` 和 `src/contracts/` 的接点。本节已核对源码，验收在实现后执行。`docs/plans/stage2a-merge.md:47-54,467-475,510-514,538-573`

**需要主人拍板**

- **实例代次**　推荐用 Core 的 `bootId` 加 `CoreWorkspace` 的进程内绑定代次。在实际绑定变更或初始化提交后、发 `pet/core.changed` 前换代。可拦住 A→B→A 和同名重挂，普通设置编辑也不会中断开 home。现有 `Binding.revision` 还会随文档保存推进，Plan 的租约只管 Plan 自己。`src/core/runtime.ts:25,96-98`、`src/core/workspace.ts:271-273,328-337`、`src/living/index.ts:127-135` 决定：按推荐（主人 2026-11-20 过目同意）。
- **串行入口**　推荐放 `companion-foundation.ts`。这里已有原生会话控制器、成员判定和前台单飞，`workspace.ts` 负责绑定核验和原子读写。`src/core/companion-foundation.ts:16-34,61-129`、`src/core/workspace.ts:116-120,175-181` 决定：按推荐（主人 2026-11-20 过目同意）。
- **恢复方式**　推荐退出 DSH 迁移，再重新启动。本进程一旦判为「需要迁移」就锁定该判定，设置页刷新可查看状态。迁移器本来就要求 Core、Economy 和 Memory 停写，重启也能让会话和各模块从新绑定重新准入。`scripts/migrate/context.mjs:35-45`、`docs/plans/stage2a-merge.md:755-761` 决定：按推荐（主人 2026-11-20 过目同意）。
- **`arrivalPending` 清除**　推荐 Core 提交新 ID 时一并置 `true`，Plan 确认同一 ID 的迎接已落盘后，由 Core 按原记录比较并清除。已有同一 ID 的迎接直接确认。清除成功后才交给原生调度消费，避免写镜像与清标记之间崩溃导致重复迎接。`docs/plans/stage2a-merge.md:544-547,765`、`vendor/dsh-world/lib/life/{home.js:6-11,runtime.js:307-323,605}` 决定：按推荐（主人 2026-11-20 过目同意）。
- **已收尾步骤的复查**　推荐严格相等仍是 `0002` 当轮完成条件。已记 `done/skip` 后复查以有效的 Core 记录为准，只有旧镜像而 Core 行缺失仍报 `migration-inconsistent`。否则一次合法的镜像滞后就会挡住第 5 批。`docs/plans/stage2a-merge.md:127,547-549`、`scripts/migrate/runner.mjs:38-40,63-75` 决定：按推荐（主人 2026-11-20 过目同意）。
- **拒写验收口径**　推荐核验伙伴业务记录、请求回执和模块文件零写入。Core 启动现有的 `core.lock`、WAL 和 schema 同值写入另行核对。若要求原库文件字节级零写，须先停下对齐 Core 的打开方式。`src/core/storage.ts:77-109`、`src/core/runtime.ts:46-57,93-98`、`AGENTS.md:55-59` 决定：按推荐（主人 2026-11-20 过目同意）。
- **迁移判定的共用代码**　推荐新建 `src/core/storage-migration.ts` 放冻结版本表和日志解码，运行时直接用，离线脚本 import 已提交的 `dist/src/core/storage-migration.js`。现在 `scripts/migrate/` 不读 `dist`（`grep -rn dist/ scripts/migrate` 为空），这是迁移脚本第一次依赖构建产物。好在 `dist/src/**` 随提交入库，按拍板点 6 迁移从与安装版本同标签的仓库跑，产物和源码一致。备选是两边各存一份版本表，会违反「每个事实只写一处」，运行时和迁移器的判定也可能漂移。`scripts/migrate/context.mjs:24-33`、`scripts/migrate/journal.mjs:14-75`、`docs/plans/stage2a-merge.md:755-761` 决定：按推荐（主人 2026-11-20 过目同意）。

**共享 home**

- `host.workspace` 的 `CoreWorkspace` 新增 `homeScope(): HomeBinding | undefined`、`readCompanionHome(scope: HomeBinding): Readonly<HomeRecord> | undefined`、`writeCompanionHome(scope: HomeBinding, expected: HomeRecord | undefined, next: HomeRecord): void`。`HomeBinding` 带 `workspaceId/path/storageId/bootId/generation`，每次核对 `ready` 和当前真实绑定。`HomeRecord` 为 `{sessionId: string, arrivalPending?: true}`，以 `storageId` 为键。写在 `CoreStore.transaction` 内复核并比较旧值，冲突拒绝。`src/core/index.ts:36-47`、`src/core/workspace.ts:116-126,175-181,417-433`、`src/core/storage.ts:99-101,168-186`
- `ensureCompanionHomeSession(ctx: Context, host: PetCoreHost, scope: HomeBinding, preset: string): Promise<string>` 放 `companion-foundation.ts`。在原生 `create` 前按 Core 实例和绑定代次登记同一个 Promise，第二个调用等待同一结果。锁内重读 Core，复用可解析的非归档主人会话，归档或明确 `session/not-found` 才重建，其他解析错误或异域会话拒绝。跨 `await` 复核绑定、原生成员和归档状态。`src/core/companion-foundation.ts:16-34,61-129`、`vendor/dsh-world/lib/life/home.js:53-78`
- 前台 `resolveCompanionHome` 保留日志恢复和上游 `open()` 的标题行为，`current` 改读 Core，`moveIn` 交给已提交后的登记回调，移除 Core 对 `life.json` 的读取、建目录和写入。前台 `host.createSession` 与 Plan 传给上游的 `host.createSession` 都接共享入口。创建者先提交 Core 再返回 ID，两侧各自复核调用租约并解析 Agent。`src/core/companion-foundation.ts:46-65,71-129,154-170`、`src/living/plan/plugin.ts:190-213,289-313`、`vendor/dsh-world/lib/life/home.js:38-44,65-84`
- 创建失败时两路共享拒绝，旧记录保留，释放单飞供重试。原生会话已建而 Core 写失败时，两路都不返回 home，镜像也不写。本进程同代保留候选 ID，重试先核验该会话并补写记录。若进程已退出，未登记的会话仍归 DSH 原生会话。`src/core/storage.ts:182-186`、`src/core/companion-foundation.ts:111-123`、`vendor/dsh-world/lib/life/home.js:65-78`
- Channels 的主人入口走共享身份，主动送达和整理仍要求运行中的 Life。Desktop 的 `isLifeHome` 继续用运行态。3C 的 `isRunningLifeHome` 仍用于回顾整理。`src/channels/plugin.ts:49-62,78-91`、`src/channels/messaging.ts:196-197`、`src/desktop/index.ts:270-282`、`src/living/plan/plugin.ts:152-153,654-659`、`src/memory/batch.ts:90-95`

**Plan 镜像与待迎接**

- 在 `CompanionPorts` 增加同步 `applyHomeArrival(scope: HomeBinding, sessionId: string): boolean`。`40-Life` 与 `isRunningLifeHome` 一起登记和撤销，复用 `scopeFor`、`RegistrationTable` 和 Plan 可见实例检查。Plan 装载取得 `ready` 绑定时即尝试交接，暂停也可落盘迎接。只有 Body 或 Economy 在场时，Core 保留标记。`src/core/tables/companion-ports.ts:17-53`、`src/core/tables/registry.ts:29-42,66-71`、`src/living/index.ts:44-50,189-210`、`src/living/plan/plugin.ts:169-199,636-660`
- Plan 从原始磁盘状态调用 `markHomeArrival`，同次保存 ID 和 `greeting`，同步目录后再确认 Core 标记。包装 `read/refresh` 在原对象上叠 Core ID，保留上游字段基线，把异 ID 的迎接隔离在投影外。上游建会话返回前刷新原对象，使工具判定和 `moveIn` 看见同一 ID。保留上游对已确认迎接的删除。`vendor/dsh-world/lib/life/{home.js:6-11,lifeStore.js:60-92,lifeStore.js:153-183,runtime.js:46-47,runtime.js:605,runtime.js:982-1025,toolRegistry.js:37-41}`、`src/core/workspace.ts:138-146`
- `write` 按当前绑定和运行代复核，将镜像归正后交原 store 合并。仅在持久镜像 ID 实际改变且提交成功后通知 `pet/life.changed`，预算或迎接消费不补发。收尾沿用同代花费写入规则。停机从本运行代保存的会话 ID 取消，镜像读写故障也要完成 `stop/cancel/settled`。`src/living/plan/plugin.ts:201-213,327-371,429-441`、`src/living/index.ts:183-187`、`vendor/dsh-world/lib/life/runtime.js:955-964`
- **四个故障用例**放 `tests/living/living-lifecycle.test.mjs`，复用真实 Cordis 装卸和磁盘夹具。① Core 提交后使镜像写失败，断言前台仍取同一 ID、标记保留、卸载取消和收尾完成，重挂只交接一次。② 无 Life 时开 home，断言前台不写 `life.json`，挂 Plan 后先落盘再清标记。③ 注入冲突镜像，断言原生工具和运行态认 Core ID，下一次有效写修正镜像。④ 阻塞旧回调至重绑或同名重挂后放行，断言新记录、镜像和通知计数不受旧回调影响。`tests/living/living-lifecycle.test.mjs:206-239,372-414,499-539`、`tests/behavior-list/entries-lifecycle.test.mjs:160-181,230-254`

**离线迁移**

- 新建 `scripts/migrate/steps/0002-home-identity.mjs`，按 `{id, from, to, complete(context): boolean, apply(context): void}` 登记在 `0001` 后。`from` 取冻结的 v1，`to` 去掉 `behavior/economy/life`，设 `core:2`、`living:2`，其他键仍为 `1`，存储清单 `schemaVersion` 仍为 `1`。用测试核对 `arch/storage.json.dataVersions`、运行时要求和步骤目标一致。`scripts/migrate/steps/0001-storage-manifest.mjs:3-22`、`scripts/migrate/context.mjs:24-33`、`scripts/migrate/journal.mjs:14-32`、`scripts/migrate/runner.mjs:12-27`、`arch/storage.json:2-4`
- 核对当前绑定、已存在的 Core 库及其 schema，按已有普通文件与停写检查读取 `life.json`，校验版本和 ID。`complete` 在 SQLite 私有副本上验证两边 ID 相等或两边都缺省。`apply` 在锁内用 SQLite 事务仅补缺失的 `{sessionId}`，异值报固定 `home-identity-conflict`。迁移保留 `life.json` 原字节，诊断只报原因码和通过与否。`scripts/migrate/context.mjs:11-22,35-45`、`scripts/lib/repo-storage.mjs:14-29,46-68`、`src/core/storage.ts:97-108,168-186`、`scripts/migrate/errors.mjs:20-30`
- 四处用真实 `0002` 注入 `SIGKILL`，沿用 1B 子进程，复核日志、原备份哈希、记录数及镜像哈希。`tests/migrate/migration-child.mjs:8-53`、`tests/migrate/crash.test.mjs:15-25,44-115`
  1. **备份已校验、段头未追加**　上一段仍有效，保留原备份目录，用新目录重开。`scripts/migrate/runner.mjs:97-106`
  2. **Core 事务已提交、清单未推进**　`--resume` 用本段原备份，`complete` 命中，只补清单和 `skip`。`scripts/migrate/runner.mjs:48-59,112-126`
  3. **清单已推进、`done` 未写**　`status` 仍报 `unfinished`，锁接管后续做只补 `skip`。`scripts/migrate/runner.mjs:38-45,108-125`、`scripts/migrate/io.mjs:21-42,44-56`
  4. **`done` 已落盘**　原样续做幂等。另删已提交的 Core 行、保留源 ID，断言 `status` 为 `inconsistent`，续做和开新段均拒绝。`scripts/migrate/runner.mjs:38-45,48-75,111-125`、`tests/migrate/crash.test.mjs:78-87,118-137`

**「需要迁移」与写入入口**

- 在 `CoreWorkspace.status()` 的 `pending/ready` 分流前调用只读判定。新 `src/core/storage-migration.ts` 共享冻结版本及日志解码，离线脚本经构建产物复用。判定核对已保存绑定、可搬迁 Core 的实际目录和待绑定目标。搬过路径的当前版本用实际存储和 `storageId` 核验，已收尾日志允许换路径。`src/core/workspace.ts:116-126,175-181,417-433`、`scripts/migrate/journal.mjs:35-75`、`docs/development.md:105-109`、`tests/core/workspace.test.ts:96-108`、`package.json:41-46`
- **旧存档**　有已初始化的绑定或伙伴数据，清单缺失或是已知旧版，报 `storage-version-outdated`。**真正新装**　无既有绑定及伙伴数据，可有空目录和本次 Core 引导库。显式初始化先记本版本的初始化中标记，验完各模块后原子写最新存储清单，再撤标记。凭匹配的标记续做本版本初始化。`src/core/workspace.ts:230-254,265-298`、`src/core/storage.ts:61-76`、`docs/plans/stage2a-merge.md:555-563,711-716`
- **未知清单**　坏 JSON、未知完整版本表或异伙伴报 `manifest-mismatch`。**迁移一半**　有效末段未全部 `done/skip` 时，即使清单已推进也报 `migration-incomplete`，提示用匹配源码和原备份 `--resume`。损坏或不匹配的日志沿用 `journal-invalid`、`journal-step-mismatch`、`binding-changed`。对外状态和拒写码统一为 `migration-required`，细因单独返回。`scripts/migrate/context.mjs:28-33`、`scripts/migrate/journal.mjs:35-75`、`scripts/migrate/runner.mjs:48-67`、`docs/plans/stage2a-merge.md:557-563`
- **初始化、重绑、设置、身份和策略**　`CoreRuntime.call` 在 `ensurePersisted()` 前拦全部配置写，`await` 后复核再进 `mutate`。覆盖初始化、`preferences.save` 的重绑/解绑/会话设置、伙伴设置、档案、底座文本、人设、安静模式。重绑在提交目标前再核目标。`CoreWorkspace.initialize/write` 入口复核，`synchronize` 在读取触发 `adopt` 前短路，旧库启动也跳过身份或策略补写。`src/core/runtime.ts:46-65,85-103`、`src/core/workspace.ts:64-98,230-235,301-351`、`src/core/preferences.ts:27-46`
- **生活、记录与记忆**　沿用 Plan `current/isCurrentBinding`、Body `synchronize/checked` 和 Economy `bound` 的 `ready` 准入。在 Body 换绑及关闭的旧快照写前、Economy `prepare` 及库写守卫、Plan 控制及 store 写前复核。资料写走现有记录库门禁。Memory 在绑定、连接、工具和归档入口用现成准入，后台整理失败回写前再拦；便携日志在旧队列实际落盘前检查原 Repo。`src/living/plan/plugin.ts:120-134,203-212,532-542`、`src/living/body/plugin.ts:155-160,191-194,370-381`、`src/living/economy/plugin.ts:79-111,264-271`、`src/core/records.ts:57-64,77-85`、`src/core/native/memory.ts:31-63,135-178,189-214`、`src/core/native/conversation.ts:339-349,388-392`、`src/memory/batch.ts:15-27,90-115`、`src/core/native/transcripts.ts:205-239`
- **设置与普通聊天**　在设置 RPC 分发前拒绝伙伴操作，保留 `snapshot`。设置页显示「需要迁移」、固定码及对应的离线操作提示，省去初始化、绑定和保存控件。Core 原生准入无作用域时保留 `next()`，伙伴提示词、召回、工具与完整日志副本停用，DSH 仍处理自己的会话和原始日志。`src/console/settings.ts:70-79,234-260,392-402`、`src/console/client.js:28,980-989,1114-1145,1176-1189`、`src/core/native/agent.ts:45-51,163-192,211-216`、`src/core/native/transcripts.ts:40-42,290-303`

**提交和允许修改的文件**

每提交可构建并通过相关快测，限 15 文件、600 行。`dist/src/**` 和工具收紧的基线随提交，不计阈值。`src/core/workspace.ts`、`scripts/migrate/**` 为高风险。若需要改 `src/core/storage.ts`，停下对齐。`AGENTS.md:49-64`、`docs/plans/stage2a-merge.md:569,772`

1. 共用版本与日志校验。`src/core/storage-migration.ts`（新）、`scripts/migrate/{context,io,journal}.mjs`、`scripts/migrate/steps/0001-storage-manifest.mjs`。`scripts/migrate/context.mjs:24-33`、`scripts/migrate/journal.mjs:14-75`
2. 离线 `0002` 与 CLI 回归。`scripts/migrate/{runner,errors}.mjs`、`scripts/migrate/steps/0002-home-identity.mjs`（新）、`arch/storage.json`、`tests/migrate/migration-child.mjs`、`tests/migrate/{normal,metadata-normal,compatibility,settlement,rollback,crash,concurrency,journal-exists,refusals}.test.mjs`。1B 专测用例显式选 `0001`，完整 CLI 按真实步骤集断言。`tests/migrate/migration-child.mjs:10-32`、`tests/migrate/normal.test.mjs:15-40`
3. 工作区与模块门禁。`src/core/{index,plugin,runtime,preferences,workspace}.ts`、`src/core/native/transcripts.ts`、`src/contracts/common.ts`、`src/living/{body,economy}/plugin.ts`、`src/memory/batch.ts`、`tests/core/workspace.test.ts`、`scripts/fixtures/synthetic-companion.mjs`、`tests/migrate/{helpers,offline-helpers}.mjs`、`tests/behavior-list/entries-lifecycle.test.mjs`。先显式初始化真正空的合成工作区，再注入旧数据形状。`src/core/index.ts:13-25`、`scripts/fixtures/synthetic-companion.mjs:39-77`、`tests/behavior-list/entries-lifecycle.test.mjs:37-54,215-228`
4. 设置入口与显示。`src/console/{settings.ts,client.js}`、`tests/core/settings.test.ts`。`src/console/settings.ts:337-388`、`tests/core/settings.test.ts:78-119`
5. 共享 home 切换及镜像。`src/core/{workspace,companion-foundation}.ts`、`src/core/tables/companion-ports.ts`、`src/living/plan/{plugin,home-store}.ts`（`home-store.ts` 新）、`arch/storage.json`、`tests/core/companion-foundation.test.ts`、`tests/living/living-lifecycle.test.mjs`、`tests/behavior-list/index.json`。`docs/plans/stage2a-merge.md:544-547,565`、`tests/core/companion-foundation.test.ts:88-108`
6. 入口联跑与回退证据。`tests/behavior-list/{entries-lifecycle,families}.test.mjs`、`tests/migrate/home-flow.test.mjs`、`tests/migrate/home-rollback.mjs`（后两者新）。`tests/behavior-list/entries-lifecycle.test.mjs:160-192,230-265`、`tests/behavior-list/families.test.mjs:125-194`、`tests/migrate/rollback.test.mjs:18-55,74-101`

- 提交 2 改动的 1B 迁移测试只把步骤集显式选成 `0001`，原断言不放宽。提交 3 列了 14 个文件，执行中超过 15 文件或 600 行就停下拆分，不预先声明超阈值。
- 回退演练用的 `v0.2.0` 检出由执行方在临时目录 `git worktree add --detach <临时目录> v0.2.0`，再按 `docs/development.md` 的恢复命令装依赖。这是本仓库自己的旧版本，不属于上游材料。`home-rollback.mjs` 不叫 `*.test.mjs`，`verify` 不会自动收集，合并前由 Claude 单独跑一次。

本批范围到 home、迁移门禁和受影响入口。`economy.initialized`、`setMeta/close` 归第 5 批，第三层切新契约归阶段 3。vendor、备份器、包导出和发布流程只作取证。`docs/plans/stage2a-merge.md:446-465,655-676`、`AGENTS.md:55-63`

**声明和文档**

- `home-identity` 改指 `.chatpet/data/core/core.sqlite#records`，`owner/containerOwner/writers` 为 Core，`selector` 为 `table: records, kind: companion-home`，证据指向新读写方法。`life.writers` 去掉 `core`，移除 `life.json` 的 Core 证据，协议写明 Plan 独占镜像和待迎接。`control.json` 的显式初始化建空文件仍如实记在其位置说明。以 R5 报告核对 Core 对 `life.json` 读写清零，架构棘轮只减不增。`arch/storage.json:38,42`、`src/core/initialization.ts:74-76`、`scripts/arch/check.mjs:16-19,44-52`、`docs/architecture.md:139`
- 推荐 Claude 合并本批时改两句，避免归属表晚于代码。「共享 home 身份和待交接标记归第一层，Core 按绑定写 `companion-home`，迁移从旧镜像复制 ID。」「计划区独占 `life.json` 的 ID 镜像与待迎接，交接以镜像落盘为准。」同时更新开发说明的迁移能力描述，完整升级和回退文档归第 6 批。`docs/architecture.md:182,186`、`docs/development.md:68-70`、`docs/plans/stage2a-merge.md:684-698,765`

**入口验收与快测**

- `tests/core/companion-foundation.test.ts:88-108` 将旧写盘断言改为 Core 记录和延后镜像。用真实 Cordis 夹具归档旧 home，阻塞上游唤醒的原生 `create`，让前台并发进入，检查只建一次、同一 ID，再注入创建和 Core 提交失败。`tests/behavior-list/entries-lifecycle.test.mjs:55-76,160-181`、`vendor/dsh-world/lib/life/runtime.js:556-571`
- `home-flow.test.mjs` 复用 `fixture/offlineFixture`、真实设置 RPC 和 Cordis。自动验证未迁移时初始化、重绑、保存三路及绕行写入被拒，逻辑记录和文件保持原值，普通 DSH 会话可回复。退出合成宿主，迁移并重开，验证聊天、真实 Bank 召回及原 home。原样复跑 1A `2A1A-07`，在 G9 的同一合成绑定迁移后复跑 `2A1A-18`，保留原操作号、单次施效、单次结算和续行断言。`tests/migrate/helpers.mjs:22-47`、`tests/migrate/offline-helpers.mjs:11-39`、`tests/core/context-contracts.test.ts:173-190`、`tests/behavior-list/families.test.mjs:125-194`
- `home-rollback.mjs` 自动演练两份备份，复用现有恢复夹具和隔离检出的 `v0.2.0` 实际代码。恢复旧包、旧数据和旧绑定后再跑聊天、召回和 home，核对送达、额度、花费保留。本批主人过目合成结果。第 6 批给主人做 RC 版本页换包、隔离 DSH 原生检查、真实副本升级回退和正式包激活。`tests/migrate/rollback.test.mjs:18-55,74-101`、`docs/development.md:91-117`、`docs/plans/stage2a-merge.md:702-707,787-794`
- **快测**　`pnpm run build && pnpm run check:arch && node --test tests/arch/storage-locations.test.mjs`。按提交加 `node --test tests/migrate/*.test.mjs`、`node --check src/console/client.js`、`node --test dist/tests/core/{workspace,settings,companion-foundation,context-contracts}.test.js tests/living/living-lifecycle.test.mjs tests/behavior-list/{entries-lifecycle,families,index}.test.mjs`。回退演练用 `HER_WORLD_020_ROOT=/path/to/v0.2.0 node --test tests/migrate/home-rollback.mjs`。Memory 用允许本机回环的环境，合并前跑 `pnpm run verify` 和 `pnpm run test:behavior-list`。`AGENTS.md:49-54`、`package.json:91-92,125-127`、`docs/plans/stage2a-merge.md:776-794`

---

## 第 5 批：`economy.initialized` 迁移

**现状**：Economy 在 Core 的 `meta` 写 `economy.initialized:<storageId>`（`src/living/economy/plugin.ts:79-81,94-96`）。Body、Economy 和初始化的文件清单都拿它当「已采用 Economy」的证据（`src/living/body/plugin.ts:143`、`src/living/economy/plugin.ts:89,228`）。代码注释写明它故意放在独立的容器里，`economy.sqlite` 丢了旧钱包也不能复活（`src/living/economy/plugin.ts:87-89`）。

**难点**：只把标记搬进 `economy.sqlite`，库丢了标记也一起丢。另外两个现有证据都不够：`data/economy/storage.json` 和库在同一个目录（`src/living/economy/store.ts:45,81`），整目录丢失时一起没了；身体检查点的 `economyGardenAuthority` 只在 Body 接上过经济端口后才写（`src/living/body/room.ts:146-147`），Economy 可以在 Body 从未加载时初始化和交易。

**做法**（拍板点 10）：

- 标记搬进 `economy.sqlite` 的 `meta`，由 Economy 自己的存储写入（满足完成标准）。
- 另加一个**钱包区负责、和 Economy 目录分开、按绑定持久化**的独立证据：`.chatpet/data/living/economy-adoption.json`，内容 `{storageId, companionId}`，原子写。首次采用（新建库、从旧菜园迁入、初始化重试）时先写它再建库。
- 运行时的「已采用」判定：独立证据 **或** `economy.sqlite` 的标记 **或** `storage.json` **或** 身体的 `economyGardenAuthority`。任一成立而库缺失就拒绝，不建空库、不导入旧菜园。
- 迁移步骤 `0003-economy-marker`：
  - 只处理 key 里的 `storageId` 等于当前绑定、值里的 `companionId / path` 也对得上的那一条；Core 里还有别的 `economy.initialized:*`，或者唯一一条对不上当前绑定，就停下（原因码），由主人决定。盘点（`scripts/migrate/inventory.mjs:29` 现在只报有没有）改为报条数和是否属于当前绑定。
  - 离线写入只打开**已存在、身份和 schema 都对**的库，不走会 `mkdir`、建表、导入旧菜园的初始化路径（`src/living/economy/store.ts:34-107`）。库缺失或身份不对就停下。
  - 顺序：写库内标记 → 写独立证据 → 两者都耐久后删 Core 的键。完成判定三件事都成立。续做能区分「从未采用」（Core 没键、目标都没有）和「源已删、目标缺失」（不可能出现的不一致，报错停下）。
- 两个 Store 重复的 `setMeta / close`：`CoreStore`（`src/core/storage.ts:165-167,201-206`）和 `EconomyStore`（`src/living/economy/store.ts:127,466`）逻辑相同（访问性和写法略有差异）。抽成第一层的一个小函数（例如 `src/core/sqlite.ts`），两边调用，行为不变。

**测试**：从未加载 Body、整个 `data/economy/` 丢失、空壳库、旧菜园存在、错误绑定，五种都拒绝复活旧钱包；缺库拒绝的现有测试（`tests/behavior-list/domains.test.mjs:98-104`）断言不改；「身体效果已生效、库存结算失败后重启」在迁移前后一致，扩展 `tests/migrate/settlement.test.mjs:12-55`；R5 报告里 Economy 不再写 Core 的 `meta`。

**开工前要定的细则**：独立证据的确切路径（`living/` 目录是否同时承载以后第二层的其他小文件）；`arch/storage.json` 的登记。

**高风险文件**：`src/core/storage.ts`（只改上面两处）、`scripts/migrate/**`。

**回退**：同第 4 批，用换包前的回退备份恢复，里面有 Core 的标记。

---

## 第 6 批：收尾

**文档**（Claude 写，Codex 只做链接和行号核对）：

| 位置 | 改什么 |
| --- | --- |
| architecture.md 2.1、2.3、5.4 | 第二层目录、区和实例；`CompanionRoom` 的位置 |
| architecture.md 第 4 节、`arch/storage.json` | home 身份、镜像、`economy.initialized`、独立证据的拥有者和写入协议 |
| architecture.md 5.2、5.6.1 | 第二层对外契约的定义处；概念细表里的路径（只改路径，不改结论） |
| architecture.md 5.8 登记者表、5.8.6 | 按新位置重写行号对照，删掉 `9a0d1dd → c057df9` 的旧对照 |
| architecture.md 5.9.1 | `environment`、`interactions` 的登记处改到第二层；测试列补上 1A 的契约测试 |
| architecture.md 6.2 | 去掉「待核」，换成合并后的新表和证据测试；1A 差异清单的结论 |
| architecture.md 7.2、7.4、第 9 节 | 两份备份的用途、多轮迁移的定稿做法；P3 标「2a 部分完成」（概念统一属 2b） |
| product.md | 2a 完成标准勾选、第一层违规去向表、已知问题 5/7/8、故障家族、G5 表、典型修改 1 |
| decisions.md | 本方案里改了既有决定的几条：常驻实例的创建方式、相册工具、三入口全卸载、需要迁移模式、Economy 独立证据、home 镜像、基线改键 |
| `AGENTS.md` | 一页入口的模块表；「新增东西去哪里登记」里的第二层登记口和生活出口 |
| `docs/development.md` | 升级和回退的完整步骤、迁移命令、多轮日志、`migration-required` 的处理 |

**度量**：在 2a 合并后的 `main` 上开 `codex/m4-measure-1-garden`，把小萝卜生长时间改 10 小时、售价改 4，只度量不合并，按 [development.md](../development.md#baseline-counting) 计数，目标只动第二层。kind/action 字符串判断复测，不应多于 283 / 104 点。

**主人**（和 M3 的 C、D、E 批同样做法，顺序按拍板点 6）：

1. 推送 `main` 后发 `0.3.0-rc.1`。
2. 隔离环境：从 npm 0.2.0 起，先做回退备份，再用版本页换到 RC，看到「需要迁移」，停 DSH 迁移，启动并激活；跑 `test:native-services`、`test:native-room`、`test:native-channel-homes`；盘点仓库外有没有代码用到删掉的 `desktopRest()`。
3. 真实数据副本（独立设备）：直接升级被拒到需要迁移；迁移后可用；已撤回的记忆仍不可见，伙伴身份和便携存储 ID 不变；缺库、坏 JSON、软链接、异身份仍不建替代；结算守恒；用回退备份把旧包、旧数据、旧绑定一起恢复，0.2.0 聊天和召回正常，送达、额度和花费按 7.2 处理。崩溃续做的证据是合成副本上的测试加真实副本记录，边界写明。
4. RC 冻结后的 `main` 发 `0.3.0`，隔离环境装一次正式包确认能激活，再升级日常机器。

---

## 特殊情况

- **空状态**：没有绑定时第一层只开聊天，实例照样建，三个区都等绑定。新装不需要迁移，直接写最新清单。
- **失败**：迁移任一步失败，日志记 `failed`，用 `--resume` 续做；原始数据可由本段已验证的备份恢复；固定原因码输出，不打印原始错误。
- **取消**：迁移可以在两步之间取消；已完成的步骤靠目标状态判定。
- **旧数据兼容**：不做读时兼容，未迁移就进「需要迁移」模式。
- **装载顺序**：配置顺序是 `22 → 25 → 40`，中间隔着 Desktop 和 PetPlatform（`cordis.patch.yml:8-17`）；3B 的 R6 测试按六种实际激活顺序跑。
- **打包后能否运行**：`verify` 里的包检查验证新的 `exports` 目标；三条原生检查在第 6 批用临时数据跑。
- **CI 偶发失败**：已知问题 9 在扩展迁移测试时再出现，按 G3 记一批，第二次失守提前复盘，不靠重跑放过。

## 概念与扩展检查

**新增或修改的概念**

| 概念 | 拥有者 | 写入者和验证 | 为什么需要，对应哪个用户场景 |
| --- | --- | --- | --- |
| 常驻实例 `LivingWorld`（三个区的登记处） | 第二层 | 三个入口登记和撤销；R6 测试 | 完成标准「常驻实例和旧服务名门面」；场景 3（她有自己的生活） |
| 第二层对外契约（快照含钱包视图、命令、事实流、`world.changed`） | 第二层 | 3E 的入口级测试 | 完成标准「第二层对外只有四样」；场景 2（桌宠和 Room 里看到她在做什么） |
| 生活出口登记 | 第二层提供，Desktop、Channels 登记；同一文件另有 Desktop 读 Life 持久启用意图的读口 `readLifeEnabled` | 3D 的测试 | 清 Life 读第三层的 4 条；场景 2、4 |
| 第一层的登记口：身体可用、只读活动接口、Life 自带相册、正在看电视、仍是运行中的 Life home | 第一层提供，第二层和 Room 登记 | 3C 的测试 | 清第一层 18 条，遵守「向上用登记」；场景 1、3 |
| Memory 的 `requestReviewCompaction` | 第一层·记忆 | 3C 的测试 | Memory 不再订阅上层事件；场景 1 |
| 持久 kind `companion-home`（含 `arrivalPending`） | 第一层·身份与绑定 | Core 唯一写入；登记进 `arch/storage.json` | 完成标准「home 身份拆到第一层」；场景 1、4 |
| `life.json.homeSessionId` 镜像和 `greeting` | 第二层·计划区 | 第二层唯一写入（上游运行时经包装 store） | 上游运行时需要 |
| Economy 独立证据 `economy-adoption.json` | 第二层·钱包区 | 钱包区唯一写入；登记进 `arch/storage.json` | 保住「缺库拒绝」；场景 3 |
| 「需要迁移」状态和原因码 `migration-required` | 第一层·身份与绑定 | 4 批的拒绝路径测试 | 未迁移数据不被新代码写坏 |
| 多段迁移日志、冻结的历史清单 | 迁移工具 | 1B 的落盘边界测试 | 第二轮迁移 |
| 迁移与恢复共用的互斥文件 `/tmp/her-world-offline-<uid>/<仓库路径 sha256>.sqlite`（1B 新增，主人已同意保留） | 迁移工具与 `companion-backup restore` | 只有本检出的 `run`、`restore` 持有；`tests/migrate/concurrency.test.mjs`、`rollback.test.mjs` | 恢复会替换整个 `.chatpet/`，仓库内的迁移锁守不住「迁移进行中做恢复」 |
| 基线「搬家改键」 | 架构检查 | 3A 的工具测试 | 搬目录不让基线失效 |

**词表**：2a 的设计约束是不新增封闭集合、不统一词表（统一留给 2b）。用 R8 报告核对过（`node scripts/arch/check.mjs --report`，`2128d01`）：R8 1061 条，其中 653 条带三个生活目录的路径，`src/behavior/room.ts` 167 条、`src/life/plan.ts` 110、`src/life/plugin.ts` 64、`src/life/plan-tools.ts` 59 最多；3C 搬动的 `review-dialogue.ts` 带 6 条，`companion-foundation.ts` 涉及 8 条。3A、3C 只改键，条数不变。kind/action 字符串判断 283 / 104 点，第 6 批复测不应增加。新加的原因码、`companion-home` 等常量各只定义一处。

**复用的已有声明**：来源适配表、工具声明表、能力状态表和它们共用的登记租约（`src/core/tables/registry.ts`）；`registerWorldPrompt / registerWorldContext`；`acknowledgePromptFacts`；`CompanionFactSource`；`BehaviorSnapshot`；`ContractError`；`registerInitializer`；前台 home 的单飞入口 `resolveCompanionHome`；迁移骨架的锁、日志、备份、原子写和 SIGKILL 夹具；`tests/migrate/settlement.test.mjs` 的跨迁移结算夹具。

**层间接口变化**：第一层多了上表的登记口、Memory 的一个调用、home 记录的读写方法和串行创建入口；第二层多了对外契约和生活出口登记；三个旧服务名的方法除 `desktopRest()` 外不变。`./contracts` 导出不拆。

## 拍板记录

**必须现在拍板**

1. **第二层的目录名** — 推荐：`src/living/`，内分 `body/`（原 behavior）、`plan/`（原 life）、`economy/`，实例在 `src/living/index.ts`。理由：`living` 已是架构文档里第二层的代号；`world` 被第一层的 `src/world/` 占了，`life` 和现有区重名。备选：不搬目录，在 `layers.json` 里把三个目录声明成一个模块；省掉 3A 的改名和 `exports` 改动，但扫描器现在只认单个 `root`（`scripts/arch/lib/rules.mjs:7-9`），也要改，而且 decisions.md 2026-11-16 的「目录合并」要改。决定：按推荐。
2. **常驻实例由哪个入口创建** — 推荐：三个入口共用一个登记处，谁先加载谁建、最后一个卸载时释放；每个区留在自己入口的作用域里；键包含服务隔离域；登记用已有的租约表。理由：6.2 原推荐「由 `25-Behavior` 创建」本身不必然带停其他区，但只要把共享资源挂在 Body 的作用域上就会；共用登记处让「卸载哪个只停哪个」不依赖实现上的小心。备选：按 6.2 原推荐由 `25-Behavior` 创建，资源所有者另行分开。决定：按推荐。
3. **合并后「卸载哪个入口会关闭哪个内部区」** — 推荐：和现状矩阵（architecture.md 6.2）逐格相同，以 1A 实测的现状为准（1A 的差异清单由主人另定），另加一行「三个入口全卸载：实例释放，表现见拍板点 8」。验收是 1A 的入口测试在 3B 后断言不改继续通过。决定：按推荐。
4. **6.2 的「待核」项怎么补测试** — 推荐：1A 在旧代码上用真实入口和真实 Cordis 卸载补入口级测试，固定真实观察到的行为；有三项源码已显示可能和 6.2 的说法不符（Body 缺席的整个暂停周期、Economy 缺席跨暂停的结算、暂停后在途回顾撤权），测出来不符就列差异清单交主人。决定：按推荐。
5. **搬家时的基线** — 推荐：给 `check:arch` 加受限的「搬家改键」（`--write-baseline --move`）：按对照改路径、按引用方新位置重解析 import，改写后必须与新扫描一一对上；工具和 `AGENTS.md` 规则在 3A 的第一个提交里，先于任何搬家。理由：基线身份含文件路径（`scripts/arch/lib/ratchet.mjs:5-9`），653 条 R8 带这三个目录，`--write-baseline` 只能删。备选：拍板点 1 选「不搬目录」。决定：按推荐。
6. **升级、回退和未迁移的数据** — 推荐：
   - 升级：0.2.0 下停 DSH，用现有 `companion-backup` 做**回退备份**（记录 0.2.0 的包指纹）→ 启动，版本页换 0.3.0 → 0.3.0 进入「需要迁移」模式，只开普通聊天、拒绝一切伙伴数据写入 → 停 DSH，从与安装版本同标签的仓库跑迁移（迁移器每段另建**同包续做备份**，只用于同一个 0.3.0 包下的续做）→ 启动。
   - 回退：启动 DSH，版本页换回 0.2.0 → 停 DSH → 用回退备份恢复（包指纹对得上）→ 启动。
   - 理由：换包只能经版本页，0.3.0 一定会先在未迁移的数据上启动一次；恢复器要求包指纹一致，一份备份同时满足不了续做和回退；启动时自动迁移已被否决；读时兼容是兜底。
   - 备选 A：随包发布迁移命令（改 `files`，高风险）。备选 B：读时兼容旧位置（兜底，要另行同意）。
   - 决定：按推荐。
7. **多轮迁移的四项** — 推荐：(a) 日志多段追加，头里写本轮步骤集、源和目标版本、绑定，`--resume` 要求步骤集一致；不另建归档文件，备份和盘点不用登记新路径。(b) v1 清单冻结进步骤表，清单随步骤推进；「已知历史清单」只判能否开始，「目标已完成」看步骤自己。(c) 每段一份同包续做备份，回退另用换包前的回退备份（见 6）。(d) 恢复带回的旧锁按陈旧锁接管并记日志；补「同时接管」和「迁移中恢复」两个并发拒绝。决定：按推荐。
8. **三个生活入口全部卸载时** — 推荐：接受第二层提供的东西一起消失：`chatpet.environment` 和 `chatpet.interactions` 两段；记录库里只有活动的日期；有日记那天正文里的活动部分。1A 先测住现状，3C 改成新断言。理由：这些都归第二层；全部卸载是主人有意关掉生活世界，聊天和记忆不受影响，相册按拍板点 9 也不受影响。备选：第一层保留「没有共享身体」提示和活动记录的只读兜底，要说明理由并经同意。决定：按推荐。
9. **相册工具** — 推荐：`album-tools.ts` 搬进 `src/core/`，Core 继续挂载；门控改为第二层登记的「此会话由 Life 自带相册」和 Room 登记的「此会话正在看电视」两个判定；工具只拿记录库给的受限句柄。理由：它只依赖第一层和 vendor，相册属于第一层记录库；Life 没加载、三入口全卸载都不丢相册。和完成标准表的字面（「搬到第二层」）不同，违规照样清零。备选：照字面搬到第二层，三入口全卸载时没有相册（并入拍板点 8）。决定：按推荐。
10. **`economy.initialized` 的独立证据** — 推荐：标记搬进 `economy.sqlite`，另加钱包区自己的独立证据文件 `.chatpet/data/living/economy-adoption.json`（和 Economy 目录分开、按绑定）；迁移只处理属于当前绑定的那一条，其余情况停下对齐；两份新证据都耐久后才删 Core 的键。理由：只搬进库，整目录丢失时旧钱包能复活；身体检查点的标记在 Body 从未加载时不存在。备选：Core 标记保留为只读的旧证据（兜底），新采用另写独立证据。决定：按推荐。
11. **home 身份记录** — 推荐：身份（`sessionId`）归 Core 的 `companion-home` 记录，两条创建路径收到第一层一个串行入口；`life.json` 的 `homeSessionId` 和 `greeting` 由第二层维护（镜像加待迎接），第二层不在时 Core 记 `arrivalPending`、第二层启动时消费一次；迁移只复制身份、不动 `greeting`。理由：上游运行时读写这两个字段，vendor 不能改；只复制让回退备份天然可用。需要同时改 architecture.md 第 4 节「生活世界只读」的说法。决定：按推荐。
12. **「第二层对外只有四样」在 2a 怎么落** — 推荐：3E 在 `src/contracts/` 定义并实现四样（快照加钱包只读视图、命令、事实流、`world.changed`），挂在已有门面上、不新增服务名；旧服务名的其余成员作为阶段性兼容门面，第三层改用新契约放到阶段 3。R1–R4 对第二层全绿照常要求。理由：完成标准同时要求门面落地，第三层的读取在阶段 3 才治理。备选：2a 就让第三层只用四样（会把阶段 3 的大量第三层改动拉进 2a）。决定：按推荐。

**推荐即可，有异议再说**

13. **事件** — 推荐：`pet/behavior.changed`、`pet/life.changed`、`pet/economy.fact` 在 2a 保持现状（是阶段性兼容接口，保留异步通知和重试语义）；区之间的事件改直接调用留给 2b；`pet/life.review` 在 3C 退休。决定：按推荐。
14. **`test:native-memory`** — 推荐：先修，两轮修不好就删，断言搬进 `tests/memory/native-memory-flow.test.mjs`。决定：按推荐。
15. **提交阈值** — 3A 的三个搬家提交预先声明超过 15 个文件，每个提交后都能构建、跑门禁；其余各批按阈值拆提交；`dist/src/**` 和改键后的基线不计入，照常提交。决定：按推荐。

## 验收

**每批的快测**（编码途中只跑 `pnpm run build` 和 `pnpm run check:types`）：

| 批 | 快测 | 合并前门禁 |
| --- | --- | --- |
| 1A | `pnpm run build && node --test tests/behavior-list/index.test.mjs dist/tests/core/context-contracts.test.js tests/behavior-list/entries-lifecycle.test.mjs tests/behavior-list/families.test.mjs` | `pnpm run verify`；`pnpm run build && pnpm run test:behavior-list` |
| 1B | `node --test tests/migrate/*.test.mjs`；`pnpm run test:native-memory`（修好时） | 同上 |
| 2 | 见第 2 批方案 | 同上 |
| 3A | `node --test tests/arch/*.test.mjs`；`pnpm run check:arch` | 同上；逐文件看补丁 |
| 3B | `pnpm run build && node --test tests/behavior-list/entries-lifecycle.test.mjs` 和 `src/living` 的 R6 测试 | 同上 |
| 3C、3D | `pnpm run check:arch`；1A 的契约测试；`pnpm run test:life-integration` | 同上 |
| 3E | 契约的入口级测试；受影响测试 | 同上 |
| 4、5 | `node --test tests/migrate/*.test.mjs`；新步骤的演练和拒绝路径测试 | 同上 |
| 6 | 文档链接和行号核对 | 同上；三条原生检查 |

Memory 测试要监听本机回环，在不允许回环的沙箱里失败要换地方重跑，不能记成通过（AGENTS.md）。

**G9 真实流程**「计划步骤 → 身体 → 经济结算 → 重启恢复」：1A 写成 L1、在旧代码上全绿；**3B 合并后经由常驻实例通过算交付**；第 4、5 批迁移后复跑。

**手动（主人）**：第 2 批的隔离机换包一次；第 4、5 批的合成副本演练结果过目；第 6 批的 RC、隔离环境升级和回退、真实副本演练、发版。

**验收会话**：每批用 skill-review-accept 在另开的会话里验收；Codex 沙箱写不了 git 时由 Claude 代提交，并在提交说明里注明。

## 执行结果

### 第 1 批 · 1A 旧行为取证

- 1A 补了 15 项测试。`tests/core/context-contracts.test.ts` 覆盖 5.9 的新增契约证据，`tests/behavior-list/entries-lifecycle.test.mjs` 覆盖 6.2 的入口装卸、暂停和全卸载。
- `tests/behavior-list/families.test.mjs` 加入 G9，真实 Life 输入调用计划工具，SQLite 拒绝首次库存结算后按原编号跨重启补结算，身体效果和账本各一次，计划自行续行。
- `tests/behavior-list/index.json` 登记 15 项新测试和 3 项既有确认顺序测试，新增索引的 `l1Stage` 均为「阶段 2」。
- 入口测试复用 `policy-host.mjs`，通过真实 Cordis 安装和卸载入口，使用 DSH 工具、提示词与会话服务。模型循环、工作区注册和会话文件持久化由合成宿主驱动。
- 1A 快测按验收表执行，构建通过，30 项通过、0 项失败。
- `pnpm run build && pnpm run test:behavior-list` 通过，索引检查 11 项、行为清单 70 项，失败 0 项。
- `pnpm run verify` 的环境、类型、架构检查及构建通过。Node 测试 1431 项通过、1 项失败。Memory 的 `P2 owned service/client: ready, scoped replay, actual exit and restart` 在等到服务就绪后读取 RSS 时遇到 `spawnSync /bin/ps EPERM`（`tests/memory/memory-process.test.mjs:81`），本轮未观察到回环监听失败。
- `verify` 到 Node 测试阶段停止，Python 测试、发布检查和打包校验由 Claude 在沙箱外完整重跑。实机验收留待后续批次。
- 建议 Claude 代提交第 1 组（1 个文件、439 行），`tests/behavior-list/entries-lifecycle.test.mjs`。提交说明「固定三个生活入口的旧装卸行为，为合并保留生命周期证据」。
- 建议 Claude 代提交第 2 组（4 个文件、475 行），`tests/core/context-contracts.test.ts`、`tests/behavior-list/families.test.mjs`、`tests/behavior-list/index.json`、`docs/plans/stage2a-merge.md`。提交说明「将上下文契约和 G9 恢复证据纳入阶段 2 行为门禁」。

### 1A 差异清单

| 说法或待核项 | 真实行为 | 证据 |
| --- | --- | --- |
| 6.2 说暂停区间不长作物，Body 缺席整个暂停周期待核（`docs/architecture.md:562`）。 | 12 小时成熟的作物在卸载 Body 时已长 2 小时。Body 缺席期间暂停 4 小时再启用，重载后进度是 6/12，暂停时间也计入。Life 持久化的是当前开关，Body 重载时读到已启用的意图。 | `tests/behavior-list/entries-lifecycle.test.mjs:321`、`src/life/plugin.ts:105`、`src/life/plugin.ts:479`、`src/behavior/plugin.ts:66`、`src/behavior/room.ts:228`、`src/behavior/room.ts:264` |
| 6.2 说先结算启用区间再暂停，Economy 缺席时的结算待核（`docs/architecture.md:562`、`docs/architecture.md:564`）。 | 卸载 Economy 后权威菜园返回不可用，Body 暂停时跳过菜园写入。启用 2 小时、暂停 4 小时后恢复 Economy，首次查询进度同为 6/12。 | `tests/behavior-list/entries-lifecycle.test.mjs:324`、`src/behavior/room.ts:157`、`src/behavior/room.ts:228`、`src/economy/store.ts:427` |
| 6.2 说暂停停止回顾，在途回顾是否撤权待核（`docs/architecture.md:575`）。 | 暂停拒绝新的回顾准入，并取消已准入的原生轮次，原信号上的读写中止。在轮次收尾前独立复核文件权限时，已准入的租约仍有效，原日期日记可读写。 | `tests/behavior-list/entries-lifecycle.test.mjs:384`、`src/life/plugin.ts:307`、`src/life/plugin.ts:475`、`src/life/plugin.ts:531`、`src/life/tool-policy.ts:104`、`src/core/life-review-files.ts:25` |
| 5.9 的「原样 JSON」需要明确匹配粒度（`docs/architecture.md:493`）。 | 确认要求固定段名、正文包含该段文本、逐条事实投影结构相等。JSON 重排键或增加空白仍能确认，投影值不同则保留待确认回执。 | `tests/core/context-contracts.test.ts:72`、`src/core/interaction-presentation.ts:21` |

### 1A 第一轮返工

- 夹具为未指定 ID 的会话生成新 ID，2A1A-07、2A1A-11、2A1A-18 验证 home 只创建一次。2A1A-11 推进时钟后核对 Life 消费原 `operationId` 的完成回执并推进游标。执行工具前断言 `tools/pre-execute` 返回 `allow`，2A1A-05 在第二轮模型回调中检查替换。
- 1A 快测 30/30 通过。`pnpm run build && pnpm run test:behavior-list` 首次因 `dist` 短暂缺失退出，重跑后构建、索引 11/11、行为清单 70/70 均通过。
- `pnpm run verify` 通过环境、类型、架构和构建检查。Node 测试 1431 项通过，1 项在 `tests/memory/memory-process.test.mjs:81` 遇到 `spawnSync /bin/ps EPERM`。本轮未观察到回环失败，Python 测试及发布、打包检查留待 Claude 在沙箱外完整重跑。

### 第 1 批 · 1B 迁移工具

- 问题 5：绑定检查和盘点共用 SQLite 私有复制，保留 WAL，由副本重建 SHM。实测 `plan`、`status`、锁外停写检查及 `manifest-mismatch` 拒绝均保留源目录文件和 mtime，双进程预检通过。
- 调用方：迁移先查 Core 停写、锁内复核全部写入者，盘点查 Core、Economy、Memory 停写。备份 CLI 和 `backupPlan` 间接使用新绑定读取，创建与恢复照常走停写检查。安装器的绑定读取拒绝外部活跃 Core，应用阶段仍用原停写门禁。合成生成器同进程同步读取，复制前后核对源文件状态。
- 多轮：冻结 v1，追加带步骤版本、绑定、备份地址及哈希的日志段，识别 0.2.0 单段日志。按实际目标推进清单，续做拒绝不同契约，已完成目标缺失时报不一致。迁移与恢复 CLI 在仓库外共用 SQLite 互斥，回带旧锁可接管，PID 复用拒绝。
- 四处 SIGKILL 均通过：备份后写日志头前、数据提交后推进清单前、清单推进后写完成记录前、记录完成后目标丢失。合成回退检查了两种包指纹、Core 绑定、工作区登记、原生日志、投影、附件、设备引用，以及送达、额度和 Life 花费。已验同时接管旧锁及迁移与恢复双向拒绝。
- 问题 7：复现发现首次启用 Memory 后夹具缺 Bank，第二轮补初始化后 P3-01 至 P3-05 通过，原脚本仍因近期播放未显式启用而失败。按两轮止损删除脚本及 npm 入口。基线调用原夹具时读取了本机安装 profile 的组合元数据，后续两轮切到合成 profile，会话和 Bank 使用合成数据。
- 门禁改验真实 Core 工具和 Memory provider，覆盖同轮纠正与独立保存、旧提取拒绝、后续可见、撤回恢复、长回复精读、归档、失联确认及播放关联。删掉旧 Core 账本的三条断言和已装 DSH 回合级的模型计数、文件工具联跑、进程掉线降级断言。
- `node --test tests/migrate/*.test.mjs` 134 通过，新增 Memory 门禁 3 通过，构建及行为清单 52 条通过。回环用例实际通过。Python provider 22 项、发布检查及临时包校验另行通过。
- `pnpm run verify` 的 Node 测试 1429 通过、1 失败。 `tests/memory/memory-process.test.mjs:72` 的 P2 进程用例在第 81 行测 RSS 时报 `spawnSync /bin/ps EPERM`，由 Claude 在沙箱外重跑。真实副本和实机换包未验。`offline-backup.mjs` 的只读 SQL 已使用临时副本，`portable-repo.mjs` 的设备搬迁直读属本批授权之外，留待单独处理。
- 建议提交 1「将原生 Memory 回归移入门禁」· `package.json`、`scripts/checks/check-native-memory.mjs`、`tests/memory/native-memory-flow.test.mjs`（3 文件，588 行）。
- 建议提交 2「将 SQLite 绑定检查和盘点移到私有副本」· `scripts/lib/repo-storage.mjs`、`scripts/migrate/inventory-plan.mjs`、`scripts/migrate/inventory.mjs`、`tests/migrate/read-only.test.mjs`（4 文件，160 行）。
- 建议提交 3「支持多轮离线迁移并与恢复互斥」· `scripts/companion-backup.mjs`、`scripts/migrate/companion-migrate.mjs`、`scripts/migrate/context.mjs`、`scripts/migrate/errors.mjs`、`scripts/migrate/io.mjs`、`scripts/migrate/journal.mjs`、`scripts/migrate/runner.mjs`、`scripts/migrate/steps/0001-storage-manifest.mjs`（8 文件，420 行）。
- 建议提交 4「验收迁移的崩溃边界、并发与回退」· `tests/migrate/concurrency.test.mjs`、`tests/migrate/crash.test.mjs`、`tests/migrate/lock-gate.mjs`、`tests/migrate/migration-child.mjs`、`tests/migrate/normal.test.mjs`、`tests/migrate/rollback.test.mjs`（6 文件，386 行）。
- 建议提交 5「更新离线迁移说明和 1B 执行记录」· `docs/development.md`、`docs/plans/stage2a-merge.md`（2 文件，28 行）。所有改动留在当前工作区，由 Claude 代提交。

#### 第一轮返工

- 已收尾段按 `storageId` 核对，未收尾段续做核对原路径和原备份。`status` 新增 `segment`，已收尾目标缺失时显示 `inconsistent`，续做以 `migration-inconsistent` 拒绝。合成用例覆盖搬家、第二轮中断和清单落盘后尚未写完成记录。
- Memory 门禁通过合成宿主触发 `turn/end`，验证确认丢失时回合仍完成并记录故障，重启后按原观察 ID 补账。
- 合成验证中迁移 136/136、Memory 门禁 4/4、构建及行为清单 52/52 通过。`verify` 的 Node 测试 1432 通过、1 失败，原因是 `tests/memory/memory-process.test.mjs:81` 遇到 `spawnSync /bin/ps EPERM`，由 Claude 在沙箱外重跑。

### 第 3 批 · 3A 第一个提交（改键工具）

- `scripts/arch/` 新增 `--write-baseline --move <对照文件>`，用导入语法树核对 R1 新位置的相对路径，复用 multiset 比对，两份基线均一一对应才写入。
- `AGENTS.md` 只更新基线规则。新增 7 项合成测试，实现前均因 CLI 尚无 `--move` 而失败。
- `node --test tests/arch/*.test.mjs` 39/39 通过。`pnpm run check:arch` 通过，60 / 1061，新增和消失均为 0。`pnpm run build` 通过。
- 计算式导入仍按原表达式核对，需改写计算式本身的情况会被拒绝。三个搬家提交等待另一条分支合并；本次未搬源码、未改仓库基线，未读真实数据。
- 建议提交说明「支持纯搬家时严格改写架构基线键（Claude 代提交）」。

### 第 3 批 · 3A 身体区搬家

- 将 `src/behavior/` 的 8 个文件移到 `src/living/body/`。逐个比对确认迁入文件只调整跨目录导入，外部引用、Room 资源、动画生成、`./25-Behavior` 导出目标、测试路径及文档链接均指向新位置。
- `arch/layers.json` 和 `arch/storage.json` 由 `living` 承接身体区，沿用原存储路径和 `dataVersions.behavior`。按主人补充确认，`tests/arch/storage-locations.test.mjs` 两行断言中的三个模块 ID 改为 `living`，保留严格相等检查、夹具逻辑和旧容器的 `life` 归属。
- `pnpm run check:arch -- --write-baseline --move <对照文件>` 完成改键。`pnpm run check:arch` 通过，基线 60 / 1053，新增和消失均为 0。
- `pnpm run build` 与 `pnpm run check:types` 通过。随构建同步 `dist/src/`，隔离编译确认五个额外的 `.d.ts` 差异仅是等价的联合类型成员排序。
- `node --test tests/arch/*.test.mjs` 39/39 通过。`node --test dist/tests/behavior/*.test.js tests/behavior-list/entries-lifecycle.test.mjs` 80/80 通过。
- `pnpm run build && pnpm run test:behavior-list` 通过，索引 11/11，行为清单 87/87。另核对现有包入口可导入、两条 Room 模块资源 URL 均返回迁入产物。
- 验证使用合成夹具。全量 `pnpm run verify` 留到合并前。改动留在工作树，由 Claude 代提交。
- 建议提交说明「搬迁身体区到 `src/living/body/` 并同步引用和架构基线」。

### 第 3 批 · 3A 计划区搬家

- 将 `src/life/` 的 16 个文件（含 `control-file.ts`）移到 `src/living/plan/`。路径归一后逐文件比对一致。同步 `dist/src/`、`./40-Life` 导出目标、回顾资源、调用方和文档路径，由 `living` 承接 Life 的服务、事件和存储声明。
- `pnpm run check:arch -- --write-baseline --move <对照文件>` 与 `pnpm run check:arch` 通过，基线 60 / 1053，新增和消失均为 0。`node --test tests/arch/*.test.mjs` 39/39 通过。
- `pnpm run build`、`pnpm run check:types` 通过。`pnpm run build && pnpm run test:behavior-list` 的索引 11/11、行为清单 87/87 通过。`node --test dist/tests/life/*.test.js tests/behavior-list/entries-lifecycle.test.mjs tests/behavior-list/families.test.mjs` 120/120 通过。
- 另核对编译后的 `40-Life` 入口和 `review-alarm.md` 资源路径。回顾、工具声明、播放上下文及合成迁移补测 72/72 通过。验证使用合成夹具。
- 搬家前 `6ad0387` 上已复现两处 Body 旧相对导入错误（`tests/regressions/mapped-refused-movement.test.mjs:27`、`tests/regressions/mapped-sleeping-inventory.test.mjs:29`），均指向不存在的 `dist/src/living/core/index.js`。Body 路径修复需单独确认范围。全量 `pnpm run verify` 留到合并前。
- 建议提交说明「搬迁计划区到 `src/living/plan/` 并同步引用和架构基线」。改动留在工作树，由 Claude 代提交。
- `playback.js` 搬到 `dist/src/living/body/` 后，回归测试指向 Core、Channels、Desktop 和 Room 的相对路径少退一级。已修正 `tests/regressions/` 下 `mapped-channel-path-binding.test.mjs`、`mapped-group-name-wake.test.mjs`、`mapped-platform-admission.test.mjs`、`mapped-playback-carriers.test.mjs`、`mapped-playback-feedback.test.mjs`、`mapped-playback-tap.test.mjs`、`mapped-refresh-convergence.test.mjs` 的 17 处路径。

### 第 3 批 · 3A 钱包区搬家

- 将 `src/economy/` 的 7 个文件搬到 `src/living/economy/`，按导入解析位置归一后逐文件核对一致。同步 14 份构建产物、`./22-Economy` 导出目标、包内校验、脚本和测试路径，核对包入口可导入。
- 身体、计划、钱包三区由 `arch/layers.json` 的 `living` 模块统一登记。同步第三层依赖及 `arch/storage.json` 的所有者，沿用原数据路径和版本键。R5 夹具通过源码路径维持跨模块写入场景，容器路径和归属仍做严格比较。
- 基线按 `pnpm run check:arch -- --write-baseline --move <对照文件>` 改键。`pnpm run check:arch` 通过，基线 60 / 1053，新增 0、消失 0。全仓 `git grep` 确认代码引用指向新位置，包括两处从 `playback.js` 解析的 `../economy/`。
- `pnpm run build`、`pnpm run check:types` 通过。`node --test tests/arch/*.test.mjs` 39/39 通过。`pnpm run build && pnpm run test:behavior-list` 的索引 11/11、行为清单 87/87 通过。
- `node --test dist/tests/economy/*.test.js tests/economy/*.test.mjs tests/regressions/*.test.mjs` 548/548 通过。验证使用合成夹具，改动留在工作树，完整门禁和提交由 Claude 处理。
- 建议提交说明「搬迁钱包区到 `src/living/economy/` 并同步引用和架构基线」。

### 第 3 批 · 3B

- `src/living/index.ts` 复用 `RegistrationTable`，按 Cordis 根、Core 对象和隔离标签登记三区。`body/plugin.ts` 将可选服务观察改为按租约观察，卸载时停计时和订阅，再保存检查点。
- `plan/{plugin,plan,review}.ts` 核对跨区租约，卸载时取消原生 home 轮次并等待队列和回顾 I/O。`economy/{plugin,access}.ts` 撤初始化器和文件守卫，取消解析并等跨区请求收尾，再关库释锁。入口同步抛出挂载错误，由 Cordis 等同一清理函数。
- `arch/layers.json` 登记 `internal/status` 并移除 `living` 的三个旧服务读取声明。已同步 `dist/src/living/`，三个门面仍提供原对象和原有方法。
- `tests/living/living-lifecycle.test.mjs` 新增 25 项 R6，覆盖六种实际装载顺序、三种先卸载、隔离、同名重挂、挂载回滚、晚到任务和清理。`tests/behavior-list/{entries-lifecycle.test,fixture}.mjs` 只接夹具，1A 测试主体及全部断言逐字核对一致。
- `tests/behavior/{behavior-scheduling,garden-clock-continuity}.test.ts`、`tests/life/{life-body,life-clock-intent,life-core-integration,life-desktop-integration,life-domain-integration,life-sleep-continuity}.test.ts` 接入显式端口或登记替身。
- `tests/regressions/{audit-r5-garden-clock,mapped-refresh-convergence,mapped-refused-movement,mapped-sleeping-inventory}.test.mjs`、`mapped-playback-context.test.ts` 及 `scripts/fixtures/synthetic-companion.mjs` 只改端口接线。
- 实现前单跑 R6 的 4 个场景，2 过、2 失败，确认旧 Plan 回调晚到写盘和 Economy 解析未取消。实现后细则第一组快测 68/68（含 R6、1A 和 G9），第二组 182/182，`node --test tests/migrate/settlement.test.mjs` 2/2。
- `pnpm run build`、`pnpm run check:types`、`pnpm run check:arch` 通过，规则 60、词表 1053 均无增减。`pnpm run build && pnpm run test:behavior-list` 通过，索引 11/11、行为 88/88。
- 验证仅使用合成数据。改动留在工作树，`pnpm run verify` 与提交由 Claude 处理。以下四组已在临时源码副本逐组通过构建、两组快测、架构和迁移结算测试，各组的 `dist/src/**` 随源码提交且不计阈值。
- 第 1 组「登记三入口」。加入 `index.ts`，三个 `apply` 接登记但保留原读法，`arch/layers.json` 先登记 `internal/status`。附共享夹具的装载接线与 R6 排列、隔离用例。8 个文件，约 428 行。
- 第 2 组「切换身体区读取与观察」。附 Body 端口夹具、旧 Plan 观察和实际计时器用例。15 个文件，328 行。
- 第 3 组「切换计划区读取与退场」。附 Plan 端口夹具、原生 reader 探针及用例。11 个文件，约 347 行。
- 第 4 组「切换钱包区读取与退场」。附 Economy 端口夹具、文件解析和挂载失败用例，移除旧 `reads`。11 个文件，约 395 行。本小节可单独提交。
- 第 2 组的 `tests/regressions/room-refresh.test.mjs` 超出开工细则允许修改的名单。该文件只给 Body 原型夹具接上 `LivingView`。Room 回归 6/6、两组快测 68/68 和 182/182、行为清单 88/88 通过。

#### 返工一轮

- 必须修 1 已修。`close()` 立即关闭准入并等待队列，已入队的 `control(false)` 按原绑定、挂载代和 Body 租约完成暂停。重挂后读到 `paused` 和 `resumeOnEnable: true`，重新启用按原 `operationId` 恢复 Body 及剩余时长。继续使用 `control.json` 现有字段。`src/living/plan/plugin.ts:114,125,184,336,545,615`、`src/living/plan/plan.ts:176,283`、`tests/living/living-lifecycle.test.mjs:375`
- 必须修 2 已修。原生 home 的 `store.write` 和 `appendWake` 按绑定及运行代放行，退场代的写入权限到 `runtime.settled()` 完成为止。重新绑定或同名重挂会挡住旧代写入，同一标签上的新登记代次保留到清理结束。新用例验证等 Body 和运行时收尾两个窗口的 `life.json` 花费都增加，重挂以及替代实例再卸载后旧回调的花费都没有写入。`src/living/index.ts:67,76,154`、`src/living/plan/plugin.ts:192,202,229,357`、`tests/living/living-lifecycle.test.mjs:428`
- 修前 `node --test --test-name-pattern '^3B ' tests/living/living-lifecycle.test.mjs` 为 0 通过、2 失败。暂停用例的 `ERR_ASSERTION` 报 `plan: 'active'`、`receipt: 'running'`、`resumeOnEnable: undefined`。花费用例报 `pausing: false`、`settling: false`，两个窗口都未增加花费。收尾探针核对运行时撤掉的原生监听器后，用返工前的两个编译模块复核，仍为 0 通过、2 失败。
- `pnpm run build && node --test tests/behavior-list/{entries-lifecycle,families,domains}.test.mjs tests/living/living-lifecycle.test.mjs dist/tests/core/tables-registry.test.js && pnpm run check:arch` 通过。测试 70 通过、0 失败，含原 25 项 R6 和新增 2 项。架构规则 60、词表 1053，均无增减。
- `node --test dist/tests/behavior/{behavior-scheduling,garden-clock-continuity}.test.js dist/tests/life/{life-body,life-clock-intent,life-core-integration,life-desktop-integration,life-domain-integration,life-sleep-continuity}.test.js dist/tests/regressions/mapped-playback-context.test.js tests/regressions/{audit-r5-garden-clock,mapped-refresh-convergence,mapped-refused-movement,mapped-sleeping-inventory,room-refresh}.test.mjs tests/migrate/settlement.test.mjs` 为 190 通过、0 失败。
- `pnpm run build && pnpm run test:behavior-list` 通过。索引 11 通过、0 失败，行为 88 通过、0 失败，含需要本机回环的 Memory 用例。
- 返工共 8 个文件。`src/living/plan/plugin.ts` 约 114 行，`src/living/index.ts` 约 35 行，`tests/living/living-lifecycle.test.mjs` 约 146 行，本方案约 15 行。构建同步 `dist/src/living/{index,plan/plugin}.{js,d.ts}` 4 个文件约 173 行。1A 入口测试文件与返工前逐字一致，验证均使用合成目录中的真实 Cordis 入口。
- 建议一个提交，说明「修复计划区显式暂停和卸载收尾时丢失的暂停回执与 home 花费」。改动留在 `codex/2a-3b-instance` 工作树。

### 第 3 批 · 3C

- 01 回顾对话搬入 Core，更新 Memory 和测试引用。3 个文件，12 行（+6 / −6）。`review-dialogue` 快测 1/1。
- 02 相册工具搬入 Core，更新 Core、Life 引用和相册证据路径。4 个文件，10 行（+5 / −5）。工具声明、相册和入口快测 34/34。
- 03 生活三区登记环境、互动事实和活动只读接口，在原生落盘后复核绑定、三区租约和准备结果再确认。14 个文件，571 行（+441 / −130）。契约、入口和 R6 快测 81/81，另跑菜园时钟 8/8。
- 04 Core 与 Life 共用受限相册句柄，经登记保住 home 和电视门控。Life 与 Bridge 直调回顾整理。15 个文件，243 行（+203 / −40）。整理、相册门控和工具声明快测 33/33，重跑第 3 组 81/81。
- 行数为增删之和，排除 `dist/src/**` 及基线。逐组临时副本的 `pnpm run build`、`pnpm run check:arch` 和细则快测全部通过。
- 旧实现红测确认查询创建缺失活动目录、Economy 旧准备进入证据、Plan 重挂后旧轮次确认事实，以及受限相册和直调入口缺席。各用例在对应组通过。
- `pnpm run check:types`、`pnpm run test:life-integration`（171/171、940/940）、`pnpm run build && pnpm run test:behavior-list`（索引 11/11、行为 88/88）通过。
- `pnpm run check:arch -- --report` 核对第一层 23 → 22 → 21 → 9 → 5，最终仅剩细则指定五条；全仓 R1–R4 为 60 → 42，R8 为 1053，零新增。
- 无范围偏离。按拍板更新 2A1A-17，`policy-life` 原断言沿用。缺目录用支持的旧版合成清单验证，共享登记仅在 Core 原生作用域可用时接线。验证只用合成数据。
- 四组补丁在 `/tmp/her-world-3c-patches/`，从 `13ae820` 顺序应用后纳入补丁的文件与工作树逐字节一致。Claude 在沙箱外执行 `pnpm run verify`。

#### 返工一轮

- 先加 `2A1A-19`，用合成 Cordis 会话自然写入原生快照，卸载三区后重启夹具，再打开磁盘上的同一会话。修复前按名称单跑，0 通过、1 失败，脚本模型收到的历史仍含 `chatpet.environment` 和 `chatpet.interactions` 的旧文本。原事件、其他生产方的段和普通回复断言已通过（`tests/behavior-list/entries-lifecycle.test.mjs:143,807,843`）。
- 根因是退休逻辑只认当前 Agent 登记过的动态段名。同进程卸载会把旧 Agent 的值置空。三区缺席时，新 Agent 从磁盘恢复了旧快照，却没有这两个登记键（`src/core/native/prompt.ts:27,175`、`src/living/index.ts:94`）。
- 使用范围例外修改 `src/core/native/prompt.ts:27`。在现有 `agent/request` 路径中让这两个段名以空值参与退休，活跃登记覆盖默认空值，沿用位置替换来保留原生日志与其他生产方的段。Living 和 Core 共用环境段名，互动段复用已有常量（`src/core/native/agent.ts:181`、`src/living/prompt-context.ts:43`）。
- Economy 重挂用例临时观测三次，三次都触发重组并读到新租约的事实。现固定断言环境和互动段均出现、互动 JSON 含新事实 ID，并保留下一轮确认的断言（`tests/living/living-lifecycle.test.mjs:56`）。
- 3C 有意加入两处行为变化。Plan 的 `afterReview` 在 main 已有的 `active()` 和 `compactAfterReview` 门控上加了 `!this.running()`，Life 暂停时回顾完成会直接返回（`src/living/plan/plugin.ts:226`）。Memory 的 `run` 因换绑或取消未实际消费批次时保留回顾标记，待成功消费后清除（`src/memory/batch.ts:104`）。
- 手写改动 6 个文件，94 行（+84 / −10）。`src/core/native/prompt.ts`（+9 / −1）、`src/living/prompt-context.ts`（+2 / −2）、`tests/behavior-list/entries-lifecycle.test.mjs`（+45 / −4）、`tests/behavior-list/index.json`（+9）、`tests/living/living-lifecycle.test.mjs`（+4 / −3）、本方案（+15）。
- 随行构建产物 3 个文件，18 行（+13 / −5）。`dist/src/core/native/prompt.d.ts`（+1）、`dist/src/core/native/prompt.js`（+10 / −3）、`dist/src/living/prompt-context.js`（+2 / −2）。
- `pnpm run build && pnpm run check:arch` 通过。规则 42、词表 1053，新增和消失各 0。
- 指定的 12 文件 `node --test` 快测通过 115 项，失败 0 项。本机回环上的 Memory 用例通过。
- `pnpm run test:behavior-list` 索引通过 11 项、行为通过 89 项，失败均为 0。
- `pnpm run check:types` 通过。另跑 `node --test dist/tests/core/dynamic-context.test.js`，通过 1 项、失败 0 项。
- 建议一个提交。标题草稿 `2a-3c: 退休重开会话中的旧生活快照`。正文草稿「三区全卸载后，新 Agent 会从历史恢复过期的环境与互动快照。在请求投影中退休这两段并保留原生日志，补上重开会话回归与 Economy 重挂的确定断言。」

### 第 3 批 · 3D

- 01 登记 WebM 读取器为动画映射生成源。1 个文件，2 行（+1 / −1）。共同快测 43/43，WebM 52/52。
- 02 用 `RegistrationTable` 接 Desktop 的暂停、恢复和呈现，复用 Plan 租约读取持久启用意图。10 个文件，358 行（+299 / −59）。共同快测 46/46，桌宠、身体和三区生命周期快测 53/53。
- 03 Channels 登记送达出口，原样转发带 `deliveryId` 的 `push`。6 个文件，80 行（+77 / −3）。共同快测 47/47，Channels 快测 11/11。
- 每组在临时副本执行 `pnpm run build && pnpm run check:arch` 和细则对应的 `node --test`，均通过。03 快测首跑因副本缺 `.venv` 有 1 项失败，补齐后原命令通过。
- 红测确认 WebM 归属未登记、探测抛错中断 `reach_out`、同名 Channels 服务未登记也被误认送达。保留 1A 入口和契约断言，验证使用合成数据。
- 每组用 `pnpm run check:arch -- --write-baseline` 收紧。`--report` 核对 `living` 5 → 4 → 1 → 0，最终 R1–R4 全零，R8 1053 条且无新增。
- `pnpm run check:types` 通过。`pnpm run test:life-integration` 通过 171/171、940/940。`pnpm run build && pnpm run test:behavior-list` 通过索引 11/11、行为 93/93。
- 桌宠探测或呈现抛错时保留原告警并继续尝试 Channels，原先探测抛错会中断送达。其余按细则执行。文件数和行数均排除 `dist/src/**` 和基线。
- 三补丁在 `/tmp/her-world-3d-patches/`，按序应用到 `aed7f27` 后与工作区版本文件逐字节一致。门禁由 Claude 在沙箱外运行。
- 返工一轮：`scripts/checks/check-native-life.mjs:70-82` 改动 14 行（+13 / −1）。3D 将 `reach_out` 切到生活出口，因此原名单外的这份原生夹具也需要登记。用 `scope.effect` 登记合成桌宠，呈现时记录气泡并返回成功，卸载时撤销。Life 已经通过登记查找桌宠，移除了无调用方的 `petDesktop` 替身。原有断言逐字保留。验证在临时副本执行。
  - `pnpm run build && pnpm run check:arch` 两条命令通过，0 失败。架构规则 37 条、词表 1053 条，均无增减。
  - 指定的 `node --test` 快测 163 通过、0 失败、0 跳过。
  - `pnpm run test:behavior-list` 索引 11 通过、0 失败，自动行为 93 通过、0 失败。3 条 L3 手工验收未运行。
  - `pnpm run test:native-life` 试跑 1 次，前置构建通过，Electron 启动后命令以 1 退出。原生断言未运行，原因：临时 `DSH_HOME` 缺少桌面 profile，`mountInstalledStandard` 报 `ENOENT: no such file or directory, open '<临时 DSH_HOME>/profiles/desktop/package.json'`。原生断言 0 通过、0 失败，`bubbles` 未验证。

## 审查结论

### 1A 第一轮验收（Codex 审查 + Claude 核实）

**必须修**

1. `tests/behavior-list/entries-lifecycle.test.mjs:161-165` 夹具里，不带 `sessionId` 的 `sessionController.create()` 固定返回 `home`，已有同名会话时直接复用。上游 home 新建正好走这条路（`vendor/dsh-world/lib/life/home.js:65` 的 `host.createSession(...)` 不传 ID）。结果是暂停、卸载、重启后就算代码新建了一个 home，也拿到同一个 ID，2A1A-07、2A1A-18 等「同一共享 home」断言照样通过。第 4 批要改 home 的创建路径，这张安全网必须能拦住这种情况。改法：不带 ID 的创建每次分配新 ID（Room、guest、`f.agent()` 显式传 ID 的保持不变）；在 home 相关测试里断言恢复时没有再新建会话。
2. `tests/behavior-list/entries-lifecycle.test.mjs:314-318`（2A1A-11）里，重新加载后的断言（Life 在运行、计划还是原 `operationId`、Body 回执还是 `running`）在卸载前就成立，证明不了方案 1A 表要求的「重新加载后按原 `operationId` 继续」。改法：重新加载后推进时钟，让原步骤走到完成边界，断言 Life 消费的是同一编号的完成回执、游标前进。

**建议修（不影响合并，返工时可以一起做）**

- `tests/behavior-list/entries-lifecycle.test.mjs:126` 丢掉了 `tools/pre-execute` 的返回值。真实 DSH 管线会执行这个返回值给出的 `deny`、`cancel`、`ask`（`@deepseek-ai/dsh-tools` 的 `lib/pipeline.js:386-404`）。现有的 `src/` 处理器都是记下拒绝原因、交给守卫执行，所以差异清单第 3 行今天仍然成立；但以后要是改成用返回值拒绝，2A1A-16 会误报成功。最低改法：断言 `gate.kind === 'allow'`，否则按拒绝处理。
- `tests/core/context-contracts.test.ts:116-120`（2A1A-05）的可见历史是在整轮结束后才检查的。在第二轮的模型回调里检查旧环境和旧召回已经不可见，才能证明替换发生在模型拿到请求之前。
- 夹具 `cordisFixture` 是从测试文件 `entries-lifecycle.test.mjs` 导出的，然后被另外两个测试文件引用。以后有机会，把它挪到一个不叫 `*.test.*` 的夹具模块里（这次的允许修改名单里没有新夹具文件，所以这次不改）。

**核实结果**：范围在允许修改名单内，没有改 `src/`、`scripts/`；没有删测试、没有 skip、没有放宽断言；快测 30/30 通过；三个新文件都只用 `mkdtemp` 合成目录，不读本机 DSH profile 和家目录。

**种地时钟（已修复）**：2A1A-12、2A1A-13 原先固定的是「暂停区间也长作物」的现状（差异清单第 1、2 行，6/12）。主人决定在 3A 之前做 G3 复盘并单独修复，修复已合并（见 [product.md](../product.md)「故障家族」）。这两条的基准从 6/12 改成了 2/12，3B「断言不改继续通过」以 2/12 为准。

**复查（返工一轮后）**：必须修 1、2 已修好，两条建议修（工具准入返回值、2A1A-05 在模型回调里检查）也已做。快测 30/30 通过，`test:behavior-list` 70 条通过。种地时钟一项已单独修复，见上一段。

### 1B 第一轮验收（Codex 审查 + Claude 核实）

**必须修**

1. `scripts/migrate/journal.mjs:53-57` 对每个第 2 版日志段都要求 `binding` 完全相等，其中包括仓库路径摘要 `repoHash`。迁移日志在 `.chatpet/data/` 里，会随 Repo 一起搬走；而 `docs/portability.md:78-81` 支持把 Repo 复制到新路径、存储身份不变。这样，0.3.0 迁移过一次之后再换设备或换路径，`status`、`plan` 和下一轮 `run` 都会报 `binding-changed`，没有出路。改法：已经全部 `done/skip` 的历史段只核对 `storageId`；只有续做最后一个未收尾的段时，才要求原路径和原备份。日志头照常记录两者。这一条修订了方案 1B「绑定（`storageId` 和仓库路径的摘要）」的校验口径：记录不变，校验分成两种情况。
2. `scripts/migrate/runner.mjs:47-51` 在续做时，只有最后一段已经收尾才去核对上一轮的目标。如果第二轮中断，而上一轮完成的目标（例如清单）后来丢了，`--resume` 会把上一轮已完成的步骤当作没做过，再跑一遍。第 5 批的步骤会删掉源数据（Core 的 `economy.initialized` 键），重跑这类步骤会出错，甚至写出错误的证据。`status` 在这种情况下也会显示 `pending`，而不是 `inconsistent`。改法：`validateJournal` 同时记下最近一个已收尾段的步骤数；续做和 `status` 都先核对这些步骤的目标，缺了就报 `migration-inconsistent`；崩溃测试补上「第二轮中断加上一轮目标缺失」这一条。
3. `tests/memory/native-memory-flow.test.mjs:150-155` 只断言 `finishTurn` 抛错。原脚本断言的是「Memory 确认丢失或服务掉线时，原生回合照样完成」（原 `scripts/checks/check-native-memory.mjs:314,339`），这件事靠 `src/core/native/agent.ts:306-311` 的 `.catch` 隔离，现在门禁里没有别的测试覆盖（已用 `git grep` 核对 `tests/`）。按方案「门禁里没有的断言要搬过来」，补一条：用合成宿主驱动 `turn/end`，`finishTurn` 失败时回合仍然完成、Memory 标记为不可用，重启后按原观察 ID 补账。

**建议修（不影响合并，返工时可以一起做）**

- `scripts/migrate/runner.mjs:38-41`：如果最后一步的数据和清单都已落盘、`done` 还没写，`status` 会全部显示 `complete`，但新的 `run` 会报 `journal-exists`。真实副本检查点上，Agent 只看得到这份输出。建议在 `status` 里加一个段级状态（本轮是否已收尾），并在对应的崩溃边界测试里断言它。

**核实结果**：范围在允许修改名单内（`companion-backup.mjs` 拆成了 `main()` 并导出两个函数，见下面的拍板点）；快测 `tests/migrate/*.test.mjs` 加新的 Memory 门禁共 137/137 通过；新测试和新脚本都不读本机 profile 或真实数据（`tests/migrate/offline-helpers.mjs:14` 在临时目录里建合成 profile，Memory 门禁用 `mkdtemp` 根目录，用 `git grep` 核对过家目录、`HOME` 和 profile 路径）。在合成副本上从 CLI 跑了 `status`、`plan`，源目录保持不变；`run` 被 `dsh-running` 拒绝，因为主人的 DSH 正在运行，按规则不能停，所以 `run`、`restore` 没有实机走过，只由测试里的 mockDsh 覆盖。删掉的断言里，旧 Core 账本三条（原 `:177-180`，方案已经认定过期）、模型调用计数、文件工具联跑这几条删得合理；只有上面第 3 条要补回来。

**迁移与恢复共用的互斥文件**（方案外机制）：主人已拍板保留（2026-11-19），返工不用动它。理由：恢复会整个替换 `.chatpet/`，放在 `.chatpet/data/` 里的 `migration.lock` 守不住「迁移进行中做恢复」（方案 1B 锁的窗口 (c)）；用 SQLite 的 `BEGIN IMMEDIATE` 做互斥，进程被杀时会自动释放，不留陈旧锁；互斥函数放在 `scripts/companion-backup.mjs` 里，是因为它随包发布，而在 `scripts/lib/` 新建文件要改 `package.json` 的 `files`（高风险）。合并时由 Claude 补进方案的「概念与扩展检查」和 `docs/development.md`：路径是 `/tmp/her-world-offline-<uid>/<仓库路径 sha256>.sqlite`，目录权限 0700、只属于当前用户，只有本检出的 `run` 和 `restore` 会去拿；0.2.0 包里自带的 `companion-backup.mjs` 不拿这个互斥，所以回退恢复要用本检出的命令（`docs/development.md` 已经这样写）。

**合并时由 Claude 同步的文档和声明**

- `arch/storage.json:58` 的 `protocol` 和 `evidence` 还写着「`scripts/checks/check-native-memory.mjs` 仍按它断言」，这个脚本已经删了。
- `docs/portability.md:220-234`：`companion-backup plan/verify` 和 `install-dsh` 的预演（不带 `--apply`，`scripts/install-dsh.mjs:88,207`）现在遇到活跃的 Core 会拒绝，以前不会，要把这个前提写进文档。
- `docs/product.md` 已知问题 5、7 的状态，以及 `:382` 第一批的完成勾选。
- 两个分支都改了「执行结果」，合并第二个分支时两段都要保留。

**复查（返工一轮后）**：必须修 1–3 已修好，`status` 的段级状态（`segment`）也已加上。快测（迁移测试加 Memory 门禁）140/140 通过，`test:behavior-list` 52 条通过。`--resume` 遇到已收尾的段时改成不写任何日志（`tests/migrate/normal.test.mjs` 相应改断言），这是有意的行为变化，不算放宽断言。上面列的「合并时由 Claude 同步」各项照旧。

### 3A 第一轮验收（Codex 审查 + Claude 核实）

**必须修**：无。

**建议修（不影响合并）**

- `scripts/arch/lib/move.mjs:37-39`：R1 表达式由扫描器的 `normalize` 序列化，导入语句前带 JSDoc（如 `/** @see X */`）时，序列化结果已不能当 TypeScript 重新解析，`--move` 会把这条当成一增一减而拒绝改键。`scripts/arch/lib/move.mjs:78-83`：省略扩展名的 `require('../x/y')` 在 R1 里记的目标不带扩展名，对照用真实文件名对不上，同样拒绝。两处都是拒绝（不会放过错误的改键），现有 60 条基线里没有命中这两种写法的条目，2a 后续各批也不再整目录搬家。以后真碰上再修，届时补一条带 JSDoc、一条省略扩展名的搬家测试。
- `arch/baseline/writers.json` 仍有 52 处 `src/behavior|life|economy` 路径和旧模块名。它是只作报告、不参与棘轮的 R5 快照（[architecture.md](../architecture.md) 棘轮一段），现在没有生成脚本，按 AGENTS.md 又不能手改。建议第 6 批收尾时决定是删掉它，还是给 `check:arch` 加一个重新生成它的入口。
- `6ad0387` 单独检出时有 9 个回归测试失败（`3f32338` 已修，提交说明里写明了），不满足方案「每个提交后都能跑门禁」。分支没推送，可以改写历史，但只影响以后在这段历史上二分，建议不改写，记录在案即可。

**没有采纳的审查意见**：Codex 报 `tests/regressions/mapped-*.test.mjs` 在 `CHATPET_PLAYBACK_TEST_MODULE` 指向 main 的旧布局产物时会找不到依赖。这个环境变量在 `scripts/`、`docs/`、`.github/` 和 `package.json` 里都没有使用方，方案也没有要求新测试能跑旧布局的产物；测试只换路径，正是方案允许修改末尾那条补充的口径。不算问题。

**核实结果**

1. 纯搬家：31 个文件逐个和 main 原文件比对，差异只有相对 import 和 `src/living/plan/review.ts:13` 的资源路径多退一级；`review-writing.ts` 被 git 识别成删除加新增，内容也只差两行 `export … from` 的路径。行号没有变，所以文档里的 `文件:行号` 只需换路径。
2. 改键工具：R1 的 `expression` 不是字符串替换，而是先把模块说明符抽掉比对其余语法，再要求新扫描里的说明符从引用方新位置解析到搬家后的目标（`relativeImportShape` 里的 `resolveImport` 核对）；改写后与新扫描做 multiset 比对，多一条少一条都抛错。独立复核：把 main 的 `rules.json` 按目录前缀和模块名（`behavior|life|economy → living`）映射后，与分支的 60 条完全相等；`vocabulary.json` 1053 条连行列都一一对上；改写过的 3 条 R1 表达式按 `posix.join` 从新位置解析都落在 `target`。三项要求的测试（纯改名通过、改了作用域被拒、对照漏文件被拒）在 `tests/arch/baseline-move.test.mjs` 里。
3. `package.json`：只改了 `./22-Economy`、`./25-Behavior`、`./40-Life` 三个 `exports` 的目标，键不变；`files`、`imports` 没动；`pnpm run verify` 里的打包校验通过。
4. `tests/arch/known-violations.test.mjs` 的 R5 夹具：写入方从 `src/life/files.ts` 换成 `src/room/files.ts`，原因是三区并成 `living` 后，计划区写钱包区的库就成了模块内写入。换成 Room 后，8 个用例的期望里 `violation` 全部原样保留（7 个 `true`、1 个 `null`），只有 `economy.sqlite` 的拥有者从 `economy` 改成 `living`。测试原意（不含 `data/` 的通配只匹配自身路径、跨模块写入照样报违规）保住了，没有放宽。`tests/arch/storage-locations.test.mjs` 只改了模块 ID，严格相等和夹具逻辑不变。
5. `arch/storage.json`：`owner`、`containerOwner`、`writers`、`locations`、`moduleIds` 改成 `living`，`dataVersions` 的键和 main 完全一致。仓库代码里没有读取 `dataVersions` 的地方，所以 3A 不需要「数据版本键 → 模块」对照。
6. `arch/layers.json`：`living` 的 `services`、`publishes`、`subscribes` 是三个旧模块的并集，`reads` 三者本来就一样。按拍板点 1，三区成了一个模块，区和区之间的发布和订阅权限也跟着合并了，以后检查不再区分是哪个区在发。这是方案已经接受的后果。
7. 旧路径：`git grep` 查过（不含 `dist`、`vendor`、`references`、基线和方案），代码里剩下的 `../economy/` 等都是 `living` 内部的同级引用，或者是 `tests/behavior/` 测试目录（方案规定不搬）。
8. 运行：沙箱外，`pnpm run build` 之后工作区干净（`dist` 和源码一致）；`node --test tests/arch/*.test.mjs` 39/39；`pnpm run check:arch` 60 / 1053，新增 0、消失 0；`pnpm run verify` 1477/1477，打包校验通过；`pnpm run test:behavior-list` 索引 11/11、行为清单 87 条。
9. 和新 main 的关系：第 2 批已合进 main（`d7469c6`）。`git merge-tree` 试合并 3A 和新 main，没有冲突；第 2 批新增的代码和测试里没有 `src/behavior|life|economy` 或对应 dist 路径。合并时要在合并后的状态上重跑 `pnpm run verify` 和行为清单。

**合并时由 Claude 同步的文档**

- `AGENTS.md:13` 一页入口还写着「behavior · life · economy」，改成 `living`（body · plan · economy）。
- `docs/decisions.md` 里「目录合并」那条被搬家提交按路径替换成了「`living/body/`、`living/plan/`、`living/economy/` 合并成第二层一个实例」，意思变了。改回描述原来的三个目录并进 `src/living/`。
- `docs/product.md:102,105,106` 的度量表还写着第二层 `economy`、`behavior`、`life` 模块和 `src/behavior/plugin.ts`、`src/life/*` 路径。数字是当时测的，保留；模块名和路径加上现在的位置。

### 3B 第一轮验收（Codex 审查 + Claude 核实）

**必须修**

两条同一个根因：计划区把「还收不收新工作」（`isOpen()`、`enabled`）和「已开始的工作、当前运行代的记账还能不能落盘」用同一个检查拦了。main 上这两种情况都能落盘，3B 后会丢，违反本批「外部行为不变」和 [architecture.md 第 8 节](../architecture.md#8-生命周期规则)第 2 条「等已提交的写完成」。返工先各写一条会失败的测试（放进 `tests/living/living-lifecycle.test.mjs`，用 `cordisFixture`），再修。

1. **显式暂停被 Life 卸载打断，只留下半截**。`src/living/plan/plugin.ts:530-543` 的 `control(false)` 先把 `enabled:false` 写进 `control.json`，再进 `stopRuntime(true)`；`:335` 的 `guardArea(body)` 和 `:178` 的 `PersistentLifePlan` 当前性检查都带 `isOpen()`。如果 Life 在 `plan.control()` 等 Body 的 `inspectPlanned/pausePlanned` 时卸载，`validate()` 抛错：计划仍是 `active/waiting`，Body 回执仍是 `running`，不写 `resumeOnEnable`。main 上 `close()` 排在队列后面（旧 `close()` 是 `await this.enqueue(stopRuntime)`），这次暂停会走完。后果：重挂后开关是关的，但计划和身体活动没暂停；按相对时长冻结的活动（`freezeOnPause`）在关闭期间照样走时间，恢复时也不走「原编号恢复」的路径（architecture.md 6.2「显式暂停生活」一行）。验收：同一场景下重挂、重新启用后，计划是 `paused` 加 `resumeOnEnable`、Body 回执按原 `operationId` 暂停再恢复，和 main 一致。做法由 Codex 定：让已进入队列的暂停在卸载时照样走完（`close()` 本来就等 `this.serial`），或者把待完成的暂停记下来、重挂时补做；后者如果要给 `control.json` 加字段，就是改数据格式，先停下来对齐。
2. **暂停收尾期间，原生 home 的花费不落盘**。`src/living/plan/plugin.ts:201-205` 给上游运行时包的 `store.write` 要求 `active()`，而 `:184-188` 的 `active()` 包含 `this.enabled` 和 `isOpen()`。显式暂停在 `:536` 先把 `enabled` 置 false，再在 `stopRuntime(true)` 里等 Body 收尾，期间 home 在途的模型步骤落地，上游 `spent()`（`vendor/dsh-world/lib/life/runtime.js:955-964,1050-1051`）调 `store.write` 被拒，`record()` 只记一个故障，当天花费没进 `life.json`，之后的每日预算判断偏低。同理，`:347-356` 先把 `this.runtime` 置空再 `runtime.settled()`，收尾期间同一运行代的写入也会被拒。main 上 `store` 不包装，这些都落盘。要求：上游写入按「同一绑定、同一运行代、收尾完成前」放行，不按 `enabled` 和 `isOpen()`；同时保住 R6 已有的「旧运行代不写新绑定、同名重挂后旧代不写」。验收：在暂停等 Body 的窗口里投递一条带 `usage` 的 `assistant/message`，`life.json` 的 `spend` 增加。

**建议修（不影响合并，返工时可以一起做）**

- `tests/regressions/room-refresh.test.mjs` 不在细则的允许修改名单里（只补了一行 `living:new LivingView()`，确实只是接线），但「执行结果」写的是「无偏离细则」。改成如实写明这一处。
- `src/living/index.ts:157-167` 的 `withLivingCaller` 用模块级变量把调用方检查交给被调的区，只覆盖同步那一段：`readFactReferences` 这类异步函数在第一个 `await` 之后再调区，就不带调用方检查了（它们靠自己的 `validate` 参数兜着，现在没有漏洞）。2b 把区之间改成直接调用时，换成显式参数。
- `src/living/economy/access.ts:75,100`：Economy 卸载时正在核对路径的文件工具（包括和账本无关的文件）会收到 `cancel`。main 上是核对完就放行、守卫随后撤掉。细则要求「取消文件守卫」，R6 也测了，窗口只在卸载那一刻，接受，记在这里。

**没有采纳的审查意见**

- Codex 报「Body 卸载时，Life 首轮 `tick()` 等 Body 期间被租约检查打断，`startRuntime()` 不执行，闹钟和回顾要等下一个事件」（`src/living/plan/plugin.ts:381-384`）。main 上同样如此：旧 `tick()` 拿到 Body 后，Body 关闭时 `resumeAcceptedPlan` 或 `setReconsiderConditions`（main `src/living/body/plugin.ts:119-121,161-164`）照样抛错，同样跳过 `startRuntime()`。不是 3B 引入的。要不要单独修，由主人决定是否记进已知问题。

**核实结果**

1. **1A 入口测试**：`tests/behavior-list/entries-lifecycle.test.mjs` 的 diff 只在 `cordisFixture` 内（加 `order`、`io` 选项和 `fiber()` 读取），测试主体和断言与 main 逐字一致；`tests/behavior-list/fixture.mjs` 只给替身补 `Context.isolate`、`fiber`、`root` 和 `provide` 后发 `internal/status`。G9（`families.test.mjs`）通过。
2. **键和登记**：`src/living/index.ts:19-28,40-68` 外层按 `ctx.root`、再按 Core 对象取 `WeakMap`，内层按三个隔离标签逐项比较；槽按目标区自己的标签索引，读时要求租约有效且提供者 `ACTIVE`（`:78-85`）。复用 `RegistrationTable`，没有另写登记机制；同名重挂生成新 `Symbol`，旧 `revoke()` 先查 `isCurrent()` 不删新槽（`src/core/tables/registry.ts:29-30,66-68`）。R6 的隔离用例覆盖了只隔离 `petLife`、同标签重新可见、别的 Cordis 根和别的 Core 对象拿不到。
3. **服务名查找**：`src/living/` 里已没有 `get('petBehavior'|'petLife'|'petEconomy')` 和对应的动态 `inject`；第一层、第三层文件没有改动。三个 `provide` 交付原对象；事件名、载荷没改，`pet/life.changed` 只在旧运行代失效时不再发（`src/living/plan/plugin.ts:327,347`），属于本批要拦的晚到回调。
4. **卸载顺序**：每个入口只有一个卸载 effect，`settleCleanup` 同步依次调用 `revoke()` 和 `close()`，二者在第一个 `await` 前分别删槽、置 `closed`；另外区一离开 `ACTIVE`，别的区就读不到它（Cordis 先进 `UNLOADING` 再并行清 effect，`node_modules/@deepseek-ai/cordis/src/fiber.ts:700-722`），所以不依赖同级 effect 的先后。挂载失败走同一个幂等清理，R6 有 Economy 挂载失败用例。
5. **R6**：25 项 = 6 种顺序 × 3 种先卸载 + 7 项专项。断言的是 Cordis 事件钩子按 fiber 归零、身体计时、计划 tick 和上游闹钟句柄归零、卸载后投递事件不新建计时器、在途解析和 reader 计数归零、`economy.lock` 消失、已提交写入保留，不只是正常路径。把 R6 原样放到 main 的代码上跑：「旧 Plan 观察」「Economy 解析取消」「Economy 等设置请求」3 项失败（旧观察读了新 Plan 的时钟 6 次、解析信号没取消、设置请求没等就卸载），分支上通过，确认修在源头；「Life 等 reader」main 上本来就过，是防退化的用例。
6. **其余测试和合成夹具**：逐行看过 diff，都是把 `ctx.get` 替身换成显式端口或在对应域登记，没有改断言、没有删测试、没有 skip。
7. **运行**：`pnpm run build` 后工作区干净（`dist` 与源码一致）；细则快测第一组 68/68、`check:arch` 60 / 1053 无增减；第二组加 Room 回归和迁移结算 190/190。`pnpm run verify` 和行为清单本轮没有重跑，沿用驱动会话的 1521/1521、88 条，返工后合并前重跑。
8. **未手动验证**：没有在主人的 DSH 里实际装载和卸载三个入口；真实入口链路由 `cordisFixture` 的真实 Cordis 装载覆盖。

**合并时由 Claude 同步的文档**

- `docs/architecture.md:581-582` 的「现场按需 `get('petBehavior')`」「随 `petEconomy`、`petLife` 出现和消失运行的可选 `ctx.inject`」改成经 `LivingWorld` 读取和按租约观察；`:587`「常驻实例推荐由 `25-Behavior` 入口创建」已被拍板点 2 取代。

**复查（返工一轮后）**：必须修 1、2 已修好，建议修第 1 条（如实写明 `room-refresh.test.mjs` 超出名单）也已做。修法是把计划区的判断拆成两个：准入照旧看 `isOpen()` 和 `enabled`；已进入队列的显式暂停（`src/living/plan/plugin.ts:114-116,545-566`）和上游写入（`:202`，当前或收尾中的运行代、同一绑定、未被同名重挂取代）按绑定和运行代放行，同名重挂由 `src/living/index.ts:76-84` 的槽代次挡住旧代。新增 2 项放到返工前的代码上跑都失败（计划停在 `active`、回执 `running`、无 `resumeOnEnable`；两个窗口的花费都没增加），返工后通过；其中花费用例还断言了重挂后、替代实例再卸载后旧回调都写不进去。1A 入口测试文件与返工前一致，没有删、skip 或放宽测试。快测第一组 70/70、`check:arch` 60 / 1053 无增减，第二组 190/190，`test:behavior-list` 索引 11/11、行为 88 条；沙箱外 `pnpm run verify` 1523/1523。

另记一处范围外的小变化：`synchronize()` 改用 `isCurrentBinding()` 后，绑定未变但伙伴 `companionId` 变了也会重新绑定（`:126-131,170`）。main 上这种情况运行时本来就因 `companionId` 不符而不启动，现在改为换绑后按新身份启动，不算放宽，记在这里。

### 3C 第一轮验收（Codex 审查 + Claude 核实）

**必须修**

1. **三区全卸载后，已有会话里的旧环境段和互动段快照仍作为有效历史送给模型**。main 上 `chatpet.environment`、`chatpet.interactions` 由 Core 无条件登记（main `src/core/companion-foundation.ts:200-248`），三区都缺席时环境段换成「没有共享身体」，旧快照会被 `retireDynamicContext` 按段名替换。3C 把两段搬到 `src/living/prompt-context.ts:43,86`，只在至少一个区对 Core 可见时登记（`src/living/index.ts:79-110,200`）。而 `retireDynamicContext`（`src/core/native/prompt.ts:25-35`）只认这个 Agent 当前登记过的段名（`dynamicValues`）。在进程内卸载时，`dispose` 会把已有 Agent 的值置空（`prompt.ts:160-168`），所以能退休；但三区都卸载后再出现的 Agent（重启 DSH、会话 Agent 销毁后重开）里没有这两个名字，旧快照原样留在 surface 上，模型会读到过时的身体、计划和互动事实。这违反拍板点 8「两段一起消失」，也是相对 main 的行为回退。2A1A-17 没测到：它在同一进程里卸载，走的是 `dispose` 置空那条路。
   - 要求：三区都缺席时，这两段在旧会话里的快照照样在 `agent/request` 里退休，只改投影，不动原始日志；其他生产方的段保持原样。做法由 Codex 定（例如 Core 记下这两个已知动态段名，缺席时按空值退休），不要为此在第一层重新读三个生活服务。
   - 验收：先写一条会失败的测试——一个已存有这两段快照的主人会话，三区全卸载，然后换一个新 Agent 或重启夹具，再走一轮；断言模型实际收到的历史里没有这两段，原生日志里原快照事件还在。放进 `tests/behavior-list/entries-lifecycle.test.mjs` 或 `tests/living/living-lifecycle.test.mjs`，用 `cordisFixture`。
   - 同类的既有缺口不在本条范围内：Economy 自己的 `chatpet.economy`（`src/living/economy/plugin.ts:292`）和 Emotion 的 `chatpet.expression-state`（`src/emotion/plugin.ts:234`）卸载后重开也会留旧快照，main 上就这样，不是 3C 引入的，另记。

**建议修（不影响合并，返工时可以一起做）**

- **隔离配置热更新不会让登记口跟着变**（Codex P2）。`src/core/tables/companion-ports.ts:42-46` 的 `scopeFor` 只在生产方挂载时比对一次隔离标签，读取时（`:50-53`）只核对租约。Cordis Loader 可以原地换掉某个入口的 `isolate` 映射、不重挂（loader `isolate()` 的 `swap`），之后 Core 对 Plan 的可见性变了，登记口却不变：home 可能同时出现两套相册，或回顾标记不触发提前整理。main 上 Core 每次都现取 `ctx.get('petLife')`，没有这个问题。不列为必须修，原因有两个：细则（「五个登记口」一节）写的就是「挂载时按隔离标签判可见、读取时核租约」，实现和定稿一致；3B 的 `LivingWorld` 也是挂载时定标签（3B 验收「核实结果」第 2 条），同属一类已接受的限制。建议在 architecture.md 5.10 或第 8 节写一句「改入口的隔离配置要重挂该入口」；要彻底解决，留到 2b 和 3B 的标签一起处理。
- `tests/living/living-lifecycle.test.mjs` 新增的「事实准备期间 Economy 重挂」用例里有一句条件断言（`if (sections.some(row=>row.name==='chatpet.environment')) ... else ...`），哪条分支都算过。建议固定成确定的一条：要么断言这一轮两段都缺席，要么断言重组后用的是新租约。
- `src/living/plan/plugin.ts:226` 的 `afterReview` 加了 `!this.running()`。main 上没有这个条件（细则写的是「保留」，不准确）：main 上 Life 刚好暂停时，回顾完成仍会发事件，Memory 留下一个标记，恢复后可能提前整理；现在不留标记。`src/memory/batch.ts:104-105` 也改成「run 没真正执行（换绑、取消）时保留标记」，这条细则写明了。两处都很小，请在「执行结果」里如实写明是有意的变化。
- `src/core/plugin.ts:39-45` 的相册门控现在返回稳定的 `photoTools`，不再在 `when` 里调用 `album()`，路径检查推迟到真正执行 `keep/list/forget` 时。坏路径下的表现从「工具不出现」变成「工具出现、执行报错」。可以接受，记在这里。

**核实结果**

1. **5.9 事务顺序**：两段仍经 `registerWorldContext` 在 Core 的原生作用域登记（`src/living/index.ts:94` 用 `companionPorts.bind` 给的 Core `ctx`），准备挂在 `system-prompt/assemble` 的前置 middleware 上，读取是同步的，准入、请求内替换由同一个 helper 负责；段名、顺序号 14/15 不变，互动段名仍用 `INTERACTION_CONTEXT`，确认仍走 `acknowledgePromptFacts`。事实轮次的 `agent/pre-step` 加了 `{prepend:true}`：main 上 Core 的这个 hook 在 `src/core/native/agent.ts:171` 先于 `onStep`（`:291`）登记，加 prepend 后仍排在原生准入外层，顺序和 main 一致。`registerWorldContext` 自己的 pre-step hook 现在排在 `onStep` 内层，但动态段不传 `admit`、也不设 `restart`，这个 hook 只是透传，顺序变化没有影响。`tests/core/context-contracts.test.ts` 没改，通过。
2. **1A 入口测试**：`entries-lifecycle.test.mjs` 只有 2A1A-17 一个用例有改动（`index.json` 同步了名字），普通回复、相册和日记原文的断言保留；按拍板点 8 改成两段缺席，活动只在全卸载时消失。G9（`families.test.mjs`）通过。
3. **两个纯搬家提交**：源码只改了 import 路径（`review-dialogue.ts` 4 行、`album-tools.ts` 2 行，外加 3 个引用方和 `arch/storage.json` 的证据路径）。按基线身份逐条比对：rules 60 → 59 → 58，各少一条对应的 R1，没有新增；vocabulary 1053 → 1053，改键后集合一致。第 1 提交的 rules diff 里另有 `living/plan/plugin.ts` 几条行号刷新，是 3B 后行号移动的结果，身份不变。
4. **第 3、4 提交**：rules 58 → 46（`companion-foundation.ts` 的 12 条 R2）→ 42（相册 2 条 R2、`batch.ts` 的 R3 和 R2），vocabulary 不变。五个登记口都用 `RegistrationTable`（`src/core/tables/companion-ports.ts:28-34`），读取时核对 `lease.isCurrent()`。缺省都和 main「服务不在」一致：身体 `false`；相册、电视、运行中 home 取 `undefined`，按假处理；活动返回 `[]`，属于拍板点 8 的变化。受限句柄冻结，只有 `keep/list/forget`，同一记录库里引用稳定（`src/core/records.ts:31-35`），有测试断言。Life 的上游运行时只把 `photos` 转给 `photoTools`（`vendor/dsh-world/lib/life/runtime.js:1011`），`photoTools` 只用这三个方法。电视期间 schema 隐藏、主人接管时仍隐藏，旧工具执行被拒，电视结束后恢复，都有测试覆盖。
5. **回顾整理**：`requestReviewCompaction` 仍只在 `memoryFor(id)` 有值时加标记；tick 里的「有待处理轮次、绑定匹配、无在途、空闲、`retryAt`、最短间隔」原样保留，只把 `ctx.get('petLife')?.isHome` 换成登记口。`policy-life` 的三处事件注入改成直调，断言逐字不变。`/bridge/compact` 的 503、403、两条 409 文案和忙时 202 后空闲整理，用真实路由处理器测过。
6. **活动只读接口**：`src/living/plan/activity-reader.ts` 缺目录时返回空，不建目录，不实例化 `createLifeStore`；读取用 `O_RDONLY|O_NOFOLLOW`，前后都核对 inode。2A1A-17 经记录库入口覆盖了「Life 卸载但 Body 在」「只挂 Economy」「三个都卸载」「重挂 Body」四种情况，也覆盖了查询缺失目录不建目录。
7. **第一层剩余**：`check:arch -- --report` 第一层 R1–R4 只剩 `core/companion-settings.ts:2`、`core/initialization.ts:5,12`、`memory/client.ts:55,56` 五条。`src/core/storage.ts`、`src/core/workspace.ts`、vendor、`package.json`、发布流程都没有改动。
8. **加载时序**：真实 DSH 里各插件一起加载。Cordis 先等一个微任务再执行依赖方的 `apply`（`_reload` 里的 `await Promise.resolve()`），Core 在同一个同步 effect 里先 `provide('petCore')` 再 `installNativeAdapter`，也就是先 `companionPorts.bind`，所以生活入口挂载时 `scopeFor` 已经可用。
9. **运行**：`pnpm run build` 后工作区干净；`check:arch` 42 / 1053 无增减；3C 细则快测（四组合并）118/118；`test:life-integration` 171/171、940/940；`test:behavior-list` 索引 11/11、行为 88/88。`pnpm run verify` 本轮没有重跑，沿用驱动会话的 1529/1529，返工后合并前重跑。
10. **未手动验证**：没有在主人的 DSH 里实际装载和卸载三个入口、看电视、走 Bridge 整理；真实入口链路由 `cordisFixture` 的真实 Cordis 装载覆盖。

**合并时由 Claude 同步的文档**：分支已经改了 `docs/architecture.md` 第 4 节、5.8.3、5.9 里受影响的说法，合并时再核对一遍，同时把必须修 1 的结论写进去（三区缺席时两段在旧快照里也退休）。`docs/product.md` 2a 完成标准里「第一层只剩 5 条」一项在合并时勾选。

**复查（返工一轮后）**：必须修 1 已修好。`retireDynamicContext`（`src/core/native/prompt.ts:27-41`）默认把 `chatpet.environment`、`chatpet.interactions` 按空值算进退休范围，当前登记的值覆盖默认值，仍走原来的按位置替换：原生日志不动，其他生产方的段保留。环境段名改成 Core 导出的常量 `ENVIRONMENT_CONTEXT`，Living 引用它（`src/living/prompt-context.ts:8,43`）。这次改了 `src/core/native/prompt.ts`，不在 3C 原允许清单里，只动了动态段退休这一处，「执行结果 · 返工一轮」写明了。新用例 2A1A-19 走的是重启夹具后从磁盘重开原会话。我把修复前编译出的 `prompt.js` 临时放回去单跑，0/1 失败（模型历史里仍有旧生活快照）；恢复后 1/1 通过。夹具只新增了 `history` 字段和 `restart` 的 `order` 选项，没有改已有断言。建议修第 2 条（条件断言改成确定断言）、第 3 条（执行结果写明两处有意变化）已做。1A 契约测试没改，2A1A-17 和返工前一致。`pnpm run build` 后产物与源码一致；`check:arch` 42 / 1053 无增减；`check:types` 通过；沙箱外 `pnpm run verify` 1530/1530；`test:behavior-list` 行为 89 条全部通过。

### 3D 第一轮验收（Codex 审查 + Claude 核实）

**必须修**

1. **原生 Life 冒烟检查没有接到新出口，`pnpm run test:native-life` 会失败**（Codex P2，已核实）。`scripts/checks/check-native-life.mjs:70` 只 `provide('petDesktop', {status, presentLife})` 一个替身，既没有登记 Desktop 出口，也没有挂 Channels。3D 之后 `reach_out` 只经 `lookupLifeOutlet`（`src/living/plan/plugin.ts:319-321`）找呈现方，不再读这个服务，所以 `bubbles` 一直是空的：`:81` 的 `bubbles.length === 1` 失败，`:93` 安静模式后的同一断言也随之失败。仓库里只有这一处替身（`grep presentLife scripts tests`），`verify` 不跑原生检查，所以驱动会话的门禁没拦住。第 6 批要用这三条原生检查做发布前验证，这张网不能断。
   - 要求：在同一个夹具插件里用 `dist/src/living/outlets.js` 的 `registerLifeOutlet(scope, host, 'desktop', {pause(){}, restore(){}, present: text => { bubbles.push(text); return true; }})` 登记合成呈现方，`scope.effect` 返回它的 `revoke`；可以保留原 `petDesktop` 替身，也可以删掉（Life 已不读它）。原有的送达、安静模式和其余断言一字不改。
   - 范围：`scripts/checks/check-native-life.mjs` 不在 3D 的允许修改名单里，本条把它补进来，只改这一处夹具。
   - 验收：`pnpm run build && pnpm run check:arch` 通过；在装有 DSH 的本机（沙箱外）跑 `pnpm run test:native-life`，输出的 JSON 里 `bubbles` 为 1。这条检查会以 `ELECTRON_RUN_AS_NODE` 启动已安装的 DSH 二进制、只用临时目录和脚本模型，不动主人在用的 DSH；本机跑不了就如实写「未运行」，留到第 6 批。

**建议修（不影响合并，返工时可以一起做）**

- **隔离配置热更新不会让生活出口和启用意图读口跟着变**（Codex P2 两条：`src/living/outlets.ts:30-33`、`src/living/index.ts:67-69`）。已核实 Cordis Loader 只改 `isolate` 时不重挂入口、原地迁移服务（loader `config/isolate.ts` 的 `swap` 和第 5 步改 `impl.isolate`；`config/entry.ts:105` 只在 `config` 变化时 `fiber.update`）。出口按提供方挂载时的标签登记，Plan 槽也是挂载时定的标签，之后 Desktop、Channels 或 Life 单改隔离配置，Life 和 Desktop 的互相可见性就和 `ctx.get` 不一致了。查找一侧每次现取标签，没有问题。main 上 Life 现取 `ctx.get('petDesktop'/'petChannels')`、Desktop 现取 `ctx.get('petLife')`，没有这个问题。不列为必须修：细则写的就是「复用 `RegistrationTable` 和 `LivingWorld` 的划分方式」，和 3B 的 `LivingWorld`、3C 的五个登记口是同一类已接受的限制（3C 验收建议修第 1 条），`docs/architecture.md:644` 已写明「改入口的 `isolate` 配置要重挂该入口」。合并时由 Claude 把这句的范围扩到 Desktop、Channels 和 Desktop 读 Life 启用意图；彻底解决，和 3B、3C 的标签一起留到 2b。
- 「概念与扩展检查」表的「生活出口登记」一行没提 Desktop 读 Life 持久启用意图的读口（`readLifeEnabled`，`src/living/outlets.ts:48-52`）。它和出口在同一文件里、由第二层提供，合并时由 Claude 在这一行补一句即可。

**核实结果**

1. **时机和顺序**：`startRuntime` 仍在启动条件检查之后、`petTranscripts.restore()` 之前暂停桌宠（`src/living/plan/plugin.ts:194`）；显式暂停仍在发 `pet/life.changed` 之后、`stopRuntime` 之前恢复（`:562`）；`close()` 里的恢复仍在订阅撤销之后（`:622`）。`mountLivingArea` 的清理同步先撤 Plan 租约再调 `close`（`src/living/index.ts:196-201`），所以恢复时 `readLifeEnabled` 读到 `false`，桌宠重新排程。出口缺席时三处都是 `?.` 跳过，渠道缺席算 `[]`，和原来一致。唯一的行为变化是 `present` 整体放进 `try`：可用性探测抛错也记原告警、继续尝试 Channels（2A3D-03 覆盖）。`presentationAvailable()` 在 `Desktop` 上一直存在（`src/desktop/index.ts:61`），原来的 `?? status().running` 回退没有意义，去掉不影响行为。
2. **登记方式**：`outlets.ts` 用 `RegistrationTable`，按 Cordis 根、Core 实例、`petDesktop`/`petChannels` 的可见标签划分，查找时核租约和提供方 fiber 为 `ACTIVE`，和 `LivingWorld.lookup` 抽出的同一个 `currentArea` 判法一致。同一标签下重复登记会抛错，但 Cordis 的 `provide` 在同一标签下重复提供本来就先抛（cordis `reflect.ts:303-305`），走不到这里。Desktop、Channels 都在 `provide` 之后用 `ctx.effect` 登记、返回 `revoke`；Cordis 按倒序清理，出口先于服务和 `features.close()` 撤销。2A3D-01/02 覆盖了同名旧租约不再接收恢复、隔离 `petDesktop` 的 Life 看不到桌宠。
3. **启用意图**：`readLifeEnabled` 直接调 Plan 的 `bodyClockState(workspaceId)?.enabled ?? running()`，`bodyClockState` 在绑定未装入时读 `readLifeControl()`（`src/living/plan/plugin.ts:142-153`），没有另造读取。Plan 只按 `petLife` 标签查，Body、Economy 标签不同也能读到（2A3D-02 的晚装分支就是这样装的）。三区全退后桌宠重新排程、`control.json` 字节不变，重挂 Life 后重新接管，都有断言。
4. **测试**：Desktop 先装、晚装、单独重载（2A3D-01/02）；三区全退后恢复；呈现期间桌宠消失和探测抛错都仍送 QQ（2A3D-03/04）；桌宠不可用且 QQ 静音、两出口都卸载、只有未登记的同名 `petChannels` 服务，三种情况都报「当前没有送达主动消息的渠道」。三个改动过的旧测试只把 Life 替身换成真实 Cordis 租约，原断言都在；`entries-lifecycle` 的默认装载顺序仍是三个生活入口；1A 契约测试没改。
5. **R5「无法静态判定」**：`build-animation-map.mjs:8,21,30,55` 四行在 main（`aed7f27`）的 `--report` 里就有，不是这次新出现的。这次只是把 `webm-metadata.mjs` 加进生成源，清掉了 `:6` 的 R1。
6. **架构**：`check:arch` 规则 42 → 37（1 条 R1、4 条 R2），词表 1053 不变；`--report` 与 main 比，R8 只有行号漂移，没有新增；`living` 的 R1–R4 为 0（剩下的 `core/initialization.ts:5 → living/plan/library.js` 属于第一层）。
7. **运行**：`pnpm run build` 后工作区干净；细则三组快测合跑 163/163；`check:types` 通过；`test:life-integration` 171/171、940/940；`test:behavior-list` 索引 11/11、行为 93/93。`pnpm run verify` 本轮没有重跑，沿用驱动会话的 1534/1534，返工后合并前重跑。Codex 审查没有改动任何文件。
8. **未手动验证**：没有在主人的 DSH 里实际装卸 Desktop、Channels 和 Life，也没有跑 `test:native-life`（必须修 1 是读代码得出的，没有实际跑失败）。真实入口链路由 `cordisFixture` 的真实 Cordis 装载覆盖。

**合并时由 Claude 同步的文档**：`docs/architecture.md` 6.2 和层间接口里「Life 直接读 Desktop、Channels」的说法改成第二层生活出口；`:644` 的隔离限制扩到出口和启用意图读口；「概念与扩展检查」补启用意图读口；`docs/product.md` 2a 完成标准里「第二层基线 0 条」一项勾选。

**复查（返工一轮后）**：必须修 1 已修好。`scripts/checks/check-native-life.mjs:70-82` 改为用 `dist/src/living/outlets.js` 的 `registerLifeOutlet` 登记合成桌宠，`present` 记气泡并返回 `true`，`scope.effect` 返回 `revoke`，卸载时撤销；原 `petDesktop` 替身删掉了。核对过 Life、Body、Core、Memory 和 `check-life-history`、`check-life-review` 都不再读 `petDesktop`，删掉不影响别处。`:81`、`:93` 和其余断言逐字未改，`node --check` 通过。改动和 2A3D-04 的真实出口路径一致（那条用例经同一个 `lookupLifeOutlet` 断言呈现成功）。`pnpm run test:native-life` **没有运行**：它通过 `mountInstalledStandard`（`scripts/checks/lib/native-standard-preset.mjs:12-17`）读主人真实的 DSH home 里的 `profiles/desktop` 配置，Codex 在临时 `DSH_HOME` 下跑报 `ENOENT`。按约定不碰主人的 DSH 环境，这条留给主人在本机跑，或在第 6 批的隔离环境里跑。两条建议修都是合并时由 Claude 改文档，返工不涉及。`src/` 没有改动；`pnpm run build` 后工作区只有这两处改动；`check:arch` 37 / 1053 无增减；细则快测 163/163；`test:behavior-list` 行为 93/93；沙箱外 `pnpm run verify` 1534/1534，包检查通过。
