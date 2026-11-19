# 种地时钟：暂停区间在组件缺席时也不计入生长

- 级别：大改（跨 behavior、life、economy 三个模块；`control.json` 和 Body 检查点各多一个字段；改 Body 与 Economy 之间的菜园端口）
- 状态：已确认（2026-11-19，主人全部按推荐通过）

行号以 `234bde9` 为准。主人在 2a 第 1 批合并后决定：3A 之前先做 G3 复盘，并单独修复（会话记录，2026-11-19）。

## 目标与外部变化

**主人看到的**：暂停生活之后，作物在暂停期间一律不长，不管暂停和恢复的那一刻 `25-Behavior`、`22-Economy` 有没有加载。现在只要在暂停或恢复时缺了其中一个，暂停时间就可能被补算成生长（[stage2a-merge.md](stage2a-merge.md)「1A 差异清单」第 1、2 行，行为清单 2A1A-12、2A1A-13：长了 2 小时、暂停 4 小时，重新加载后进度是 6/12，应为 2/12）。

其他不变：没暂停过的存档、一直启用时卸载再加载组件、三个组件都在时的普通暂停和恢复，作物进度、湿度和现在一样。设置页、命令、工具输出不变；唯一新增的可见行为是拍板点 2 里那条拒绝（如果采纳）。

**开发者看到的**：Life 的 `control.json` 多一个 `pauses` 字段；`bodyClockState()` 多返回这份区间；菜园端口的 `loadGarden(now, passive)`、`actGarden(…, passive)` 改成接收时钟（区间）。

## G3 复盘（种地时钟第 3 批之前必须做）

**前两批**：

- 第 1 批（`2962d0f`，当时的 `tests/audit-r5-garden-clock.test.mjs`，现在在 `tests/regressions/`）：修的是准入的应用顺序——生长投影之前先跳过暂停时间，暂停时先把已启用的时间提交（`tests/regressions/audit-r5-garden-clock.test.mjs:53,95`）。
- 第 2 批（`9b8a9ba`）：修的是把「执行器还没恢复或被卸载」误当成「主人暂停」，并加上已提交进度不能倒退的保护（`tests/behavior/garden-clock-continuity.test.ts:51,86`）。

这次是第 3 次失守，2a 第 1 批 1A 取证时发现。

**共同根因**：「哪段时间算启用」没有被记录下来。现在只靠一个当前开关（Life 的 `enabled`、Body 检查点的 `gardenClockEnabled`）加上菜园的一个 `updatedAt`，在当时在场的组件处理暂停或恢复的那一刻，把区间折算进 `updatedAt`。一个布尔值加一个时间点，重建不出「启用—暂停—启用」这样的混合区间，所以每换一种装卸组合或处理顺序，就可能多算或少算：

- 开关只存当前值：`control.json` 只写 `{version, enabled, preferences}`，开关和偏好的两个写入口都是这样（`src/life/plugin.ts:480,512`）。
- 缺 Economy：暂停那一刻菜园不可用，边界结算直接跳过（`src/behavior/room.ts:237`），之后没有地方补；Economy 回来后，按启用状态从旧的 `updatedAt` 一路算到现在（`src/economy/store.ts:427-434`，`vendor/feiyu-room-template/public/room/garden-state.js:137-152`）。
- 缺 Body：暂停和恢复只写了 `control.json`。Body 重新加载时，检查点里的 `gardenClockEnabled` 还是 `true`，于是走「启用状态下重启，保留已过时间」的分支（`src/behavior/room.ts:231`）。
- 处理顺序：Life 写盘后才发 `pet/life.changed`，Body 收到后只是入自己的队列（`src/life/plugin.ts:483`，`src/behavior/plugin.ts:68-80`）。排在前面的 Body 读写仍按旧开关运行；先提交的那一次会把暂停算成生长，或者把恢复后的时间跳过，提交之后无法回收（Codex 用上游生长函数做的内存验证：应长 3/12，旧顺序下会得到 2/12 或 4/12）。

