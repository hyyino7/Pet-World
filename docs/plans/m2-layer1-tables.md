# 阶段 1 · M2 第一层的两张小表和来源适配（P2a + P2b）

- 级别：大改
- 状态：已确认

这是 M2 的总方案：一次拍板，分 8 批执行（A、B、C、E1、E2、F、G、H；初始化表按拍板点 3 推荐移到 M3，所以没有 D 批）。每批一个 `codex/m2-*` 分支，单独验收、单独合并，按顺序进行。目标、完成标准和停止条件以 [product.md](../product.md)「M2：第一层的两张小表和来源适配」为准，这里只写怎么做。现有行为以 [architecture.md](../architecture.md) 5.8 的会话策略表为准（已由主人确认）。

行号以 `main` 的 `6b0dcb3` 为准；代码路径默认相对 `src/`，`tests/`、`scripts/`、`arch/` 写全路径。

## 目标与外部变化

**主人看到的：基本无。** M2 不发版。合入的改动都要求行为不变，包括已知问题 1（guest 和电视的回复 footer 会写共享情绪）这类现状，也原样保留。唯一的例外是某个模块没加载时，设置页「运行状态」的显示可能和现在不同（拍板点 4）。

下面这些在 M2 前后必须一致，由 A 批的测试和各批的对照测试守住：

- 每种会话的准入结果、可见工具、记忆观察、情绪更新（5.8.2、5.8.3）；
- 每种会话的历史改写和组装段（5.8.4）；
- 所有模块都加载时，`listCapabilities` 返回的每一行和顺序。

**开发者看到的：**

| 变化 | 说明 |
| --- | --- |
| 三个登记口 | 能力状态、来源适配（含会话策略行）、伙伴工具声明。上层模块通过它们向第一层登记，不再给 `host.native` 的字段赋值 |
| 新增工具 | 在工具登记处一并声明「哪些来源可用」和可选的「历史概览」；不再改 `core/life-tool-policy.ts` 和 `core/native/history-maintenance.ts` |
| 新增输入来源 | 登记一个来源适配器，带会话策略行；不再改 `core/native/conversation.ts`、`core/native/agent.ts` |
| 违规基线 | R4 `10 → 0`；Core 的 R1 `8 → 5`、R2 `22 → 14`；全仓 R1–R4 目标 `81 → 60`（见「M2 表格对照」） |
| 行为清单 | 新增会话策略表各格的条目，用新字段 `policyCells` 关联到 5.8 的行和授权面 |

## 范围变化

M2 的大部分工作直接对应 product.md M2 表里的一行（见「M2 表格对照」）。下面几处是对原文的调整或解读，请主人确认：

1. **初始化表移到 M3（拍板点 3，推荐）。** 核对发现，初始化改成按模块登记后，「有模块没加载」时会同时改变新装、启动检查、显式重做和回退旧版这几种情况的结果（见「拍板前先看」）。要定这些语义，需要先有 M3 才做的「按拥有者划分的存储句柄」（R5 对第一层生效）。改的又是高风险文件 `core/workspace.ts`。初始化表不影响 M2 结束时第 4、5 类的复测。
   - 替换或延期了什么：M2 表第一行的「不再写死目录」和 R1 `core/initialization.ts:5,12` 两条，延到 M3。
   - 当前闭环怎么验收：能力状态表照样在 M2 完成并清掉对应的 7 条 R2。
   - 原完成标准还算不算数：第一行改为只验收能力状态表，初始化部分并入 M3 的完成标准，H 批同步改 product.md。
   - 对应场景：不变（重构不加功能）。
2. **工具结果的历史概览放进 M2（拍板点 2，推荐）。** P2b 写的是「历史投影」，提示词与历史投影表在 M3。这里只把「哪些工具结果能投影成概览、用哪个函数投影」改成工具声明派生，这正是 architecture 5.10「新增工具」一行写的「历史瘦身识别」。提示词段、状态快照退休、召回仍留在 M3。不放进来，第 4 类「另加历史投影」的变体在复测时量不出改善。
3. **「R4 对第一层全绿」包括 Emotion 和 Memory 的四条。** R4 基线共 10 条，全是给 `host.native` 赋值：Life、Room、Channels 各 2 条，另有 `emotion/plugin.ts:173,288` 的 `playbackEvidence`、`memory/plugin.ts:13,15` 的 `memoryEnabledForNewSessions`。这是原目标的实际范围，不算扩大。
4. **登记完成屏障不在 M2 实现（拍板点 10，推荐）。** architecture 2.2 要求「登记完成之前，来源适配表返回未就绪」。核对发现，仓库里锁定的 Cordis 4.1.0 没有能宣布「本次预期的登记已齐」的接点（`Fiber.await()` 只等当前生命周期，`node_modules/@deepseek-ai/cordis/src/fiber.ts:748`）。硬加会让启动窗口里不带 `identity` 的主人输入被拒，改变现有行为（`core/native/conversation.ts:38`）。M2 对没登记的来源返回「没有适配器认领」并拒绝，和现在一样；屏障留到 M3 再找接点，H 批在 2.2 写明。
5. **会话策略表的空白测试先补（A 批）。** M2 的完成标准要求每行每个授权面都有测试；后面各批都靠这些测试判断行为是否不变。

不做：product.md 标「可选」的「回退后找回新版期间聊天」（拍板点 8）。

## 拍板前先看：核对源码时发现的事实

- **第 4、5 类复测有两个变体先天无法减半。** 4a（新工具只给主人用）基线已经是 1 个文件。5b（新增聊天平台）基线的 5 个文件里，有 4 个在 Channels 和 Console 的设置、持久化和编排：`channels/messaging-settings.ts:4`、`channels/messaging-storage.ts:6`、`channels/messaging.ts:56-57`、`console/client.js:344,367`（product.md:121）。再加上新平台自己的适配器，下限仍是 5。这部分归阶段 3 的「设置项一份字段声明」，M2 不碰。怎么判请主人现在定（拍板点 1）。
- **初始化按模块登记会改变部分加载时的结果。** 现在 `core/initialization.ts:8-10` 写死 13 个目录，`:67-80` 不管模块是否加载都建出桌宠配置、Life 控制文件和情绪文件，就绪检查还要求后两者合法（`:49-65`，`core/workspace.ts:227` 调用）。改成登记后：
  - 显式初始化会按当前登记重新生成清单（`core/workspace.ts:275-281`），没加载的模块的条目会从 `manifest.json` 里消失；
  - 晚加载的模块如果把缺失文件立刻算进清单，整个工作区会变成不可用（`core/workspace.ts:215-226`）；
  - 新版生成的短清单交给旧版打开时，旧版仍要求这 13 个目录和两个配置文件，回退旧版会失败；
  - 已有其他路径也在建这些目录：近期账本建 `data/memory`（`emotion/recent.ts:9`），共享 home 建 `data/life`（`core/companion-foundation.ts:84-88`），PetPlatform 和 Channels 按需建自己的目录（`desktop/platform/plugin.ts:123`、`channels/storage.ts:41`）；
  - `workspace.initialize` 在进入初始化回调前先 `ensurePersisted()`（`core/runtime.ts:82`），可能建目录、加锁、恢复数据库，屏障加在后面也挡不住副作用；
  - 多处测试和脚本直接 `createCore()` 后初始化，并断言 Core 单独也会建 Life、Emotion、桌宠配置（`tests/core/workspace.test.ts:48`、`scripts/fixtures/synthetic-companion.mjs:51`、`scripts/checks/check-runtime-package.mjs:167`）。
- **能力状态行现在由 Core 写死并改写。** 基础 9 行列在 `core/runtime.ts:96-98`（含一直是 `unavailable` 的 `console.operations`），`core/plugin.ts:52-98` 读 Desktop、Life、Room、Channels、Voice 和同层的 Emotion、Memory 改写各行，并追加 `emotion.expression`。公开的 `owner` 不等于模块归属：`desktop.room` 的 `owner` 是 `desktop`，`channel.qq` 是 `qq`。设置页按 `owner` 汇总显示（`console/client.js:1005-1008,1153-1155`），Memory 单独显示 provider 状态，`bilibili` 本来就没有行，显示「未报告」。
- **`ModuleId` 不只是能力行的字段。** 它也是 Core 授权主体和请求去重键的一部分（`core/authority.ts:5-6`、`core/runtime.ts:86`）。M2 不扩大也不放开它。
- **渠道准入会被反复核验。** 同一条消息会在入队、`pre-step`、`observeInputs`、后台轮次启动和 guest 预设里被问多次（`core/native/agent.ts:78,180-181,198-199`、`core/native/conversation.ts:57,189`、`channels/guest.ts:28`）。收件授权在第一次接受时从 `pending` 扣掉，之后按消息 ID 缓存到 `turn/end`（`channels/sessions.ts:80-89,94-96`）。QQ 补答授权在存活期间每次都要重新核对原消息、最新日志、绑定和权限（`:69-75`）。
- **Desktop 图片恢复对所有非 guest 的受管轮次生效**，在会话副本恢复之前（`core/native/agent.ts:189-191`），不只是 Desktop 聊天。
- **`MemoryScope.workspaceId` 会传给 Python。** 它进入进程环境 `CHATPET_MEMORY_SCOPE` 和每次请求的 `scope`（`memory/client.ts:49` 一带），Python 用它核验和选择 Bank（`memory/main.py:24`、`memory/provider.py:21`）。改名只能改 TypeScript 内部名，线上形状不变。
- **删除 `host.native` 字段会碰到方案外的调用方。** `memoryEnabledForNewSessions` 还被 Core 启动和设置页读写（`core/plugin.ts:22`、`console/settings.ts:255`）；门禁内有测试直接赋 `channelBoundary`、`resolveScope` 和 Memory 开关（如 `tests/regressions/audit-r6-memory-scope.test.mjs:201`）；门禁外 `scripts/checks/check-native-services.mjs:67` 写 `lifeAdmission`，`scripts/checks/check-native-room.mjs:136` 断言旧字段为 `undefined`（删字段后这条会空过）。
- **`dist/src/` 是跟踪文件。** 每改一个 `src/*.ts`，提交里就多出 `.js` 和 `.d.ts`。C 批光是手写文件就有 10 个以上，按现有阈值一个提交放不下（拍板点 9）。
- **M2 后 Core 仍留在基线里的条目。** R2 14 条：`core/companion-foundation.ts` 的环境和事实准备 12 条、`core/plugin.ts:43-44` 相册工具作用域 2 条。R1 5 条：`core/initialization.ts:5,12`（随初始化表）、`core/companion-settings.ts:2`、`core/native/memory.ts:7`、`core/plugin.ts:7`。product.md 的 M3 完成标准要求第一层 R1–R4 全绿，但又把事实准备放在阶段 2a、设置声明放在阶段 3，两者照字面无法同时兑现。这个冲突留给 M3 方案解决，M2 只如实记录。

