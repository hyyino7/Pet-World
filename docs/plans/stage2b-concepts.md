# 阶段 2b：概念统一（逐概念小步）

- 级别：大改（跨第二层、第三层和 `contracts`，改第二层对外契约的类型，阶段 2 收尾）
- 状态：已确认（2026-11-21，主人全部按推荐通过）

本方案先把 [product.md](../product.md)「2b 概念统一」的完成标准草案定稿（下面「完成标准（定稿稿）」一节，主人确认后替换 product.md 里的草案），再按批次交付。每批只统一一个概念，单独验收、单独合并。第 1 批和度量命令批的执行提示词随方案交给主人；第 2–6 批各有一段「开工细则要定」，开工前由 Claude 补齐行号和答案、主人过目，不另开方案文件。

行号以 `0f94b69` 为准。Codex 挑刺一轮，意见的处理见文末「挑刺处理」。

## 目标与外部变化

**主人看到的**：聊天、记忆、桌宠、Room、QQ、设置页的功能和界面都不变；不改持久数据格式，不需要迁移。升级和平常换包一样（拍板点 7）。

**开发者看到的**：

1. **动作、计划命令、阅读状态、身体指标各只有一份词表**，在 `src/contracts/behavior.ts`。照料入口、角色房间工具、计划 schema、计划校验、Body 执行校验、设置页白名单和按钮都从它派生（拍板点 4）；漏改由类型检查或契约测试拦下。
2. **身体快照的 `behavior` 里多一个 `busy` 字段**：伙伴是否正在进行一项共享活动，由第二层一个函数算出。Desktop 不再自己解释 `her.kind` 判断忙碌（拍板点 3）。
3. **事实按领域有声明、关联类型和一个解码器**；新写入的事实按声明收窄，旧事实照常读出。Python 侧的识别和它由双向契约测试对齐（拍板点 5）。
4. **设置页不再靠解析 `harvest:` 前缀决定保存哪些价格键**，改用 Economy 给出的可写键；账本 kind 从裸字符串变成一处定义的联合类型。
5. **一条度量命令**输出 G5 的自动项（product.md G5 要求阶段 2 结束前有）。
6. kind/action 字符串判断点数回到 283 / 104 以下（含等于）。

序列化字段和外部名称不变：`activity`、`activityId`、`phase`、`kind`、`action`、`type` 等字段名和取值照旧。对外接口只有三处增加：快照 `behavior.busy`、`lifeView` 返回的照料动作清单（拍板点 4）、Economy 配置视图里的可写键。

## 完成标准（定稿稿）

在草案基础上改动的标 ★，理由见「范围变化」。

- [ ] **动作基础表**：`BodyAction` 基础表落地，六种照料动作、十种角色动作、五种计划身体动作由它派生；「词表重复基线」里这三行达到目标（各 1 份）。★ 设置页照料按钮由基础表派生（architecture.md 5.10 已写明按钮是派生项）。
- [ ] **计划命令**：七种计划 kind、阅读状态各一份；★ 计划经济操作（现 4 份）、计划菜园操作（现 3 份）也各一份。
- [ ] **活动与阶段**：内部明确 `label / operationId / currentActivityId` 三种职责（序列化字段不改名）；`BodyPhase`、`ExecutionPhase` 各自命名，执行阶段到身体阶段的有损转换集中成一个函数。
- [ ] ★ **身体状态契约**：第二层输出「忙不忙、当前活动」，Desktop 的吃饭素材守卫改读它。「能否被打断」现有行为按动作而异、没有消费方，延到阶段 3（拍板点 3）。
- [ ] **事实**：`domain` 与 `type` 有关联类型和统一解码器；★ 新写入按声明收窄、历史事实不因 `type` 未知而读不出；Python 侧的领域和 actor 清单与 TS 声明有正反双向契约测试。
- [ ] **全仓三项**：五种身体指标只定义一次；商品类别由 Economy 输出，消费方不解析 ID 前缀；账本 kind 集中一处。
- [ ] **典型修改第 8 类**（照料动作、事实领域）在 2b 合并后的 `main` 上开独立度量分支实做，如实记录文件数和层数（判法见拍板点 10）。
- [ ] **kind/action 字符串判断**回到 283 / 104 以下（含等于）。★ 点数只能靠合并重复的判断减少；改字段或变量名、换成扫描器不认的写法（`.has()`、对象查表）而判断次数没少的，不算。验收逐条对照减少的点。
- [ ] ★ **R8 和规则基线新增条目为零**，消失的条目在同一提交用 `--write-baseline` 收紧。
- [ ] ★ **一条真实流程（G9，L1）**：设置页 `lifeAction` RPC 发「喂食」→ Life → Body 执行 → 事实落库 → 下一轮 `chatpet.interactions` 带出这条事实、原生日志 `flush` 后确认 → 同一事实在另一个会话被召回 → 重启后仍能查到。复用 `tests/behavior-list/native.test.mjs:6-37` 的末端断言，入口从直调 `body.act` 换成真实设置 RPC。
- [ ] ★ **G5 度量命令**：一条命令输出规则违规数、词表重复数、kind/action 点数、手写超过 1500 行的文件数、模块间依赖数；修复批次占比和典型修改基线是人工项，命令列出 product.md 里的最新记录并标「人工」（拍板点 11）。
- [ ] ★ **阶段 2 收尾**：与阶段 2 相关的行为清单条目全绿，门禁全绿；G8 规则复盘；主人验收体验，决定继续、调整还是停下（product.md「每个阶段结束都做三件事」）；发一个版本（拍板点 7）。

停止条件（沿用草案）：同一条行为清单两轮修不好：止损；同一个不变量第二次失守：按 G3 提前复盘。另加一条：某一批为了收拢词表必须改变对外行为（取值增减、拒绝条件或错误文案变化），停下来，回到主人这里重新对齐。

## 范围变化

| 变化 | 为什么 | 替换或延期了什么 | 对应拍板点 |
| --- | --- | --- | --- |
| 计划经济操作、计划菜园操作并入「计划命令」 | architecture.md 5.6 已把它们列在「命令与请求」里，草案没单列；不并的话「每个集合一份」做不完 | 无 | 1 |
| 「能否被打断」延到阶段 3 | 现有行为按动作而异（睡着时 `feed/water` 不改变身体、`pet/poke` 仍生效，`living/body/room.ts:675-688`；是否打断计划看动作和原执行，`room.ts:986-990,1015-1032`），没有一个可以照搬的统一口径，也没有消费方 | 草案「身体状态契约输出能否被打断」延期 | 3 |
| Desktop 吃饭素材守卫改读 `behavior.busy` | 身体状态契约没有消费方就等于没落地；这是 Desktop 唯一按原始 `her.kind` 判断忙碌的地方（`desktop/platform/plugin.ts:680`）。只改这一处判断 | 无。Desktop 其余读身体的地方归阶段 3 | 3 |
| 设置页按钮由基础表派生，`lifeView` 多返回照料动作清单 | architecture.md 5.10 把按钮列为派生项；只做契约测试的话，新增动作仍要手改页面 | 无 | 4 |
| 事实新写入收窄、历史读取放宽 | 封闭的联合类型表达不了库里可能存在的旧 `type`；不分开的话要么类型说谎，要么旧数据读不出 | 无 | 5 |
| 身体指标常量放在 `contracts`（第一层目录） | 草案写「只在第二层定义一次」；`contracts/behavior.ts:45` 的快照类型要引用它，而 `contracts` 不能依赖 `living`。拥有者仍是第二层 | 无 | 9 |
| 点数只能靠合并判断减少；基线新增为零 | 扫描器按字段名认点（`scripts/arch/lib/vocabulary.mjs:35-51`），R8 棘轮按新增条目卡（`scripts/arch/lib/ratchet.mjs`）；写进标准防止为数字做假改动 | 无 | 无 |
| 补 G9 真实流程、G5 命令、阶段 2 收尾三件事 | G9 要求每阶段一条真实流程；G5 写明「阶段 2 结束前改由命令输出」；2b 是阶段 2 的最后一段 | 无 | 11 |
| 情绪、呈现分类器、槽位与素材**不在 2b** | 「词表重复基线」里九种 feeling、Room 七维、两套呈现分类器、第二层的 `roomClip / desktopClip` 四行，草案没有分给 2b；按 architecture.md 5.6，这三个概念的细表在阶段 3 前补。阶段 3 草案已有「槽位与素材分离」，缺这四行各自的验收线，补进阶段 3 草案 | 延期到阶段 3（原本没有分配，现在写明） | 2 |
| `contracts/` 按层拆分不在 2b | architecture.md 2.1 的目标；拆分要重排 `./contracts` 入口的组织，且和典型修改第 8 类的层数判定相关 | 延到阶段 4 按收益再定，写进阶段 4 草案 | 9、10 |

对应的已确认场景：主人照料伙伴后，设置页、Room、桌宠和计划里的同一个动作行为一致，伙伴在别的会话里还记得（核心场景的「同一个伙伴贯穿各入口」）；桌宠在伙伴忙时不接吃饭动作，和 Body 判断一致（已有行为，换成同一个来源）。新增照料动作、新增事实领域是维护度量题（典型修改第 8 类）。原完成标准除「能否被打断」延期外全部保留。

## 批次总览

| 批 | 内容 | 搬家 / 改逻辑 | 依赖 | 分支 |
| --- | --- | --- | --- | --- |
| 1 | 安全网：各入口对词表的现有接受/拒绝、身体阶段投影、Desktop 吃饭守卫、事实读写的行为测试；G9 流程测试 | 只加测试 | 无 | `codex/2b-1-evidence` |
| M | G5 度量命令 | 新增脚本 | 无 | `codex/2b-m-metrics` |
| 2 | 动作基础表 `BodyAction` 及派生；设置页按钮派生 | 改逻辑（行为等价） | 1 | `codex/2b-2-body-action` |
| 3 | 计划命令：计划 kind、经济操作、菜园操作、阅读状态各一份；计划校验按 kind 分派 | 改逻辑（行为等价） | 2 | `codex/2b-3-plan-commands` |
| 4 | 活动与阶段：职责命名、阶段转换函数、`busy`、Desktop 改读 | 改逻辑（只增快照字段） | 3 | `codex/2b-4-body-status` |
| 5 | 事实：领域声明、写入收窄、统一解码器、Python 契约测试 | 改逻辑（行为等价） | 2 | `codex/2b-5-facts` |
| 6 | 全仓三项（身体指标、商品类别、账本 kind）、点数收尾、文档、度量、发版 | 改逻辑（行为等价）+ 文档 | 2–5、M | `codex/2b-6-closeout` |

**并行**：第 1 批和 M 批互不相干，可以同时开。第 5 批要用第 2 批的 `BodyAction`，排在第 2 批之后；它和第 3、4 批都改 `living/body/room.ts`（第 3 批 `:596-636`，第 4 批 `:834-845` 附近，第 5 批 `:992-1042`），区间不重叠，可以和第 3 批并行，后合并的一方解冲突并重跑事实回读和重试测试（拍板点 6）。

