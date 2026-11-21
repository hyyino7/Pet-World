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

**做法**：在 `src/contracts/behavior.ts` 放一张基础表，每个动作标明它属于哪些集合；照料动作带设置页按钮文案。示意（具体写法开工细则里定）：

```ts
export const BODY_ACTIONS = {
  feed:{care:'免费基础餐食',role:true,plan:true,feedback:true},
  water:{care:'倒杯水',role:true,plan:true,feedback:true},
  play:{care:'一起玩',role:true,plan:true,feedback:true},
  pet:{care:'摸摸头',role:true,feedback:true},
  sleep:{care:'去睡觉',role:true,plan:true}, wake:{care:'叫醒',role:true,plan:true},
  poke:{role:true,feedback:true}, talk:{role:true,feedback:true},
  command:{role:true}, lamp:{role:true},
} as const;
```

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

**开工细则要定**：`lifeView` 返回字段的名字和形状；`console/settings.ts` 改从基础表取白名单后，仍在调用 Life 之前拒绝；Life `act` 是否保留自查。

## 第 3 批：计划命令

**现状**：七种计划 kind 完整 4 份（`contracts/behavior.ts:51`、`plan-tools.ts:85-122` 的 `oneOf` 分支、`plan.ts:85`、`room.ts:597`）；计划经济 `buy / sell / consume` 4 份（`contracts/behavior.ts:59`、`plan-tools.ts:111`、`plan.ts:101`、`room.ts:614`）；计划菜园九种操作 3 份（`plan-tools.ts:32-56`、`plan.ts:90`、`room.ts:73`）；阅读状态 4 份（`contracts/behavior.ts:31`、`living/economy/types.ts:67`、`room.ts:53,834`）。

**做法**：

- `contracts/behavior.ts` 放计划 kind、经济操作、菜园操作、阅读状态的表，`PlannedActivity`、`PlannedExecution`、`economy/types.ts:67`、`room.ts:53,834` 改为引用；`plan-tools.ts` 的 schema 枚举从表生成。写法同第 2 批，不新增字面量数组。
- `parsePlan`（`plan.ts:76-128`）和 `startPlanned`（`room.ts:596-636`）的校验改成按 kind 选一个校验函数：同一个 kind 的字段校验、时间策略放在一起，`kind` 只判断一次。错误文案、各字段报错先后、`String(...)` 的宽松准入、Life 新稿与旧存档两条路径的区别、Body 的素材槽校验（复用现有 `requirePresentationSlot`）、回执重放和指纹，全部保留。
- Body 调 Economy 的 `buy / sell` 子集（`room.ts:41`、`living/economy/plugin.ts:27`）改用同一份经济操作表。

**点数**：两个函数现在合计 17 个 kind 点（`plan.ts` 8、`room.ts` 9），算上 `plan.ts:127`、`room.ts:628` 是 19。按 kind 分派后预计减 8 点以上，开工细则里逐条列出合并前后。这是 kind 回到目标的主要来源。

**不做**：Room 菜园工具的 12 个操作（`room/plugin.ts:131`）是角色工具的超集，含 `state / auto / careNow` 等非计划操作，属于 Room 入口自己的词表，只把与计划重叠的部分改为从菜园操作表拼出。

**开工细则要定**：校验表的形状；17 个点合并后的去向。

## 第 4 批：活动、阶段和身体状态契约

**现状**：`currentActivityId` 在 `src/` 里没有出现（只在文档里）；`activityId` 的取值混着执行编号、菜园任务号、照料任务号和自动摘要（`living/body/plugin.ts:212,222,227`）。执行到身体的有损转换在 `plugin.ts:222-223`（运行中计划只保留 `moving / working`，其余归 `pending`）。身体的 `completed` 来自 `task.completedAt`（`plugin.ts:224-230`），而计划、库存投喂和角色动作都会产生任务（`room.ts:459,544,975-981,1044-1048`），和执行的 `completed` 同名不同义。

**做法**：

- 命名：`contracts/behavior.ts` 导出 `BodyPhase`、`ExecutionPhase`、`ExecutionStatus`。内部变量和参数按职责叫 `label`（自然语言标签）、`operationId`（已派发操作）、`currentActivityId`（快照里的当前活动）；序列化字段 `activity`、`activityId` 不改名，在类型旁注明对应职责和取值来源。
- 转换函数：`living/body/` 新增纯函数 `bodyPhaseOf(execution)`，承接 `plugin.ts:222-223` 的投影，注释写明 `waiting` 变成 `pending`。两种 `completed` 的区别写进类型注释。Body 里另有几处把原始身体或上游菜园状态投影成**执行**阶段（`room.ts:214-215,565,955,964-965,970-971`），方向不同，留在原处，只改为引用 `ExecutionPhase`。设置页的执行阶段标签（`console/client.js:638`）加契约测试比对 `ExecutionPhase`。
- `busy`：同目录新增 `companionBusy(her)`（不用 `bodyStatus` 这个名字，Desktop 已有同名方法表示桌面进程状态，`desktop/platform/plugin.ts:249`）。口径**照搬 Desktop 现在的判断**：睡着、走路、或 `kind` 不在 `idle / play / idle_look / react_happy / react_pout / react_shy / react_scare` 里（`desktop/platform/plugin.ts:680`），输入同样是 `homeView` 投影后的 `her`，不是原始存档状态。结果放进 `BehaviorActivity`，因为 Desktop 读的 `roomState()` 只转发 `home` 展开和 `behavior`，不转发快照根字段（`living/body/plugin.ts:340-344`）。
- Desktop：`desktop/platform/plugin.ts:680` 改读 `behavior.busy`。没有身体时（`her` 缺席）原来 `busy` 为假，改后同样为假，不需要兜底。两处「正在吃饭」判断（`:686,690`）合成一处，留在 Desktop 适配层（5.7 定的兼容行为）。睡觉/起床分支、`activity-required` 分支、素材同一性判断不动。