前两批补的是「读的时候」和「恢复的时候」两种组合；这次是「暂停或恢复的时候不在场」。所以这次在源头修：**把暂停区间记下来；每次推进菜园都按区间扣，不再依赖暂停那一刻谁在场、谁先处理。**

**会推进或提交菜园的入口**（这次都要走同一条规则）：

| 入口 | 位置 |
| --- | --- |
| Body 读菜园（观察、身体动作、定时器、装卸、计划派发和停续都经 `tick` 进入这里） | `src/behavior/room.ts:157-166` → 端口 `loadGarden`（`src/economy/plugin.ts:118`） |
| Body 的手工菜园动作（Room 的 `roomGarden`、`roomPlant`、照料、`room_garden` 和拍照工具，Life 的兼容门面） | `src/behavior/room.ts:1085-1090` → 端口 `actGarden` → `src/economy/store.ts:457-463` |
| caretaker 自动照料写菜园 | `vendor/feiyu-room-template/src/garden-autonomy.js:264,308`，经 Body 注入的 `storage.loadGarden/saveGarden` |
| Economy 改配置时重算菜园 | `src/economy/plugin.ts:202-209` → `src/economy/store.ts:275-276` |
| Economy 的菜园视图 | `src/economy/store.ts:465` |
| 还没采用 Economy 的旧菜园 JSON：读、手工动作、首次接管导入 | `src/behavior/room.ts:162,1090`，`vendor/feiyu-room-template/src/garden-store.js:20,37`，`src/economy/store.ts:77-86` |
| 经济上下文段（只用金币，不提交进度） | `src/economy/plugin.ts:253` |

**怎样算结束这一轮**：2A1A-12、2A1A-13 改成断言 2/12 并通过；下面「验收」里新增的几条 L1 通过（同时断言进度、湿度和已提交的 `updatedAt`）；`pnpm run verify` 和行为清单全绿。

**相邻但不是同一个不变量**：Body 缺席期间，身体需求按离线窗口推进（`src/behavior/room.ts:243-251`），这段时间里如果暂停过，离线窗口也算进去。6.2 只规定了「有 Body 时停止被动推进」（`docs/architecture.md:562`），Body 不在时怎样没有定义。见拍板点 3。

## 范围变化

不在 2a 完成标准里，主人已说「现在做」，排在 3A 之前。

- **替换或延期了什么**：不替换任何目标；3A 往后推一批。2a 的完成标准全部有效。
- **当前闭环怎么验收**：见「怎样算结束这一轮」和「验收」。
- **原完成标准还算不算数**：算。2A1A-12、2A1A-13 是 1A 固定的现状基准，这次明确改成新断言，新断言就是 3B「断言不改继续通过」的基准（[stage2a-merge.md](stage2a-merge.md) 拍板点 3）。合并时在 2a 方案里注明这次基准变更。
- **对应的用户场景**：场景 3「她有自己的生活」——主人暂停生活，就是希望生活世界停下来。

## 改动范围

- 这一步是：改逻辑（不搬家；3A 在这一批合并之后开工）
- 允许修改：
  - `src/life/plugin.ts` — `control()` 和 `settings()` 写入时维护 `pauses`；两处读取（`:105-125`、`:148-162`）解析 `pauses`；`bodyClockState()` 返回区间；工作区切换时清掉内存状态
  - `src/behavior/room.ts`、`src/behavior/plugin.ts` — 所有推进菜园的入口（上表前三行和旧 JSON）在推进时同步取时钟；Body 检查点缓存一份区间副本
  - `src/economy/store.ts`、`src/economy/plugin.ts` — `readGarden`、`actGarden`、`configure`、`gardenView` 按区间分段推进；端口签名改为接收时钟；新增一个只读的「已提交菜园时钟」读取，供清理用
  - `src/economy/garden-clock.ts`（新）— 纯函数：按区间分段推进、校验和规整区间
  - `tests/behavior-list/entries-lifecycle.test.mjs`、`tests/behavior-list/index.json` — 改 2A1A-12、2A1A-13 的断言，登记新增条目
  - `tests/behavior/**`、`tests/regressions/**`、`tests/life/**`、`tests/economy/**` — 受签名变化影响的已有测试（至少 `garden-clock-continuity`、`audit-r5-garden-clock`、`life-clock-intent`、`life-desktop-integration`、`autonomous-life`、`mapped-refused-movement`），以及新增测试；**只能改调用方式，不能放宽断言**
  - `arch/storage.json` 的 `life` 和 `body` 条目 — `protocol` 写明新字段
  - `dist/src/**` — 构建产物，照常提交，不计入阈值
