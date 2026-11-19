# 种地时钟：暂停区间在组件缺席时也不计入生长

- 级别：大改（跨 behavior、life、economy 三个模块；`control.json` 增加可选字段；改 Body 与 Economy 之间的菜园端口）
- 状态：已确认（2026-11-19，主人全部按推荐通过）

行号以 `234bde9` 为准。主人在 2a 第 1 批合并后决定：3A 之前先做 G3 复盘，并单独修复（会话记录，2026-11-19）。

## 目标与外部变化

**主人看到的**：暂停生活之后，作物在暂停期间一律不长，不管暂停和恢复的那一刻 `25-Behavior`、`22-Economy` 有没有加载。现在只要在暂停或恢复时缺了其中一个，暂停时间就可能被补算成生长（[stage2a-merge.md](stage2a-merge.md)「1A 差异清单」第 1、2 行，行为清单 2A1A-12、2A1A-13：长了 2 小时、暂停 4 小时，重新加载后进度是 6/12，应为 2/12）。

其他不变：没暂停过的存档、一直启用时卸载再加载组件、三个组件都在时的普通暂停和恢复，作物进度、湿度和现在一样。设置页、命令、工具输出不变，没有新增的拒绝（拍板点 6 取代了拍板点 2）。

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
  - `src/life/plugin.ts` — `control()` 和 `settings()` 写入时维护 `pauses`；两处读取（`:105-125`、`:148-162`）解析 `pauses`；`bodyClockState()` 返回区间；工作区切换时清掉内存状态；把读 `control.json` 的逻辑（现在在 `bodyClockState()` 里，`:110-123`）抽成导出的纯函数，供 Life 服务不在时使用
  - `src/behavior/room.ts`、`src/behavior/plugin.ts` — 所有推进菜园的入口（上表前三行和旧 JSON）在推进时同步取时钟（Life 服务在就问服务，不在就调 Life 导出的读取函数）
  - `src/economy/store.ts`、`src/economy/plugin.ts` — `readGarden`、`actGarden`、`configure`、`gardenView` 按区间分段推进；端口签名改为接收时钟；新增一个只读的「已提交菜园时钟」读取，供清理用
  - `src/economy/garden-clock.ts`（新）— 纯函数：按区间分段推进、校验和规整区间
  - `tests/behavior-list/entries-lifecycle.test.mjs`、`tests/behavior-list/index.json` — 改 2A1A-12、2A1A-13 的断言，登记新增条目
  - `tests/behavior/**`、`tests/regressions/**`、`tests/life/**`、`tests/economy/**` — 受签名变化影响的已有测试（至少 `garden-clock-continuity`、`audit-r5-garden-clock`、`life-clock-intent`、`life-desktop-integration`、`autonomous-life`、`mapped-refused-movement`），以及新增测试；**只能改调用方式，不能放宽断言**
  - `arch/storage.json` 的 `life` 条目 — `protocol` 写明新字段；`body` 条目如果上一轮已改，改回去
  - `dist/src/**` — 构建产物，照常提交，不计入阈值
- 必须复用：
  - `vendor/feiyu-room-template/public/room/garden-state.js:134` 的 `advanceGarden`，经 `src/economy/store.ts:373-375` 的 `advance` 和 `gardenOptions` — 每一段都用它算，保留作物规则、存档规则和回执，不另写生长公式
  - `src/economy/store.ts:430` 现有的「不在长就把 `updatedAt` 推到当前时间」 — 只在没有区间记录时继续使用
  - `src/life/plugin.ts:104-125` 的 `bodyClockState()` — 保持同步、不进队列的读法；Body 和 Economy 推进菜园时直接调用它（`src/behavior/plugin.ts:70,149`，`src/economy/plugin.ts:206`），不改成等 Life 的队列（Life 的停止和计划停续会等 Body，反过来等会形成循环）
  - `durableWrite`（`src/life/plugin.ts:480`）— 整份原子替换 `control.json`
  - `src/economy/store.ts:419` 附近的 `projectGarden()` — 读已提交的行，供「已提交菜园时钟」用
- 不做：
  - Body 检查点不存区间副本，`arch/storage.json` 的 `body` 条目不改（拍板点 6）
  - Body 缺席期间的身体需求（拍板点 3）
  - 修正已经多长了的历史存档：以前的暂停没有记录，无法补扣
  - 改 Desktop：它只读 `bodyClockState().enabled`（`src/desktop/features.ts:80`），这个字段语义不变，只加回归覆盖

**核心做法**：