## 改动范围

- 每批由一到两个「步骤」组成，每个步骤要么只搬家（行为不变），要么只改逻辑，步骤之间各有验证（见「各批做法」）。
- 允许修改（按批）：
  - A：`tests/behavior-list/**`（含 `entries.ts`、`fixture.mjs`、`index.json`、`index.test.mjs`）、`tests/**` 下新增的测试文件
  - B：`src/contracts/tables.ts`（新）、`src/contracts/index.ts`、`src/core/tables/**`（新）、`tests/core/tables*.test.ts`（新）
  - C：`src/core/{plugin,index,runtime}.ts`；登记能力行的模块入口 `src/{desktop,life,room,channels,voice,emotion,console}/plugin.ts`；`src/console/client.js` 和经生成器重新生成的 `src/desktop/platform/client.js`；能力对照测试
  - E1：`src/core/native/{agent,conversation,history-maintenance}.ts`、`src/core/life-tool-policy.ts`、`src/core/life-review-files.ts`（第二步迁到 `src/life/`）、`src/life/plugin.ts`；对应测试（含 import 路径）
  - E2：`src/core/native/{agent,conversation}.ts`、`src/core/plugin.ts`、`src/room/{plugin,chat}.ts`、`src/channels/{sessions,guest,plugin,messaging}.ts`、`src/desktop/{index,plugin}.ts`、`src/emotion/plugin.ts`、`src/memory/{plugin,batch}.ts`、`src/console/settings.ts`；读 `channelBoundary` 的 `src/economy/plugin.ts:223`、`src/life/plan-tools.ts:47`、`src/life/plugin.ts:172,199`、`src/core/companion-foundation.ts:150`；受影响的门禁测试；`scripts/checks/check-native-{services,room,channel-homes}.mjs`
  - F：`src/core/native/history-maintenance.ts`；工具登记处 `src/room/plugin.ts:146`、`src/economy/plugin.ts:229`、`src/life/plan-tools.ts:128`、`src/life/review.ts:38`、`src/emotion/plugin.ts:207`、`src/core/native/agent.ts:154`、`src/core/plugin.ts:40` 和 `src/life/album-tools.ts`；迁到 `src/life/` 的工具策略
  - G：持有 `NativeScope`、`MemoryScope` 和 `source.kind` 类型的文件（见 G 批），`scripts/fixtures/synthetic-companion.mjs`、上面三个原生检查脚本
  - 全部批次：`dist/src/**`（构建产物）；`arch/baseline/rules.json`、`arch/baseline/vocabulary.json`（只用 `pnpm run check:arch -- --write-baseline` 删条目）；`arch/layers.json`（只在当批确有必要时改，并写明原因）
  - H：`docs/product.md`、`docs/architecture.md`、`docs/decisions.md`、`AGENTS.md`、`docs/development.md`；复测分支上的任意文件（不合并）
- 必须复用：
  - `core/native/prompt.ts:85-175` 的 `WorldPromptRegistration`（同作用域幂等 `attach`、撤销、guest 独立 waterfall 的附着写法）
  - `core/native/memory.ts:39-45` 的 `assertBinding` 和 `memory/client.ts:62` 一带拦截晚到结果的写法：适配器登记代次和工作区绑定分别复核，每次 `await` 之后、真正写入或执行工具之前都要查
  - `core/native/history-maintenance.ts:28-102` 的候选挑选和原位替换机制（只换掉 `:13-24` 的按工具名分支和 `:38-44` 的按来源判断）
  - 各模块现有的概览函数：`room/tool-context.ts`、`economy/tool-context.ts`、`life/tool-context.ts`
  - 测试夹具：`tests/behavior-list/fixture.mjs:18` 的插件入口夹具；预设和工具 schema 权限用真实 DSH 工具作用域的写法（`tests/life/life-tool-policy.test.ts:10`）；QQ 收件用 `tests/behavior-list/channels.test.mjs:14` 的假传输；跨日回顾用 `tests/behavior-list/families.test.mjs:61` 的夹具
- 不做：
  - 改任何已知问题（1–7）的行为
  - 初始化表（拍板点 3）、登记完成屏障（拍板点 10）
  - 提示词段登记、状态快照退休、召回策略（M3）
  - 事实准备与确认、环境段的上层读取（阶段 2a）
  - 设置项、运维操作表（阶段 3）
  - 目录改名为 `kernel/`、拆 contracts（不在阶段 1）
  - 回退后找回新版期间聊天（拍板点 8）

## 分批与提交

每批一个分支，从当时的 `main` 切出；上一批合并后才开下一批。批内按步骤提交，每个提交完整可运行，不把一处接线的新旧两半分开提交来凑阈值。阈值见拍板点 9。

| 批 | 分支 | 步骤 | 清掉的基线条目 |
| --- | --- | --- | --- |
| A | `codex/m2-a-policy-tests` | 只加测试 | 无 |
| B | `codex/m2-b-tables` | 改逻辑：新增三个登记口，不接线 | 无 |
| C | `codex/m2-c-capabilities` | C1 改逻辑：Core 改读登记表，现有计算原样登记；C2 搬家：各行计算搬到拥有者，逐模块提交 | R2 `core/plugin.ts:57,66,67,68,72,77,85`（7 条） |
| E1 | `codex/m2-e1-life-source` | E1a 改逻辑：Core 经来源适配表取 Life 策略；E1b 搬家：Life 策略文件迁到 `life/` | R4 `life/plugin.ts:54,528`（2 条） |
| E2 | `codex/m2-e2-sources` | 改逻辑：Room、Channels、Desktop、Emotion、Memory 改为登记，按模块逐个提交 | R4 其余 8 条；R2 `core/native/agent.ts:190`（1 条） |
| F | `codex/m2-f-tool-declarations` | 改逻辑：工具声明派生 Life 名单和历史概览 | R1 `core/native/history-maintenance.ts:4,5,6`（3 条） |
| G | `codex/m2-g-scope-names` | 搬家：分开命名 | 无 |
| H | `codex/m2-h-retest-docs`；度量分支 `codex/m2-retest-*` | 文档与度量 | 无 |

每批收紧基线时，比对 `--write-baseline` 实际删掉的条目身份，和上表一致；R8 基线身份可能因移动定义而变化，出现新增就当批解决，不放宽。

## 各批做法

### A 补测试（只加测试）

对 5.8.2、5.8.3、5.8.4 每个「无测试」格补一条门禁内测试，在当前 `main` 上断言现状。

- **索引**：不改 15 类的口径。新条目的 `categories` 可以为空，另加字段 `policyCells`，取值形如 `"5.8.3#8-tv/情绪"`（行号、分支、授权面）。`index.test.mjs` 增加对 `policyCells` 取值的校验，并检查 5.8 每个格至少有一条非 L3 条目覆盖。
- **夹具**：`tests/behavior-list/entries.ts` 加上 Room、Desktop、Emotion 的入口。现有夹具的工具执行是手工模拟，`begin()` 只跑首步（`fixture.mjs:114`），证明不了「预设过滤之后才登记的工具」「真正的第二步接管」「模型可见的工具列表」「流式 footer」。这几类断言改用真实 DSH 工具作用域和流的写法（复用上面「必须复用」列的三个测试的做法），必要时扩展夹具的第二步和流。

要补的测试：