- 必须复用：
  - `vendor/feiyu-room-template/public/room/garden-state.js:134` 的 `advanceGarden`，经 `src/economy/store.ts:373-375` 的 `advance` 和 `gardenOptions` — 每一段都用它算，保留作物规则、存档规则和回执，不另写生长公式
  - `src/economy/store.ts:430` 现有的「不在长就把 `updatedAt` 推到当前时间」 — 只在没有区间记录时继续使用
  - `src/life/plugin.ts:104-125` 的 `bodyClockState()` — 保持同步、不进队列的读法；Body 和 Economy 推进菜园时直接调用它（`src/behavior/plugin.ts:70,149`，`src/economy/plugin.ts:206`），不改成等 Life 的队列（Life 的停止和计划停续会等 Body，反过来等会形成循环）
  - `durableWrite`（`src/life/plugin.ts:480`）— 整份原子替换 `control.json`
  - `src/economy/store.ts:419` 附近的 `projectGarden()` — 读已提交的行，供「已提交菜园时钟」用
- 不做：
  - Body 缺席期间的身体需求（拍板点 3）
  - 修正已经多长了的历史存档：以前的暂停没有记录，无法补扣
  - 改 Desktop：它只读 `bodyClockState().enabled`（`src/desktop/features.ts:80`），这个字段语义不变，只加回归覆盖

**核心做法**：

1. **记录**：Life 只在**已提交的开关值真正改变**时产生边界：`true → false` 在 `pauses` 末尾加 `{from, to: null}`；`false → true` 把最后一条未结束的区间填上 `to`。重复写同一个值不产生新区间（`control()` 可以被重试，`src/life/plugin.ts:475`）。`settings()` 改偏好时原样保留 `pauses`。开关和区间在同一次 `durableWrite` 里写入。
2. **推进**：每次推进菜园，都从已提交行的 `updatedAt` 推到当前时间；遇到和这段时间重叠的区间就分段——先用 `advance` 推到区间开始，再把 `updatedAt` 跳到区间结束（没结束的跳到当前时间），然后继续。完全落在 `updatedAt` 之前的区间不起作用，所以三个组件都在时的现有边界结算照常进行，不会重复扣。
3. **区间优先**：只要拿得到区间，就只按区间算，不再看 Body 检查点里的布尔值，也不看 `passive`。布尔值只在「完全没有区间记录」（旧存档、新字段还没写过）时沿用现在的逻辑。这样 Body 按旧开关排队的读写，提交的也是按区间算出来的正确结果。
4. **时钟来源**：推进时同步调用 Life 的 `bodyClockState()`。Life 不在时，用 Body 检查点里的副本（Body 每次从 Life 拿到区间就同时更新副本，和保存菜园在同一次检查点里）。两者都拿不到时，见拍板点 2。
5. **CAS 冲突**：Body 保存菜园时仍带原投影的 revision；冲突时从已提交行重读、重新取时钟、重新推进（`src/economy/store.ts:435-440` 现有的冲突处理）。`configure` 维持现在的顺序：在同一个同步事务里校验配置 revision、按旧规则结算菜园、写新规则（`src/economy/store.ts:275-276`）。
6. **清理**：Life 写 `control.json` 时，读一次「已提交菜园时钟」，删掉 `to` 不晚于它的区间；Economy 不在或读不出来就全部保留。不设条数上限（见拍板点 4）。

## 特殊情况