**每批的点数**：每批报告 `check:arch -- --report` 里 `R8 kind/action 字符串判断` 两行的数字。某批点数上升要在执行结果里逐条说明，下一批收回；第 6 批结束时必须到目标。R8 和规则基线每批都必须新增为零。

## 第 1 批：安全网（只加测试，不改 `src/`）

固定 2b 要动的每个词表在每个入口上的现有表现，后面各批改完断言不变。测试进 `tests/behavior-list/`，在 `index.json` 加条目，ID 前缀 `2B1-`。只断言旧代码上已有的可观测字段，新版才有的字段（`behavior.busy` 等）留到对应批次再加断言。

| 要固定的行为 | 入口 | 至少覆盖 |
| --- | --- | --- |
| 照料动作白名单 | 设置页 `lifeAction`（`console/settings.ts:221-235`）、`petLife.act`（`living/plan/plugin.ts:656-658`）、`petBehavior.act` 和 `care`（`living/body/plugin.ts:323-363`）、`worldCommands.care`（`contracts/living.ts:34`） | 六个动作都接受；`poke`、`lamp`、空串、非字符串都拒绝，各入口的拒绝码和文案不变 |
| 角色房间动作 | `room_action` 工具 schema（`room/plugin.ts:18,122`）和 Body 核验（`living/body/room.ts:85,992-1003`） | 十个动作的 schema 枚举；`talk` 文本截到 120 字；上游有、角色没有的 `visit` 被拒 |
| 主人房间动作 | 主人 Room RPC（`room/plugin.ts:69,86-95`）→ Body（`living/body/plugin.ts:346-355`） | 上游 `HOME_ACTIONS` 的 15 项（`vendor/feiyu-room-template/home-state.js:23-25`）原样转发，各自写出的事实 `type` |
| 计划 kind 与身体动作 | `life_plan_update` schema（`living/plan/plan-tools.ts:85-122`）、`parsePlan`（`living/plan/plan.ts:76-128`）、`startPlanned`（`living/body/room.ts:596-636`） | 七种 kind 各一条合法步骤；未知 kind、`body` 配 `pet` 被拒；三处错误文案和**各字段的报错先后**不变 |
| 菜园与经济计划操作 | `plan-tools.ts:32-56,111`、`plan.ts:90,101`、`room.ts:73,610,614` | 每种操作接受；`careNow`、`auto` 在计划里被拒；`consume` 数量不为 1 被拒 |
| 阅读状态投影 | `room.ts:834-845`、`living/body/playback.ts:90-94` | `unread / offered / confirmed` 对应的 `presentationKind`、`readingState` |
| 身体阶段投影 | `living/body/plugin.ts:210-230` | 运行中计划的五种执行阶段分别投影成 `moving / working / pending`；无计划时路线、睡眠、等候、停留、反应、已完成任务、空闲各一条 |
| Desktop 吃饭守卫 | `/anim` 路由（`desktop/platform/plugin.ts:672-692`） | 空闲时选吃饭素材触发 `feed`；走路、睡着、非空闲 kind 时返回 `activity-busy`；`react_shy`、`react_scare` 当作不忙（与呈现分类器不同，现状如此）；正在吃饭时选吃饭素材不重复触发；睡觉/起床素材走身体动作；其他身体素材返回 `activity-required` |
| 事实写入 | Body（`room.ts:462-465,666,1034-1042`）、Economy（`living/economy/store.ts:199-207` 及五个调用点） | 每种实际写入的 `type`；同请求重试返回原事实（`room.ts:1006-1012`、`store.ts:209-219`） |
| 事实读取 | Core `observeFacts`（`core/native/conversation.ts:202-220`）、World 按 ID 读（`living/index.ts:289-319`）、Life 按引用读（`living/plan/facts.ts:5-24`）、提示词段准备与确认（`living/prompt-context.ts:70-111`） | Body、Economy 各一条合法事实走通；未知领域、缺字段的现有处理不变；**用合成的旧记录**覆盖一个不在现有写入集合里的 `type`、已确认后回读、日志确认（第 5 批的安全网） |
| Python 识别 | `memory/provider.py:67-86` | `body`、`economy` 接受；其他领域、ID 前缀与领域不符、未知 actor 拒绝 |
| G9 真实流程 | 插件入口加假原生宿主（L1） | 完成标准里那条；另一条计划流程复用 `2A1A-18` 的夹具，固定身体步骤从派发到完成时快照里现有的 `phase` 变化 |

**差异处理**：取证时发现现有行为和 architecture.md 5.6.1 的描述不符，写成差异清单交给 Claude，不在本批修。

## M 批：G5 度量命令

新增 `scripts/arch/metrics.mjs` 和 `pnpm run metrics`。复用 `scripts/arch/lib/scan.mjs` 的 `scan()` 结果（规则违规、R8、`judgments`、依赖边），加一个手写文件行数统计（排除 `arch/layers.json` 里的生成清单、vendor、dist，口径同 product.md G5 第 4 项）。修复批次占比、典型修改基线两项不自动算，列出 product.md 里最新一列并标「人工」（拍板点 11）。只报告，不进门禁。`docs/development.md:147`「尚无独立的仓库度量命令」改为指向它。

**特殊情况**：模块依赖数的口径（去重、排除自环和未知端点）和 product.md G5 第 5 项对齐；第一次跑出的数和手工记录的 60 条对不上时，先查口径，不改手工记录。

## 第 2 批：动作基础表

**做法**：在 `src/contracts/behavior.ts` 放一张基础表，每个动作标明它属于哪些集合；照料动作带设置页按钮文案。具体写法见本节末「开工细则」第 1 条。

由它导出 `BodyAction`、`CareAction`、`RoleAction`、`PlanBodyAction`、`FeedbackAction` 五个类型和对应的只读数组（用 `Object.keys` 加筛选生成，不写新的字面量数组）。替换：

- 照料：`living/body/plugin.ts:25`、`living/plan/plugin.ts:49`、`console/settings.ts:228`、`contracts/living.ts:34`（现在写成计划身体动作加 `'pet'`）。
- 角色：`room/plugin.ts:18`、`living/body/room.ts:85`。
- 计划身体：`contracts/behavior.ts:58`、`living/plan/plan-tools.ts:103`、`living/plan/plan.ts:95`、`living/body/room.ts:611`。
- 互动反馈子集：`living/body/room.ts:820-823`（`pet / poke / water / feed / play / talk`，不限 actor 是主人）。
- 设置页按钮（`console/client.js:656-657`）：`lifeView` 的返回加上照料动作清单（动作和文案），页面按它渲染（拍板点 4）。生成文件 `src/desktop/platform/client.js` 由构建重新生成。

**为什么放在 `contracts`**：`contracts/behavior.ts` 和 `contracts/living.ts` 要从基础表派生类型，而 `contracts` 是第一层模块，依赖里没有 `living`（`arch/layers.json:34-38`）；放进 `living` 就得把这些契约类型一起搬走，`./contracts` 入口（`src/contracts/index.ts:7-10`）也要跟着重排。2a 已把第二层对外契约放在 `contracts/living.ts`（architecture.md 5.2），常量先例是 `contracts/emotion.ts:2` 的 `COMPANION_FEELINGS`。拥有者仍是第二层：只有第二层决定取值，`contracts` 里只放数据和类型，不放判断逻辑。

**R8**：基础表是「值为对象」的对象字面量，扫描器不把它当词表定义（`scripts/arch/lib/vocabulary.mjs:27-28` 只收值全是字符串的对象）；派生数组不是字面量，也不算。替换掉的内联 `.includes([...])` 数组原本各算一个定义（`vocabulary.mjs:16`），替换后 R8 只减不增。

**点数**：`.includes(action)` 换成共享数组仍算 1 点，本批靠合并重复检查减点：`worldCommands.care` 和公开 `act` 共用一次白名单判定（`living/body/plugin.ts:325,362`），保留各自的错误顺序；Life 的 `act`（`living/plan/plugin.ts:657`）是否还要自查一遍，按第 1 批测试决定。预计 action 减 1–2。

**不做**：不改上游 `HOME_ACTIONS`；不改 Desktop 的素材到动作转换（`desktop/platform/plugin.ts:671-689`，第三层适配，5.7 已定）；`catalog-food` 内部动作值不进基础表（`living/body/room.ts:459`）；Desktop 自己开放的 `sleep / wake / pet` 子集（`desktop/features.ts:164-177`、`desktop/platform/plugin.ts:626-635`）是桌宠入口自己的白名单，只把类型改为 `CareAction` 的子集；Economy 主人操作的 `feed`（`living/economy/plugin.ts:264`）是库存投喂，同名不同义，不并；Body 内部的行为分组（`room.ts:1021,1047,1052`）不是集合定义，留在原处。

**开工细则（Claude 补齐，主人过目后开工；行号以 `e96a5e7` 为准）**

1. **集合标记用序号，保住现有顺序。** 三处顺序是外部可见的、第 1 批测试逐字固定了：设置页按钮 `feed / water / pet / play / sleep / wake`（`console/client.js:656`）、角色工具枚举 `command / pet / poke / feed / water / play / talk / sleep / wake / lamp`（`room/plugin.ts:18`，进模型的工具 schema，`concepts-actions.test.mjs:37`）、计划身体动作枚举 `sleep / wake / water / feed / play`（`plan-tools.ts:103`，`concepts-plan.test.mjs:35`）。一张表的键顺序只能满足其中一种，所以每个集合标记写成该集合里的序号，派生数组按序号排。照料标记同时带按钮文案。写法：

   ```ts
   export const BODY_ACTIONS = {
     command:{role:1}, pet:{role:2,care:{order:3,label:'摸摸头'},feedback:true},
     poke:{role:3,feedback:true}, feed:{role:4,care:{order:1,label:'免费基础餐食'},plan:4,feedback:true},
     water:{role:5,care:{order:2,label:'倒杯水'},plan:3,feedback:true},
     play:{role:6,care:{order:4,label:'一起玩'},plan:5,feedback:true},
     talk:{role:7,feedback:true}, sleep:{role:8,care:{order:5,label:'去睡觉'},plan:1},
     wake:{role:9,care:{order:6,label:'叫醒'},plan:2}, lamp:{role:10},
   } as const;
   ```

   值都是对象和数字，扫描器不把它当词表定义；派生数组由函数生成，不是字面量。加一条小测试：每个集合的序号从 1 连续、不重复（漏填或撞号时失败）。