1. **记录**：Life 只在**已提交的开关值真正改变**时产生边界：`true → false` 在 `pauses` 末尾加 `{from, to: null}`；`false → true` 把最后一条未结束的区间填上 `to`。重复写同一个值不产生新区间（`control()` 可以被重试，`src/life/plugin.ts:475`）。`settings()` 改偏好时原样保留 `pauses`。开关和区间在同一次 `durableWrite` 里写入。
2. **推进**：每次推进菜园，都从已提交行的 `updatedAt` 推到当前时间；遇到和这段时间重叠的区间就分段——先用 `advance` 推到区间开始，再把 `updatedAt` 跳到区间结束（没结束的跳到当前时间），然后继续。完全落在 `updatedAt` 之前的区间不起作用，所以三个组件都在时的现有边界结算照常进行，不会重复扣。
3. **区间优先**：只要拿得到区间，就只按区间算，不再看 Body 检查点里的布尔值，也不看 `passive`。布尔值只在「完全没有区间记录」（旧存档、新字段还没写过）时沿用现在的逻辑。这样 Body 按旧开关排队的读写，提交的也是按区间算出来的正确结果。
4. **时钟来源**：推进时同步调用 Life 的 `bodyClockState()`。Life 服务不在时，Body 和 Economy 直接调用 Life 导出的纯函数读 `control.json`（分层声明已允许 behavior、economy 依赖 life，`arch/layers.json`），读到的就是权威区间。数据仍归 Life，读取用的是 Life 自己的代码，而且只读。没有 `control.json` 时当作「没有区间记录」，沿用现在的布尔逻辑（不当作「已暂停」）；文件存在但格式不对时，按现有规则报「生活开关文件无效」。不再有 Body 副本（拍板点 6）。
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
- **旧数据兼容和回退**：0.2.0 读到带 `pauses` 的 `control.json` 会忽略这个字段（`v0.2.0` 的 `src/life/plugin.ts:119-122,158-162` 只检查 `version` 和 `enabled`），它下一次改开关或偏好会把字段丢掉，等于回到现在的行为。只换包、不恢复数据的回退不保证新语义；正式回退按 [development.md](../development.md) 恢复回退备份。没有 Body 副本，所以不存在副本过期的问题。
- **打包后能否运行**：只改 `src/`，`exports` 和 `files` 不变；`verify` 里的打包校验覆盖。

## 概念与扩展检查

| 概念 | 拥有者 | 写入者和验证 | 为什么需要 |
| --- | --- | --- | --- |
| 暂停区间 `control.json.pauses`（`{from, to\|null}` 的有序列表） | life | 只有 Life 的 `control()` 改它，`settings()` 原样保留；Core 初始化只在文件缺失时建一份不带 `pauses` 的 `control.json`，并校验 `version`、`enabled`（`src/core/initialization.ts:56-63,74-75`），这两处不改，`pauses` 的格式只由 Life 校验；登记进 `arch/storage.json` 的 `life` 条目 | 暂停区间必须在缺席组件回来后仍然能扣 |
| Life 导出的时钟读取函数 | life | 只读 `control.json`；Body、Economy 在 Life 服务不在时调用；单元测试和「Life 卸载后 Body 回来」的 L1 | Life 卸载期间不会产生新暂停，但已记录的区间仍要扣（取代原来的 Body 副本，见拍板点 6） |
| 「已提交菜园时钟」只读读取 | economy | Economy 提供，Life 读；单元测试 | 清理只能按已提交的 `updatedAt`，不能按投影 |

- **词表**：不新增封闭集合。
- **复用的已有声明**：`bodyClockState()`、`pet/life.changed`、菜园端口、`advanceGarden`、`durableWrite`。
- **层间接口变化**：都在第二层内部。`bodyClockState()` 多一个返回字段；菜园端口的 `loadGarden`、`actGarden` 由布尔值改为时钟（`src/behavior/room.ts:33-35`，`src/economy/plugin.ts:118`）；Economy 多一个只读方法；Life 多一个导出的纯函数，Body、Economy 在 Life 服务不在时调用（代码依赖，`arch/layers.json` 已允许）。第一层、第三层不变。
- **数据格式**：`control.json` 多一个可选字段，缺省等于现在的行为，`version` 不升。是否需要迁移步骤见拍板点 5。合并时由 Claude 同步 architecture.md 第 4 节。

## 拍板记录

