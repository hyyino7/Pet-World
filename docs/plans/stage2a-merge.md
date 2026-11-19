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

### 3D 清 Life 读第三层的 4 条

Life 在启动、休息和通知时直接找 Desktop 和 Channels（`src/living/plan/plugin.ts:131,180,285-305`）。改成第二层的登记口：`src/living/` 提供「生活出口」登记，Desktop 和 Channels 在各自入口登记、卸载时撤销。

- 四个回调：暂停 Desktop 自主小功能、恢复、呈现、送达。调用时机、顺序不变；出口缺席时跳过，和现在 `?.` 取不到时一样。
- Desktop 还读 Life 的**持久启用意图**，包括运行时还没就绪的时候（`src/desktop/features.ts:55-89`），登记口要能回答这一点。
- 测试覆盖：Desktop 先装、晚装、单独重载；生活入口全部退出后恢复；呈现失败仍尝试 Channels；两者都不可用时明确失败（参照 `tests/life/life-desktop-integration.test.ts:58-93`）。

**允许修改**：`src/living/**`、`src/desktop/plugin.ts` 或 `src/desktop/features.ts`（只加登记）、`src/channels/plugin.ts`（只加登记）、`arch/layers.json`、基线、相关测试。

**验收**：第二层基线 0 条，`living` 模块 R1–R4 全绿。

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
| 生活出口登记 | 第二层提供，Desktop、Channels 登记 | 3D 的测试 | 清 Life 读第三层的 4 条；场景 2、4 |
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
- 无偏离细则，仅使用合成数据。改动留在工作树，`pnpm run verify` 与提交由 Claude 处理。以下四组已在临时源码副本逐组通过构建、两组快测、架构和迁移结算测试，各组的 `dist/src/**` 随源码提交且不计阈值。
- 第 1 组「登记三入口」。加入 `index.ts`，三个 `apply` 接登记但保留原读法，`arch/layers.json` 先登记 `internal/status`。附共享夹具的装载接线与 R6 排列、隔离用例。8 个文件，约 428 行。
- 第 2 组「切换身体区读取与观察」。附 Body 端口夹具、旧 Plan 观察和实际计时器用例。15 个文件，328 行。
- 第 3 组「切换计划区读取与退场」。附 Plan 端口夹具、原生 reader 探针及用例。11 个文件，约 347 行。
- 第 4 组「切换钱包区读取与退场」。附 Economy 端口夹具、文件解析和挂载失败用例，移除旧 `reads`。11 个文件，约 395 行。本小节可单独提交。
- `tests/regressions/room-refresh.test.mjs` 的 Body 原型夹具补接 `LivingView`，修复归第 2 组。Room 回归 6/6、两组快测 68/68 和 182/182、行为清单 88/88 通过。

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