2. **一个判断函数代替四份白名单检查。** `contracts/behavior.ts` 导出类型守卫 `isCareAction(value)`、`isPlanBodyAction(value)`。现在「是不是照料动作」在四个入口各判一次：`console/settings.ts:228`、`living/plan/plugin.ts:657`、`living/body/plugin.ts:325`（`worldCommands.care`）、`:362`（`act`），各自的报错不同（设置页 `INVALID_ARGUMENT`、Life「未知的生活动作」、World 先查绑定再报 `INVALID_ARGUMENT`、Body「未知的身体动作」，`concepts-actions.test.mjs:19-28` 固定）。四个入口都保留自己的检查和报错，只把判断本身换成调用同一个函数。这样字符串判断从 4 处变成守卫里的 1 处，action 预计 105 → 102；这是把同一条规则收成一个定义处，四个入口的检查次数没变，在执行结果里照这个口径写明。计划侧 `plan.ts:95` 改用 `isPlanBodyAction(String(value.action))`，保留 `String(...)` 的宽松准入（差异清单已记）；`room.ts:611` 同样改用它，点数不变。
3. **设置页仍在调用 Life 之前拒绝。** `console/settings.ts:228` 改用 `isCareAction(input.action)`，位置和报错不变。
4. **`lifeView` 多一个 `careActions`。** 由 `console/settings.ts:235` 在返回值上加 `careActions:[{action,label}]`（按照料序号），和现有的 `roomAvailable`、`channelsAvailable` 并列；Life 的 `snapshot()` 不改。设置页按钮改按 `view.careActions` 渲染，按钮文案、顺序、调用的 `lifeAction` 不变。`lifeView` 失败时整张卡片本来就不显示，不加兜底。补一条 L2 测试：`lifeView` 返回的 `careActions` 和按钮顺序、文案一致；用 `lifeAction` 逐个发送都被接受。
5. **Life 的 `act` 保留自查**（它的报错文案「未知的生活动作」被固定，删掉会变成 Body 的文案）。
6. **其余替换照方案**：角色白名单 `room.ts:85` 改为派生集合；反馈子集 `room.ts:820-823` 改用 `feedback` 标记；`contracts/living.ts:34` 改为 `CareAction`；`contracts/behavior.ts:58` 改为 `PlanBodyAction`；Desktop 的 `sleep / wake / pet` 子集（`desktop/platform/plugin.ts:630`、`desktop/features.ts:164`）只加 `satisfies readonly CareAction[]` 一类的类型约束，取值和写法不动。
7. **顺手修的测试**：第 1 批复查留下的建议修，2B1-03 的 `lamp` 改用 `on:false` 核对参数生效（灯原本开着，`on:true` 看不出效果）。
8. **提交切分**（每个 ≤15 文件 / 600 行，`dist/src` 不计）：① 基础表、守卫和第二层、Room、Desktop 的替换，加序号测试；② 设置页 `careActions`、按钮渲染、生成的 `src/desktop/platform/client.js`、L2 测试和 `lamp` 测试。
9. **验收**：第 1 批 13 条和新测试全绿；`check:arch -- --report` 的 action ≤ 103（目标 102），kind 不升；R8 和规则基线新增 0，消失的条目在同一提交收紧；`pnpm run verify`（沙箱外）。

## 第 3 批：计划命令

**现状**：七种计划 kind 完整 4 份（`contracts/behavior.ts:51`、`plan-tools.ts:85-122` 的 `oneOf` 分支、`plan.ts:85`、`room.ts:597`）；计划经济 `buy / sell / consume` 4 份（`contracts/behavior.ts:59`、`plan-tools.ts:111`、`plan.ts:101`、`room.ts:614`）；计划菜园九种操作 3 份（`plan-tools.ts:32-56`、`plan.ts:90`、`room.ts:73`）；阅读状态 4 份（`contracts/behavior.ts:31`、`living/economy/types.ts:67`、`room.ts:53,834`）。

**做法**：

- `contracts/behavior.ts` 放计划 kind、经济操作、菜园操作、阅读状态的表，`PlannedActivity`、`PlannedExecution`、`economy/types.ts:67`、`room.ts:53,834` 改为引用；`plan-tools.ts` 的 schema 枚举从表生成。写法同第 2 批，不新增字面量数组。
- `parsePlan`（`plan.ts:76-128`）和 `startPlanned`（`room.ts:596-636`）的校验改成按 kind 选一个校验函数：同一个 kind 的字段校验、时间策略放在一起，`kind` 只判断一次。错误文案、各字段报错先后、`String(...)` 的宽松准入、Life 新稿与旧存档两条路径的区别、Body 的素材槽校验（复用现有 `requirePresentationSlot`）、回执重放和指纹，全部保留。
- Body 调 Economy 的 `buy / sell` 子集（`room.ts:41`、`living/economy/plugin.ts:27`）改用同一份经济操作表。

**点数**：两个函数现在合计 17 个 kind 点（`plan.ts` 8、`room.ts` 9），算上 `plan.ts:127`、`room.ts:628` 是 19。按 kind 分派后预计减 8 点以上，开工细则里逐条列出合并前后。这是 kind 回到目标的主要来源。

**不做**：Room 菜园工具的 12 个操作（`room/plugin.ts:131`）是角色工具的超集，含 `state / auto / careNow` 等非计划操作，属于 Room 入口自己的词表，只把与计划重叠的部分改为从菜园操作表拼出。

**开工细则（Claude 补齐，主人过目后开工；行号以第 2 批合并后的 `main`（`f3379cd`）为准）**

1. **计划 kind 表带两项属性，代替四份分组。** `contracts/behavior.ts` 放 `PLAN_KINDS`，每种 kind 标两项：`target`（要指定房间位置：`room / move`）和 `executable`（依据真实回执结束、不接受时长：`move / garden / body / economy / read`）。这两组现在各写了两份：「要目标」在 `plan.ts:87`、`room.ts:609`；「可执行」在 `plan.ts:114`、`room.ts:620`，另有它的补集「持续活动 `room / hold`」在 `plan.ts:127`。三处改读表上的属性。属性值是布尔，表的键顺序就是现有 `oneOf` 以外各处共用的 `hold / room / move / garden / body / economy / read`。
2. **一个守卫判断是不是计划 kind。** 导出 `isPlanKind(value)`，`plan.ts:85` 用 `isPlanKind(String(value.kind))`（保留 `String(...)` 的宽松准入），`room.ts:598` 用 `isPlanKind(input.kind)`，报错各自不变。
3. **字段校验按 kind 分派，两边各一张完整映射。** Life 和 Body 的字段校验文案不同（Life 英文、Body 中文），不合成一份；各自写成 `Record<PlanKind, 校验函数>`，TypeScript 要求每种 kind 都有一项，以后加 kind 漏写校验会编译失败。Life 侧承接 `plan.ts:87-112` 的 room/move、garden、body、economy、read 五段；Body 侧承接 `room.ts:609-619` 的 room/move、hold、garden、body、economy、read 六段。分派点放在原来这些段所在的位置，所以各字段报错的先后不变：Life 在公共字段之后、`presentationSlot` 之前；Body 在 `freezeOnPause` 之后、「执行活动不能带 until」之前。没有专门校验的 kind 映射到空函数。
4. **留在原处的两处 kind 判断**：`room.ts:604`（经济食用时取食物素材槽，是素材准入不是字段校验）和 `room.ts:629`（菜园计划的准入等待），它们各只判断一种 kind，不是分组副本。
5. **经济和菜园操作各一张表。** `PLAN_ECONOMY_OPERATIONS`（`buy / sell / consume`）替换 `contracts/behavior.ts:113` 的联合、`plan-tools.ts:112` 的枚举、`plan.ts:101`、`room.ts:615`；Body 调 Economy 的 `buy / sell` 子集（`room.ts:41`、`economy/plugin.ts:27`）改成从它排除 `consume` 的类型。`PLAN_GARDEN_OPERATIONS` 替换 `plan.ts:90`、`room.ts:73` 的 `gardenActions` 和 `plan-tools.ts:32-56` 五个分支里的取值；五个分支的结构和每个分支里的枚举顺序不变，每个操作在表里记它属于哪个分支和分支内序号（同第 2 批的序号写法）。Room 工具的 12 个菜园操作（`room/plugin.ts:131`）是主人入口自己的词表，不动。
6. **阅读状态一张表。** `READING_STATES`（`unread / offered / confirmed`）替换 `contracts/behavior.ts:85`、`economy/types.ts:67`、`room.ts:53,835` 的联合；Economy 存储行只有 `offered / confirmed`（`economy/store.ts:351`），类型写成排除 `unread`。差异清单记的「公开路径上看不到 `confirmed`」不改。
7. **`plan-tools.ts` 的计划步骤 schema 由一张 `Record<PlanKind, 分支>` 生成。** 分支对象的键顺序照现在的 `oneOf` 顺序（`hold / room / move / body / garden / economy / read`），每个分支的 `kind.const` 从键生成；描述文字逐字不变。第 1 批 `concepts-plan.test.mjs` 按 `const` 找分支，顺序另加一条断言。
8. **点数预计**：`plan.ts` 去掉 9 个 kind 点（`:85,87,87,88,94,98,107,114,127`），`room.ts` 去掉 8 个（`:598,609-613,618,620`），守卫新增 1 个，kind 预计 287 → 271；action 不变（102）。字段校验改成按表分派后，每一步只判断一次 kind，这是判断次数真实减少；以后加 kind 由编译器提醒补校验，执行结果里照这个口径写。
9. **提交切分**（`dist/src` 不计）：① 四张表和守卫、`contracts` 类型、Body 侧校验映射、经济和阅读类型替换；② Life 侧校验映射和 `plan-tools.ts` schema 生成，加顺序断言和方案执行结果。
10. **验收**：第 1 批 13 条和第 2 批测试全绿且断言不改；`check:arch -- --report` 的 kind ≤ 275、action 不升；R8 和规则基线新增 0；`pnpm run verify`（沙箱外）。

## 第 4 批：活动、阶段和身体状态契约

**现状**：`currentActivityId` 在 `src/` 里没有出现（只在文档里）；`activityId` 的取值混着执行编号、菜园任务号、照料任务号和自动摘要（`living/body/plugin.ts:212,222,227`）。执行到身体的有损转换在 `plugin.ts:222-223`（运行中计划只保留 `moving / working`，其余归 `pending`）。身体的 `completed` 来自 `task.completedAt`（`plugin.ts:224-230`），而计划、库存投喂和角色动作都会产生任务（`room.ts:459,544,975-981,1044-1048`），和执行的 `completed` 同名不同义。

**做法**：