1. **暂停区间记在哪里** — 推荐：Life 的 `control.json`。理由：暂停和恢复只经过 Life（`src/console/settings.ts:228` → `src/life/plugin.ts:475`），它是唯一每次都在场的。备选：另开一个文件，多登记一份持久数据，没有额外好处。决定：按推荐。
2. **（已被拍板点 6 取代）Life 不在、Body 副本也拿不到时**（例如 Life 和 Body 都卸载了，只剩 Economy） — 推荐：会提交作物进度的写入（目前只有「改经济配置」，`src/economy/plugin.ts:202-209`）拒绝，并提示先加载生活或身体组件；只读的投影（经济上下文段、菜园视图）照常按现在的方式显示。理由：这时可能还有已记录、没扣的暂停，按默认「在长」提交就会补算，而且提交后无法回收；只剩 Economy 时改配置很少见。备选 A：和现在一样默认在长并提交（简单，但留下一个已知会补算的口子）。备选 B：这种情况下改配置只写新规则、不结算菜园（新规则会被套用到之前的时间段）。决定：按推荐。
3. **Body 缺席期间的身体需求要不要一起扣暂停** — 推荐：这次不做，记进 `ideas/inbox.md`，由主人以后决定要不要把 6.2 补成「Body 不在时暂停也停止身体被动变化」。理由：6.2 没定义过，属于另一个不变量，混进来会让这一批的验收说不清。备选：这次一起做，用同一份区间扣离线窗口。决定：按推荐。
4. **区间清理** — 推荐：按 Economy 已提交的 `updatedAt` 清理，不设条数上限。理由：区间只在「Economy 不在」期间积累，而且每条都对应主人的一次手动暂停，不会多到成问题；设上限就得定义超过后怎么办，拒绝暂停是新的可见行为，丢弃最旧的又会算错。备选：上限 256 条，超过拒绝暂停。决定：按推荐。
5. **要不要加迁移步骤** — 推荐：不加。理由：只是可选字段，缺省等于现在的行为，旧版本会忽略，没有要搬或要改写的已有数据；加一个空步骤只会让 0.3.0 的迁移多一步。合并时在 `docs/decisions.md` 记一条「新增可选字段、缺省等于旧行为的，不需要迁移步骤」，和 AGENTS.md「改了已有数据的格式就加迁移步骤」的规则对齐。备选：按字面规则加一个只校验、不改写的迁移步骤。决定：按推荐。

6. **（执行中补充，2026-11-19）Life 服务不在时从哪里取区间** — 执行时发现：Body 整段缺席期间暂停又恢复，随后 Life 先卸载、Body 再回来，Body 副本是暂停前存的，手工菜园动作仍按 6/12 提交。推荐：Life 把读 `control.json` 的逻辑导出成纯函数，Life 服务不在时 Body 和 Economy 直接调用；删掉 Body 副本；拍板点 2 的拒绝不再需要，同时取消。理由：读到的就是权威区间，任何装卸顺序都成立；分层已允许这两个依赖；少一份持久字段。备选：Life 不在时 Body 加载就不提交作物进度（和 6.2「卸载 Life 时显式操作仍可用」冲突）。决定：按推荐。

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
  - Life 卸载后才重新加载 Economy：区间从 Life 导出的读取函数取
  - Body 整段缺席时暂停再恢复，随后先卸载 Life、再加载 Body：手工菜园动作提交 2/12（执行时发现的停点，保留为回归测试）
  - Life 和 Body 都不在时改经济配置：照常成功，并按区间扣除暂停
  - 没有 `control.json` 也没有 Life 服务：结果和改之前相同
  - 重复写同一个开关值不产生新区间；暂停中改 Life 偏好，区间保留
  - 已有存档没有 `pauses`：结果和改之前相同
  - 时间倒退：不产生重叠、负长度区间，`updatedAt` 不减
  - 清理：Economy 提交过之后再暂停，旧区间被删
- 手动：无（不改界面）。主人可在隔离环境里卸载 `25-Behavior` → 暂停 → 等一会 → 恢复 → 重新加载，看作物进度没有补长。

## 执行结果