1. Room 私聊：主人前台轮次；Room 工具可见；输入以 `owner_statement` 排进 Memory；footer 写情绪；取编号最大的未归档会话，没有就新建；同一 `rpcId` 不重复投递；私聊和电视共用一条历史；界面只回放最近 80 条；首步前恢复会话副本和图片；调用方取消即取消原生轮次。
2. Room 电视：只准当前这一条；模型可见的工具里没有可执行项，执行一律被拒；受自主步数和时长上限约束；画面输入以伙伴的 `virtual_action` 排进 Memory；footer 写共享情绪（**现状，待主人决定**，已知问题 1）。
3. 渠道主人私聊：从真实收件进入 home；同一条收件第一次接受后，重查返回同样结果，但不能再用于第二条消息；主人工具可用、没有 Life 限制和自主计数；以 `owner_statement` 加渠道身份排进 Memory；footer 写情绪。QQ 补答授权的重复核验、假冒原消息、取消、同名换绑和晚到结果各一条（现有 `tests/regressions/audit-r7-channel-nudge.test.ts` 覆盖的不重复写）。
4. guest：预设屏蔽所有继承工具，包括之后登记的；看不到 `pet_memory_*` 和 `pet_emotion_update`；footer 写共享情绪（**现状，待主人决定**）；组装只有角色卡、只含身份的 `chatpet.profile`、两段情绪说明，再加召回。
5. Desktop 聊天：三个授权面和组装都同普通 owner 会话；有活会话时「新建」先保存再归档旧会话。
6. Life 与回顾：footer 生效；自主步数上限、工具次数上限、时长上限各一条。
7. `pet_emotion_update` 工具本身：主人可用；guest 和电视看不到；版本冲突被拒。
8. 碎碎念与梦话：不读写 Memory，不写情绪，系统提示只有伙伴身份；梦话带上游的说梦话指令。
9. 「回顾后提前压缩」：设置开启、Memory 开启、会话仍是 home、有待处理轮次、空闲、过了最小间隔时，回顾完成后压缩一次；设置关闭或任一条件不满足时不压缩（`life/plugin.ts:194-196`、`memory/batch.ts:89-104`）。
10. **M2 真实流程（G9，L1，对应场景 3、4）**：QQ 真实收件进入 home → home 里已在运行的 Life 轮次在后续 step 收到主人消息，限制当场解除 → 回顾轮次写当天日记 → 重启后仍是同一个 home，日记在，主人消息和回顾回复在 Memory 里的来源归属可查。

完成后，5.8 里对应格的「无测试」在 H 批换成测试位置。

验收：

- `pnpm run build && node --test <新增测试文件>`，全部通过
- `pnpm run test:behavior-list` 全绿，`index.test.mjs` 的格覆盖检查通过
- `git diff --stat 6b0dcb3..codex/m2-a-policy-tests -- src dist` 为空（起点按开批时的 `main` 替换）

### B 登记口骨架（改逻辑，不接线）

新增三个登记口，先不让任何调用方使用，行为不变。类型放在 `contracts/tables.ts`（第一层 contracts，上层可以 import），实现放在 `core/tables/`。两处都在现有模块根下，`arch/layers.json` 不改。

**通用登记表**实现 [architecture.md](../architecture.md) 2.2 的契约，除「登记完成屏障」外（拍板点 10）：

- 同一键重复登记直接报错，不覆盖。
- 需要顺序的表显式写排序键，相同排序键是登记错误。
- 判定结果分四种：`unclaimed`（没有适配器认领）、`rejected`（适配器拒绝，带原因）、`accepted`、`failed`（适配器抛错）。调用方把 `unclaimed`、`rejected`、`failed` 都按拒绝处理，和现在的结果一致；只有日志和测试能区分它们。
- 撤销：登记返回一个只能撤销自己的句柄。重复撤销无效；撤销后同键可以重新登记，旧句柄再撤销也不会删掉新的登记（现有 `registerInitializer` 的撤销按 ID 删除，有这个问题，`core/workspace.ts:183-188`，M2 的新登记口不照抄）。
- 租约：每次登记有自己的代次。调用方拿到的回调带上代次，撤销后再调用直接失效。
- 一个适配器抛错只影响它负责的来源。

**能力状态登记**：`{id, owner, order, contractVersion, service?, page?, status()}`。`id` 和 `owner` 取值仍是 `contracts/common.ts:5-8` 的公开联合类型，登记时校验；登记表只负责「哪一行由谁提供、怎么算」。

**来源适配登记**（一个适配器可以带多个分支，例如渠道的主人私聊和 guest）：

| 字段 | 内容 |
| --- | --- |
| `sources` | 认领哪些 `source.kind`；主人原生输入那一行由 Core 自己登记 |
| `order` | 同一 `source.kind` 有多个分支时的判定顺序 |
| `admit(context)` | 返回四种结果之一，接受时带上选中的分支和上下文（渠道身份、一次性授权等）。同一条消息可以被重复调用，适配器保证结果幂等；一次性授权在第一次接受时由适配器自己扣减 |
| `turnKind` | `foreground` 或 `background`，取代 `core/native/agent.ts:73` 的字符串判断。主人接管只由 `foreground` 输入触发 |
| `toolPolicy` | 入队时安装的限制、执行时的复查、拒绝文案、释放动作 |
| `fileAccess?` | 文件工具的路径判断（回顾用）。订阅 `tools/pre-execute`、`tools/result` 的机制留在 Core（`arch/layers.json:11` 已登记），适配器只提供判断函数 |
| `memoryObservation` | 输入记成什么 `origin`、`actorId`、排队的 `sourceKind` 和归属；回复的归属渠道（对应 `core/native/conversation.ts:71-88,133-141`） |
| `emotionUpdate` | `footer` 和 `tool` 分别声明 |
| `historyProjection?` | 这一来源的轮次是否参与生活状态投影、是否保护所在轮次（对应 `core/native/history-maintenance.ts:38-44`） |
| `policyRow` | 会话策略表的完整一行：行号、分支、可信 actor、选择键、历史范围、预设、生命周期、绑定校验，以及每个授权面对应的行为清单条目。第 2 行（共享 home）、第 9 行（碎碎念，没有原生输入）只声明，不参与判定；第 7 行写明「沿用第 1 行策略」 |

**伙伴工具声明**：`{name, sources, historyOverview?}`。`sources` 取 `owner / life / review / guest / tv`，它们和 `source.kind` 的对应由来源适配器的分支给出（例如 `dsh-world-life` 的回顾分支对应 `review`）。工具本身仍用原生 `tools.register` 登记，保留原有 `when`、局部作用域和执行守卫；声明只补元数据。上游在 Agent 本地挂载、没法附元数据的工具（`plan_next`、`check_alarm`、`cancel_alarm`、`reach_out`，以及上游 home 挂载的相册工具，`vendor/dsh-world/lib/life/toolRegistry.js:19`），由所属模块用同样的声明结构补登。

每条契约一条测试：顺序、重复登记、四种结果、旧句柄撤销不影响同键新登记、撤销后租约失效、在途调用在撤销后不再写入、跨作用域（guest 预设）附着。

验收：

- `pnpm run build && node --test dist/tests/core/tables*.test.js`
- `pnpm run check:arch`（R8 无新增；新增的两组词表先查 `--report`，有同值集合就复用）
- `pnpm run verify`

### C 能力状态表

**C1 改逻辑**：`listCapabilities`（`core/runtime.ts:57`）改为读登记表。Core 先把现在的 10 行原样登记，计算仍在 Core，输出逐行不变。同时改设置页的缺席显示（拍板点 4）：`console/client.js:1005-1008` 对「本来有行、现在没有行」的拥有者显示「不可用」，`bilibili` 仍显示「未报告」，Memory 仍显示 provider 状态；改完经生成器重新生成 `desktop/platform/client.js`。

**C2 搬家**：各行的计算逐个搬到提供它的模块，每个提交一个模块，Core 不再读上层服务。

| 行 `id` | 公开 `owner` | 登记者 | 缺席时 |
| --- | --- | --- | --- |
| `core.conversation` | `core` | Core | 不会缺席 |
| `memory.lifecycle` | `memory` | Core（含 `petMemory` 缺席时的覆盖，`core/index.ts:27-36`、`core/plugin.ts:92`） | 不会缺席 |
| `life.pursuits` | `life` | Life | 无行 |
| `desktop.presentation`、`desktop.body` | `desktop` | Desktop（30-Desktop） | 无行；现在 Desktop 缺席而绑定就绪时是 `disabled` 并带操作列表（`core/plugin.ts:57-63`），改后不再显示这两行 |
| `desktop.room` | `desktop` | Room | 无行 |
| `channel.qq` | `qq` | Channels | 无行 |
| `voice.speech` | `voice` | Voice | 无行 |
| `console.operations` | `console` | Console，值照旧是常量 `unavailable` | 不会缺席（Console 是主入口） |
| `emotion.expression` | `emotion` | Emotion | 无行 |

排序键还原现在的顺序：先基础 9 行，再 `emotion.expression`。`contractVersion` 照旧取 `CONTRACT_VERSION`。

对照测试：固定一份搬家前的逐行输出，覆盖「未绑定 / 已绑定」×「全部加载 / 单个模块缺席再恢复」× 桌宠开关、QQ 在线离线关闭、语音能否识别。全部加载时逐行相同；单个模块缺席时按上表；设置页的缺席显示单独断言。

验收：

- `pnpm run build && node --test <能力对照测试> dist/tests/core/core.test.js`
- C2 每个提交后 `pnpm run check:arch`；批末 `pnpm run check:arch -- --write-baseline` 删掉 7 条
- `pnpm run verify`

### E1 Life 来源适配器