- 命名：`contracts/behavior.ts` 导出 `BodyPhase`、`ExecutionPhase`、`ExecutionStatus`。内部变量和参数按职责叫 `label`（自然语言标签）、`operationId`（已派发操作）、`currentActivityId`（快照里的当前活动）；序列化字段 `activity`、`activityId` 不改名，在类型旁注明对应职责和取值来源。
- 转换函数：`living/body/` 新增纯函数 `bodyPhaseOf(execution)`，承接 `plugin.ts:222-223` 的投影，注释写明 `waiting` 变成 `pending`。两种 `completed` 的区别写进类型注释。Body 里另有几处把原始身体或上游菜园状态投影成**执行**阶段（`room.ts:214-215,565,955,964-965,970-971`），方向不同，留在原处，只改为引用 `ExecutionPhase`。设置页的执行阶段标签（`console/client.js:638`）加契约测试比对 `ExecutionPhase`。
- `busy`：同目录新增 `companionBusy(her)`（不用 `bodyStatus` 这个名字，Desktop 已有同名方法表示桌面进程状态，`desktop/platform/plugin.ts:249`）。口径**照搬 Desktop 现在的判断**：睡着、走路、或 `kind` 不在 `idle / play / idle_look / react_happy / react_pout / react_shy / react_scare` 里（`desktop/platform/plugin.ts:680`），输入同样是 `homeView` 投影后的 `her`，不是原始存档状态。结果放进 `BehaviorActivity`，因为 Desktop 读的 `roomState()` 只转发 `home` 展开和 `behavior`，不转发快照根字段（`living/body/plugin.ts:340-344`）。
- Desktop：`desktop/platform/plugin.ts:680` 改读 `behavior.busy`。没有身体时（`her` 缺席）原来 `busy` 为假，改后同样为假，不需要兜底。两处「正在吃饭」判断（`:686,690`）合成一处，留在 Desktop 适配层（5.7 定的兼容行为）。睡觉/起床分支、`activity-required` 分支、素材同一性判断不动。

**点数**：Desktop 这段是 3 个 kind 点，白名单搬到 Body 仍计 1 点，吃饭判断合并减 1，本批净减约 1。

**不做**：「能否被打断」（拍板点 3）；两套呈现分类器（已知问题 4）；`ActivityClip` 搬家；删 `home:any`；Desktop 其余读睡眠和身体存在的地方（`desktop/features.ts:121,199,246-260`、`desktop/platform/plugin.ts:325,331,667`），它们读的是睡没睡、有没有身体，不是忙不忙。

**开工细则（Claude 补齐，主人过目后开工；行号以第 3 批分支 `a4cc63a` 为准，合并后 `main` 相同）**

1. **三种职责用类型别名写明，不改字段名。** `contracts/behavior.ts` 导出 `ActivityLabel`（自然语言标签）、`OperationId`（已派发操作）、`CurrentActivityId`（快照里的当前活动，`string | null`），分别用在 `PlannedActivity.activity`、`PlannedActivity/PlannedExecution.operationId`、`BehaviorActivity.activityId` 上，旁边注明取值来源：`activityId` 可能是执行编号、菜园任务号、照料任务号或自动摘要（`living/body/plugin.ts:221-226`）。序列化字段名一个不改。
2. **阶段类型各自命名。** 导出 `BodyPhase`（`BehaviorActivity.phase`，`contracts/behavior.ts:128`）、`ExecutionPhase`、`ExecutionStatus`（`PlannedExecution` 的 `phase`、`status`），原处改为引用；`room.ts` 里 `updateExecution` 的阶段和状态参数跟着用这两个类型。类型注释写明两种 `completed` 的区别：身体的 `completed` 来自 `task.completedAt`（`plugin.ts:229`），执行的 `completed` 包括失败和取消的终态。
3. **有损转换一个函数。** `living/body/` 新增纯函数 `bodyPhaseOf(phase: ExecutionPhase): BodyPhase`，承接 `plugin.ts:222` 的投影（`moving`、`working` 照搬，`pending`、`waiting`、`completed` 都变成 `pending`），注释写明丢了什么。Body 里把原始身体或上游菜园状态投影成执行阶段的几处（`room.ts` 的菜园、睡眠、移动分支）方向相反，留在原处，只改用 `ExecutionPhase` 类型。阶段不是 kind/action，点数不变。
4. **`busy` 在快照里按画面投影算。** Desktop 读 `petBehavior.roomState()`（`desktop/platform/plugin.ts:368`），它返回的 `behavior` 来自 Body 快照的 `this.activity()`，`her` 来自同一份快照里 `presentHome(bound.room.view())` 的画面投影（`living/body/plugin.ts:315-317`）。所以新增纯函数 `companionBusy(her)`（`living/body/` 下），在快照组装处用同一个 `home.her` 算出 `busy`，放进 `behavior`；`roomState()` 原样转发 `behavior`，不用改。口径照搬 `desktop/platform/plugin.ts:682`：有 `her` 且（睡着、走路、或 `kind` 不在 `idle / play / idle_look / react_happy / react_pout / react_shy / react_scare` 里）。没有 `her` 时为 `false`，和现在 Desktop 的 `busy` 一样。注释写明它和呈现分类器（`living/body/presentation.ts:18-19`）的白名单为什么不同：一个管 Desktop 能不能插入吃饭，一个管画面选什么分类。
5. **Desktop 改读。** `desktop/platform/plugin.ts:682` 改成读 `this.behavior?.behavior?.busy`；`:688`、`:692` 两处「是不是正在吃饭」合成一个局部变量，留在 Desktop 适配层。睡觉/起床分支、`activity-required` 分支、素材同一性判断不动。白名单从 Desktop 搬到 Body 仍算 1 个点，吃饭判断合并减 1，kind 预计 271 → 270。
6. **设置页执行阶段标签**（`console/client.js:638`）加契约测试：标签表的键和 `ExecutionPhase` 一致。标签是界面文案，留在页面。
7. **测试**：第 1 批 2B1-07、2B1-08 断言不改；新增 L2 测试从公开快照断言 `behavior.busy` 在空闲、走路、睡着、非空闲 kind、`react_shy` 几种状态下的取值，并和 Desktop `/anim` 的接受/拒绝对上；`bodyPhaseOf` 由 2B1-07 的五种执行阶段覆盖，不另写只断言常量的测试。
8. **提交切分**：① 职责别名、阶段类型、`bodyPhaseOf`、`companionBusy` 和快照字段，加 L2 测试；② Desktop 改读和吃饭判断合并、阶段标签契约测试、方案执行结果。
9. **验收**：第 1–3 批测试全绿且断言不改；kind ≤ 271、action 不升；R8 和规则基线新增 0；`pnpm run verify`（沙箱外）。

## 第 5 批：事实声明

**现状**：领域清单 `body / economy` 散在 `contracts/interaction.ts:13`、`core/native/conversation.ts:206`、`living/index.ts:290`（按 ID 前缀反推领域）、`living/plan/facts.ts:9`、`living/plan/plugin.ts:277,308,440,445`、`living/prompt-context.ts:70`、`memory/provider.py:76`；上游还有封闭的 `FactRef`（`vendor/dsh-world/lib/life/types.d.ts:27`），新增领域会碰到上游边界。`type` 没有任何地方校验（`conversation.ts:206-208` 查的是版本、ID、领域、actor、摘要和时间）。实际写入的 `type`：Body 写动作字，主人房间入口原样转发上游 `HOME_ACTIONS` 的 15 项（`home-state.js:23-25`，含 `sick / heal`），角色入口收窄成十种，另有库存投喂和睡着拒绝两处写 `feed`（`room.ts:462-463,666,1036-1040`）；Economy 是 `purchase / sale / money-grant / item-gift / reading-import`（`living/economy/store.ts:247,256,263,271,332`）。

**做法**：

- `contracts/interaction.ts` 放领域声明：每个领域一份 `type` 集合。Body 的集合就是上游 `HOME_ACTIONS` 的 15 项（Body 事实的 `type` 由上游动作决定），在声明里写成一张表，加测试比对 vendor 的 `HOME_ACTIONS`；`room.ts:1036` 的标签表改成以它为键的映射（现在缺 `sick / heal` 的标签，按现状回落成动作字，保持不变）。Economy 五项放同一处。
- **写入和读取分开**：新写入的事实用收窄后的类型（按 `domain` 区分的联合）；读取的类型保留未知 `type` 的原文，不因 `type` 不在声明里而拒绝。具体写法开工细则里定，约束是不新增 R8 裸字段（扫描器把导出的 `type: string` 记为裸字段，`vocabulary.mjs:30-34`）。
- 统一解码：同文件导出 `factDomainOf(id)` 和事实信封的校验函数，替换 `living/index.ts:290-292` 的前缀反推和各处重复的领域清单；`conversation.ts:206-208` 改用同一个校验函数，校验内容不增不减（仍调 `canonical`，不新增前缀或结果状态校验）。Life 按引用回读保留顺序和重复，不要求 ID 带冒号前缀（`tests/life/life-fact-read.test.ts:6-18` 特意用了无前缀 ID）。提示词段（`living/prompt-context.ts:70-111`）会准备、投影并确认事实，确认依赖原样投影（`core/interaction-presentation.ts:8-34`），本批只换它的领域清单来源，不动投影。
- Python：`memory/provider.py:76-78` 不改写法，加正反双向契约测试：构建后读 TS 侧的领域和 actor 集合，逐个喂给 `interaction_source` 必须接受；再从 Python 侧穷举它接受的值，必须都在 TS 声明里；不存在的领域必须拒绝。

**特殊情况**：真实历史库里实际出现过哪些 `type` 不知道，本批不碰真实数据；用第 1 批的合成旧记录覆盖未知类型、已确认回读、同请求重试和日志确认。JSON 形状不变，但升级和回退是否不受影响以这些测试为准，不从「形状不变」推出。

**开工细则（Claude 补齐，主人过目后开工；行号以第 3 批分支 `a4cc63a` 为准，合并后 `main` 相同）**