- `src/life/plugin.ts` 导出同步只读的 `readLifeControl`，由 Life 的静态方法实现；生活开关和暂停区间原子写入，闭合区间按已提交时钟清理。
- `src/behavior/plugin.ts` 和 `src/behavior/room.ts` 在菜园推进时取权威区间，覆盖读取、照料、手工动作和旧 JSON。Body 检查点的区间副本已移除。
- `src/economy/garden-clock.ts` 校验区间并分段调用上游生长函数。`src/economy/store.ts` 按区间投影和提交。`src/economy/plugin.ts` 在 Life 卸载时直接读取区间，单独运行时也能改配置。
- `arch/storage.json` 在 Life 条目登记 `pauses`，Body 条目已恢复。`dist/src/**` 已构建。
- `entries-lifecycle.test.mjs` 验证 2A1A-12、2A1A-13 和新增的 16 条 Cordis 流程，`index.json` 登记新增 L1。缺文件用例采用 Core 支持的旧版清单。
- Body 错过整段暂停、Life 先卸载时，手工动作提交 2/12，湿度和 `updatedAt` 均通过。R5 无时钟用例恢复原夹具及原断言。
- 验收快测（含 `life-clock-intent` 和 `garden-clock` 单测）56 通过、0 失败。Desktop、Life、Economy、旧菜园 JSON 和动作拒绝的补充回归 83 通过、0 失败。
- `pnpm run build && pnpm run test:behavior-list` 的行为 86 条和索引自测 11 条通过、0 失败。`pnpm run check:types`、`pnpm run check:arch` 通过。
- 改动留在当前工作区，由 Claude 提交并在合并前跑 `pnpm run verify`。自动验证使用合成数据，主人可在隔离环境复核。

### 建议提交分组

1. **修复组件缺席时的菜园暂停结算**。14 个文件，构建产物另计。
   - 包含 `src/life/plugin.ts`、`src/behavior/plugin.ts`、`src/behavior/room.ts`、`src/economy/garden-clock.ts`、`src/economy/plugin.ts`、`src/economy/store.ts` 和 `arch/storage.json`。
   - 带上 `tests/behavior-list/entries-lifecycle.test.mjs` 中 2A1A-12、2A1A-13 的新断言及所用辅助函数，并提交 `tests/economy/economy-recovery.test.ts`、`tests/economy/garden-clock.test.mjs`、`tests/life/autonomous-life.test.ts`、`tests/life/life-clock-intent.test.ts`、`tests/regressions/audit-r5-garden-clock.test.mjs` 和 `tests/regressions/mapped-refused-movement.test.mjs`。
   - 随源码带上 `dist/src/life/plugin.{js,d.ts}`、`dist/src/behavior/plugin.js`、`dist/src/behavior/room.{js,d.ts}`、`dist/src/economy/garden-clock.{js,d.ts}`、`dist/src/economy/plugin.{js,d.ts}` 和 `dist/src/economy/store.{js,d.ts}`。
2. **补齐菜园装卸与旧存档的行为验收**。3 个文件。
   - 包含 `tests/behavior-list/entries-lifecycle.test.mjs` 的其余新增用例和夹具、`tests/behavior-list/index.json` 的登记及本方案执行结果。

### 返工一轮

- 暂停区间无效时，Body 沿用菜园不可用的等待路径，提示「生活开关文件无效」，继续推进身体和执行显式照料。菜园和 `control.json` 保留原样。
- `readLifeControl`、文件检查与解析移至新增的 `src/life/control-file.ts`，纳入本轮已授权的 `src/life` 范围。Body 和 Economy 只读 `enabled` 和 `pauses`，Life 绑定时校验 `preferences`。重新生成对应的 `dist/src/**`。
- `synchronize()` 在工作区 `storageId` 变化时重新绑定。L1 `G3-GARDEN-17`（阶段 2，种地时钟）命名为「Life 卸载后损坏的暂停区间只阻挡菜园，身体照常」，保留无效暂停区间的全部断言，索引同步更名。
- Core 就绪检查会拒绝无效偏好（`src/core/initialization.ts:64`），已移除 L1 中无法进入的 `invalidPreferences` 分支。保留 `life-clock-intent` 对读取器容忍无效偏好、Life 严格校验偏好和开口暂停区间 `[{from, to: null}]` 的单元测试。
- 收尾重跑 `pnpm run build` 通过。验收快测（含 `garden-clock` 单测）58 通过、0 失败；行为清单 87 通过、0 失败；索引自测 11 通过、0 失败。此前 `pnpm run check:types` 通过，旧 JSON 菜园补充用例 1 通过、0 失败，Body 调度、Life 领域集成和 Economy 恢复补充回归 45 通过、0 失败。所有验证使用合成数据。
- `pnpm run check:arch -- --write-baseline` 在 `arch/baseline/vocabulary.json` 生成 8 条已消失 R8 记录的删除，同时刷新两份基线的报告信息。随后两次 `pnpm run check:arch` 均通过，新增和待删除记录均为 0 条。
- 建议一组提交「隔离无效生活时钟并补齐菜园行为验收」，包含 5 个源码文件、3 个测试及索引文件和本方案，共 9 个手写文件；随附 `arch/baseline/{rules,vocabulary}.json` 和 7 个 `dist/src/**` 构建产物，生成文件另计。