**E1a 改逻辑**：Core 改为经来源适配表取 Life 的策略。Life 在入口登记适配器，策略代码暂时仍在 `core/life-tool-policy.ts` 和 `core/life-review-files.ts`，由 Life 向下 import（第二层 → 第一层，合法）。

- 准入：照搬 `life/plugin.ts:54-55`。
- 工具限制：入队时装限制、执行时再查、主人接管立即释放、轮次结束和关闭时清理，时机和顺序都照旧（`core/native/agent.ts:52-82,162-169,252,262-277`）。Core 继续持有本轮状态（`turns`、`lifePolicies`），只把「装什么限制、拒绝文案、释放动作」交给适配器。
- 回顾：识别 `purpose: 'review'` 和 `reviewDay`、中断后把权限带到下一次 Life 输入（`core/native/agent.ts:36,60-66,248-250`），归适配器的回顾分支。
- 回顾文件守卫：订阅 `tools/pre-execute`、`tools/result` 的机制留在 Core（`core/life-review-files.ts:64-93` 的守卫骨架），路径判断（`assertLifeReviewFile`）由适配器的 `fileAccess` 提供。守卫已开始解析文件时 Life 被卸载，要拒绝而不是放行。
- 历史投影：保住「轮后排队、空闲时准备、下次打开请求时替换」（`core/native/agent.ts:93-106,140-147,254-255`）。`history-maintenance.ts:38-44` 里按来源的判断改读适配器的 `historyProjection` 声明。
- 删掉 `CoreNative.lifeAdmission`（`core/native/conversation.ts:24`），同批更新直接用到它的测试和 `scripts/checks/check-native-services.mjs:67`。

**E1b 搬家**：`core/life-tool-policy.ts` 和 `assertLifeReviewFile` 所在的路径规则迁到 `life/`，Life 的 import 跟着改，Core 不再 import 它们。测试的 import 路径随迁移改（`tests/life/life-tool-policy.test.ts:8`、`tests/life/life-review-files.test.ts:8`），断言不改。

验收：

- `pnpm run build && node --test dist/tests/life/*.test.js dist/tests/core/history-maintenance.test.js tests/life/*.test.mjs`
- `pnpm run test:behavior-list`（A 批的第 3、6、9、10 条和 B01、B07 必须全绿）
- 新增结构化判定测试：Life 未登记时 `unclaimed`、Life 拒绝时 `rejected`、适配器抛错时 `failed`，三者都拒绝后台轮次
- `pnpm run check:arch -- --write-baseline` 删 2 条
- `pnpm run verify`

### E2 其余来源适配器（改逻辑，按模块逐个提交）

- **Room**：为 `chatpet-room-tv` 登记适配器，准入照搬 `room/chat.ts:78-82`，`turnKind` 为 `background`，工具策略是「全部拒绝」，取代 `room/plugin.ts:149` 的守卫，拒绝文案不变。会话策略第 8 行写私聊、电视两个分支，私聊分支沿用第 1 行策略。
- **Channels**：为带 `identity` 的 `user` 和 `dsh-world-reply-nudge` 登记适配器，分支为主人私聊（第 5 行）和 guest（第 6 行）。收件授权的扣减和按消息 ID 缓存、补答授权的逐次核验都留在适配器里，语义照旧（`channels/sessions.ts:68-90,94-96,168-178`）。guest 判定（`:55-59`）由适配器提供，Core 用 `host.native.isGuest(id)` 这样的查询代替 `channelBoundary?.guest()`（`core/native/agent.ts:46`），其他读它的地方一起改。现状里「未准入的前台消息让整步拒绝」和「后台候选只过滤」的区别（`core/native/agent.ts:180-183,198-200`），以及 Core 作用域外的原生聊天直接 `next()`（`:172-175`），都保持不变。
- **Desktop**：图片恢复改由 Desktop 登记成「非 guest 受管轮次首步前」的钩子，执行时机仍在会话副本恢复之前（`core/native/agent.ts:189-193`），覆盖普通原生会话、Life 等所有非 guest 入口。声明第 7、9 行。
- **主人原生输入**（第 1、2 行）由 Core 自己登记：不带 `identity` 的 `user` 照旧直接准入（`core/native/conversation.ts:38`）。
- **Emotion**：`playbackEvidence` 改成登记，带租约；Core 在异步 Bank 操作返回后调用 `associated()` 之前复核租约和绑定（`core/native/conversation.ts:227-257`）。footer 和 `pet_emotion_update` 按适配器声明的 `emotionUpdate` 处理，各行声明照现状写：guest、电视的 footer 也是「允许」。
- **Memory**：`memoryEnabledForNewSessions` 改成方法（`memory/plugin.ts:13,15`），Core 启动和设置页的读写一起改（`core/plugin.ts:22`、`console/settings.ts:255`）。`observeInputs` 和 `finishTurn` 按适配器声明的 `memoryObservation` 决定记成什么，声明照现状写。混合轮次（同一轮里既有后台输入又有主人接管）里，每条输入按它自己的来源声明记录，轮次的前后台按现状由是否有被接受的前台输入决定。
- 删掉 `CoreNative.roomAdmission`、`channelBoundary`、`playbackEvidence` 字段（拍板点 5）。同批更新直接赋这些字段的门禁测试，以及 `scripts/checks/check-native-room.mjs:136`、`check-native-channel-homes.mjs`，让它们断言新的登记和撤销，而不是断言旧字段为空。
- **完整性测试**：夹具加载全部模块后，会话策略表 9 行都有登记；每行三个授权面都有声明；每行列出的行为清单条目在 `index.json` 里存在。这条只证明「登记齐了」，三个面「实际生效」由 A 批的测试证明。

验收：

- `pnpm run build && node --test dist/tests/regressions/*.test.js tests/regressions/*.test.mjs dist/tests/desktop/*.test.js dist/tests/emotion/*.test.js tests/behavior-list/*.test.mjs`
- 新增渠道判定测试：同一消息重复判定幂等、收件授权只扣一次、补答授权每次重核、未认领 / 拒绝 / 抛错的优先级
- `pnpm run test:behavior-list` 全绿
- `pnpm run check:arch -- --write-baseline` 删 9 条（R4 8 条、R2 1 条），R4 基线为空
- `pnpm run verify`

### F 工具声明派生（改逻辑，不改行为）

- 各模块登记工具时补上声明。Life 能力名单由声明派生，取代 `core/life-tool-policy.ts:2-9` 的写死名单（E1b 后在 `life/`）。回顾在普通名单上再加 `read`、`write`，由回顾分支的工具策略声明。
- 上游本地工具和上游 home 挂载的相册工具，由 Life 按 B 批说的方式补登。Her World 自己的相册包装登记的是 `pet_*` 名字（`life/album-tools.ts:13`），它现在的可见条件排除 Life home、guest 和电视（`core/plugin.ts:40-46`），保持不变。`read_review_dialogue` 现在的可见条件是「home 且 Memory 开启」，不检查回顾（`life/review.ts:38`），也保持不变。
- `core/native/history-maintenance.ts:13-24` 改成按工具名查声明里的 `historyOverview`；`full`、已有 `view`、出错、`factIds`、`section` 这些不投影的判断照旧。概览函数仍在各模块，由模块交给登记表，Core 不再 import。
- 对照测试：派生出的普通 Life 名单和回顾名单，与现在两份集合双向相等；四个工具的历史概览结果逐字节相同；在请求中实际触发一次投影；模块卸载后它的工具不再投影。

验收：

- `pnpm run build && node --test dist/tests/life/life-tool-policy.test.js dist/tests/core/history-maintenance.test.js dist/tests/life/context-overview.test.js <新增对照测试>`
- `pnpm run check:arch -- --write-baseline` 删 3 条
- `pnpm run verify`

### G 命名分开（搬家）

product.md 要求 `source.kind`、`NativeScope`、`MemoryScope`、`scopeId` 分别命名：

- **`source.kind`**：Her World 认得的取值写成一个声明出来的类型（5.8.1 的 7 种），放在 `contracts/tables.ts`，来源适配器按它认领。原生消息里 `source.kind` 的字段名和取值不变。
- **`NativeScope`**：持有它的标识符改名，`CoreNative.scopeFor / resolveScope` → `nativeScopeFor / resolveNativeScope`，`core/native/agent.ts` 的 `scopeFor / sameScope` 同理；调用方一起改（`channels/sessions.ts:74,88,172`、`emotion/plugin.ts:167,275`、`memory/batch.ts:23` 等）。
- **`MemoryScope`**：TypeScript 内部把 `workspaceId` 改名为 `bankId`。传给 Python 的进程环境和请求 `scope` 仍是现在的形状，只在 `memory/client.ts` 里转换一次。和真正的工作区 ID、Core 记录里的历史字段（如 `memory-source-work.workspaceId`）不混用，后者不改（拍板点 6）。
- **Emotion 的绑定**：`emotion/plugin.ts:166-171` 的两个分支统一成 `EmotionBinding = {id, path, guest}`，不再一个分支展开整个绑定目标。
- **`scopeId`**：不改名，在 `core/runtime.ts:9` 加注释写明它是伙伴身份的作用域。
- 不改任何序列化字段、事件名、服务名。

验收：

- `pnpm run check:types && pnpm run build && node --test <受影响模块的测试>`
- Memory：两个不同 ID 的工作区各自召回、重启后恢复（`tests/regressions/audit-r6-memory-scope.test.mjs:183` 一类）；`.venv/bin/python tests/memory/memory_provider_test.py`
- 合成副本：`node scripts/fixtures/synthetic-companion.mjs --out <空目录> --variant current` 和 `--variant legacy` 都能生成
- `pnpm run check:arch`、`pnpm run verify`