1. **领域声明一张表。** `contracts/interaction.ts` 放 `FACT_DOMAINS`：`body` 的 `type` 集合是上游 `HOME_ACTIONS` 的 15 项（`vendor/feiyu-room-template/home-state.js:23-25`），`economy` 是 `purchase / sale / money-grant / item-gift / reading-import`（`living/economy/store.ts:248,257,264,272,333`）。同文件放 actor 种类表 `owner / companion / system`。派生 `FactDomain`、`BodyFactType`、`EconomyFactType`、`FACT_DOMAIN_NAMES`、`isFactDomain`、`factDomainOf(id)`。写法同第 2 批（对象表加派生，不新增字面量数组）。加一条测试：Body 的 15 项和 vendor 的 `HOME_ACTIONS` 完全一致。
2. **读和写两种类型。** `CompanionFact` 保留为**读取**类型：按 `domain` 区分，`type` 是该领域的已知值或未登记的旧字符串（写成「已知值联合 | 带标记的未知字符串」，类型注释说明这是为了旧数据，不是新写入的出口）；读事实的地方（`CompanionFactSource`、Core、Life、提示词段、Body 的反馈筛选）都用它，签名基本不动。新增**写入**类型 `NewCompanionFact`：`type` 收窄到声明。三个写入点改用它：Body 的照料事实（`room.ts:1058`）、库存投喂（`room.ts:488`）、睡着拒绝投喂（`room.ts:684`），以及 Economy 的 `recordFact`（`store.ts:200`，`type` 参数改为 `EconomyFactType`）。导出的属性不写成裸 `type: string`，R8 裸字段不增加。
3. **标签表补齐键。** `room.ts:1054` 的事实标签表改成以 `BodyFactType` 为键的完整映射，少一个键编译失败；`sick`、`heal` 现在没有标签，显式写成 `undefined`，摘要照旧回落成动作字，输出不变。
4. **领域清单改引用。** `living/index.ts:289-292` 的前缀反推改用 `factDomainOf`；`core/native/conversation.ts:206` 的领域判断改用 `isFactDomain`，这一行其余校验（版本、ID、`requestId`、actor、摘要、时间、`canonical`）不增不减，缺 `type` 的事实照旧接受（差异清单已记，2B1-10 固定）；`living/plan/facts.ts:9`、`living/plan/plugin.ts:307,444` 改用 `FACT_DOMAIN_NAMES`，`plugin.ts:276`、`:439` 的领域参数改用 `FactDomain`；`living/prompt-context.ts:70` 按 `FACT_DOMAIN_NAMES` 依次取服务，顺序仍是先 Body 后 Economy，投影和确认不动。Life 按引用回读保留顺序和重复，不要求 ID 带前缀。
5. **上游边界写进文档。** 上游 `FactRef`（`vendor/dsh-world/lib/life/types.d.ts:27`）的领域是封闭的，vendor 不能改；新增事实领域时要经 Life 的回读适配，不能只改声明。这条写进 architecture.md 5.10「新增事实领域」一行（第 6 批文档一起改）。
6. **Python 正反双向。** `memory/provider.py` 不改。新测试：构建后读 TS 的领域和 actor 集合，逐个喂给 `interaction_source` 必须接受；再用 Python 标准库 `ast` 解析 `provider.py`，取出 `interaction_source` 里领域和 actor 两个元组，必须和 TS 集合完全相等（Python 多接受一个旧值也会失败）；不存在的领域必须拒绝。
7. **测试**：第 1 批 2B1-09、2B1-10、2B1-11 断言不改（合成的未知 `type` 旧记录仍能读出）；新增测试只针对新行为：`factDomainOf` 对无前缀 ID 的现有处理、Body 15 项与 vendor 一致、Python 双向。类型层面的收窄由 `pnpm run check:types` 保证，不写只断言常量的测试。
8. **点数**：这批改的是 `domain`、`type` 字段，扫描器不计点，kind/action 预计不变。
9. **提交切分**：① 领域声明、读写两种类型、写入点和标签表、vendor 一致性测试；② 读取方改引用、Python 双向测试、方案执行结果。
10. **验收**：第 1–3 批测试全绿且断言不改；kind、action 不升；R8 和规则基线新增 0；`pnpm run test:memory`；`pnpm run verify`（沙箱外）。
11. **和第 4 批并行**：两批都基于第 3 批合并后的 `main`。第 4 批改 `contracts/behavior.ts`、`living/body/plugin.ts` 的快照、Desktop；第 5 批改 `contracts/interaction.ts`、Core、Life 的事实读取、`room.ts` 的事实写入。只有 `room.ts` 两边都碰（第 4 批只改 `updateExecution` 的类型），后合并的一方解冲突并重跑事实回读和重试测试。

## 第 6 批：全仓三项、点数收尾、文档与发版

按事情拆成多个提交，每个提交不超过 15 文件 / 600 行；`src/desktop/platform/client.js` 是生成文件但不在阈值豁免里，改 `console/client.js` 的提交要把它算进去。预计切分：身体指标 1 个、商品类别 1 个、账本 kind 1 个、点数收尾 0–1 个、文档 1 个。

- **身体指标**：`contracts/behavior.ts` 放五项表；替换 `contracts/behavior.ts:45`、`living/economy/types.ts:14`、`living/economy/store.ts:312`、`living/plan/plan-tools.ts:124`、`living/plan/plan.ts:26,134`、`living/plan/upstream.d.ts:10`、`living/body/room.ts:26`。设置页 `console/client.js:575` 的标签表加契约测试。`room.ts:119,258` 只用其中三项，改成从表里挑并注明原因。`living/body/initial-state.ts:11` 的默认值和 `living/economy/catalog.ts:22` 的食物效果是取值，改成以表为键的类型约束。
- **商品类别**：类别本来就由 Economy 输出（`ItemKind`，`living/economy/types.ts:4`；目录行带 `kind`，`catalog.ts:42-50`），第二层以外读类别都用 `kind`（`console/client.js:510,570`）。剩下的问题是设置页保存配置时又按 `harvest:` 前缀过滤一遍（`console/client.js:505`），和 Economy 快照里的 `effectiveEconomyConfiguration`（`catalog.ts:28-35`）是同一条规则的两份。做法：Economy 视图在 `configuration` **之外**给出可写的价格键和上架键（放进 `configuration` 会被旧页面的 `...writable` 原样提交回去、被服务端当未知设置拒绝），设置页按它保存；服务端准入复用 Store 按目录种类和价格字段的现有判断（`store.ts:274-306`），保留种子、堆肥的价格映射和同请求重试。
- **账本 kind**：`LedgerEntry.kind` 现在是裸 `string`（`living/economy/types.ts:38-41`），12 种写入值散在 `store.ts`（写口 `:190,479`）。在 `types.ts` 定义联合类型，先收窄写口；旧 SQLite 行以 `String(row.kind)` 读出（`store.ts:233-237`），读取保持宽松。生产代码不按它分支，只有设置页显示（`console/client.js:577`）和 Economy 对外返回（`living/economy/plugin.ts:206,338-348`）。账本 `owner-grant` 和事实 `money-grant` 是两件事（`store.ts:262-263`），不合并。
- **点数**：第 2–5 批之后重跑，到 283 / 104 以下。不碰高风险文件 `src/core/workspace.ts:507-518` 的 5 个偏好写门禁点（拍板点 8）；差额不够时在第二层找重复判断，逐条报给 Claude 再改。
- **度量**：典型修改第 8 类在合并后的 `main` 上开 `codex/2b-measure-8-care`、`codex/2b-measure-8-fact` 实做，只度量不合并；用 `pnpm run metrics` 补 G5 表的 2b 一列。
- **文档**：architecture.md 5.6.1、5.7、5.10 改成 2b 后的现状；product.md 词表重复基线、阶段 3 草案（情绪等四行的验收线、「能否被打断」）、阶段 4 草案（`contracts/` 按层拆分）；decisions.md 记本方案的拍板。
- **阶段 2 收尾**：G8 规则复盘，结论写进 product.md；主人验收体验后决定继续、调整还是停下。
- **发版**：主人在 GitHub Actions 发预发布版，隔离环境在版本页更新到预发布版，设置页点一遍照料按钮、桌宠选一次吃饭和睡觉素材、聊天里确认伙伴记得刚才的照料；发正式版后同样先在隔离环境用版本页更新一次，再升级日常机器（拍板点 7）。

## 特殊情况

- **旧数据**：2b 不改任何持久数据的格式。计划文件里的 `kind`、`action`，Body 存档里的动作值，事实库里的 `domain`、`type`，账本的 `kind` 都照旧读写。收窄只发生在新写入的事实和账本行，读取保持宽松（第 5、6 批），由合成旧记录测试锁住。
- **错误文案和拒绝码**：所有入口的拒绝条件、文案和报错先后保持不变，由第 1 批测试锁住。
- **模块缺席和卸载**：没有 Body 时 Desktop 的 `busy` 为假，和现在一样；Life 卸载时 `lifeView` 不可用，照料按钮和现在一样不显示。
- **打包**：新常量是纯数据，构建产物照常进 `dist/src/contracts/`；不动 `package.json` 的 `exports`、`files`、`imports`。
- **生成文件**：`src/desktop/platform/client.js` 含 `console/client.js` 的同段代码，改后由构建重新生成，不手改。

## 概念与扩展检查

- **新增或修改的概念**：`BodyAction` 及 `CareAction / RoleAction / PlanBodyAction / FeedbackAction`；计划 kind、计划经济操作、计划菜园操作、`ReadingState`；`BodyPhase`、`ExecutionPhase`、`ExecutionStatus`；`label / operationId / currentActivityId` 三种职责（只是内部命名）；`busy`（新的公开语义：是否正在进行一项共享活动，口径照搬 Desktop）；事实领域声明及新写入/历史读取两种类型；账本 kind 联合；Economy 的可写配置键；身体指标表。除 `busy` 和可写键外，都是把现有多份收成一份，没有新含义。
- **拥有者**：动作、计划命令、阅读状态、阶段、`busy`、身体指标是第二层（类型和常量放在 `contracts`，沿用 architecture.md 5.2 的做法）；Body 事实的 `type` 集合由上游 `HOME_ACTIONS` 决定、Body 声明，Economy 事实的 `type` 由 Economy 声明；商品类别、可写键、账本 kind 归第二层·钱包区；照料按钮文案随基础表，拥有者第二层，Console 只渲染。
- **新增词表**：没有新词表。R8 和规则基线每批新增为零。
- **复用的已有声明**：`contracts/living.ts` 的契约位置；`scan()` 和 `vocabulary.mjs` 的口径；`requirePresentationSlot`；`effectiveEconomyConfiguration` 和 Store 的配置准入；第 1 批复用 `native.test.mjs` 末端断言和 `2A1A-18` 夹具。
- **层间接口变化**：`BehaviorActivity` 增加 `busy`；`lifeView` 增加照料动作清单；Economy 配置视图增加可写键；`CompanionFact` 的 TS 类型分成新写入与历史读取（JSON 不变）。没有新服务名、新事件。
- **为什么需要**：典型修改第 8 类（加照料动作、加事实领域不漏改）；2a 带进来的点数偏差；G5、G9 的阶段要求。

## 拍板记录