**点数**：Desktop 这段是 3 个 kind 点，白名单搬到 Body 仍计 1 点，吃饭判断合并减 1，本批净减约 1。

**不做**：「能否被打断」（拍板点 3）；两套呈现分类器（已知问题 4）；`ActivityClip` 搬家；删 `home:any`；Desktop 其余读睡眠和身体存在的地方（`desktop/features.ts:121,199,246-260`、`desktop/platform/plugin.ts:325,331,667`），它们读的是睡没睡、有没有身体，不是忙不忙。

**开工细则要定**：`busy` 在 `BehaviorActivity` 里的字段名；`companionBusy` 和呈现分类器（`living/body/presentation.ts:17-19`）各自的白名单为什么不同，写进注释。

## 第 5 批：事实声明

**现状**：领域清单 `body / economy` 散在 `contracts/interaction.ts:13`、`core/native/conversation.ts:206`、`living/index.ts:290`（按 ID 前缀反推领域）、`living/plan/facts.ts:9`、`living/plan/plugin.ts:277,308,440,445`、`living/prompt-context.ts:70`、`memory/provider.py:76`；上游还有封闭的 `FactRef`（`vendor/dsh-world/lib/life/types.d.ts:27`），新增领域会碰到上游边界。`type` 没有任何地方校验（`conversation.ts:206-208` 查的是版本、ID、领域、actor、摘要和时间）。实际写入的 `type`：Body 写动作字，主人房间入口原样转发上游 `HOME_ACTIONS` 的 15 项（`home-state.js:23-25`，含 `sick / heal`），角色入口收窄成十种，另有库存投喂和睡着拒绝两处写 `feed`（`room.ts:462-463,666,1036-1040`）；Economy 是 `purchase / sale / money-grant / item-gift / reading-import`（`living/economy/store.ts:247,256,263,271,332`）。

**做法**：

- `contracts/interaction.ts` 放领域声明：每个领域一份 `type` 集合。Body 的集合就是上游 `HOME_ACTIONS` 的 15 项（Body 事实的 `type` 由上游动作决定），在声明里写成一张表，加测试比对 vendor 的 `HOME_ACTIONS`；`room.ts:1036` 的标签表改成以它为键的映射（现在缺 `sick / heal` 的标签，按现状回落成动作字，保持不变）。Economy 五项放同一处。
- **写入和读取分开**：新写入的事实用收窄后的类型（按 `domain` 区分的联合）；读取的类型保留未知 `type` 的原文，不因 `type` 不在声明里而拒绝。具体写法开工细则里定，约束是不新增 R8 裸字段（扫描器把导出的 `type: string` 记为裸字段，`vocabulary.mjs:30-34`）。
- 统一解码：同文件导出 `factDomainOf(id)` 和事实信封的校验函数，替换 `living/index.ts:290-292` 的前缀反推和各处重复的领域清单；`conversation.ts:206-208` 改用同一个校验函数，校验内容不增不减（仍调 `canonical`，不新增前缀或结果状态校验）。Life 按引用回读保留顺序和重复，不要求 ID 带冒号前缀（`tests/life/life-fact-read.test.ts:6-18` 特意用了无前缀 ID）。提示词段（`living/prompt-context.ts:70-111`）会准备、投影并确认事实，确认依赖原样投影（`core/interaction-presentation.ts:8-34`），本批只换它的领域清单来源，不动投影。
- Python：`memory/provider.py:76-78` 不改写法，加正反双向契约测试：构建后读 TS 侧的领域和 actor 集合，逐个喂给 `interaction_source` 必须接受；再从 Python 侧穷举它接受的值，必须都在 TS 声明里；不存在的领域必须拒绝。

**特殊情况**：真实历史库里实际出现过哪些 `type` 不知道，本批不碰真实数据；用第 1 批的合成旧记录覆盖未知类型、已确认回读、同请求重试和日志确认。JSON 形状不变，但升级和回退是否不受影响以这些测试为准，不从「形状不变」推出。

**开工细则要定**：读取类型的写法；新增领域时上游 `FactRef` 边界要改哪里（写进 architecture.md 5.10 的「新增事实领域」一行）。

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

## 审查结论