### H 复测、度量与文档

- 按下一节做复测，结果写进 product.md「典型修改前后对比」，新增一列「M2 后」。
- 更新 product.md 的 G5 表：R1–R4 条目数；模块间依赖按有向端点合并去重、剔除自环和未知端点，不把各规则的行直接相加；R8 用 `--report` 同口径（M2 前是 1073 条、464 个定义）。
- product.md：M2 表第一行改为只含能力状态表，初始化表并入 M3（若拍板点 3 选推荐）；第 4、5 类的判法写进 `:127`（拍板点 1）。
- architecture.md：2.2 的「现在的做法」改成现状，写明登记完成屏障未实现及原因；5.8 的「无测试」换成测试位置，写明每一行由哪个适配器登记；5.10「新增工具」「新增输入来源」两行写成现在的做法。
- AGENTS.md「新增东西去哪里登记」：工具、输入来源两行改成登记口。
- docs/decisions.md 记下拍板点 1、3、4、5、10 的决定。
- M2 验收后，本方案文件按规则删除，长期有用的内容并入正式文档。

## M2 结束时的复测

门槛以 product.md 为准：第 4、第 5 类改动的文件数减半，并且只动一层（product.md:127）。没达到门槛，就在 M3 开始前转为缩小（[decisions.md](../decisions.md) 2026-11-18）。

**起点**：G 批合并后的 `main` 提交，记作 `<M2 末>`。

**做法**：和 M1 的前 3 题一样，在独立分支上真的实现一遍，先有能跑通的测试再计数，只度量、不合并，分支保留。