- **空状态**：`control.json` 不存在或没有 `pauses`，当作没有区间记录，行为和现在一样。新装的伙伴第一次暂停时开始记录。
- **旧的暂停存档**：`enabled: false` 但没有 `pauses`（升级前就暂停着），第一次恢复时没有可闭合的区间：这一次沿用现在的布尔逻辑，之后的暂停开始记录。
- **重启**：区间在 `control.json` 里，重启后照样生效；暂停中重启，最后一条 `to` 仍是 `null`。
- **开关已提交但后续失败**：开关写盘后，计划停续或运行时启动仍可能报错（`src/life/plugin.ts:484-488`）。区间以已提交的开关为准，重试不会产生第二条区间。
- **格式不对**：`pauses` 不是有序、互不重叠的列表，或者最后一条未结束的区间和 `enabled` 对不上，按现有规则报「生活开关文件无效」并保留原文件（`src/life/plugin.ts:120,159`）。
- **时间倒退**：新区间的 `from` 取 `max(当前时间, 上一条的 to)`；闭合时 `to` 取 `max(当前时间, from)`，不会出现负长度或重叠；分段推进保证 `updatedAt` 只增不减。同一毫秒内暂停又恢复，得到长度为 0 的区间，写入时直接丢掉。
- **Economy 读不出来时暂停**：照常暂停并记录区间，只是这次不清理。暂停不依赖 Economy。
- **旧数据兼容和回退**：0.2.0 读到带 `pauses` 的 `control.json` 会忽略这个字段（`v0.2.0` 的 `src/life/plugin.ts:119-122,158-162` 只检查 `version` 和 `enabled`），它下一次改开关或偏好会把字段丢掉，等于回到现在的行为。只换包、不恢复数据的回退不保证新语义；正式回退按 [development.md](../development.md) 恢复回退备份。Body 副本只在 Life 不在时使用，而且以 Life 给出的区间为准，Life 一回来就覆盖副本。
- **打包后能否运行**：只改 `src/`，`exports` 和 `files` 不变；`verify` 里的打包校验覆盖。

## 概念与扩展检查

| 概念 | 拥有者 | 写入者和验证 | 为什么需要 |
| --- | --- | --- | --- |
| 暂停区间 `control.json.pauses`（`{from, to\|null}` 的有序列表） | life | 只有 Life 的 `control()` 改它，`settings()` 原样保留；Core 初始化只在文件缺失时建一份不带 `pauses` 的 `control.json`，并校验 `version`、`enabled`（`src/core/initialization.ts:56-63,74-75`），这两处不改，`pauses` 的格式只由 Life 校验；登记进 `arch/storage.json` 的 `life` 条目 | 暂停区间必须在缺席组件回来后仍然能扣 |
| Body 检查点里的区间副本 | behavior | 只有 Body 写，内容来自 Life；只在 Life 不在时读；登记进 `arch/storage.json` 的 `body` 条目（两个 `home.json` 路径） | Life 卸载期间不会产生新暂停，但已记录的区间仍要扣 |
| 「已提交菜园时钟」只读读取 | economy | Economy 提供，Life 读；单元测试 | 清理只能按已提交的 `updatedAt`，不能按投影 |

- **词表**：不新增封闭集合。
- **复用的已有声明**：`bodyClockState()`、`pet/life.changed`、菜园端口、`advanceGarden`、`durableWrite`。
- **层间接口变化**：都在第二层内部。`bodyClockState()` 多一个返回字段；菜园端口的 `loadGarden`、`actGarden` 由布尔值改为时钟（`src/behavior/room.ts:33-35`，`src/economy/plugin.ts:118`）；Economy 多一个只读方法。第一层、第三层不变。
- **数据格式**：两份持久文件各多一个可选字段，缺省等于现在的行为，`version` 不升。是否需要迁移步骤见拍板点 5。合并时由 Claude 同步 architecture.md 第 4 节。

## 拍板记录