1. 计划经济操作、计划菜园操作是否并入 2b — 推荐：并入（各收成一份；Room 工具的主人操作词表不硬并）；决定：按推荐
2. 情绪、呈现分类器、槽位与素材的四行词表基线是否明确延到阶段 3 — 推荐：延到阶段 3，2b 只在 product.md 阶段 3 草案里写明各自验收线；已知问题 4 随阶段 3 处理；决定：按推荐
3. 身体状态契约的范围 — 推荐：2b 只落「忙不忙、当前活动」，`busy` 照搬 Desktop 现有口径放进 `behavior`，Desktop 吃饭守卫改读；「能否被打断」延到阶段 3（现在按动作而异、没有消费方）。另一选项是 2b 先取证出一张「各状态下各动作接受与否」的表、写成 Body 的统一准入函数，风险是要改 Body 的 `act` 准入；决定：按推荐
4. 设置页照料按钮怎么跟基础表对齐 — 推荐：按 architecture.md 5.10 派生，`lifeView` 返回动作和文案，页面按它渲染。另一选项是只加契约测试比对（不改接口，但新增动作还要手改页面）；决定：按推荐
5. Python 侧怎么对齐事实领域 — 推荐：正反双向契约测试，不改 Python 写法。另一选项是生成一份常量文件给 Python 读（`dist/src` 已整体打包，不用改 `files`，但要核对 Python 进程能否从安装包定位它）；决定：按推荐
6. 并行方式 — 推荐：第 1 批与 M 批并行；第 5 批在第 2 批之后、与第 3 批并行；其余顺序；决定：按推荐
7. 版本号和发布方式 — 推荐：发 0.4.0，预发布版和正式版都先在隔离环境用版本页更新验收，再升日常机器；没有数据迁移，不做真实数据副本演练。另一选项是 0.3.1；决定：按推荐
8. kind/action 点数的差额从哪里收 — 推荐：不碰高风险的 `src/core/workspace.ts`，kind 主要靠第 3 批的按 kind 分派（预计减 8 点以上），action 靠第 2 批合并照料入口的重复检查（预计减 1–2）；决定：按推荐
9. `contracts/` 按层拆分是否在 2b 做 — 推荐：不做，新常量照 2a 的做法放进 `contracts`；拆分留到阶段 4 按收益再定，写进阶段 4 草案；决定：按推荐
10. 典型修改第 8 类的层数怎么判 — 现状：声明在 `contracts`（按 `arch/layers.json` 归第一层），执行在第二层，按现有口径是 2 层；product.md 的门槛是「文件数减半且只动一层」。推荐：按物理归层如实记录，文件数照常判，层数这项判未达标并注明「第一层只有 `contracts` 一处声明」，等阶段 4 拆分 `contracts` 后复测。另一选项是把 `contracts` 里的第二层契约文件按拥有者计入第二层，在计数口径里写明；决定：按推荐
11. G5 命令的范围 — 推荐：自动算规则违规、词表重复、kind/action 点数、1500 行文件数、模块依赖数；修复批次占比和典型修改基线是人工判断，命令列出最新人工记录并标「人工」；决定：按推荐

## 验收

- 快测：`pnpm run build`，然后 `node --test <本批受影响的测试文件>`；改了 `contracts/` 或模块依赖的，再跑 `pnpm run check:arch`。
- 每批门禁：`pnpm run verify`（含 `check:arch`），`pnpm run build && pnpm run test:behavior-list`。Memory 相关测试要在允许回环的地方跑。
- 点数和基线：`pnpm run check:arch -- --report` 里 `R8 kind/action 字符串判断` 两行，以及两份基线的「新增」数，每批写进执行结果。
- 第 5 批另跑：`pnpm run test:memory`。
- 第 6 批另跑：`pnpm run metrics`；`pnpm run test:native-context`、`pnpm run test:native-desktop`（已安装 DSH，本机脚本模型，不用付费模型）。这两条只补充原生环境的证据，G9 流程以第 1 批的 L1 测试为准。
- 手动（主人）：第 6 批的预发布版和正式版在隔离环境验收（见第 6 批「发版」）；阶段 2 收尾时验收体验，决定继续、调整还是停下。

## 挑刺处理

Codex 只读挑刺一轮。采纳的：第 4 批 `busy` 只照搬 Desktop 吃饭守卫的口径、放进 `behavior`（`roomState()` 不转发快照根字段）、改名避开 Desktop 的 `bodyStatus()`、「能否被打断」改为拍板点 3；第 5 批 Body 事实 `type` 是 15 项不是 13 项、写入与读取分开、补漏掉的领域清单和上游 `FactRef`、提示词段不是只透传、Python 改正反双向比对、改为依赖第 2 批；点数估计改正（第 3 批 17 点，第 4 批只净减约 1，删掉「各减 10 点以上」），写明会持平或反增的改法；R8 按新增条目验收；补漏掉的副本（计划菜园 schema 分支、计划经济 4 份、Desktop 子集、执行阶段标签）；第 6 批预先拆提交；G9 补召回和重启末端；补 G5 命令、G8 复盘和主人阶段验收；发版补正式版先隔离验收；典型修改第 8 类的层数冲突改为拍板点 10；商品可写键不放进 `configuration`。

没有采纳的：「按层拆分未必要改 `exports`」——承认不一定改映射，但 `./contracts` 入口的组织和归层判定都要重排，仍建议放到阶段 4（拍板点 9），不在 2b 做。

## 执行结果

### 第 1 批

- 方案表的照料白名单、角色房间动作、主人房间动作分别对应 `2B1-01`、`2B1-02`、`2B1-03`。计划 kind 与身体动作、菜园与经济计划操作分别对应 `2B1-04`、`2B1-05`。阅读状态、身体阶段、Desktop 吃饭与睡醒素材分别对应 `2B1-06`、`2B1-07`、`2B1-08`。
- 事实写入、事实读取、Python 识别分别对应 `2B1-09`、`2B1-10`、`2B1-11`。G9 设置页喂食到跨会话召回和重启对应 `2B1-12`。Life 计划从派发到完成的身体阶段与跨重启回执对应 `2B1-13`。登记见 `tests/behavior-list/index.json:1314-1442`。
- `pnpm run build && node --test tests/behavior-list/{concepts-actions,concepts-facts,concepts-flow,concepts-phases,concepts-plan,native}.test.mjs` 通过 13 条。`pnpm run build && pnpm run test:behavior-list` 通过 11 条索引测试和 117 条行为清单，均为 0 失败。真实 Memory 回环通过。
- `pnpm run verify` 的 Node 测试 1662 通过、1 失败。既有 Memory P2 用例启动服务成功后遇到 `/bin/ps` 的 `EPERM`，单独复跑同样失败，后续断言环境原因未跑（`tests/memory/memory-process.test.mjs:80-96`）。单独补跑 Python 测试 22 条，以及 `check:release`、`pnpm pack` 和 `check:package`，均通过。
- `pnpm run check:arch` 和 `pnpm run check:arch -- --report` 均通过。规则基线当前 37 条，词表基线当前 1031 条，两份均新增 0、消失 0。
  - R8 kind 字符串判断，运行源码 287 点 / 43 文件，扫描范围 287 点 / 43 文件。
  - R8 action 字符串判断，运行源码 105 点 / 13 文件，扫描范围 105 点 / 13 文件。
- 差异清单
  - Core `observeFacts` 接受缺 `type` 的事实，证据 ID 与带 `type` 的记录一致。实现见 `src/core/native/conversation.ts:202-215`，测试见 `tests/behavior-list/concepts-facts.test.mjs:83-91`。
  - 「睡觉-起来」默认在专用睡觉序列的 `sleep.end`，`/anim` 入口默认返回 `unknown-animation`，将素材加进动画池后才派发 `wake`。配置见 `vendor/dsh-pet/platform/assets/config.jsonc:387-392`，枚举与准入见 `vendor/dsh-pet/platform/runtime.mjs:4168-4193,4258-4263`，派发见 `src/desktop/platform/plugin.ts:668-684`，测试见 `tests/behavior-list/concepts-desktop.test.mjs:62-71`。
  - `confirmPlannedReading` 同步完成执行并清除阅读投影，公开快照从 `offered` 直接回到 `idle`，跳过 `confirmed` 投影分支。实现见 `src/living/body/room.ts:360-371,490-495,705-716,834-845` 和 `src/living/body/playback.ts:90-94`，测试见 `tests/behavior-list/concepts-phases.test.mjs:23-30`。
  - Economy Store 重试从 `requests.result` 返回首次事务的视图，事实只在首次事务写入。公开 `ownerAction` 另读当前视图，原事实按 ID 回读。实现见 `src/living/economy/store.ts:182-187,199-219,259-264` 和 `src/living/economy/plugin.ts:240-251,276-277`，公开回包与事实去重的测试见 `tests/behavior-list/concepts-facts.test.mjs:21-32`。
  - Life `parsePlan` 用 `String(value.action)` 校验，接受并保留 `['feed']`，工具 schema 要求字符串并拒绝该输入。实现见 `src/living/plan/plan.ts:94-97` 和 `src/living/plan/plan-tools.ts:101-104`，测试见 `tests/behavior-list/concepts-plan.test.mjs:37-41,67`。

### M 批

- 第 1 条已修，`docs/development.md` 用源码检出中的路径和章节名引用 G5，打包闭包检查通过。
- 第 2 条已修，`scripts/arch/metrics.mjs` 逐字读取 G5 表第 6、7 项最新单元格并标「人工」，缺文件、表、行或记录时报出原因。
- 第 3 条已修，按规则列违规目标、调用点和违规边。`scripts/arch/lib/counts.mjs` 与架构报告共用。
- 第 4 条已修，kind/action 合计按文件去重。架构检查在默认、详细和违规夹具场景中的输出逐字节一致，退出码也相同。
- 第 5 条已修，度量支持 `--root`，`tests/infrastructure/metrics.test.mjs` 用临时 Git 仓库验证手写阈值、生成和未跟踪文件排除、依赖去重、违规数和人工记录。分别将手写统计、违规数、依赖数置零，测试均能检出。
- 三项建议一并落实。共用分组和去重逻辑，复用 `scan.mjs` 返回的模块集合，R8 分列重复/子集关系与裸 `string` 字段，测试覆盖依赖和人工记录。
- `pnpm run metrics` 和 `pnpm run metrics -- --json` 通过，度量快测 2 项通过、0 项失败。`pnpm run check:arch` 和独立归档的 `pnpm run check:package <归档>` 通过，两份架构基线的新增及消失均为 0。
- `pnpm run verify` 构建成功，Node 测试 1651 项通过、1 项失败。沙箱拒绝 `tests/memory/memory-process.test.mjs:81` 调用 `/bin/ps`（`EPERM`），单独重跑复现。单跑 Python Memory 测试 22 项全部通过，`pnpm run check:release` 通过。
- 用本次构建产物运行 `pnpm run test:behavior-list`，104 条全部通过。
- 当前 37 个违规目标、R8 基线 1031 条、kind 287 点、action 105 点，合计 392 点 / 47 文件，手写超限 0 个。模块依赖以同口径复算，M2 为 60 条，2a 搬家后 46 条，2a 收尾和本次均为 40 条。生活模块合并后排除 6 条自环、8 条重复边，`aed7f27` 又移除 4 条边，`6a76e50` 再移除 2 条。第 6 批将复算结果写进 product.md 的 G5 表。

### 第 2 批