**计数**：每个实验提交相对 `<M2 末>` 的已提交累计差异（`git diff --stat <M2 末>..<提交>`），规则同 [development.md](../development.md#baseline-counting)。主列只比手写 `src/` 文件，因为基线的第 4、5 类是排除测试、文档和构建产物的读码下限；测试、跟踪的构建产物、生成源和上游依赖另列。层和模块按实际路径映射 `arch/layers.json`。每题列出文件清单和层，写明是否达到门槛。

| 题 | 分支 | 具体改动 | 基线 | 预计 |
| --- | --- | --- | --- | --- |
| 4a 新工具，仅主人用 | `codex/m2-retest-4-tool` 第 1 个提交 | 只读工具 `pet_body_brief`，返回身体概况 | 1 | 1（基线已是最少，无法减半） |
| 4b 同上，Life 也可用 | 同一分支第 2 个提交 | 声明加上 Life 来源 | 2 | 1 |
| 4c 同上，另加历史概览 | 同一分支第 3 个提交 | 声明加上 `historyOverview` | 4 | 2（登记处 + 概览函数） |
| 5a 后台来源 | `codex/m2-retest-5-source` | 只在 home 准入的系统提醒来源：只开 `check_alarm`，记忆观察记为系统来源，不更新情绪；测试要验证 `check_alarm` 的本地挂载、后台判定、证据归属，以及其他工具被拒 | 至少 3 | 1 |
| 5b 聊天平台 | 不建分支，用基线同样的读码方法 | 新增一个与 QQ 同级的私聊平台 | 至少 5 | 至少 5（新适配器 + 4 个 Channels/Console 接点；第一层 0 个） |

判定按拍板点 1。

## 特殊情况

- **模块未加载**：能力行、来源适配都只来自已加载的模块。没登记的来源一律拒绝，和现在一样（`core/native/conversation.ts:23,39-40`）。能力行按拍板点 4。
- **启动窗口**：模块还没登记时，它的来源返回 `unclaimed` 并拒绝，和现在「字段还没赋值」的结果一致；不带 `identity` 的主人输入由 Core 自己的登记处理，照旧直接准入。
- **模块卸载、重载**：撤销登记，租约失效，在途回调不再写入。Life 卸载后后台轮次一律拒绝、回顾文件守卫拒绝而不是放行；Room 关闭后电视输入不再准入；渠道关闭后在途轮次被取消、补答授权撤销（现状，`channels/sessions.ts:179-187`）。
- **适配器抛错**：只影响它的来源，按拒绝处理并记日志。
- **工作区换绑**：登记代次和工作区绑定分别复核，A→B→A 后旧回调失效（沿用 `core/native/memory.ts:39-45` 的做法）。
- **旧数据兼容**：不改数据格式，不加迁移步骤，不碰 `manifest.json`。
- **打包后能否运行**：不改 `package.json` 的 `exports / files / imports`；新文件都在 `src/` 下，随构建进 `dist/src/`。`./core` 导出的 `PetCoreHost` 少几个可写字段（拍板点 5），E1、E2 当批就更新门禁测试和三个原生检查脚本，不等 M3。
- **并发**：两个模块抢同一个键直接报错（契约），不按加载顺序覆盖。

## 概念与扩展检查

- **新增或修改的概念和拥有者**：
  - 能力状态行：提供它的模块拥有，表由第一层提供；公开 `id/owner` 的词表仍归第一层 contracts。
  - 来源适配器和会话策略行：来源所属模块拥有（Life：第 3、4 行；Room：第 8 行；Channels：第 5、6 行；Desktop：第 7、9 行的声明）；Core 拥有主人原生输入（第 1、2 行）。
  - 前台 / 后台分类（`turnKind`）和主人接管资格：由适配器声明，取代 Core 的字符串判断。
  - 伙伴工具声明：工具所属模块拥有；上游工具由引入它的模块补登。
  - 判定结果四种取值：第一层 contracts。
  - 播放证据接缝、Memory 开关：从可写字段改成登记 / 方法，拥有者仍是 Emotion、Memory。
- **新增词表**：判定结果 `unclaimed / rejected / accepted / failed`；`turnKind` 两种；工具来源 `owner / life / review / guest / tv`（和 `source.kind` 不是一一对应，回顾是 `dsh-world-life` 的分支，guest 是带 `identity` 的 `user` 的分支，电视是 `chatpet-room-tv`）；`source.kind` 的本地声明类型（G 批）。新增前先跑 `pnpm run check:arch -- --report` 查 R8，有同值集合就复用。
- **复用的已有声明**：`ModuleId`、`CapabilityId` 的公开联合（不扩大）；`WorldPromptRegistration` 的撤销和附着写法；`assertBinding` 的绑定复核；会话策略表 5.8 的 9 行；`ContractError` 的 `effect / retry` 只在登记出错时使用（`effect: 'none'`、`retry: 'never'`），登记表的判定不走它。
- **层间接口的变化**：第一层对外新增三个登记口和 `isGuest` 查询，符合 5.1「会话接缝只暴露登记，不暴露可赋值的函数字段」；删除 `host.native` 的四个可写字段，Memory 开关改成方法。第二、三层不新增对外接口。
- **为什么需要这些新职责，对应哪个用户场景**：它们取代 Core 里写死的上层策略，让「新增工具」「新增输入来源」只改一处。对应核心场景 1、2、4（同一个伙伴的身份、记忆和权限贯穿原生聊天、桌宠、Room 和渠道）；A 批的真实流程还覆盖场景 3（生活、回顾和日记）。没有新增用户功能。

## M2 表格对照

| product.md M2 的一行 | 完成标准 | 由哪批交付 |
| --- | --- | --- |
| 能力状态表、初始化表 | Core 不再读上层服务拼状态，不再写死目录；对应的 R1–R2 违规清零 | C（能力状态，R2 7 条）；初始化表移到 M3（拍板点 3） |
| 来源适配表 | `lifeAdmission / roomAdmission / channelBoundary` 赋值消失，R4 对第一层全绿；Life 相关行为清单通过 | E1、E2；A 的测试 |
| 会话策略表并入来源适配表 | 9 种会话每行有测试，三个授权面分别声明并有测试；渠道原消息核验和一次性授权保留；四个名字分别命名 | A（测试）、B（行结构）、E1/E2（声明和完整性测试）、G（命名） |
| 能力状态契约 | 硬编码对应关系清零；新增工具不再改 `core/life-tool-policy.ts` | C（能力行对应）、F（工具派生） |
| 回退后找回新版期间聊天（可选） | 若做：副本演练 | 不做（拍板点 8） |

按目标完成后：R4 `10 → 0`；Core R1 `8 → 5`（初始化表的 2 条随 M3），R2 `22 → 14`；全仓 R1–R4 目标 `81 → 60`。

## 停止条件

沿用 product.md M2：

- 同一条行为清单两轮修不好：停下来，整理已确认的事实交给独立会话分析，不硬改测试。
- 来源适配表装不下某类输入（例如渠道的一次性授权、回顾的文件守卫）：停下来，回到 architecture.md 补契约，不硬套。
- 同一个不变量第二次失守：按 G3 提前复盘。
- 执行中发现要改的文件超出本批「允许修改」，或碰到未列入的高风险文件：停下来对齐。

## 拍板记录

1. **第 4、5 类复测怎么判。** 推荐：第 4 类按 4b、4c 判减半和只动一层，4a 基线已是 1 个文件，只要求不增加；第 5 类按 5a 判，5b 照样计数并如实记录，只要求它不改第一层，剩下的 Channels、Console 文件归阶段 3 的设置字段声明。H 批把这个判法写进 product.md:127。另一个选项是按原文严格判：4a、5b 都会不达标，M3 前就要转为缩小。决定：按推荐（主人 2026-11-18）。
2. **工具结果的历史概览放进 M2。** 推荐放进（F 批）：这是 5.10「历史瘦身识别」的派生；提示词段、状态快照退休和召回仍留在 M3。决定：按推荐（主人 2026-11-18）。
3. **初始化表移到 M3。** 推荐移：部分加载时的新装、启动检查、显式重做、回退旧版语义要和 M3 的存储句柄一起定，改的又是高风险文件，而且不影响 M2 的复测。M2 表第一行改为只验收能力状态表。另一个选项是留在 M2，那就要在本方案里先定清上面四种情况各自的结果，并为旧版回退、晚加载模块、中途失败再试加合成演练。决定：按推荐（主人 2026-11-18）。
4. **模块没加载时的能力行。** 推荐：没加载的模块没有行；设置页对「本来有行、现在没有」的拥有者显示「不可用」，`bilibili` 和 Memory 的显示不变。仍有一处和现在不同：Desktop 缺席但绑定就绪时，现在是「已停用」，改后由 Room 的行决定。另一个选项是不改设置页，缺席时显示「未报告」。决定：按推荐（主人 2026-11-18）。
5. **删除 `host.native` 的可写字段，不留兼容。** 推荐删除 `lifeAdmission`、`roomAdmission`、`channelBoundary`、`playbackEvidence`，`memoryEnabledForNewSessions` 改成方法：完成标准要求赋值消失，仓库内的调用方和三个原生检查脚本在当批更新；仓库外的使用情况不确定，M3 打包验证会在已安装环境里核实。这意味着接受 `./core` 导出对象的源码和运行时接口变化。决定：按推荐（主人 2026-11-18）。
6. **`MemoryScope.workspaceId` 在 TypeScript 内部改名为 `bankId`。** 推荐改：线上字段不变，行为不变；已知问题 2 是否进一步处理仍由主人另定。决定：按推荐（主人 2026-11-18）。
7. **已知问题 1 在 M2 里照原样登记。** 推荐照原样：A 批的测试写明「现状，待主人决定」，E2 的声明也照现状写，以后要改就改声明和这两条测试。决定：按推荐（主人 2026-11-18）。
8. **「回退后找回新版期间聊天」不做。** 推荐不做：它是可选项，M2 不发版，M3 发版前再评估。决定：按推荐（主人 2026-11-18）。
9. **构建产物不计入提交阈值。** 推荐：`dist/src/**` 由 `pnpm run build` 生成，和脚本收紧的基线一样不计入每提交 15 个文件、600 行，但提交里照常包含，提交说明写明。按这个口径，C2、E2 按模块逐个提交可以控制在阈值内；不同意的话，这两批要拆得更细。决定：按推荐（主人 2026-11-18）。
10. **登记完成屏障不在 M2 实现。** 推荐：没找到可用的宿主接点，硬加会让启动窗口里的主人输入被拒。M2 对没登记的来源返回 `unclaimed` 并拒绝（和现在一样），屏障留到 M3，H 批在 architecture 2.2 写明。决定：按推荐（主人 2026-11-18）。

## 验收

- 快测：每批「验收」里列的命令
- 门禁：每批合并前 `pnpm run verify` 和 `pnpm run test:behavior-list` 各跑一次，全绿。Memory 测试要监听本机回环；在不允许回环的沙箱里失败是环境问题，换地方重跑，不记成通过或跳过
- 真实流程：A 批第 10 条 L1 用例，在 A 合并时和 G 合并后各跑一次，都通过
- 手动（主人，可选）：门禁外的 `pnpm run test:native-services`、`pnpm run test:native-room`、`pnpm run test:native-channel-homes` 用已安装的 DSH 程序和合成模型跑，不调用付费模型。M2 开始前和 G 合并后各跑一次（E1、E2 已把脚本更新成断言新登记），结果前后一致；M2 开始前就失败的，记录下来，不阻断
- M2 验收时主人看：违规清单少了哪些（R4 清零，Core R1 少 3 条、R2 少 8 条）；行为清单全绿；第 4、5 类复测结果，按拍板点 1 的判法决定 M3 继续还是转为缩小

## 挑刺与回应

Codex 只读挑刺，对照源码核实，基线条目和加总都对得上。提出的 19 条必须修全部成立或部分成立，已改进正文：

1. **行为清单写法会被索引测试拒绝，夹具证明不了预设过滤、第二步接管和流式 footer。** — 成立。A 批改用 `policyCells` 字段，复用真实工具作用域、QQ 假传输和跨日回顾夹具。
2. **A 批的预期要按 5.8 写细。** — 成立。补了「回顾后提前压缩」的条件分支、真实收件入口、Room 共用历史 / 80 条 / 首步恢复 / 取消、梦话指令。
3. **登记完成屏障没有可用的宿主接点，硬加会改变启动窗口行为；撤销语义要写清。** — 成立。屏障移出 M2（拍板点 10）；B 批写清排序键、重复撤销、旧句柄、租约。
4. **`policyRow` 只有行号和测试 ID，不够结构化；多个来源共用不带 `identity` 的 `user`。** — 成立。B 批的来源适配登记改成带分支、`turnKind` 和完整策略行。
5. **C 批缺完整能力行对照，`owner` 不等于模块，`ModuleId` 还用于授权。** — 成立。C 批加了逐行表和缺席语义，`ModuleId` 不扩大。
6. **初始化按模块登记会改变新装、启动、重做、回退的结果。** — 成立。推荐把初始化表移到 M3（拍板点 3）。
7. **「未就绪无写入」挡不住 `ensurePersisted()` 的副作用；初始化顺序和幂等要细分。** — 成立，随初始化表移到 M3，问题记进「拍板前先看」，留给 M3 方案。
8. **D 的命令和夹具对不上。** — 成立，随 D 移出；G 批的合成副本命令补了 `--out` 和 `--variant`。
9. **E1 两个文件不能只改路径；Life 订阅文件工具事件会新增 R3。** — 成立。E1 拆成改逻辑和搬家两步，文件守卫的订阅留在 Core，Life 只提供判断函数。
10. **渠道准入会被反复调用，不能每次都当作一次性消费。** — 成立。B 批写明判定可重复、幂等、由适配器在首次接受时扣减；E2 加了对应测试。
11. **图片恢复、Memory、Emotion、播放证据各有没写进接口的生命周期。** — 成立。E2 逐项写明时机、租约复核和混合轮次的处理。
12. **删字段和改名会打到方案外的调用方。** — 成立。E1、E2、G 的允许修改加上这些调用方、门禁测试和三个原生脚本，当批更新。
13. **F 批的上游工具、相册包装、回顾阅读工具的现状写得不准。** — 成立。F 批改写，保留原有 `when` 和执行守卫。
14. **G 批漏了 `source.kind`，`MemoryScope` 确实上线路。** — 成立。G 批补上，并写明线上形状不变。
15. **复测预计里 4a 无法减半、5b 下限是 5。** — 成立。复测表和拍板点 1 已修正，计数口径按建议写细。
16. **范围变化和概念检查漏列实际决策。** — 成立。两节重写，补了部分安装、启动窗口、能力行缺席、字段删除、5b 判据、阈值例外和场景 3。
17. **C、D、E 不能整体称为纯搬家；C 批按阈值放不下。** — 成立。每批拆成步骤并标明性质；拍板点 9 写明按模块逐个提交。
18. **`--write-baseline` 同时处理 R8 基线，按条目身份比较。** — 成立。允许修改加上 `vocabulary.json`，要求比对删除身份。另指出 product.md 的 M3 完成标准和阶段 2a/3 的安排有冲突 — 成立，记进「拍板前先看」，留给 M3 方案。
19. **验收命令大多存在，专项证据缺。** — 成立。各批补了专项测试。

建议三条（沿用 `attach` 和 `assertBinding` 的写法、Pet 配置解析的复用、保留已核实的锚点）中，第一、三条已并入「必须复用」和正文；第二条随初始化表移到 M3。

## 执行结果

（Codex 完成各批后填写，每批 15 行以内）

### A · 补现状测试

- `entries.ts` 接入 Room、Desktop、Emotion 和 guest，`fixture.mjs` 增加原生步进、流和便携日志恢复，`policy-host.mjs` 接入真实 DSH 工具和提示词作用域。
- `channels.test.mjs` 与 `qq-transport.mjs` 复用 QQ 假传输，`families.test.mjs` 复用同一计划写入夹具，`policy-evidence.mjs` 提供回顾、情绪与 Memory 证据断言。
- `policy-room.test.mjs`、`policy-desktop.test.mjs`、`policy-life.test.mjs`、`policy-qq.test.mjs` 分别覆盖 Room、桌面、Life 与回顾、QQ 与 guest。两条共享情绪 footer 测试均标「现状，待主人决定」。
- `index.json` 登记 `policyCells`，`index.test.mjs` 检查 5.8.2–5.8.4 的 82 格均由非 L3 条目覆盖。
- 临时副本中 `pnpm run build` 通过，`node --test tests/behavior-list/policy-{room,desktop,life,qq}.test.mjs` 通过 27 项，失败 0 项。Memory 本机回环可用。
- `pnpm run test:behavior-list` 的索引检查通过 11 项，行为清单通过 48 项，失败 0 项。合并前门禁由 Claude 执行。
- 与方案的差异是 Room 电视仍可见 `pet_emotion_update` 等工具 schema，Room 执行守卫拒绝可见工具的调用。测试按此现状断言。
- L1 用合成宿主复现空闲通知与 QQ 投递之间开始 Life 首步的顺序。接管走真实 Life 入队监听器，重启后核验同一 home、日记和 Memory 来源。
- `git diff --stat 15057f8 -- src dist` 为空。原 A 批已提交 5 次（`521815d`、`d0d49fa`、`306a06b`、`f96c0ca`、`dad46aa`）。首轮返工另提交 5 次（`61d4bd8`、`b9b878d`、`6cef1c8`、`f549784`、`18d25b9`）。
- 首轮返工补强 `policy-qq.test.mjs`、`policy-life.test.mjs`、`policy-room.test.mjs` 的现状断言，更新 `index.json` 的绑定和生命周期覆盖。每项结果见下方审查条目。
- 首轮返工在临时副本运行 `pnpm run build`、`node --test tests/behavior-list/policy-{life,qq,room,desktop}.test.mjs dist/tests/regressions/audit-desktop.test.js`，构建通过，专项测试 44 项通过、0 项失败。`pnpm run test:behavior-list` 的索引检查 11 项通过（82 格覆盖），行为清单 52 项通过，均为 0 项失败。

### B · 登记口骨架

- `src/contracts/tables.ts` 定义登记与租约、能力状态、来源策略和伙伴工具声明类型，`src/contracts/index.ts` 仅增加类型导出。
- `src/core/tables/registry.ts` 实现显式排序、按登记代次撤销、租约校验和原生作用域附着；`capabilities.ts` 校验公开能力及拥有者 ID 并按需计算状态；`sources.ts` 按来源判定并绑定选中分支的回调与租约。
- `tests/core/tables*.test.ts` 覆盖排序、重复登记、四种判定、旧句柄、在途写入失效、真实 DSH 工具作用域及策略分支。提交包含 `dist/src/**` 构建产物，按拍板点 9 排除在提交阈值计数之外。
- 通过 `mise exec -- pnpm run build` 和 `mise exec -- node --test dist/tests/core/tables*.test.js`，专项测试 13 项通过、0 项失败。
- `mise exec -- pnpm run check:arch -- --report` 未找到三组新词表的同值集合。`mise exec -- pnpm run check:arch` 通过，R8 新增 0。
- `mise exec -- pnpm run verify` 的 Node 测试 1,378 项通过、1 项失败。Memory 服务启动后，`tests/memory/memory-process.test.mjs:81` 调用 `/bin/ps` 被沙箱拒绝（`EPERM`），独立调用复现。门禁未通过，后续 Python 测试和打包检查未执行。
- 现有入口继续走原路径。B 批只增加登记口及契约，登记完成屏障按拍板点 10 留到 M3。
- Codex 沙箱不能写 worktree 的 `index.lock`，由 Claude 原样提交为 `8955bb4`（实现、测试和构建产物），执行结果另行提交。
- 首轮返工补齐伙伴工具声明表，并让撤销等待所有作用域清理后汇总错误。构建通过，专项测试通过 16 项、失败 0 项，架构检查通过（R8 新增 0）。完整门禁由验收者在沙箱外执行。

### C · 能力状态表

**C1 改逻辑**

- `src/core/{runtime,index,plugin}.ts` 接入 `CapabilityTable`；独立 Core 保留基础 9 行，DSH 插件追加情绪行，状态仍由 Core 计算。
- `src/console/client.js` 将缺席拥有者显示为「不可用」，保留哔哩哔哩和 Memory 的显示规则；构建重新生成桌宠客户端。
- `tests/core/capabilities.test.mjs` 在 `ceb3529` 上固定逐行输出，覆盖 360 个组合，集中维护模块缺席的期望，并单独断言两份客户端的设置页显示。
- `mise exec -- pnpm run build` 通过；`mise exec -- node --test tests/core/capabilities.test.mjs dist/tests/core/core.test.js` 通过 10 项、失败 0 项；`mise exec -- pnpm run check:arch` 通过，新增违规 0。
- 保留 Core 对应构建产物；已还原构建造成的三份 Channels 声明联合类型顺序差异。完整门禁及提交由验收者处理。

**C2 搬家**

- Life、Desktop、Room、Channels、Voice、Console、Emotion 依次接管能力行，随入口登记和撤销。Core 保留会话行、记忆行和 `petMemory` 缺席覆盖。
- 对照测试覆盖 408 个组合，含 Console 实际卸载和重载。全部加载时的行、顺序、契约版本与 C1 一致。
- 七步构建和专项测试均通过（每步 10 项、失败 0）。工作区架构检查逐步核对待删条目，同源临时副本收紧基线后逐步通过。
- 批末在工作区运行 `check:arch -- --write-baseline`，按身份核对删除 7 条 R2（57、66、67、68、72、77、85），R8 条目身份无变化，最终架构检查通过。
- 提交：Codex 沙箱写不了 index，Claude 按 Codex 的累积快照逐步重放提交（C1 `a7986aa`，C2 `7869678`、`724bf38`、`bbf1763`、`60aefa0`、`48a7522`、`73f30b4`、`6cc4798`）。和方案的差异：基线不在批末一次删除，而是每个模块的提交里用 `--write-baseline` 删去该步消失的条目，保证每个提交 `check:arch` 都通过；合计删除的仍是上面 7 条，最终文件和 Codex 的批末快照逐字节一致。

## 审查结论

### A 批第一轮（Claude 核实 Codex 审查，返工）

已核实：改动只在 `tests/**` 和本方案内；没有删除、skip 或放宽已有测试；`families`、`channels` 两个文件只是把 `ownerPlan` 和 QQ 假传输抽成共享代码。`pnpm run build` 通过，`pnpm run test:behavior-list` 48 条全部执行并通过。夹具的 `policy` 模式用真实 DSH 工具作用域、守卫和提示词组装，断言落在真实服务状态上，没有只断言 mock 的测试。两条「现状，待主人决定」（M2A-07、M2A-21）按现状断言共享情绪被写入。L1（M2A-22）从合成 QQ 传输进入真实渠道入口，由真实 Life 入队监听器把收件转成后续步，并在第二步解除限制。

问题在于：82 格里有几格登记了，但对应的测试并不检验这一格的行为；还有两处断言太宽，删掉被测守卫也能通过。下面 8 条都要修，修完 `index.test.mjs` 的格覆盖检查和行为清单要照样全绿。

1. **L1 证明不了重启后复用了同一个 home。** `tests/behavior-list/fixture.mjs:115-119` 的 `sessionController.create()` 没收到 `sessionId` 时总是返回 `home`；而 home 的创建（`src/core/companion-foundation.ts:116`）正好不传 ID。所以即使重启后丢了 `life.json` 里的 home 记录、重新建了一个，`policy-qq.test.mjs:153` 的 ID 相等断言也会通过。改法：不带 ID 的创建要分配新 ID，或者记下创建调用，断言重启后没有再建。这是方案第 10 条「重启后仍是同一个 home」的核心证据。

   已修：监测各次启动的原生会话创建调用。首次打开 home 时创建一次，最终重启后打开同一 ID 时创建零次。
2. **「忙碌」和「最小间隔」两个条件实际没被检验。** `policy-life.test.mjs:83-85`、`:96-99` 在 `tick()` 之后马上看 `calls`；但 `src/memory/batch.ts:102` 先同步写 `lastAttempt`，然后要等 `:38` 的 `memory.prepare()` 返回才调用压缩替身。所以即使删掉空闲判断或最小间隔判断，这两处断言也会通过。改法：在这两个时间点断言 `memory-batch` 的 `lastAttempt` 没变，等条件满足后再断言它更新了。方案第 9 条明确列了空闲和最小间隔。

   已修：直接断言忙碌和最小间隔内持久化的 `lastAttempt` 不变，确认空闲且间隔到期后才更新并压缩。
3. **「恰好一次」证明不了回顾通知只用一次。** `policy-life.test.mjs:89-102` 首次压缩之后，每次都重新发一条 `pet/life.review`，所以即使删掉 `src/memory/batch.ts:104` 的 `reviews.delete()`，用例也会通过。改法：先加一条普通轮次，不发新通知，时间推过最小间隔，但不到轮数和闲置阈值，断言没有再压缩。

   已修：压缩处理完待办后新增一条普通轮次，保持在轮数和闲置阈值以下。超过最小间隔且没有新通知时，压缩尝试时间、待办轮数和调用次数均符合预期。
4. **`5.8.2#6/绑定` 没有真实断言。** 这一格只登记给了 M2A-20，而 M2A-20 从头到尾绑定都没变。5.8.2 第 6 行的绑定列还要求会话 `cwd` 和组合预设不变（`src/channels/sessions.ts:57-58`）。改法：用真实 QQ 收件建立 guest 会话，再分别改 `cwd` 和组合预设，断言旧会话不再准入；或者找一条门禁内确实断言这一点的已有测试来登记。

   已修：M2A-33 经真实 QQ 收件建立 guest 轮次，分别改变会话 `cwd` 和组合预设并验证同一消息被拒，恢复后准入。绑定格由 M2A-33 覆盖。
5. **`5.8.2#8-tv/绑定` 没有真实断言。** M2A-02 只改了消息 ID 和会话 ID，没改绑定；M2A-08 的私聊换绑不经过电视准入（`src/room/chat.ts:78-81` 的 `allows` → `isRoom`）。这一格属于原本「无测试」的第 8 行，必须补上。改法：电视请求还在途时切换绑定，断言同一会话、同一画面的准入失效。

   已修：M2A-02 在电视请求仍在途时改变工作区路径，核验同一会话与同一画面被拒，恢复路径后完成原轮次。
6. **`5.8.2#9/绑定` 登记错了测试。** M2A-11 一直用同一个绑定。门禁内已经有 `tests/regressions/audit-desktop.test.ts:162`（`F6: workspace changes abort an in-flight direct LLM request and suppress old output`），把它登记成新条目，覆盖这一格即可（`file` 用 `dist/tests/regressions/audit-desktop.test.js`）。

   已修：将绑定格改登记给 M2A-34，运行原有 Desktop F6 回归，验证换绑中止请求且晚到输出不会呈现。
7. **`5.8.3#3/记忆` 登记错了测试。** M2A-22 只核验了 QQ 主人消息、回顾输入和回顾回复，没核验普通 Life 自主输入进 Memory。改法二选一：登记 `tests/life/life-memory-integration.test.ts:94`（`actual Body facts and a Life reply keep a complete eligible Core-to-Memory source graph`，还覆盖事实登记）；或者在 M2A-22 里给 `autonomous` 加一条 `virtual_action` 的观察断言。

   已修：M2A-22 核验普通 Life 自主输入以伙伴的 `virtual_action` 进入 Memory，带有原生会话归属和已确认的观察记录。
8. **渠道关闭时取消已准入主人轮次，没有测试。** 方案第 3 条要求「取消」单独一条；5.8.2 第 5 行生命周期列写的是 `src/channels/sessions.ts:185`。M2A-24 关闭的是补答轮次，而补答不进 `accepted`，所以不会触发取消，用例也没断言 `cancellations`。`audit-r7-channel-nudge.test.ts:86` 只覆盖撤销授权。改法：真实 QQ 主人收件在 home 里开始轮次，关闭渠道，断言 `f.cancellations` 里有 `{id: home.id, reason: {kind: 'user'}}`，然后登记到 `5.8.2#5/生命周期`。

   已修：M2A-35 让真实 QQ 主人收件在 home 开始原生轮次，关闭渠道组件后收到恰好一次 `{kind: "user"}` 取消，并拒绝原收件再次准入。登记到 `5.8.2#5/生命周期`。

不用返工，但要记下来：

- 方案第 7 条写「guest 和电视看不到 `pet_emotion_update`」，现状是电视看得到、调用时被 Room 守卫拒绝。测试按现状断言是对的。H 批要把 architecture 5.8.3 第 8 行情绪列的「没有工具」改成「工具可见，执行被拒」。
- 建议：5.8.2#6/生命周期（关闭渠道时取消在途 guest 轮次，`src/channels/sessions.ts:184`）也只登记给了恢复用例，可以和第 8 条一起补一条断言。

  已修：M2A-36 经真实 QQ 收件启动 guest 轮次，关闭渠道组件后收到恰好一次原生取消，并拒绝原收件再次准入。登记到 `5.8.2#6/生命周期`。

### A 批复查（第二轮，通过）

逐条核对 8 条和那条建议，都已修好，而且新断言能区分对错：删掉被测的守卫或判断，对应用例会失败。

- 第 1 条：`sessionController.create` 的计数在每次启动时重新挂上（夹具每次启动都会调用 `configure`）。首次启动计 1 次，重启后计 0 次。
- 第 2、3 条：现在断言的是持久化的 `lastAttempt`，不再只看压缩替身被调用。旧通知那一步，最后一次 `tick` 正好推满 5 分钟间隔，且低于 200 轮和 60 分钟两个阈值，所以只要 `reviews.delete()` 没了就会再压缩一次，用例会失败。
- 第 5 条：换绑后 `src/room/chat.ts:78-81` 的 `allows` → `isRoom` → `existing` → `binding()` 抛错，被捕获后返回 `false`，走的确实是电视准入守卫。
- 第 4、6、7、8 条和建议：M2A-33～36 和 M2A-22 新加的断言都落在真实入口和真实服务状态上；M2A-22 不再登记 `5.8.2#5/生命周期`，改由 M2A-35 覆盖。
- 复跑：`pnpm run build` 通过；`pnpm run test:behavior-list` 的索引检查（含 82 格覆盖）通过，行为清单 52 条全部执行并通过。`git diff --stat 15057f8..HEAD -- src dist` 为空。
- 本节和「执行结果」里提交说明的修正由 Claude 写，随合并提交进入 `main`。

### B 批第一轮（Claude 核实 Codex 审查，返工）

已核实：改动只在 B 批允许的文件内（`src/contracts/{tables,index}.ts`、`src/core/tables/**`、`tests/core/tables*.test.ts`、对应 `dist/src/**` 和本方案），没有接线，`arch/layers.json` 未改。`pnpm run build` 后重新生成的 `dist` 与提交一致。沙箱外 `pnpm run verify` 通过（136 个测试文件，模型调用 0）。Codex 执行时门禁失败是沙箱禁止 `/bin/ps`，属环境问题。测试用真实 Cordis 作用域和 DSH 工具，没有只断言 mock 的。

下面 2 条要修：

1. **少了第三个登记口：伙伴工具声明。** 方案 B 节和「概念与扩展检查」写的是「新增三个登记口」（能力状态、来源适配、伙伴工具声明），F 批要从声明派生 Life 名单和历史概览，上游本地挂载的工具也要「由所属模块用同样的声明结构补登」。现在 `src/contracts/tables.ts:121-125` 只有 `CompanionToolDeclaration` 类型，`src/core/tables/` 没有对应的登记表。改法：按 `CapabilityTable` 的写法加一个声明表，复用 `RegistrationTable`：按 `name` 唯一，校验 `sources` 只取五种工具来源；能按来源列出声明，取到的 `historyOverview` 回调要带租约，撤销后失效。工具执行仍走原生 `tools.register`，本批不接线。补对应测试。

   已修：`CompanionToolTable` 复用 `RegistrationTable` 按工具名唯一登记，使用契约里的五种来源校验，提供按名称查找和按来源列出。取出的历史概览回调在撤销后失效。测试用现有 Life 历史投影验证回调行为。

2. **一个作用域清理同步抛错，会让其余作用域都不清理。** `src/core/tables/registry.ts:66-69` 在 `map` 里依次调用 `attachment.dispose()`。Cordis 的 `effect` 返回的 `dispose` 是同步执行的（`node_modules/@deepseek-ai/cordis/src/fiber.ts:114-117` 的 `runDisposable` 不捕获异常），所以 `release()` 同步抛错会打断 `map`，后面的作用域不再清理；而登记键已经删掉了，再调 `revoke()` 也补不回来，旧的工具限制会一直留在那些预设上。这违反 2.2「撤销之后，在途调用必须失效」。改法：每个作用域的清理单独执行并收集错误，全部结束后再抛出（例如 `AggregateError`）。补一条测试：两个作用域里前一个清理抛错，后一个照样被撤销。

   已修：撤销先使登记租约失效，再独立执行各 Cordis 作用域的清理，等待全部结束后用 `AggregateError` 报告失败。回归测试确认第一个作用域同步抛错后，第二个作用域仍异步删除其资源，撤销随后才报错。

建议（不影响合并）：

- `install()` 里如果同步重入调用 `revoke()`，`revoke` 会在 `attachment.dispose` 赋值前就返回；之后 `registry.ts:60` 会补做清理，但 `revoke()` 的调用方会早于清理完成就继续往下走。可以让 `revoke` 等这次挂载装完再清理。
- `src/core/tables/sources.ts:59-61` 里，一个适配器抛错会让同一 `source.kind` 后面的适配器都不再判定（`tables-sources.test.ts:58` 按这个语义断言）。`user` 由 Core 主人输入、Desktop、Room、渠道共用，所以 E2 接线时要把 Core 主人输入的 `order` 排在渠道前面，否则渠道适配器出错会挡住主人原生输入。现在的 `acceptsInput`（`src/core/native/conversation.ts:37-41`）对不带 `identity` 的 `user` 直接放行，不经过渠道。

### B 批复查（第二轮）

- 第 1 条：已修。`src/core/tables/tools.ts` 的 `CompanionToolTable` 复用 `RegistrationTable`，按 `name` 唯一，校验 `COMPANION_TOOL_SOURCES`，登记时冻结来源副本；取出的 `historyOverview` 带租约，撤销后失效，同名重新登记不受影响（`tests/core/tables-tools.test.ts`）。
- 第 2 条：已修。`registry.ts` 的撤销改用 `allSettled` 加 `async` 包装，同步抛错也会变成 rejection，所有作用域都清理完后再抛 `AggregateError`；新测试在真实 Cordis 插件作用域里验证，前一个作用域清理抛错时后一个照样被撤销。
- 复跑：`pnpm run build` 后 `dist` 与源码一致；`node --test dist/tests/core/tables*.test.js` 16 项通过；`pnpm run check:arch` 通过（R1–R8 新增 0）。返工由 Claude 原样提交。