## 审查结论

验收会话（Codex 只读审查 + Claude 核实）重跑结果：快测 56/56 通过；`pnpm run verify` 1468/1468 通过；`pnpm run test:behavior-list` 行为 86 条、索引自测 11 条全部通过，2A1A-12、2A1A-13 按 2/12 通过。改动范围都在「允许修改」内，三个提交（不计 `dist/`）都没超过阈值。

专门判断的四点：

1. `readLifeControl` 引入：没有运行时循环（`life/plugin` 对 `behavior/plugin` 只有 `import type`，不会引入 `economy/plugin`），导入链里也没有模块顶层的副作用调用；`arch/layers.json` 允许这两个依赖。代价是 Body 引入的本地模块从 10 个变成 37 个，Economy 从 13 个变成 37 个，还会带进 `#dsh-world/life/runtime` 等生活运行时。列为建议修 1。
2. 拍板点 2 的拒绝没有残留（`src/` 里搜不到）；R5 测试只改了调用方式（布尔值改成 `{enabled}`），断言和前提与 main 一致。
3. Body 不存区间副本（`src/behavior/` 里只在 `room.ts:175,1107` 读取 `pauses`）；`arch/storage.json` 只改了 `life` 条目。
4. 推进菜园的入口都经过 `advanceGardenClock`：Body 的读取和照料（`room.ts:159-167`，caretaker 经 `room.ts:133`）、手工动作（`room.ts:1097-1098`）、旧 JSON（`room.ts:166,1106-1112`）、Economy 的读取、动作、视图和改配置（`store.ts:433-437,461-469,278`）。拿到区间就只按区间算；布尔值只在 `pauses === undefined` 时沿用（`garden-clock.ts:45-46`、`room.ts:175`、`economy/plugin.ts:112-121`）。

### 必须修

1. **`control.json` 一出错，卸载 Life 后身体的显式操作也全部失败** — `src/behavior/room.ts:159-161,172-176`
   - 触发：`control.json` 的 `version`、`enabled` 和 `preferences` 有效，所以 Core 判定工作区就绪（`src/core/initialization.ts:63-64`；更正：初稿写成「只校验 `version`、`enabled`」，其实 Core 也校验 `preferences`，所以 `preferences` 无效时工作区不会就绪，这条触发不了）；但 `pauses` 无效。不论 Life 服务在不在，`lifeClock()` 最后都会走到 `readLifeControl` 并抛出（Life 在场但没绑定成功时，实例方法 `bodyClockState()` 也调它）。
   - 影响：`gardenClock()` 在 `loadGardenState` 的 try 外面抛错，不会设置 `economyBlocked`。`tick()` 只在 `economyBlocked` 时转入菜园不可用路径（`room.ts:891-895`），而 caretaker 每次 tick 都会读菜园（`room.ts:925` → `room.ts:133`），`advanceRoom` 又把异常继续抛出去（`src/behavior/plugin.ts:112-117`）。结果是 `roomAction` 里免费喂食、喂水这类和菜园无关的操作也全部失败。
   - 为什么必须修：违反 [architecture.md 6.2](../architecture.md#62-三个旧入口的语义)「卸载 `40-Life` 后 Behavior 仍接收显式操作」，是这次新增的退化：改之前 Life 不在时 Body 根本不读 `control.json`。
   - 修法要求：读区间失败时，只让菜园走现有的不可用路径（报「生活开关文件无效」、不写菜园、保留原文件），身体照常 tick 和执行显式操作。补一条 L1：卸载 Life，把 `control.json` 写成 `pauses` 无效，断言免费照料成功、菜园返回不可用且不提交、文件原样保留。

### 建议修（不影响合并）

1. 把 `readLifeControl`（连同 `safeLifeFile` 和解析）挪到独立的小模块，例如 `src/life/control-file.ts`，`src/life/plugin.ts` 再从那里引入。Body、Economy 就不用再把整个 Life 插件和生活运行时拉进来。顺手改的话，和必须修 1 放在同一轮。
2. `synchronize()` 加了 `storageId` 变化时重新绑定（`src/life/plugin.ts:165-166`）。它和 `bodyClockState()` 原有的 `storageId` 判断一致，但不在方案的改动说明里，「执行结果」要补一句。
3. `tests/life/life-clock-intent.test.ts:52-59` 用 `intent()` 去掉了 `pauses` 再比较，原有字段的断言没变；可以顺手再断言一下暂停后 `pauses` 的形状。