1. **暂停区间记在哪里** — 推荐：Life 的 `control.json`。理由：暂停和恢复只经过 Life（`src/console/settings.ts:228` → `src/life/plugin.ts:475`），它是唯一每次都在场的。备选：另开一个文件，多登记一份持久数据，没有额外好处。决定：按推荐。
2. **Life 不在、Body 副本也拿不到时**（例如 Life 和 Body 都卸载了，只剩 Economy） — 推荐：会提交作物进度的写入（目前只有「改经济配置」，`src/economy/plugin.ts:202-209`）拒绝，并提示先加载生活或身体组件；只读的投影（经济上下文段、菜园视图）照常按现在的方式显示。理由：这时可能还有已记录、没扣的暂停，按默认「在长」提交就会补算，而且提交后无法回收；只剩 Economy 时改配置很少见。备选 A：和现在一样默认在长并提交（简单，但留下一个已知会补算的口子）。备选 B：这种情况下改配置只写新规则、不结算菜园（新规则会被套用到之前的时间段）。决定：按推荐。
3. **Body 缺席期间的身体需求要不要一起扣暂停** — 推荐：这次不做，记进 `ideas/inbox.md`，由主人以后决定要不要把 6.2 补成「Body 不在时暂停也停止身体被动变化」。理由：6.2 没定义过，属于另一个不变量，混进来会让这一批的验收说不清。备选：这次一起做，用同一份区间扣离线窗口。决定：按推荐。
4. **区间清理** — 推荐：按 Economy 已提交的 `updatedAt` 清理，不设条数上限。理由：区间只在「Economy 不在」期间积累，而且每条都对应主人的一次手动暂停，不会多到成问题；设上限就得定义超过后怎么办，拒绝暂停是新的可见行为，丢弃最旧的又会算错。备选：上限 256 条，超过拒绝暂停。决定：按推荐。
5. **要不要加迁移步骤** — 推荐：不加。理由：只是可选字段，缺省等于现在的行为，旧版本会忽略，没有要搬或要改写的已有数据；加一个空步骤只会让 0.3.0 的迁移多一步。合并时在 `docs/decisions.md` 记一条「新增可选字段、缺省等于旧行为的，不需要迁移步骤」，和 AGENTS.md「改了已有数据的格式就加迁移步骤」的规则对齐。备选：按字面规则加一个只校验、不改写的迁移步骤。决定：按推荐。

## 验收

- 快测：`pnpm run build && node --test tests/behavior-list/entries-lifecycle.test.mjs dist/tests/behavior/garden-clock-continuity.test.js tests/regressions/audit-r5-garden-clock.test.mjs dist/tests/life/life-clock-intent.test.js`，加上新增的 `garden-clock` 单元测试
- 行为清单：`pnpm run build && pnpm run test:behavior-list`（2A1A-12、2A1A-13 断言改成 2/12；新增条目登记 `l1Stage: 阶段 2`、家族「种地时钟」）
- 门禁：`pnpm run verify`
- 必须新增的测试（真实入口、真实 Cordis 装卸，复用 `cordisFixture`；每条同时断言进度、湿度和已提交的 `updatedAt`）：
  - 只缺一个边界：暂停时缺 Economy、暂停中 Economy 回来再恢复；暂停时缺 Body、恢复前 Body 回来
  - 整段缺席：Body 缺席时暂停再恢复；Economy 缺席时暂停再恢复；两者都缺席
  - 恢复之后再走一段启用时间，确认这段照常生长（防止少算）
  - 一次缺席里暂停两次
  - 暂停中整体重启（`f.restart()`），然后恢复
  - 暂停已写盘、Body 里还排着按旧开关的读写：提交结果仍按区间算
  - 手工菜园动作（经 `actGarden`）发生在暂停期间：不补算生长
  - 还没采用 Economy 的旧 JSON 菜园：暂停期间的读和手工动作都不补算
  - Life 卸载后才重新加载 Economy：区间从 Body 副本取
  - 按拍板点 2 的决定：Life 和 Body 都不在时改经济配置的结果
  - 重复写同一个开关值不产生新区间；暂停中改 Life 偏好，区间保留
  - 已有存档没有 `pauses`：结果和改之前相同
  - 时间倒退：不产生重叠、负长度区间，`updatedAt` 不减
  - 清理：Economy 提交过之后再暂停，旧区间被删
- 手动：无（不改界面）。主人可在隔离环境里卸载 `25-Behavior` → 暂停 → 等一会 → 恢复 → 重新加载，看作物进度没有补长。

## 执行结果

## 审查结论