- `src/contracts/{behavior,living}.ts` 由带序号的动作基础表派生五组类型和数组。Body、Life、Room 和计划工具共用准入或枚举，Desktop 的入口子集加类型约束。反馈按原条件投射已完成的主人互动。
- `src/console/{settings.ts,client.js}` 由 `lifeView.careActions` 派生照料按钮，构建重生成 `src/desktop/platform/client.js` 和受影响的 `dist/src` 产物。
- 新增序号连续性测试、六种主人互动的反馈回归，以及设置页六个按钮经真实 RPC 执行的 `2B2-01`。第 1 批唯一的测试改动是 `2B1-03` 将 `lamp` 输入改为 `on:false`。
- R8 kind 字符串判断由 287 点到 287 点，运行源码与扫描范围均为 43 文件。
- R8 action 字符串判断由 105 点到 102 点，运行源码与扫描范围均为 13 文件。
- `isCareAction` 把 World `care`、Body `act`、Life `act` 和设置页 `lifeAction` 的四处名单判断合成一处。第一组的前三处合并净减 2 点，第二组设置页接入再减 1 点。四个入口各自保留校验和报错顺序。
- `isPlanBodyAction` 接替 Life `parsePlan` 原有的 1 点，原 Body 的 `??` 表达式未被计点，计划侧净变化 0。
- 规则基线 37 条，新增和消失各 0。词表基线 1031 → 921 → 915，两组分别收紧 110、6 条，新增均为 0。收紧后 `pnpm run check:arch` 和 `pnpm run check:arch -- --report` 均通过。
- `pnpm run build && node --test <受影响的测试>` 通过 101 条。首次有 1 条因设置页测试夹具在跨 VM 刷新前读取，等刷新后复跑通过。
- `pnpm run build && pnpm run test:behavior-list` 通过 11 条索引测试和 118 条行为测试，含第 1 批 13 条、新增 L2 和真实 Memory 召回。
- `pnpm run verify` 的 Node 测试 1667 条通过、1 条失败。Memory P2 启动服务后调用 `/bin/ps` 被沙箱拒绝（`EPERM`），单跑复现，后续断言环境原因未跑。独立补跑 Python Memory 22 条、`check:release`、`pnpm pack` 和 `check:package` 均通过。

### 第 3 批

- `src/contracts/behavior.ts` 集中四张表和准入守卫。`living/body/room.ts` 与 `living/plan/plan.ts` 由 `target` 校验位置、按 kind 分派其余字段校验，再用 `executable` 判定计时。`living/economy/{plugin,types,store}.ts` 引用交易子集和阅读状态。
- `living/plan/plan-tools.ts` 派生步骤分支和操作枚举。新增菜园、经济枚举顺序断言，实际注册的 `life_plan_update` 描述和完整 schema 与改前逐字节相同。
- R8 kind 字符串判断由 287 点/43 文件降至 271 点/44 文件，运行源码与扫描范围一致。
- R8 action 字符串判断为 102 → 102 点，运行源码与扫描范围均为 13 文件。
- Life 减 9 点，`plan.ts:85` 并入守卫，`:87` 两个目标比较并入 `target`，`:88,94,98,107` 的菜园、身体、经济、阅读条件并入一次字段分派，`:114,127` 的计时与新稿可达性改读 `executable`。
- Body 减 8 点，`room.ts:598` 并入守卫，`:609` 改读 `target`，`:610–613,618` 的原地、菜园、身体、经济、阅读条件并入一次字段分派，`:620` 改读 `executable`。共用守卫新增 1 点，素材及菜园准入判断保留。减点位置按改前行号。
- 规则基线 37 条，新增/消失 0/0，生成器刷新旧行号。词表基线 915 → 801 → 707，新增 0，分别消失 114、94 条。`pnpm run check:arch` 和 `pnpm run check:arch -- --report` 均通过。
- `pnpm run build && node --test <受影响的测试>` 171 条通过。新增回归覆盖 Life 的宽松准入、Life 和 Body 的素材槽报错顺序、Body 重启后回执重放与指纹冲突。
- `pnpm run build && pnpm run test:behavior-list` 通过 11 条索引检查和 118 条行为测试，含第 1 批 13 条及第 2 批设置页照料流程。原断言全部保留。
- `pnpm run verify` 的环境、类型、架构和构建通过，Node 测试 1669 条通过、1 条失败。Memory P2 在 `/bin/ps` 被沙箱拒绝（`EPERM`），单跑复现，后续断言环境原因未跑。
- 门禁中断后的 Python Memory 22 条、`pnpm run check:release`、`pnpm pack` 和 `pnpm run check:package` 已独立补跑并通过。

### 第 5 批

- `src/contracts/interaction.ts` 集中事实领域、类型和参与者声明。Body 三处写入和 Economy 写入用 `NewCompanionFact`；读取用 `CompanionFact`，按领域保留旧 `type` 原文。
- Core 共用事实信封校验，继续接受缺 `type` 的记录；World 按编号前缀路由，Life 按显式领域保留无前缀编号、顺序和重复。提示词段仍先读 Body 后读 Economy。
- 新增 vendor 动作集合和原始标签回落、World 编号前缀、Python 运行时准入与 AST 元组双向契约测试。上游 `FactRef` 的领域封闭，新增领域需经 Life 回读适配，留第 6 批补入架构 5.10。
- R8 kind 字符串判断为 271 → 271 点，运行源码与扫描范围均为 44 → 45 文件，参与者判断移入契约。
- R8 action 字符串判断为 102 → 102 点，运行源码与扫描范围均为 13 文件。
- 词表基线 707 → 696 → 690，两组新增均为 0，分别消失 11、6 条；规则基线 37 条，新增和消失均为 0。`pnpm run check:arch` 和 `pnpm run check:arch -- --report` 通过。
- `pnpm run check:types` 通过；`pnpm run build && node --test <受影响的测试>` 通过 214 条；`pnpm run build && pnpm run test:behavior-list` 通过 11 条索引检查、118 条行为测试。第 1–3 批断言保持原样。
- `pnpm run test:memory` 的 Python 22 条和 Node 2 条通过、P2 进程测试 1 条失败；`pnpm run verify` 的环境、类型、架构和构建通过，Node 1672 条通过、同一条 P2 失败。
- P2 服务启动后 `/bin/ps` 被沙箱拒绝（`EPERM`），后续断言环境原因未跑。门禁中断后的 Python Memory、`check:release`、`pnpm pack` 和 `check:package` 已独立运行并通过。

## 审查结论

### 第 1 批（Codex 独立审查 + Claude 核实，基于 `724cbb7`）

已核实没问题的：只改了 `tests/behavior-list/` 下 13 个文件，`src/` 无改动；13 条 `2B1-*` 都登记了，测试名一一对应；`native.test.mjs` 的两条旧测试抽到 `native-facts.mjs` 后没有删掉或放宽断言，反而收紧了（日志检查从「整份 JSON 含事实 ID」改为「事实出现在 `chatpet.interactions` 段」，第二条测试补了日志检查、B 不重复读待送达事实、重启后 `readFacts` 回读）；R8 点数 kind 287 / action 105 没变，两份基线新增 0、消失 0；`pnpm run verify` 1663 条全过，`pnpm run build && pnpm run test:behavior-list` 117 条全过，Memory 回环测试真实通过。L1 条目不带重启不算问题：现有 L1 约 35 / 46 条也不带重启，L1 的含义是走插件入口加假原生宿主。

**必须修**

1. **执行结果没写。** 在上面「执行结果」下补「### 第 1 批」：13 条条目和方案表的对应关系、快测和门禁结果、`check:arch -- --report` 的 R8 两行和两份基线的新增数，以及差异清单。差异清单逐条写清现状、`文件:行号` 和证据所在的测试行，至少包括这几条：
   - Core `observeFacts` 接受缺 `type` 的事实，证据 ID 不变（`concepts-facts.test.mjs:89`）；
   - 默认动画池里没有「睡觉-起来」，起床素材只有配置加进动画池后才会转成 `wake`（`concepts-desktop.test.mjs:58-63`）；
   - `confirmPlannedReading` 会立即完成执行并清掉身体快照的阅读投影，公开快照上看不到 `confirmed`，所以 `room.ts:834-845`、`playback.ts:90-94` 里 `confirmed` 的分支在公开路径上走不到；
   - Economy 同请求重试返回 `requests` 表里存的原结果（视图），不返回原事实，也不重写事实（`living/economy/store.ts:185-187`）。方案第 1 批表里写的「`store.ts:209-219` 返回原事实」不准；
   - Life `parsePlan` 用 `String(value.action)` 比对动作，非字符串的 `['feed']` 会被接受，而工具 schema 拒绝它（`living/plan/plan.ts:95`）。
2. **2B1-03 声称的「同请求重试不重复生效」没有被验证**（`concepts-actions.test.mjs:58-62`）。`talk` 重试只比了回执和待确认事实。时钟固定时，Body 即使重新执行一次，事实也会完全相同，而房间里已经多出一条留言。要在首次提交和两次重试（含重启后那次）之后，都从公开房间状态确认同一条留言只存了一份。
3. **2B1-03 的「原样转发」只核对了事实 `type`**（`concepts-actions.test.mjs:50-56`）。如果 `go`、`place` 的 `pos`，或 `command` 的 `room/spot`、`lamp` 的 `on`、`talk` 的 `text` 在转发时丢了，Body 仍会写同一个 `type` 的事实，测试照样通过。要固定每个动作现在的 `fact.result.status`；有参数的动作，再从公开房间状态核对参数确实生效了。
4. **2B1-02 只固定了角色动作两份词表中的一份**（`concepts-actions.test.mjs:33-41`）。工具 schema 的十项枚举核对了，但 Body 的角色白名单 `companionActions`（`living/body/room.ts:85`）只验证了 `talk` 接受、`visit` 拒绝。第 2 批要把这两份合成一份；Body 漏掉 `feed` 或 `command` 时，测试仍会通过。要用合法输入和合适的身体状态，经角色路径把十个动作各执行一次，断言都不报「角色不能执行这项房间操作」。
5. **2B1-01 没有固定 World `care` 的报错先后**（`concepts-actions.test.mjs:19-26`）。`worldCommands.care` 现在先查绑定、后查动作（`living/body/plugin.ts:323-325`），但非法动作只用有效绑定测过。第 2 批要合并照料入口的重复检查，如果把动作校验挪到 `living.command` 外面，测试会发现不了。要补一条绑定错、动作也错的 World 请求，固定它返回 `STALE_BINDING`（这里用代码里实际返回的错误码）。
6. **2B1-04 没有覆盖各 kind 自己的字段报错**（`concepts-plan.test.mjs:37-67`）。现在 Life 只覆盖了公共字段、`room` 和 `body`，Body 只覆盖了公共字段和 `body`；`room / move / hold / read` 各自字段的报错和先后，在 Life 和 Body 上都没固定。第 3 批要把计划校验改成按 kind 分派，动的正是这些地方。要在 Life `updatePlan` 和 Body `startPlanned` 上，给这四种 kind 各补至少一条非法字段用例，固定现有文案。
7. **2B1-06 调用内部函数，越出了 L2 的边界**（`concepts-phases.test.mjs:23-24`、`entries.ts:21`）。用例手工把 `readingState` 改成 `confirmed`，再直接调 `resolveActivityPlayback`。这既违反 `levels` 里 L2「不构造内部类、不读取私有状态」，固定的又是公开路径上走不到的状态（见第 1 条的差异）。要删掉这条断言和 `entries.ts` 新加的导出；公开确认后的终态断言（第 31-32 行）保留。
8. **G9（2B1-12）的召回只查了 Memory 算出的上下文，没查会话是否真的收到**（`native-facts.mjs:23,34`）。如果 Core 漏发召回消息，或者事实摘要是空串，`petMemory.context().includes(...)` 仍会通过。要断言摘要非空；在 B 会话重启前后两轮，从 `f.begin()` 返回的 `injections`（`fixture.mjs:224`）里确认召回消息含原事实摘要。`native.test.mjs` 共用这个辅助函数，一起收紧没问题。

**建议修（不影响合并）**

- 2B1-09 睡眠中投喂重试后，按 `requestId` 断言只有一条事实；现在只按已有 ID 回读，多写一条也发现不了（`concepts-facts.test.mjs:50-52`）。
- 2B1-10 Life 重读已确认事实之后，补查 Life 自己的送达确认（`concepts-facts.test.mjs:105-114`）。
- 2B1-11 给 `execFileSync` 加超时，Python 路径改为相对仓库根解析，不依赖当前目录（`concepts-facts.test.mjs:117-120`）。
- 2B1-12 让夹具记录 flush 尝试次数：失败轮要断言确实尝试过 flush，而不只是没有成功（`concepts-flow.test.mjs:28`）。
- 夹具 `end()` 固定等 3 ms 再读盘，`warnings` 里收集到的异步错误新用例也没检查；这是已有的写法，可以留给以后单独处理（`fixture.mjs:84,245`）。

**合并时由 Claude 处理**：上面的差异清单并进 `docs/architecture.md` 5.6.1 对应的行（动作的桌面素材、阅读状态、请求身份、事实），同时作为第 2 批（Desktop 素材到命令）、第 3 批（阅读状态和 `parsePlan` 的类型检查）、第 5 批（Core 缺 `type`、Economy 重试）开工细则的输入。改变这些现状属于对外行为变化，按停止条件先回主人这里对齐。第 1 批和 M 批都改了本方案的「执行结果」，后合并的那支要解一次文本冲突。

**复查（基于 `fb3be71`）**：8 条必须修都已修好（`871ed81` 修第 2–7 条，`d873520` 修第 8 条和前 4 条建议修，`fb3be71` 补执行结果）。沙箱外 `pnpm run verify` 1663 条全过，行为清单 117 条全过。合并时差异清单已并进 `docs/architecture.md` 5.6.1 的五行：计划身体动作、桌面素材、阅读状态、请求身份、事实。剩下一条建议修：2B1-03 用 `lamp` 的 `on:true` 测参数是否生效，但灯原本就开着，看不出效果；改用 `on:false` 更能说明问题。

### M 批（Codex 独立审查 + Claude 核实，基于 `488d682`）

已核实没问题的：
- G5 第 4、5 项口径一致。手写超限文件 0 个，模块依赖 40 条（有向去重，排除自环和未知端点）。
- 40 和 60 的差异解释成立：在 `d58ffc8` 上用同一个脚本复算正好是 60；`27e9232`（2a-3a 搬家）把三个生活模块并成 `living`，正好去掉 6 条自环、8 条重复边，变成 46；之后 `aed7f27`（2a-3c）去掉 4 条、`6a76e50`（2a-3d）去掉 2 条，变成 40。执行结果里的「后续又移除 6 条边」可以补上这两个提交号。
- 脚本里没有写死的历史说明。
- 规则 37 条、R8 1031 条、kind 287 点、action 105 点，和 `check:arch -- --report` 一致。
- `pnpm run build && pnpm run test:behavior-list` 104 条全过。

**必须修**

1. **`pnpm run verify` 失败**：`Missing packaged dependency docs/development.md -> product.md`。`docs/development.md` 会进安装包，而 `docs/product.md` 不进，这次在 `docs/development.md:147` 加的相对链接触发了包检查。`6edef28` 修过同一个问题。改成同文件第 139 行的写法：写「源码检出中 `docs/product.md`「G5 手工度量」」，不用链接。
2. **人工项没有列出最新记录**（`scripts/arch/metrics.mjs:54-57`）。方案和拍板点 11 要求「列出 product.md 里最新一列并标「人工」」，现在只输出「人工」和锚点。要从 `docs/product.md` 的 G5 表里，读出第 6、7 项最新一列的原文，原样输出，保留「人工」标签，不重新计算。读不到表或行时，明确报出读不到，不要静默留空。
3. **G5 第 1 项只输出了违规目标数**（`metrics.mjs:35-36,66`）。G5 表的口径是按规则分别给「目标 / 调用点 / 违规边」三个数（`docs/product.md:136`）。要按规则输出这三个数，口径和 `check:arch -- --report`（`scripts/arch/check.mjs:8-13`）一致。
4. **G5 第 3 项缺少 kind、action 合并后的去重汇总**（`metrics.mjs:38-45`）。product.md 记的是「392 点 / 47 文件」（重叠文件只计一次），命令只给分项 43 和 13 个文件，直接相加会得到 56。要补上合计的点数和去重文件数。
5. **测试把当前仓库里某个生成文件的大小变成了门禁条件**（`tests/infrastructure/metrics.test.mjs:31`）。`verify` 会自动收集这个测试；将来 `animation-map.ts` 合法地缩短、改名或拆分时，门禁会失败，这和「只报告，不进门禁」相冲突。改用合成夹具验证排除逻辑：一个临时 git 仓库，放受跟踪的 1500 行和 1501 行手写文件、一个超限的生成文件、一个未跟踪的文件。脚本需要能接受根目录参数。

**建议修（不影响合并）**

- 第 3、4 条的分组和去重逻辑，抽到 `scripts/arch/lib/` 里，由 `check.mjs --report` 和 `metrics.mjs` 共用。测试就不用再按整行中文去反解析报告（`metrics.test.mjs:16`），两边的口径也不会分叉。另外，模块集合可以直接用扫描结果，不必再读一次 `layers.json`（`metrics.mjs:32`）。
- R8 总数里，重复关系和裸 `string` 字段分开输出（扫描结果里有 `bare`）。G5 第 2 项的口径本来就分这两类（`docs/product.md:138`）。
- 测试补上依赖去重和人工记录的断言。现在把手写统计、违规数、依赖数都清空，测试仍然能过。

**复查（基于 `2f4ed19`）**：5 条必须修都已修好（`dd585d1` 把统计抽到 `scripts/arch/lib/counts.mjs`，`check:arch --report` 输出和改前逐字一致；`fc5a804` 修第 1–5 条和三条建议修；`2f4ed19` 补执行结果）。沙箱外 `pnpm run verify` 1652 条全过，包检查也过了；行为清单 104 条全过。剩下一条建议修：第 6 项最新一列写的是「未重算」，命令就原样输出它，看不到最后一次算出的 36/70。

### 第 2 批（Codex 独立审查 + Claude 核实，基于 `0fd6fa7`）

已核实没问题的：
- 行为等价。四个照料入口的检查仍各自保留，报错码、文案和先后不变（设置页先查绑定和 Life，再报 `INVALID_ARGUMENT`；World 先查请求和绑定；Life「未知的生活动作」；Body「未知的身体动作」）。`startPlanned` 的 `isPlanBodyAction(input.action)` 与原 `includes(input.action ?? '')` 对 `undefined` 和非字符串的结果相同；`parsePlan` 保留 `String(...)` 宽松准入。
- 三处顺序。设置页按钮 `feed / water / pet / play / sleep / wake`、`room_action` 枚举 `command … lamp`、计划身体枚举 `sleep / wake / water / feed / play` 与原来逐项一致；`BODY_ACTIONS` 写法与细则第 1 条一致。反馈集合与原来同为六项（只做成员判断，顺序无关）。
- 第 1 批测试只改了 2B1-03 的 `lamp` 为 `on:false`，前后各有一条断言，现在能看出灯从开变关；其余 2B1 断言未动。
- 点数。用仓库扫描器分别在 `89072ba` 和 `0fd6fa7` 上导出 action 判断点逐条比对：去掉的 5 点是设置页、World `care`、Body `act`、Life `act` 四处照料名单判断和 `parsePlan` 一处；新增 2 点是 `isCareAction`、`isPlanBodyAction` 守卫里各一处；Desktop 的 `['sleep','wake','pet']` 只是拆成变量，1 点持平。净 −3（105 → 102），kind 287 不变，属于把同一条规则收进一个定义处，不是靠改写法躲点。
- 基线。按 `scripts/arch/lib/ratchet.mjs` 的条目身份（不含行号）比对词表基线：1031 → 915，新增 0、删除 116；规则基线 37，新增和消失各 0。
- `lifeView.careActions` 由 `console/settings.ts` 在返回值上加，Life `snapshot()` 未改。沙箱外构建后工作区干净，`src/desktop/platform/client.js` 和 `dist/src` 与构建产物一致。
- 新测试验证真实行为：`2B2-01` 从 `src/console/client.js` 取出真实 `LifePage`，经真实设置 RPC 渲染并逐个点击六个按钮，核对事实 `type` 和 `channel`，再用改写的 `careActions` 证明按钮跟随返回值而非写死；连跑 5 次全过，执行结果里提到的首轮时序问题未复现。反馈回归跑真实 `CompanionRoom`，核对投射的事实 ID。序号测试能拦漏号和撞号。
- 沙箱外 `pnpm run verify`：Node 测试 1668 条全过（含 Memory P2 的 `/bin/ps` 用例）、`check:arch`、包检查通过；`pnpm run build && pnpm run test:behavior-list`：索引 11 条、行为清单 118 条全过。Codex 把「沙箱外重跑门禁」列为必须修，已由这次重跑消解。

**必须修**：无。

**建议修（不影响合并）**
- `src/contracts/behavior.ts:10,44-47` 的基础表和派生数组只在类型上只读，照 `contracts/tables.ts:33` 的做法加 `Object.freeze`（表项和四个派生数组），防止哪天有 JS 调用方原地改数组让四个入口一起放行。现在没有写入方。
- `src/living/body/room.ts:13-14` 两条同模块导入可合并；`FEEDBACK_ACTIONS` 的排序全为 0，可以不排序；`BODY_ACTION_NAMES` 没有模块外使用者，可以不导出。
- 本方案第 2 批正文「互动反馈子集…不限 actor 是主人」与代码不符（`room.ts:821` 只投射已完成的主人互动，前后一致）；开工细则第 4 条「`lifeView` 失败时整张卡片本来就不显示」只对首次读取成立，已有视图后轮询失败会保留卡片并显示错误（`console/client.js:589-595`）。方案合并时删除，不必改，后续批次引用时注意。

**不采纳**：Codex 提出「旧版服务端响应缺 `careActions` 时新前端 `.map()` 抛错」。设置页前端和 `settings.ts` 在同一个包里一起发，前端由同版本插件提供，不会混用；细则第 4 条也明确不加兜底。
