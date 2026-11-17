# 阶段 1 · M1 地基（安全网）

- 级别：大改
- 状态：已确认

本方案是 M1 的总方案：一次拍板，分 5 批（A–E）执行，每批一个 `codex/*` 分支，单独验收、单独合并。M1 的目标、完成标准和停止条件以 [product.md](../product.md) 的「当前：阶段 1 → M1」为准，这里只写怎么做。

## 目标与外部变化

**主人看到的：无。** M1 不合入任何业务代码改动，不发版，DSH 里装的 0.1.8 不受影响。

精确地说：

- `src/` 只在两处被临时改动，都不合并：E 批测典型修改的临时分支；A 批验收时注入一处故意违规，验证门禁会失败。
- 合入 `main` 的改动不碰 `src/`、`vendor/`、生成文件。
- 包里会变的只有两样：`package.json` 的 `scripts` 多两行；随包发布的 `docs/development.md` 会更新（它在 `package.json:81` 的 `files` 里）。运行时代码和入口都不变。

**开发者看到的（新增命令和文件）：**

| 新增 | 作用 |
| --- | --- |
| `pnpm run check:arch` | 跑 R1–R4 和 R8，和基线比对：出现新违规，或基线里有已经消失的条目，都会失败。已接进 `pnpm run verify` |
| `pnpm run check:arch -- --report` | 打印现状违规清单（R1–R4、R8）和 R5 写入报告，给人看 |
| `pnpm run test:behavior-list` | 只跑行为清单（15 类 + 4 个故障家族），核对每条测试确实执行并通过 |
| `node scripts/migrate/companion-migrate.mjs <plan\|run\|status>` | 迁移骨架：加锁 → 备份 → 按目标状态逐步迁移 → 写迁移日志；中途崩溃可续做 |
| `node scripts/fixtures/synthetic-companion.mjs --out <空目录> [--variant current\|legacy]` | 生成按真实布局、不含主人内容的合成副本，含假的 DSH home 和安装回执 |
| `node scripts/migrate/inventory.mjs --installation <回执>` | 数据盘点：只输出路径、大小、表名、行数，以及和登记表的差异 |
| `arch/` 目录 | `layers.json`、`storage.json`、违规基线 |

## 范围变化

用户功能层面无变化：下面每一项都对应 M1 表格里的一行（见「M1 表格对照」）。

但有几项属于「检查边界的取舍」，会影响检查能管住多少。单独列出，请主人拍板：

- `world/` 暂归第一层；生成文件不扫描（拍板点 7）
- R8 把「互为子集」也算作重复
- 行为测试分三个层次，15 类各自的完整流程分摊到各阶段完成（拍板点 9）

## 拍板前先看：核对源码时发现的事实偏差

写方案时，对照源码核实了文档里的说法；Codex 挑刺时又复核了一遍。下面五处和现状不完全一致，会影响做法。

1. **「Core 向上读取 19 处」数不准。**
   - 按字面搜 `get('petX')`，读第二、三层服务的调用共 20 次，分布在 16 行：`core/companion-foundation.ts:141,202,207,228,233,247`、`core/plugin.ts:43,44,57,66,67,68,72,77,85`、`core/native/agent.ts:190`。
   - 另有一处条件计算名：`companion-foundation.ts:179`，即 `ctx.get(fact.domain==='body'?'petBehavior':'petEconomy')`。
   - `companion-foundation.ts:139` 先把 `ctx.get` 绑成别名 `get`，到 :141 才使用。
   - 读 `petTranscripts`（Core 自己提供，`core/native/transcripts.ts:292`）、`petMemory`、`petEmotion` 的不算，它们同属第一层。
   - 19 这个数在任何地方都没有留下逐条位置。

   → A 批把逐条位置写进已知违规表，并分开记「调用点数」和「依赖边数」，不硬凑 19。
2. **自动测试文件现在是 109 个**：`tests/` 下 51 个 `*.test.ts`、58 个 `*.test.mjs`。文档写 110，而且 [product.md](../product.md) 里「37 个只看行为 + 73 个混合」加起来也是 110，没有留下分类索引，无法复核。→ E 批更正总数，37/73 改成「待重新分类」，B 批的分级就是新的分类。
3. **存储清单版本号不能写进 `.chatpet/manifest.json`。**
   - 它的原文被算进绑定指纹（`core/workspace.ts:155,171`）。
   - 初始化时会被改写成固定的三字段形状（`core/workspace.ts:279-281`）。
   - `schemaVersion` 只认 1–3（`core/workspace.ts:240`、`:158-161`）。

   往里加字段，0.1.8 会判「工作区文件变了」，或者直接抹掉。→ 版本号和迁移日志放独立文件（拍板点 4）。源码显示 0.1.8 容忍 `.chatpet/data/` 下多出普通文件：`core/workspace.ts:209` 只检查声明项，`scripts/lib/repo-storage.mjs:58` 也只按声明检查。C 批再实测证明一遍。
4. **现有恢复器不是纯回滚。**
   - 恢复前，它把当前的渠道日志、Core 的送达去重额度记录、Life 花费带进待恢复的数据：`scripts/lib/offline-backup.mjs:409-420`，Core 部分的记录 kind 列在 `:309`。
   - 当前缺这些受保护记录时，它拒绝恢复（`:354`）。
   - 共享附件冲突时也拒绝（`:426`）。
   - profile 设置只留一份参考副本（`:453`）。
   - 原生日志恢复成备份时的样子。

   → 迁移演练里「回退后旧版可用」要按这些真实行为来断言，不能断言整个目录和备份逐字节相同。
5. **「guest 的情绪 footer 仍能改共享情绪」不是未确认的疑点，而是被检查断言过的现有行为。**
   - `core/native/agent.ts:46-48` 给 guest 也返回作用域。
   - `emotion/plugin.ts:166` 接收这个作用域。
   - `scripts/checks/check-native-services.mjs:104` 明确断言「guest footer 会更新同一个情绪实例」。

   → 已知问题登记时，写成「已确认的现有行为，要不要改由主人判断」，不当作待修 bug。

## 改动范围

- 这一步是：只加安全网，既不搬家也不改逻辑。不改现有测试的断言。
- 允许修改（全部批次合计，各批的细分见下）：
  - `arch/**` — 新建：层声明、存储声明、违规基线
  - `scripts/arch/**` — 新建：检查脚本、已知违规样例
  - `scripts/migrate/**` — 新建：迁移骨架、数据盘点
  - `scripts/fixtures/synthetic-companion.mjs` — 新建：合成副本生成器
  - `scripts/checks/verify.mjs` — 在第 13 行的检查列表里加 `check:arch`
  - `scripts/checks/run-behavior-list.mjs` — 新建
  - `tests/arch/**`、`tests/migrate/**`、`tests/behavior-list/**` — 新建
  - `package.json` — 只在 `scripts`（`package.json:89` 起）里加 `check:arch`、`test:behavior-list`；不动 `files`、`exports`、`imports` 和依赖
  - `docs/product.md`、`docs/architecture.md`、`docs/development.md`、`AGENTS.md` — E 批更新（见 E）
- 必须复用：
  - TypeScript 编译器接口（devDependency `typescript` 5.9.3，`package.json:153`）— R1–R5、R8 的解析，不加新依赖（[decisions.md](../decisions.md)「检查脚本用已有的 TypeScript 编译器接口写」）
  - `package.json` 的 `imports`（`package.json:35`）— R1 解析 `#别名`
  - `scripts/lib/offline-backup.mjs` 的 `backupPlan`（:85）、`assertDshStopped`（:145）、`createOfflineBackup`（:234）、`verifyOfflineBackup`（:268）、`restoreOfflineBackup`（:391）— 迁移前的备份、回退，以及盘点要走的根目录清单，都从这里来，不另写一套
  - `scripts/lib/repo-storage.mjs` 的 `inspectRepoBinding`（:15）— 找绑定和 storageId
  - `scripts/companion-backup.mjs:29-34` 读安装回执的方式 — 迁移和盘点同样以回执为输入。不照搬 `:45` 那种把完整结果打印出来的做法（见「真实数据边界」）
  - `src/core/storage.ts:77` 起的独占锁写法：pid 加随机 token、拒绝软链接、处理过期锁 — 迁移锁照这个写法实现（在 `scripts/` 里重写，不 import `src` 的私有类）
  - 各模块现有的初始化流程和公开服务（经 `dist/src`），例如 `src/core/index.ts:13` 的 `createCore`、`src/core/initialization.ts:67` 的 `initializeCompanionFiles`，以及身体、计划、经济、Memory 各自的初始化 — 合成副本用真实代码生成布局，不手写一份猜测的布局
  - `tests/infrastructure/offline-backup.test.mjs:12-48` 的夹具 — 合成副本里 DSH home、注册表、会话目录的布局参照它。它在 `:20` 的 Memory 文件只是文本占位，不能照抄；不改这个测试
  - `scripts/checks/verify.mjs:14` 会自动收集 `tests/**/*.test.mjs` 和 `dist/tests/**/*.test.js` — 新测试放对位置，就自动进门禁
  - [portability.md](../portability.md)「Move to another device」里的 `dafeiyu-setup --resume-repo` — D 批搭隔离环境用它，不另写绑定改写工具
- 不做：
  - 不合入任何 `src/`、`vendor/`、生成文件的改动；已知问题只登记，不修
  - 不建 R6、R7：[architecture.md](../architecture.md) 第 3 节把它们定在 M3 和阶段 2、3；R5 只报告，不阻断
  - R1 不检查对 `vendor/` 和 npm 包的 import：上游代码按层分配适配器是阶段 2、3 的事
  - G5 不做成命令（M2 起再做），M1 手工记一张表
  - 不在 M1 里拆完混合测试；15 类各自的完整流程用例分摊到后续阶段（拍板点 9）
  - 不安装、不更新主人日常在用的 DSH；Agent 不调用付费模型

## 分批与提交

5 批，各开一个分支，各自走 skill-review-accept 验收合并。

| 批 | 分支 | 内容 | 依赖 |
| --- | --- | --- | --- |
| A 检查地基 | `codex/m1-a-arch-checks` | `layers.json`、`storage.json`（结构、模块 ID、按第 4 节填好的全部行）、R1–R4、R5 报告、R8、基线与棘轮、接进门禁 | 无 |
| B 行为清单 | `codex/m1-b-behavior-list` | 行为测试分级和索引、15 类行为测试、4 个故障家族的完整流程用例、运行命令 | 无，和 A 并行 |
| C 迁移骨架 | `codex/m1-c-migration` | 合成副本生成器、存储清单版本号和迁移日志、迁移锁、备份串联、盘点工具；合成副本上的演练 | A 合入后从新 `main` 拉分支（读 `storage.json`） |
| D 真实副本检查点 | 不写代码 | 主人在隔离环境用 C 的命令盘点和演练，Agent 只看通过与否 | C 合入，且主人已提供副本和隔离环境 |
| E 基线与文档 | `codex/m1-e-baselines`；`AGENTS.md` 由 Claude 写 | 典型修改基线（3 个临时分支）、已知问题登记、度量表、`AGENTS.md` 重写、文档同步 | A、B、C 合入 |

`storage.json` 只由 A 建立并定好结构，C 只往里加数据版本字段，避免两批争同一份文件。A、B 都要在 `package.json` 的 `scripts` 里加一行，后合入的那个先变基。

**提交粒度**（`AGENTS.md` 目前没有阈值，见拍板点 3）：按推荐阈值「单个提交不超过 15 个文件、600 行改动」，下面这些提交预先声明会超：

- A：违规基线 `arch/baseline/*.json` 是脚本生成的，单独一个提交，不计入阈值；已知违规样例 `scripts/arch/fixtures/**` 单独一个提交。
- B：按类别分 3–4 个提交（例如 1–5、6–10、11–15、故障家族），每个都不超阈值。
- C：生成器、迁移骨架、盘点工具、演练测试各一个提交。

## 各批做法

### A 检查地基

**`arch/layers.json`**：旧代码的每个目录是一个模块，按 [architecture.md](../architecture.md) 2.1 归层：

- 第一层：`core / memory / emotion / contracts`
- 第二层：`behavior / life / economy`
- 第三层：`desktop / room / channels / voice / console`

两个特殊目录：`contracts/` 暂作第一层共用，所有层都能引用（拆成三份是 M2 起的事）；`world/` 暂归第一层（拍板点 7）。

每个模块声明这几项：

- 所在层
- 提供的服务：13 个服务名都来自 `ctx.provide('petX')`，例如 `core/native/transcripts.ts:292`
- 允许读的服务
- 发布和订阅的事件
- 生成文件清单，以及每个生成文件对应的生成源

生成文件本身不扫描，但它的生成源要扫描（拍板点 7）。

**`arch/storage.json`**：[architecture.md](../architecture.md) 第 4 节登记表的机器可读版。每行记这几项：

- 数据：路径或表名；Core 记录按 kind 分行
- **业务拥有者**：目标模块
- **现在的物理容器**：哪个文件或数据库，例如 Core 数据库的 `records` 表
- **现在的写入模块**
- **处理方式**：不变 / 搬出 / 待定

R5 报告、合成副本生成器、盘点和迁移都读它（拍板点 5）。

**R1–R4**（`scripts/arch/check.mjs` + `scripts/arch/lib/*.mjs`），按 [architecture.md](../architecture.md) 第 3 节的覆盖范围实现：

- **R1 静态 import 方向**：覆盖 `.ts/.js/.mjs/.cjs`，含动态 `import()`、`createRequire`、`#别名`。规则 R0：只能往下或同层；第三层模块之间禁止互相引用。例如 `room/chat.ts:8` 引用 `desktop/images.js`，应该报出。
- **R2 运行时服务读取**：覆盖 `ctx.get('petX')`、`ctx.petX`、`scope.petX`、`inject: [...]`。要识别别名（`companion-foundation.ts:139` 那种）、解构、计算名。条件表达式两边都是字面量的（`:179`），两个目标都记；判不出的写法报「无法静态判定」，也进基线。
- **R3 事件**：覆盖 `ctx.on / ctx.emit('pet/…')` 和 DSH 原生事件的订阅。订阅者所在层不得低于发布者，例如 `memory/batch.ts:14` 订阅 `pet/life.review`，应该报出。M1 里，「事件要在发布层声明」先落在 `layers.json` 每个模块的 `publishes` 里；挪进各层 contracts 是 M2 起的事。
- **R4 给别人的对象赋值**：覆盖 `host.native.xxx =`，含别名和解构后的赋值。

**R5 报告**（只报告，不阻断）：每条写入记录列出四项：写入模块、读还是写、物理容器、业务拥有者。只要满足下面任一条就标「违规」：

- 写入模块不是业务拥有者；
- 物理容器不是业务拥有者自己的存储。

第二条正是 `desktop-session` 和 Channels 五类记录的问题：写入者就是拥有者本人，但它们写在 Core 数据库里。

`CoreStore` 记录 kind 要能解析常量。例如 `channels/qq-inbox.ts:25` 的 `const kind='channel-received'`，实际写入在 `:34,41,43`；报告要定位到写入处，不能只找到常量声明。

**R8**：

- 收集字符串取值集合，形状包括：3 个以上字符串的数组字面量、字面量联合类型、`switch case` 组、`includes([...])` 判断，以及 JSON schema 里的 `const` 和 `enum` 分支（例如 `life/plan-tools.ts:71-103` 用 `oneOf` + `kind.const` 声明七种计划 kind）。
- 归一成排序后的集合，跨文件重复或互为子集的报出来。
- 另报公开接口（`src/contracts/**`、各模块对外服务的类型）里 `kind / action / status / type` 是裸 `string` 的字段。
- 再按 [product.md](../product.md)「词表重复基线」的口径，统计 kind、action 字符串判断的个数。

**基线与棘轮**：

- 文件：`arch/baseline/rules.json`（R1–R4）、`arch/baseline/vocabulary.json`（R8）、`arch/baseline/writers.json`（R5 报告，只作现状待办，不比对）。
- **每条旧违规单独一个条目**，身份是「规则 + 文件 + 所在的函数或方法路径 + 目标（模块、服务、事件或属性）+ 归一化后的表达式」，不含行号。这样挪动代码、改格式都不会误报。但下面两种情况会被抓到：删掉一处旧违规、在另一个函数里新加一处；同一函数里多出一处。
- `check:arch` 的规则：
  - 出现基线里没有的条目，失败；
  - **基线里有、代码里已经消失的条目，也失败**，提示在同一个提交里用 `--write-baseline` 收紧基线，不允许空出来的额度留给以后的新违规。
- `--write-baseline` 只能删条目；发现要新增条目就拒绝写入。

**证明抓得到**，分两层：

1. **一次性验收（A 合并前）**：`check:arch -- --report` 对旧代码的输出必须包含下表全部条目。抓不到就修脚本。停止条件：修两轮仍抓不全，停下来重新评估「用脚本做检查」这条路。

   | 已知违规 | 位置 |
   | --- | --- |
   | Core 向上读取（R2） | 「事实偏差」第 1 条的 16 行，加上 `companion-foundation.ts:179` 的条件读取 |
   | Core 静态 import 上层（R1） | `core/companion-settings.ts:2`、`core/initialization.ts:5`、`core/plugin.ts:7`、`core/native/history-maintenance.ts:4-6` |
   | `lifeAdmission` 赋值（R4） | `life/plugin.ts:54,528` |
   | `roomAdmission` 赋值（R4） | `room/plugin.ts:144,154` |
   | `channelBoundary` 赋值（R4） | `channels/sessions.ts:93,182` |
   | Memory 订阅上层事件（R3） | `memory/batch.ts:14` |
   | 第三层互相引用（R1） | `room/chat.ts:8` |
   | `desktop-session` 写 Core 数据库（R5） | 读 `desktop/index.ts:44`、写 `:45` |
   | Channels 五类记录写 Core 数据库（R5） | `channels/messaging.ts:162,212,214`、`channels/bridge.ts:85,88`、`channels/usage.ts:29,34`、`channels/qq-inbox.ts:34,41,43` |
   | `economy.initialized` 标记写 Core（R5） | `economy/plugin.ts:70,84` |
   | R8 已知重复 | [product.md](../product.md)「词表重复基线」表的 7 组：每组都要报出**全部定义位置**，份数和表里对得上；对不上的，写明差异是表错了还是脚本漏了 |

2. **长期自测**：上表里的真实写法在后续阶段会被修掉，所以不能拿 `src/` 当长期测试。
   - 把每种写法（别名、解构、条件计算名、动态 import、`createRequire`、`#别名`、常量 kind、`oneOf const`）抄成最小样例，放在 `scripts/arch/fixtures/known-violations/`。`.ts` 文件放在 `scripts/` 下不会被 `tsc` 检查，因为 `tsconfig.json` 只收 `scripts/**/*.mts`。
   - `tests/arch/known-violations.test.mjs` 断言每个样例都被抓到、一个干净样例零报告。
   - `tests/arch/ratchet.test.mjs` 覆盖四种反例：直接新增；删一处旧违规、在别的函数加一处；旧条目消失但没收紧基线；`--write-baseline` 试图新增条目。

**接进门禁**：`scripts/checks/verify.mjs:13` 的列表里加 `check:arch`，放在 `build` 之前，几秒内跑完。

### B 行为清单

**分级**。索引里每条测试标一个层次：

- **L1 完整流程**：从真实入口走完「入口 → 准入 → 工具限制 → 执行 → 落盘 → 查询或召回 → 重启恢复」。门禁里的「真实入口」指插件入口，加上 DSH 边界上的假原生宿主和假模型，不启动 DSH、不调模型。装好的 DSH 上的同类检查（`scripts/checks/check-native-*.mjs`）仍是主人在隔离环境里手动跑的可选检查，不进门禁。
- **L2 公开面行为**：只通过稳定的外部面来驱动和断言，包括 `petX` 服务的公开方法、设置 RPC、DSH 原生事件、磁盘上的数据文件。故障只在边界注入：文件系统权限、删文件和软链接、关闭再打开模拟重启、假时钟、假原生宿主和假模型。不 `mock.method` 私有方法，不往数据库里注入触发器，不读模块私有状态（例如 `body.binding.room`），不直接构造内部类。
- **L3 回归参考**：现有的、碰内部实现的测试，保留在门禁里，但不算行为清单的完成项。

新写的 L1、L2 测试，对 `src/` 的 import 全部集中在 `tests/behavior-list/entries.ts` 一个文件里；以后重写模块时只改这一个文件。

**M1 的完成线**（拍板点 9）：

- 15 类每类至少一条 L2 或 L1；
- 4 个故障家族各一条 L1；
- 索引给 15 类各自标注它的 L1 计划在哪个阶段补上，最晚阶段 4 结束（[product.md](../product.md) 第 87 行要求每一类最终都有完整流程）。

**索引与运行**：

- `tests/behavior-list/index.json`，每条记：编号、类别、层次、测试文件、**固定的**测试名（不允许动态拼接的名字）、计划补 L1 的阶段。
- `scripts/checks/run-behavior-list.mjs` 用 `node:test` 的 `run()` 接口按文件运行，按实际执行的测试身份逐条核对：每条索引项必须恰好执行一次并通过。零匹配、跳过、`todo`、取消都算失败；测试名按字面匹配，不当正则。挑刺时实测过：`--test-name-pattern` 零匹配时退出码照样是 0，所以不能只看退出码。
- `tests/behavior-list/index.test.mjs` 断言索引里 15 类和 4 个家族都不缺，层次字段合法。

**15 类的起点**（已有测试经挑刺逐条复核，B 批再核实后定稿）：

| 类 | 可复用的已有测试 | 处理 |
| --- | --- | --- |
| 1 计划续行 | `tests/life/autonomous-life.test.ts:46`，但它手动调用 `plan.advance()`（:51-67） | 由「计划推进」家族的 L1 覆盖：完成事件到来后自动续下一步 |
| 2 同请求重试不重复生效 | `tests/core/core.test.ts:35`，经公开服务验证重放和重启 | 登记为 L2；`autonomous-life:132`、`economy-recovery:25` 归 L3 |
| 3 效果已落盘后结算失败再重启 | `tests/life/life-domain-integration.test.ts:55`，靠 SQLite 触发器（:69） | **新写 L2**。故障要证明恰好发生在结算阶段，而不是预留阶段：钱包库的连接和 WAL 在 `src/economy/store.ts:65` 已经打开，单纯把文件改成不可写未必能让它失败，B 批要先找到能在边界上可靠制造这个失败的办法 |
| 4 睡眠中投喂的终态 | `tests/regressions/mapped-sleeping-inventory.test.mjs:95`，直接读 `body.binding.room`（:63,68） | **新写 L2**，经身体和经济的公开服务 |
| 5 种地时钟不倒退 | `tests/behavior/garden-clock-continuity.test.ts:69`，直接构造内部类 | 由「种地时钟」家族的 L1 覆盖；原测试归 L3 |
| 6 离线消耗额度 | `tests/life/offline-body-policy.test.ts:73`，直接构造 `offlineBodyWindow` | **新写 L2**：停机 → 假时钟前进 → 重启 → 经公开服务查询 |
| 7 日记按原日期恢复 | `tests/life/life-review-runtime.test.mjs:59,113`，直接启动 World runtime | 由「日记与回顾」家族的 L1 覆盖 |
| 8 历史日记保护 | `tests/life/life-review-files.test.ts:63`（假原生工具边界）、`life-review-runtime.test.mjs:136` | 并入「日记与回顾」家族的 L1：主人补写历史日记能写，已有日记不能覆盖 |
| 9 输入持久化先于确认 | `tests/core/interaction-context.test.ts:18`，只断言假回调的顺序 | **新写 L2**：真实日志落盘 → 确认 → 重启后不重放 |
| 10 送达与记忆召回分开 | `tests/life/life-memory-integration.test.ts:117-136`，**用真实 Python provider**（:70-74）召回，并断言查询里不含 fact ID（:136） | 在它的基础上补成 L2：去掉手动确认，改由入口驱动 |
| 11 阅读必须有真实文本 | `tests/life/life-domain-integration.test.ts:121`，真的获取文本，并跨重启保留（:137-150）；`pet-activity-mirroring:34` 只验证分类 | 借用 :121 的流程写 L2，不带那个文件里的触发器 |
| 12 QQ 收件恢复 | `tests/regressions/audit-qq-recovery.test.mjs:72,83,94`，直接组装 inbox，读 CoreStore 内部记录（:79） | **新写 L2**：经渠道入口和原生边界，断言重启后不丢、不重放 |
| 13 换目录时在途请求不写旧目录 | `tests/regressions/mapped-channel-path-binding.test.mjs:115`（延迟请求跨换绑） | 以 :115 为基础写 L2，真正制造跨换绑的在途请求 |
| 14 隐藏后取消显示定时器 | `tests/behavior/activity-playback-carriers.test.mjs:126` | 假 DOM 算呈现端的边界，登记为 L2；`activity-playback-room` 的夹具绕过构造器（:42），归 L3 |
| 15 缺库不得空白替代 | `tests/infrastructure/first-install.test.mjs:163-164`（经 `createCore`） | 登记为 L2；钱包缺库补一条经经济服务的 L2 |

**4 个故障家族的 L1**：每条写明入口、断言和重启点。

- **日记与回顾**：两条入口都要过——自主回顾能写当天日记；主人聊天能补写历史日记。已有日记不能被覆盖；中途重启后，按原日期续上。
- **种地时钟**：种下 → 显式暂停或组件重启 → 查询 → 时间不倒退，成熟进度不丢。
- **计划推进与完成契约**：计划步骤的完成事件到来后，不经模型自动续下一步，而且只续一次。
- **关闭后晚到的录音与取消**：复用 `tests/regressions/audit-r7-pet-hear.test.mjs:93,97` 的音频夹具。关闭后才到的录音不再生效，在途请求被取消。

**规则**：清单在旧代码上必须全绿。任何一条在旧代码上是红的，说明要么找到了旧 bug，要么测试写错了。如果是前者，停下来登记成已知问题，由主人决定，不在 M1 里修。

### C 迁移骨架

**合成副本生成器** `scripts/fixtures/synthetic-companion.mjs`：

- 在一个空目录里生成一整套「已安装」环境：
  - Repo 和 `.chatpet/`
  - 各模块数据：Core 数据库、可以真实打开的 Memory 库、情绪、身体、计划、经济库、渠道和语音目录
  - DSH home：profile、`storages/workspace.json`、会话目录、投影缓存、附件
  - 安装回执，以及一个假的已安装包目录（供恢复器比对指纹）
- 用 `dist/src` 里各模块真实的初始化和公开流程来建库、写状态；内容全是固定的假数据（例如伙伴名 `fixture`）。`storage.json` 的每一行都要覆盖到。
- 新旧位置是**互斥的两种变体**，用 `--variant` 选，因为真实代码只会选其中一套：
  - 自述和日记：`core/record-paths.ts:14` 有旧文件时选 `data/life/`；
  - 身体：`behavior/plugin.ts:130` 有旧文件时选 `data/life/`。
- 自测断言：两种变体都能被 `backupPlan` 接受，都能被 `createCore` 打开且状态为 ready，各模块读出的数据就是生成时写入的。

**存储清单与迁移日志**：

- 版本号写在 `.chatpet/data/storage-manifest.json`：`{schemaVersion: 1, companionId, modules: {core: 1, memory: 1, ...}}`，模块集合以 `storage.json` 的拥有者模块为准。
- 迁移日志是 `.chatpet/data/migrations.jsonl`。第一行记本次迁移的 ID，以及**迁移前备份**的目录和 manifest 哈希；之后每行记一个步骤的开始、跳过、完成或失败。
- 两份文件都在 `.chatpet/` 里，现有备份的 `companion` 根已经覆盖它们，回退时会一起恢复。

**迁移命令** `scripts/migrate/companion-migrate.mjs`：

- `plan` 列出待做的步骤；`status` 读版本号和日志，只输出步骤状态。
- `run --installation <回执> --backup <新目录>`，依次做：
  1. 取得迁移锁 `.chatpet/data/migration.lock`，照 `src/core/storage.ts:77` 的写法；
  2. `assertDshStopped`，并确认 Core、经济、Memory 都没有写入者；
  3. 重新核对绑定；
  4. `createOfflineBackup` → `verifyOfflineBackup`；
  5. 写日志第一行；
  6. 逐步执行；
  7. 释放锁。

  整个过程一直持有锁，第二个 `run` 会直接被拒绝。
- `run --resume --installation <回执>`：崩溃后续做。**不做新备份**；从日志第一行找到迁移前的备份，先校验它仍然完整，再取锁继续。日志缺失或备份校验失败，就拒绝续做，提示用那份备份回退。这样不会出现「新备份里存的是迁移了一半的状态」。
- 过期锁（持有进程已不存在）按 `storage.ts` 的规则接管，并在日志里记一行。

**步骤契约**：

- 每一步先判断「目标状态是否完整成立」，成立就记「跳过」；不看完成标记，也不以日志为准（[decisions.md](../decisions.md)「迁移的幂等以目标状态为准」）。
- 写文件一律先写临时文件 → fsync → rename → fsync 目录。
- 日志最后一行如果被截断，读的时候忽略它，续做时补写。
- M1 只有一步 `0001-storage-manifest`：创建版本号文件。它的目标状态是：文件存在，`schemaVersion`、`companionId`、模块集合和各版本都和预期完全一致；文件存在但内容不一致的，算失败、需要核对，不覆盖。
- 这一步就是阶段 1 发版要带的唯一一项改动（[decisions.md](../decisions.md)「第一次迁移只加版本号和迁移日志」）。M1 只把它做出来、在副本上演练，不随包发布：`scripts/migrate/` 不在 `package.json` 的 `files` 里。
- 回退沿用 `restoreOfflineBackup`，不另写。

**演练**：`tests/migrate/*.test.mjs`，全部在生成器产出的合成副本上跑，两种变体各跑一遍。

1. **正常迁移再回退**：
   - 迁移后：Core 打开为 ready，companionId、storageId 不变。
   - Memory 库合并 WAL 后，按逻辑内容比对不变；另有一条**已撤回的记忆**，迁移前后经真实 provider 召回都看不到（[architecture.md](../architecture.md) 7.5）。
   - 用迁移前的备份回退，0.1.8 的 Core 照常打开，版本号文件消失。
   - 回退后的断言按恢复器的真实行为来写（事实偏差第 4 条）。
2. **崩溃续做**：测试注入一组多步的假迁移，在子进程里分别于四个点 `SIGKILL`：改数据之前、改数据之后写日志之前、写日志写到一半、全部完成但还没释放锁。每次 `run --resume` 之后，每一步都恰好生效一次，不重复、不漏，锁能被接管。崩溃点只靠测试注入的步骤实现，正式脚本里不留测试钩子。
3. **并发**：两个 `run` 同时启动，只有一个能拿到锁。
4. **0.1.8 兼容**：没迁移过的副本和迁移过的副本，0.1.8 的 `createCore` 都能打开。
5. **跨迁移的结算恢复**：在「身体效果已落盘、库存结算未完成」的状态下迁移，迁移前后重启时的恢复结果一致（[architecture.md](../architecture.md) 7.5）。
6. **拒绝情况**：DSH 没停、已有迁移在跑、回执不是 installed、备份校验失败、坏 JSON、软链接、外来 companionId、版本号文件内容不一致，都在写任何数据之前失败（判据沿用 `tests/infrastructure/first-install.test.mjs`）。

**数据盘点** `scripts/migrate/inventory.mjs`：

- 输入安装回执，按 `backupPlan` 的根目录逐个走。程序为了找到绑定，要读回执、清单和身份字段，但**不把这些值输出**。
- 输出 JSON，只包含：
  - 相对路径、文件大小
  - SQLite 表名和行数
  - Core `records` 表里每个已知 kind（`storage.json` 登记过的）的行数，以及未知 kind 的个数（不输出名字）
  - `economy.initialized` 标记有没有（只输出有或无）
  - 和 `storage.json` 的差异：多出了什么、缺了什么
- 在合成副本上自测：输出里不出现生成器写进去的任何假内容字符串、companionId、路径前缀以外的绝对路径。

### D 真实副本检查点（等主人）

**前提**：主人提供真实数据副本，并准备好隔离环境（拍板点 8）。隔离环境按 [portability.md](../portability.md)「Move to another device」搭：

1. 在独立的 macOS 用户或独立的 DSH home 里安装 DSH 和 0.1.8 包；
2. 用 `dafeiyu-setup --resume-repo <副本路径> --apply --offline` 绑定副本，它会改写宿主路径、记录实际安装路径；
3. 生成这套环境自己的安装回执。

先跑一遍 `inventory.mjs` 的根目录核对，确认所有根目录都在隔离环境之内，再开始下面的步骤。这也是 portability 这条路第一次真正跑一遍（[portability.md](../portability.md) 第 114 行说它还没有真机验收）。

**步骤**：

1. 主人在隔离环境跑 `inventory.mjs`，把输出给 Claude。差异逐条处理。如果登记表漏了重要数据，就停下来，先补 `storage.json` 和 [architecture.md](../architecture.md) 第 4 节（停止条件）。
2. 看盘点结果里 `economy.initialized` 的有无和 `economy.sqlite` 在不在，确认主人的安装是否已采用 Economy。
3. 浏览器里的经济待确认请求只存在主人**日常在用**的 DSH 的 localStorage 里，隔离环境里查到 0 不能说明原安装没有（拍板点 6）。由主人在日常 DSH 的控制台开发者工具里跑一段只读片段，只输出 `chatpet:economy:pending:*` 键的个数和所在页面（键名格式见 `src/console/client.js:449`），不输出值，不改任何东西。
4. 主人在隔离环境跑：`companion-migrate.mjs run` → 打开 DSH 聊一句、问一件以前聊过的事 → 关闭 DSH → 用迁移前的备份回退 → 再打开聊一句。再做一次「迁移中途杀进程 → `run --resume`」。

**这次演练能证明什么，不能证明什么**：M1 全程只有 0.1.8 一个包，所以它证明的是「0.1.8 容忍新增的元数据文件，迁移、续做和恢复都正常」。它不证明「换新包后回退」：恢复器要求当前安装包的指纹和备份一致（`offline-backup.mjs:277`），换包回退要等 M3 有了新包再演练。第 4 步的聊天会用主人配置的模型（风险 7），聊天内容不贴回审查会话。

停止条件：演练失败两轮，停下来整理事实，交给独立会话重新分析，不进入 M2。

### E 基线与文档

**典型修改基线**：

- E 开工时记下 `main` 的提交号作为固定起点。前 3 种修改在从这个起点拉出的临时分支上真的做一遍，提交后用 `git diff --stat <起点>..<分支>` 数动了几个文件，再按 `layers.json` 数跨了几层。不合并；分支留到 M1 评审点之后，由主人决定删不删。
- 题目固定下来，以后各阶段重测用同一题：
  1. `codex/m1-baseline-1-garden`：把一种作物的生长时间和售价各改一次；
  2. `codex/m1-baseline-2-room`：在 Room 加一个显示「当前口渴值」的状态项；
  3. `codex/m1-baseline-3-channel`：给 QQ 加一条「每个账号每天最多主动发 N 条」的额度规则。

  三题都要改到相关测试跑通为止。
- 后 5 种用 A 的 import 图，加上读码，复核 [product.md](../product.md) 表里的盘点数字。
- 结果填进 product.md「典型修改前后对比」表的「现在」一列。

**已知问题登记**：在 product.md 新增「已知问题」一节，登记 4 条，每条写清位置、影响、能否复现、状态：

1. **guest 的情绪 footer 会改共享情绪**：已确认的现有行为，见事实偏差第 5 条。还要查清电视画面（`room/chat.ts:130`）是不是同样如此。状态：「现有行为，是否改变待主人决定」。
2. **Memory 的 `workspaceId` 实际接收 `storageId`**：`core/native/memory.ts:53` 把 `binding.storageId` 传给 `workspaceId`，而 `memory/client.ts:11` 的字段名是 `workspaceId`。状态：待主人决定。
3. **错误码不一致**：`EXPIRED_USE` 在 `contracts/common.ts:21` 有，`core/storage.ts:10` 的 `reject()` 联合里没有。设置页回复的类型（`console/settings.ts:17`）只有 `code / message / details`，在 `:400,402` 丢掉了 `effect` 和 `retry`。状态：待主人决定。
4. **两套分类器结论不同**：同一组 `feelings=[anger, calm]`，`behavior/presentation.ts:21` 取到 `anger`；`behavior/playback.ts:95-99` 的 `singleFeeling` 只认单一情绪，于是在 `:109` 落到 `rest.calm`。状态：待主人决定。

「能否复现」用丢弃式脚本验证，脚本不合并；会失败的测试不进门禁。

**度量表（G5 手工版）**：在 product.md「重构的度量与机制」里加一张现状表：

- R1–R4 各规则的违规数（调用点数和依赖边数分开记）
- R8 重复组数和裸字符串数
- kind/action 字符串判断数
- 手写超过 1500 行的文件数
- 模块间依赖数
- 修复批次占比：逐个提交判断是修复、功能、发版还是其他，按 G3 把同一个提交里的多轮返工也算作批次（从提交说明和改动判断）。拿不准的标「估计」，不能直接拿提交数当批次数。
- 典型修改基线

**`AGENTS.md` 按 dev-kit 模板重写**（Claude 写）：

- 一句话说明。
- 一页入口：三层简图、概念表、「新增东西去哪里登记」。链接 [architecture.md](../architecture.md) 和 `arch/layers.json`，不抄内容，控制在 10 KB 以内。
- 开发约定：
  - 快测：`pnpm run build` 加 `node --test <文件>`。E 批实测耗时；如果 `build` 超过 60 秒，提议加一个只跑 `tsc -p tsconfig.build.json` 的脚本，另找主人同意。
  - 门禁：`pnpm run verify`
  - 恢复环境：链接 [development.md](../development.md#local-tools) 里现有的命令。它随包发布，命令只在那里写一份。
  - 行为清单：`pnpm run test:behavior-list`
  - 高风险：`scripts/lib/offline-backup.mjs`、`scripts/lib/repo-storage.mjs`、`scripts/migrate/`、`src/core/storage.ts`、`src/core/workspace.ts`、`package.json` 的 `exports / files / imports`、`cordis.patch.yml`、发布流程
  - 禁改：`vendor/**`；生成文件（`src/desktop/platform/client.js` 等，要改就改生成器）；`references/`；`arch/baseline/**`（只能由 `--write-baseline` 改，而且只减不增）
  - 提交阈值：按拍板点 3 的决定写
- 原有的协作约定保留。快测和恢复命令实际跑一次。

**文档同步**：

- [architecture.md](../architecture.md) 第 3 节写上基线文件的实际位置，替换掉「在 M1 的实施方案里定」那句；第 4 节链接 `arch/storage.json`。
- [development.md](../development.md) 写上 `check:arch`、`test:behavior-list` 和迁移命令。
- product.md 的「行为清单」一节写上位置、分级和命令；更正测试文件数和 37/73 的说法。

## 特殊情况

- **空状态**：没绑定工作区的安装，`backupPlan` 本身就会拒绝（`offline-backup.mjs` 的 `backupBinding` 要求绑定 ready）。迁移和盘点同样拒绝并说明原因，不创建任何文件。
- **失败**：迁移任一步失败，保留原文件，日志记「失败」，退出码非 0，后面的步骤不再执行；主人可以用迁移前的备份回退。
- **取消或崩溃**：随时可以中断；`run --resume` 按目标状态判断，已完成的步骤跳过，回退点始终是第一次的备份。
- **并发**：迁移锁保证同一时间只有一个迁移；DSH 和各模块的写入者在拿到锁之后还会再查一次。
- **旧数据兼容**：多出来的文件不在 0.1.8 的指纹和清单检查范围内（事实偏差第 3 条），C 批演练 4 用 0.1.8 的代码实测证明。
- **打包后能否运行**：运行时代码和入口不变，`check:package` 照常通过；`scripts/arch`、`scripts/migrate` 不进包。
- **检查脚本误报**：判不出的写法进基线，不会被放过；真误报就修脚本，不靠往基线里加条目绕过（基线只能由脚本写，而且只减不增）。
- **真实数据边界**：程序在隔离副本里读完成任务必需的字段（绑定、身份）。Agent 只接收盘点的元数据输出，以及迁移和演练的通过或失败。回执内容、`backupPlan` 的完整结果、备份 manifest、数据库里的值、聊天正文都不交给 Agent。

## 概念与扩展检查

- **新增的概念和拥有者**：
  - 层声明 `arch/layers.json`：模块归属、允许的依赖、服务、事件、生成文件。拥有者是架构，改它就等于改架构，要走方案。
  - 存储声明 `arch/storage.json`：第 4 节登记表的机器可读版，区分业务拥有者和物理容器。拥有者同上。
  - 违规基线 `arch/baseline/*.json`：只能由检查脚本写，只减不增。
  - 存储清单版本号、迁移日志、迁移锁，以及「迁移 ↔ 迁移前备份」的关联：数据归第一层·身份与绑定；M1 由离线脚本写，M3 起交给 `kernel/storage/`。约束：锁在整次迁移期间都持有；回退点始终是第一次的备份；日志只供参考，以目标状态为准。
  - 行为清单的分级和索引：属于测试的一部分。
- **新增词表**：
  - 规则编号 R1–R8，沿用 architecture 第 3 节
  - 模块 ID，沿用现有目录名，即 architecture 2.1 的左列
  - 数据模块的版本键，沿用 `storage.json` 里的拥有者模块 ID
  - 迁移步骤 ID（`NNNN-名字`）
  - 迁移日志状态（开始 / 跳过 / 完成 / 失败）
  - 行为清单编号和层次（L1 / L2 / L3）

  其中真正新起的只有步骤 ID、日志状态、清单编号和层次。
- **复用的已有声明**：architecture 2.1 的归层、第 3 节的规则、第 4 节的登记表；`package.json` 的 `imports`；`ctx.provide` 的 13 个服务名；`backupPlan` 的根目录清单；`storage.ts` 的锁写法。
- **层间接口变化**：无，不合入任何 `src/` 改动。
- **为什么需要、对应哪个场景**：M1 表格里每一项都是「怎么算没做坏、怎么安全回头」的安全网，为重构的成功标准服务，保证全部 5 个核心场景的行为不变；它本身不新增任何用户可见的职责。

## M1 表格对照

| M1 表格项 | 批 | 怎么算完成 |
| --- | --- | --- |
| 行为清单 | B | 15 类每类至少一条 L2 或 L1，在旧代码上全绿，并且被核对确实执行过 |
| `layers.json` 与 R1–R4；R5 报告 | A | 一次性验收表全部抓到；R5 报告区分业务拥有者和物理容器；基线已固定 |
| 数据盘点 | C 做工具，D 执行 | 真实副本的差异逐条处理；Economy 是否已采用；待确认请求的数量和位置 |
| 迁移骨架 | C + D | 合成副本上 6 类演练进门禁；真实副本演练由主人确认通过 |
| 合成数据副本生成器 | C | 两种变体都能用；迁移、回退、崩溃续做都先在它上面跑通 |
| 典型修改基线 | E | 8 种写成一张表，前 3 种是固定起点、固定题目的实测 |
| 违规基线与棘轮、度量 | A + E | 新增一条违规、或空出额度不收紧，门禁都会失败；度量表已记 |
| 故障家族完整流程用例 | B | 4 条 L1 在旧代码上全绿 |
| R8 报告 | A | 7 组已知重复的全部定义位置都报出；新增重复会被阻断 |
| `AGENTS.md` 重写 | E | 快测和恢复命令实际跑过 |
| 已知问题登记 | E | 4 条已登记，不修 |

## M1 评审点（继续 / 缩小 / 止步）

A–E 都合入、D 通过之后，Claude 准备一页评审材料给主人（放在对话里，不进仓库），内容包括：

- 现状违规的规模（按规则和模块分）
- 典型修改基线
- 盘点差异和处理结果
- 迁移演练结果
- 故障家族用例
- 已知问题

主人在 A 继续 / B 缩小 / C 止步里选一个，Claude 把结论写进 [decisions.md](../decisions.md)；选 A 才开始写 M2 方案。如果 D 一直等不到真实副本，A、B、C、E 照常完成，评审点等 D。

## 挑刺与回应

Codex 只读挑刺（基于 HEAD `3a6f908`）提出 13 条主要意见，另附四条事实偏差和三张表的逐项核对。Claude 回读了涉及的源码，主要意见全部采纳，逐项核对表里的更正也都改了：

| # | 意见 | 回应 |
| --- | --- | --- |
| 1 | 真实副本没有可执行的隔离绑定准备流程：回执和 Core 里存的是绝对路径，单纯复制目录不会指向副本 | 采纳。D 改用现有的 `dafeiyu-setup --resume-repo` 搭隔离环境，先核对根目录都在隔离环境内 |
| 2 | 停 DSH 不能代替迁移互斥 | 采纳。加迁移锁，照 `storage.ts:77` 的写法，整次持有；加并发演练 |
| 3 | 「按目标状态判断」还没有形成崩溃恢复契约；崩溃后做新备份，存的是迁移了一半的状态 | 采纳。写明目标状态要完整匹配、原子写、日志截断的处理；`--resume` 不做新备份，回退点固定为第一次的备份；崩溃点扩到 4 个 |
| 4 | 「文件 + 目标 + 次数」的基线有两个漏报窗口 | 采纳。改成逐条身份（含所在函数和归一化表达式），消失的条目必须同提交收紧；加两条反例测试 |
| 5 | 行为清单 runner 零匹配也会成功（挑刺实测退出码为 0） | 采纳。改用 `run()` 核对实际执行的测试身份，零匹配、跳过都算失败，名字按字面匹配 |
| 6 | 一部分「直接登记」的用例违反方案自己定的外部边界；完整流程的要求被悄悄降低 | 采纳。引入 L1/L2/L3 分级，起点表逐条改了；15 类各自的 L1 分摊到各阶段，列为拍板点 9，不再悄悄降低 |
| 7 | R5 混淆了业务拥有者和物理容器，会把 Channels、Desktop 写 Core 数据库判成「一致」 | 采纳。`storage.json` 和 R5 报告分开记业务拥有者、物理容器、写入者、读还是写 |
| 8 | 迁移演练漏了 architecture 7.5 的「已撤回记忆仍不可见」和「结算未完成时迁移前后行为一致」 | 采纳。补为演练 1 和演练 5，Memory 比对时先合并 WAL |
| 9 | R8 列的语法形状抓不到 `plan-tools.ts:71` 的 `oneOf const`；生成文件豁免后，它的生成源也要受检 | 采纳。补上 schema 的 `const/enum`；验收改成核对每组的全部定义位置；生成源要扫描 |
| 10 | A 只建空的 `storage.json`，完成不了 R5 验收 | 采纳。`storage.json` 归 A 建立并填满，C 在 A 合入后再开工 |
| 11 | `diff main...` 漏掉未提交的修改，起点会移动；拿提交数当修复批次数会失真 | 采纳。固定起点提交和题目，只数已提交的差异；批次按 G3 逐个提交判断 |
| 12 | 先恢复再换包，会被指纹检查挡住；只用 0.1.8 证明不了换包回退 | 采纳。D 写明只证明「0.1.8 容忍新元数据，恢复正常」，换包回退留到 M3 |
| 13 | 「不改 src、不改包内容」的说法太绝对 | 采纳。改成精确说法：临时改动不合并；包里只有 `scripts` 和 `development.md` 会变 |
| — | 四条事实偏差的行号更正、guest footer 已被断言、测试起点表逐条修正、盘点程序其实要读绑定字段 | 全部采纳，正文里已经改了 |

**没有采纳的意见：无。**

**有一条我和挑刺的结论一致，但写法不同**：挑刺认为「范围变化：无」不完全属实。我保留了「用户功能层面无」，把检查边界的取舍单独列出来，交给主人拍板。

## 拍板记录

1. **M1 怎么切** — 推荐：一份总方案，分 5 批，各自开分支、各自验收；A 和 B 并行，C 在 A 之后。理由：只需拍板一次，而每批的改动面小，能单独回退；拆成 5 份方案文件，共同的取舍（文件位置、行为测试的分级）会散在多处。决定：按推荐（主人 2026-11-17 确认）
2. **检查相关的文件放哪** — 推荐：声明和基线放顶层 `arch/`（`arch/layers.json`、`arch/storage.json`、`arch/baseline/`），脚本放 `scripts/arch/`。理由：一页入口要链接它们，放顶层好找；脚本和数据分开。备选：全放进 `scripts/arch/`。决定：按推荐（主人 2026-11-17 确认）
3. **提交阈值** — 推荐：写进 `AGENTS.md`，单个提交不超过 15 个文件、600 行改动；脚本生成的基线文件和抄录的样例不计，但要在方案里预先声明。决定：按推荐（主人 2026-11-17 确认）
4. **存储版本号和迁移日志放哪** — 推荐：`.chatpet/data/storage-manifest.json` 加 `.chatpet/data/migrations.jsonl`。理由：不碰 `manifest.json` 的指纹；文件在 `.chatpet/` 里，现有备份自然覆盖。备选：Core 数据库的 `meta` 表，但那等于又往 Core 库里塞一类数据，和 R5 要求的方向相反。决定：按推荐（主人 2026-11-17 确认）
5. **`arch/storage.json` 和 architecture 第 4 节的关系** — 推荐：路径清单只在 `storage.json` 里维护；第 4 节保留拥有者、写入协议和理由，并链接过去。理由：每个事实只写一处，而生成器、盘点、R5、迁移都要读机器可读的清单。决定：按推荐（主人 2026-11-17 确认）
6. **怎么数浏览器里的待确认请求** — 推荐：主人在日常 DSH 的开发者工具里跑一段只读片段，只数键的个数。备选：写程序解析 Electron 的 localStorage 库文件，但要加解析依赖，而且会碰到值。决定：按推荐（主人 2026-11-17 确认）
7. **旧代码里的特殊归属** — 推荐：`world/` 暂归第一层，`contracts/` 暂作第一层共用；生成文件（`src/desktop/platform/client.js` 等，在 `layers.json` 里列出名单）不进 R1–R4、R8 的扫描，但它们的生成源要扫描，报告里列出跳过了哪些。理由：前两者真正的拆分在后续阶段；生成文件要改也是改生成器，扫生成文件本身只会产生无法处理的噪音。决定：按推荐（主人 2026-11-17 确认）；A 批验收时收窄：`vendor/` 里的生成源也不扫，只扫生成脚本和 `src/` 里的生成源（主人 2026-11-17 确认）
8. **真实副本检查点的前提** — 推荐：主人提供副本位置，并准备好独立的 macOS 用户（或独立的 DSH home）作为隔离环境之后，D 才开始；第 4 步的聊天由主人自己操作，会用主人配置的模型。决定：按推荐（主人 2026-11-17 确认）
9. **行为清单在 M1 做到什么程度** — 推荐：15 类每类至少一条 L2 或 L1，4 个故障家族各一条 L1；15 类各自的 L1 在索引里标注计划阶段，随对应模块的重写补齐，最晚阶段 4 结束。理由：M1 表格的完成标准是「每类有可运行的行为测试」，[product.md](../product.md) 第 87 行要求每类最终都有完整流程；一次补齐 15 条 L1，会让 M1 变成半个测试重写项目。备选：M1 就补齐 15 条 L1。决定：按推荐（主人 2026-11-17 确认）

## 验收

- 快测（各批）：
  - A：`node --test tests/arch/*.test.mjs`；`pnpm run check:arch`
  - B：`pnpm run build && pnpm run test:behavior-list`
  - C：`pnpm run build && node --test tests/migrate/*.test.mjs`
- 门禁（每批合并前）：`pnpm run verify`
- Claude 验收时额外做：
  - A：核对 `check:arch -- --report` 的输出包含一次性验收表的每一行；在验收工作区里临时往 `src/core` 的另一个函数里加一处 `ctx.get('petLife')`，同时删掉一处旧的，确认 `check:arch` 失败，然后撤掉（不提交）。
  - B：核对索引覆盖 15 类和 4 个家族；把一条索引项的名字改错，确认 runner 失败；抽查 L2 测试符合分级定义。
  - C：自己用生成器分别产出两种变体，走一遍 `run → 杀进程 → run --resume → status → 回退`。
- 手动（主人）：
  - D 的四步。
  - M1 评审点：看现状违规清单、基线表和演练结果；在隔离环境里用副本打开 DSH，确认聊天和记忆正常。
- 本机执行注意：Claude 的 Bash 工具不走登录 shell，跑 `node`、`pnpm` 要用 `zsh -lc '…'` 包一层。

## 执行结果

### A 批（已合并）

- `arch/layers.json`：13 个模块、13 个服务、依赖/事件和生成源声明；`arch/storage.json`：第 4 节全部数据类别，共 50 条登记，本轮均未改。
- `scripts/arch/check.mjs`、`lib/*.mjs`：TypeScript AST 的 R1–R4、R5 报告、R8 和棘轮；本轮只调整 R8 身份、vendor 扫描范围和 R1–R3 名字解析及内联类型导入。
- `fixtures/**`：独立最小违规/干净样例；本轮增加 `core/resolution.ts`，覆盖模板、计算解构、内联类型导入和完整可解析写法。
- `tests/arch/*.mjs`：本轮新增 7 条回归；`package.json`、`scripts/checks/verify.mjs` 接线保持不变。
- 当前 `rules.json` 共 81 条（R1 28、R2 41、R3 2、R4 10）；`vocabulary.json` 共 1073 条（1038 条双向重复/子集关系记录、35 条裸 string）；`writers.json` 保持 324 条。
- 本轮快测：zsh 下 `node --test tests/arch/*.test.mjs` 31 通过/0 失败/0 跳过，`pnpm run check:arch` 通过；新增回归修前分别复现 R8 1 项、vendor 1 项、R1–R3 3 项失败，首次整套检查另修正新样例同名行号导致的测试定位冲突。
- 未运行全量 verify、构建、DSH 或付费模型，未访问个人数据；未改 src/、vendor/、原有非 arch 测试或 B–E；正式文档同步留 E 批。
- 本轮未运行 git add/commit/stash/reset，未推送、未合并；改动由 Claude 按最终提交计划分开提交。
- 验收注意：建议修 4–7 按主人要求不做；R5 只报告、R8 仍有非业务集合噪音；全量门禁、Claude 复验和主人验收仍待各自执行，C 批随后需变基。
- 返工（C 批发现的存储登记问题，已修）：逐条核对原有 50 条并在 `arch/storage.json:6-55` 各行补 `evidence`；实质修正第 18、21、34-43、47-48 行：近期账本改为 Memory 目录容器、Emotion 业务拥有者（`src/core/index.ts:18`、`src/emotion/recent.ts:11,17,25,56,78`），身体/旧菜园、Life 各文件、记录库/相册新旧位置、Channels 设备目录用 `locations` 分别登记，补相册文件范围和建表清单，校正当前写入者（各处源码依据见对应行）；R5 修正精确路径优先级、分位置容器和建表归属，新增 `tests/arch/storage-locations.test.mjs`，保留全部现有测试；用 `scan()` 重生成 writers：324 条调用身份未变、18 条报告字段修正，现为 65 违规/109 一致/150 未知，rules/vocabulary 字节未变；快测 `node --test tests/arch/*.test.mjs` 24 通过/0 失败、`pnpm run check:arch` 通过；除本行执行记录外仅改 A 批允许目录，未运行全量门禁、真实副本或 git add/commit，由 Claude 验收及提交。
- 返工（A 批第一轮）：只修必须修 1–3，逐条状态见下方审查结论；直接调用 `scan()` 重生成三份基线并复扫核对，rules 74→81（新增 10、消失 3，其中 1 条同位置改报未知），vocabulary 1381→1073（新增 0、消失 308，全为 vendor 相关，保留项按新身份重编码），writers 字节不变；逐条位置和原因见紧接下方差异表，快测 31/31 与 check:arch 通过，保留 Claude 原审查及拍板点 7 收窄记录。
- 返工（A 批第二轮）：只修必须修第 8 条，R8 重复关系身份去掉 `relation`，新增完全重复集合单方加值变为子集的回归；修前确认 1 失败（新增 2、消失 2），修后 `node --test tests/arch/*.test.mjs` 32 通过/0 失败/0 跳过，`pnpm run check:arch` 通过（rules 81、vocabulary 1073，均新增 0/消失 0）；三份基线未重生成、字节未变，未改无关部分；未运行全量门禁或 Git 写操作，由 Claude 复验及提交。

<details>
<summary>A 批第一轮基线差异（逐条位置与原因）</summary>

所有基线由当前 `scan()` 直接生成，未用 `--write-baseline` 绕过新增限制。以下与返工前的基线比较；R8 的旧身份先映射到第 1 条确定的新身份再核对，保留的 1073 条只是重新编码，不算新增违规。

**规则新增 10 条**

| 规则 | 位置 | 函数路径 | 目标 | 原因 |
| --- | --- | --- | --- | --- |
| R1 | `src/console/settings.ts:67:28` | `settingsHandler/<callback>` | `src/channels/plugin.js` | 第 3 条：补扫内联类型导入（原有旧违规）。 |
| R1 | `src/console/settings.ts:68:28` | `settingsHandler/<callback>` | `src/desktop/platform/plugin.js` | 第 3 条：补扫内联类型导入（原有旧违规）。 |
| R1 | `src/console/settings.ts:68:150` | `settingsHandler/<callback>` | `src/desktop/platform/plugin.js` | 第 3 条：补扫内联类型导入（原有旧违规）。 |
| R1 | `src/core/initialization.ts:12:19` | `<module>` | `?` | 第 3 条：路径含无法解析的动态部分，现明示未知（原有写法）。 |
| R1 | `src/desktop/features.ts:14:50` | `upstream` | `?` | 第 3 条：路径含无法解析的动态部分，现明示未知（原有写法）。 |
| R1 | `src/desktop/platform/migration.ts:28:16` | `<module>` | `?` | 第 3 条：路径含无法解析的动态部分，现明示未知（原有写法）。 |
| R1 | `src/desktop/platform/plugin.ts:37:18` | `<module>` | `?` | 第 3 条：路径含无法解析的动态部分，现明示未知（原有写法）。 |
| R1 | `src/memory/client.ts:53:41` | `MemoryConnection/open` | `?` | 第 3 条：路径含无法解析的动态部分，现明示未知（原有写法）。 |
| R1 | `src/memory/client.ts:54:36` | `MemoryConnection/open` | `?` | 第 3 条：路径含无法解析的动态部分，现明示未知（原有写法）。 |
| R1 | `src/voice/plugin.ts:8:50` | `upstream` | `?` | 第 3 条：部分动态路径不再冒充完整目标，同一位置改报未知。 |

**规则消失 3 条**

| 规则 | 位置 | 函数路径 | 原目标 | 原因 |
| --- | --- | --- | --- | --- |
| R1 | `src/voice/plugin.ts:8:50` | `upstream` | `src/desktop/upstream/host/*.js` | 第 3 条：部分路径不能冒充完整目标，同一位置改报未知。 |
| R2 | `vendor/dsh-pet/platform/upstream/client.js:14977:10` | `<callback>/createTransport/api` | `petApi7340` | 第 2 条：排除 vendor 生成源。 |
| R2 | `vendor/dsh-pet/platform/upstream/client.js:15113:18` | `<callback>/mountBaifan/get` | `?` | 第 2 条：排除 vendor 生成源。 |

**R8 新增 0 条，消失 308 条**

其中 306 条是涉及 vendor 的重复关系双向记录（206 条双方都在 vendor，100 条只有一方在 vendor），另 2 条是 vendor 里的裸 string；308 条消失均由第 2 条收窄扫描范围导致。审查原述 306 条只计重复关系，未含 2 条裸 string。每行是一条原基线记录，重复关系的两端分别列出；下表的「第 2 条」均指排除 vendor 生成源。

| 原位置 | 函数路径 | 形状 | 对方位置 / 函数路径或字段 | 关系 | 消失原因 |
| --- | --- | --- | --- | --- | --- |
| `src/behavior/room.ts:524:34` | `CompanionRoom/dispatchExecution` | `array` | `vendor/dsh-pet/platform/upstream/client.js:67 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:67:31` | `<callback>` | `array` | `src/behavior/room.ts:524 / CompanionRoom/dispatchExecution` | 子集 | 第 2 条 |
| `src/behavior/room.ts:524:34` | `CompanionRoom/dispatchExecution` | `array` | `vendor/dsh-pet/src/shared/menu/tree.ts:15 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:15:50` | `<module>` | `array` | `src/behavior/room.ts:524 / CompanionRoom/dispatchExecution` | 子集 | 第 2 条 |
| `src/behavior/room.ts:524:34` | `CompanionRoom/dispatchExecution` | `array` | `vendor/dsh-pet/src/shared/menu/types.ts:20 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/types.ts:20:5` | `<module>` | `union` | `src/behavior/room.ts:524 / CompanionRoom/dispatchExecution` | 子集 | 第 2 条 |
| `src/desktop/helper/main.cjs:45:33` | `trayRequest` | `array` | `vendor/dsh-pet/platform/upstream/client.js:50 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:50:23` | `<callback>` | `array` | `src/desktop/helper/main.cjs:45 / trayRequest` | 子集 | 第 2 条 |
| `src/desktop/helper/main.cjs:45:33` | `trayRequest` | `array` | `vendor/dsh-pet/platform/upstream/client.js:77 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:77:24` | `<callback>` | `labels` | `src/desktop/helper/main.cjs:45 / trayRequest` | 子集 | 第 2 条 |
| `src/desktop/helper/main.cjs:45:33` | `trayRequest` | `array` | `vendor/dsh-pet/platform/upstream/client.js:5407 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5407:22` | `<callback>` | `array` | `src/desktop/helper/main.cjs:45 / trayRequest` | 子集 | 第 2 条 |
| `src/desktop/helper/main.cjs:45:33` | `trayRequest` | `array` | `vendor/dsh-pet/src/shared/config.ts:11 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/config.ts:11:43` | `<module>` | `array` | `src/desktop/helper/main.cjs:45 / trayRequest` | 子集 | 第 2 条 |
| `src/desktop/helper/main.cjs:45:33` | `trayRequest` | `array` | `vendor/dsh-pet/src/shared/display-hotkey.ts:13 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/display-hotkey.ts:13:30` | `<module>` | `array` | `src/desktop/helper/main.cjs:45 / trayRequest` | 子集 | 第 2 条 |
| `src/desktop/helper/main.cjs:45:33` | `trayRequest` | `array` | `vendor/dsh-pet/src/shared/menu/tree.ts:22 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:22:62` | `<module>` | `labels` | `src/desktop/helper/main.cjs:45 / trayRequest` | 子集 | 第 2 条 |
| `src/desktop/helper/main.cjs:45:33` | `trayRequest` | `array` | `vendor/dsh-pet/src/shared/types.ts:20 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/types.ts:20:26` | `<module>` | `union` | `src/desktop/helper/main.cjs:45 / trayRequest` | 子集 | 第 2 条 |
| `src/desktop/images.ts:26:17` | `DesktopImages/validate` | `array` | `vendor/dsh-pet/platform/upstream/client.js:5699 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5699:21` | `<callback>` | `array` | `src/desktop/images.ts:26 / DesktopImages/validate` | 重复 | 第 2 条 |
| `src/desktop/images.ts:26:17` | `DesktopImages/validate` | `array` | `vendor/dsh-pet/src/shared/chat/image-pick.ts:8 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/image-pick.ts:8:28` | `<module>` | `array` | `src/desktop/images.ts:26 / DesktopImages/validate` | 重复 | 第 2 条 |
| `src/desktop/platform/browser-entry.js:8:18` | `registerCompanion/factory/apply` | `array` | `vendor/dsh-pet/platform/upstream/client.js:17810 / <callback>/makeFactory/<callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:17810:18` | `<callback>/makeFactory/<callback>` | `array` | `src/desktop/platform/browser-entry.js:8 / registerCompanion/factory/apply` | 子集 | 第 2 条 |
| `src/desktop/platform/migration.ts:151:107` | `migratePresentation` | `array` | `vendor/dsh-pet/platform/upstream/client.js:6614 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:6614:14` | `<callback>` | `labels` | `src/desktop/platform/migration.ts:151 / migratePresentation` | 子集 | 第 2 条 |
| `src/desktop/platform/migration.ts:151:107` | `migratePresentation` | `array` | `vendor/dsh-pet/platform/upstream/client.js:6839 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:6839:14` | `<callback>` | `labels` | `src/desktop/platform/migration.ts:151 / migratePresentation` | 子集 | 第 2 条 |
| `src/desktop/platform/migration.ts:151:107` | `migratePresentation` | `array` | `vendor/dsh-pet/platform/upstream/client.js:7064 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:7064:14` | `<callback>` | `labels` | `src/desktop/platform/migration.ts:151 / migratePresentation` | 子集 | 第 2 条 |
| `src/desktop/platform/migration.ts:151:107` | `migratePresentation` | `array` | `vendor/dsh-pet/platform/upstream/client.js:7289 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:7289:14` | `<callback>` | `labels` | `src/desktop/platform/migration.ts:151 / migratePresentation` | 子集 | 第 2 条 |
| `src/desktop/platform/migration.ts:151:107` | `migratePresentation` | `array` | `vendor/dsh-pet/platform/upstream/client.js:7514 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:7514:14` | `<callback>` | `labels` | `src/desktop/platform/migration.ts:151 / migratePresentation` | 子集 | 第 2 条 |
| `src/desktop/platform/migration.ts:151:107` | `migratePresentation` | `array` | `vendor/dsh-pet/platform/upstream/client.js:7739 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:7739:14` | `<callback>` | `labels` | `src/desktop/platform/migration.ts:151 / migratePresentation` | 子集 | 第 2 条 |
| `src/desktop/platform/migration.ts:151:107` | `migratePresentation` | `array` | `vendor/dsh-pet/platform/upstream/client.js:7964 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:7964:14` | `<callback>` | `labels` | `src/desktop/platform/migration.ts:151 / migratePresentation` | 子集 | 第 2 条 |
| `src/desktop/platform/migration.ts:151:107` | `migratePresentation` | `array` | `vendor/dsh-pet/platform/upstream/client.js:8189 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:8189:14` | `<callback>` | `labels` | `src/desktop/platform/migration.ts:151 / migratePresentation` | 子集 | 第 2 条 |
| `src/desktop/platform/plugin.ts:253:32` | `PetPlatform/bodyStatus/pets . some:callback0` | `array` | `vendor/dsh-pet/platform/upstream/client.js:50 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:50:23` | `<callback>` | `array` | `src/desktop/platform/plugin.ts:253 / PetPlatform/bodyStatus/pets . some:callback0` | 子集 | 第 2 条 |
| `src/desktop/platform/plugin.ts:253:32` | `PetPlatform/bodyStatus/pets . some:callback0` | `array` | `vendor/dsh-pet/platform/upstream/client.js:77 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:77:24` | `<callback>` | `labels` | `src/desktop/platform/plugin.ts:253 / PetPlatform/bodyStatus/pets . some:callback0` | 子集 | 第 2 条 |
| `src/desktop/platform/plugin.ts:253:32` | `PetPlatform/bodyStatus/pets . some:callback0` | `array` | `vendor/dsh-pet/platform/upstream/client.js:5407 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5407:22` | `<callback>` | `array` | `src/desktop/platform/plugin.ts:253 / PetPlatform/bodyStatus/pets . some:callback0` | 子集 | 第 2 条 |
| `src/desktop/platform/plugin.ts:253:32` | `PetPlatform/bodyStatus/pets . some:callback0` | `array` | `vendor/dsh-pet/src/shared/config.ts:11 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/config.ts:11:43` | `<module>` | `array` | `src/desktop/platform/plugin.ts:253 / PetPlatform/bodyStatus/pets . some:callback0` | 子集 | 第 2 条 |
| `src/desktop/platform/plugin.ts:253:32` | `PetPlatform/bodyStatus/pets . some:callback0` | `array` | `vendor/dsh-pet/src/shared/display-hotkey.ts:13 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/display-hotkey.ts:13:30` | `<module>` | `array` | `src/desktop/platform/plugin.ts:253 / PetPlatform/bodyStatus/pets . some:callback0` | 子集 | 第 2 条 |
| `src/desktop/platform/plugin.ts:253:32` | `PetPlatform/bodyStatus/pets . some:callback0` | `array` | `vendor/dsh-pet/src/shared/menu/tree.ts:22 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:22:62` | `<module>` | `labels` | `src/desktop/platform/plugin.ts:253 / PetPlatform/bodyStatus/pets . some:callback0` | 子集 | 第 2 条 |
| `src/desktop/platform/plugin.ts:253:32` | `PetPlatform/bodyStatus/pets . some:callback0` | `array` | `vendor/dsh-pet/src/shared/types.ts:20 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/types.ts:20:26` | `<module>` | `union` | `src/desktop/platform/plugin.ts:253 / PetPlatform/bodyStatus/pets . some:callback0` | 子集 | 第 2 条 |
| `src/desktop/platform/plugin.ts:254:20` | `PetPlatform/bodyStatus/pets . some:callback0` | `array` | `vendor/dsh-pet/platform/upstream/client.js:50 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:50:23` | `<callback>` | `array` | `src/desktop/platform/plugin.ts:254 / PetPlatform/bodyStatus/pets . some:callback0` | 子集 | 第 2 条 |
| `src/desktop/platform/plugin.ts:254:20` | `PetPlatform/bodyStatus/pets . some:callback0` | `array` | `vendor/dsh-pet/platform/upstream/client.js:77 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:77:24` | `<callback>` | `labels` | `src/desktop/platform/plugin.ts:254 / PetPlatform/bodyStatus/pets . some:callback0` | 子集 | 第 2 条 |
| `src/desktop/platform/plugin.ts:254:20` | `PetPlatform/bodyStatus/pets . some:callback0` | `array` | `vendor/dsh-pet/platform/upstream/client.js:5407 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5407:22` | `<callback>` | `array` | `src/desktop/platform/plugin.ts:254 / PetPlatform/bodyStatus/pets . some:callback0` | 子集 | 第 2 条 |
| `src/desktop/platform/plugin.ts:254:20` | `PetPlatform/bodyStatus/pets . some:callback0` | `array` | `vendor/dsh-pet/src/shared/config.ts:11 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/config.ts:11:43` | `<module>` | `array` | `src/desktop/platform/plugin.ts:254 / PetPlatform/bodyStatus/pets . some:callback0` | 子集 | 第 2 条 |
| `src/desktop/platform/plugin.ts:254:20` | `PetPlatform/bodyStatus/pets . some:callback0` | `array` | `vendor/dsh-pet/src/shared/display-hotkey.ts:13 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/display-hotkey.ts:13:30` | `<module>` | `array` | `src/desktop/platform/plugin.ts:254 / PetPlatform/bodyStatus/pets . some:callback0` | 子集 | 第 2 条 |
| `src/desktop/platform/plugin.ts:254:20` | `PetPlatform/bodyStatus/pets . some:callback0` | `array` | `vendor/dsh-pet/src/shared/menu/tree.ts:22 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:22:62` | `<module>` | `labels` | `src/desktop/platform/plugin.ts:254 / PetPlatform/bodyStatus/pets . some:callback0` | 子集 | 第 2 条 |
| `src/desktop/platform/plugin.ts:254:20` | `PetPlatform/bodyStatus/pets . some:callback0` | `array` | `vendor/dsh-pet/src/shared/types.ts:20 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/types.ts:20:26` | `<module>` | `union` | `src/desktop/platform/plugin.ts:254 / PetPlatform/bodyStatus/pets . some:callback0` | 子集 | 第 2 条 |
| `src/emotion/index.ts:50:11` | `<module>` | `union` | `vendor/dsh-pet/src/shared/playback.ts:9 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/playback.ts:9:30` | `<module>` | `union` | `src/emotion/index.ts:50 / <module>` | 子集 | 第 2 条 |
| `src/emotion/index.ts:50:11` | `<module>` | `union` | `vendor/dsh-pet/src/shared/playback.ts:12 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/playback.ts:12:32` | `<module>` | `union` | `src/emotion/index.ts:50 / <module>` | 重复 | 第 2 条 |
| `src/emotion/index.ts:50:11` | `<module>` | `union` | `vendor/dsh-pet/src/shared/playback.ts:15 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/playback.ts:15:61` | `<module>` | `array` | `src/emotion/index.ts:50 / <module>` | 子集 | 第 2 条 |
| `src/emotion/index.ts:50:11` | `<module>` | `union` | `vendor/dsh-pet/src/shared/playback.ts:18 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/playback.ts:18:65` | `<module>` | `array` | `src/emotion/index.ts:50 / <module>` | 重复 | 第 2 条 |
| `src/emotion/plugin.ts:65:10` | `CompanionEmotion/recordPlayback` | `array` | `vendor/dsh-pet/src/shared/playback.ts:9 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/playback.ts:9:30` | `<module>` | `union` | `src/emotion/plugin.ts:65 / CompanionEmotion/recordPlayback` | 子集 | 第 2 条 |
| `src/emotion/plugin.ts:65:10` | `CompanionEmotion/recordPlayback` | `array` | `vendor/dsh-pet/src/shared/playback.ts:12 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/playback.ts:12:32` | `<module>` | `union` | `src/emotion/plugin.ts:65 / CompanionEmotion/recordPlayback` | 重复 | 第 2 条 |
| `src/emotion/plugin.ts:65:10` | `CompanionEmotion/recordPlayback` | `array` | `vendor/dsh-pet/src/shared/playback.ts:15 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/playback.ts:15:61` | `<module>` | `array` | `src/emotion/plugin.ts:65 / CompanionEmotion/recordPlayback` | 子集 | 第 2 条 |
| `src/emotion/plugin.ts:65:10` | `CompanionEmotion/recordPlayback` | `array` | `vendor/dsh-pet/src/shared/playback.ts:18 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/playback.ts:18:65` | `<module>` | `array` | `src/emotion/plugin.ts:65 / CompanionEmotion/recordPlayback` | 重复 | 第 2 条 |
| `src/emotion/plugin.ts:180:20` | `installEmotion/<callback>` | `labels` | `vendor/dsh-pet/src/shared/playback.ts:9 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/playback.ts:9:30` | `<module>` | `union` | `src/emotion/plugin.ts:180 / installEmotion/<callback>` | 子集 | 第 2 条 |
| `src/emotion/plugin.ts:180:20` | `installEmotion/<callback>` | `labels` | `vendor/dsh-pet/src/shared/playback.ts:12 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/playback.ts:12:32` | `<module>` | `union` | `src/emotion/plugin.ts:180 / installEmotion/<callback>` | 重复 | 第 2 条 |
| `src/emotion/plugin.ts:180:20` | `installEmotion/<callback>` | `labels` | `vendor/dsh-pet/src/shared/playback.ts:15 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/playback.ts:15:61` | `<module>` | `array` | `src/emotion/plugin.ts:180 / installEmotion/<callback>` | 子集 | 第 2 条 |
| `src/emotion/plugin.ts:180:20` | `installEmotion/<callback>` | `labels` | `vendor/dsh-pet/src/shared/playback.ts:18 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/playback.ts:18:65` | `<module>` | `array` | `src/emotion/plugin.ts:180 / installEmotion/<callback>` | 重复 | 第 2 条 |
| `src/life/plugin.ts:490:44` | `CompanionLife/desktopRest` | `union` | `vendor/dsh-pet/platform/upstream/client.js:67 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:67:31` | `<callback>` | `array` | `src/life/plugin.ts:490 / CompanionLife/desktopRest` | 子集 | 第 2 条 |
| `src/life/plugin.ts:490:44` | `CompanionLife/desktopRest` | `union` | `vendor/dsh-pet/src/shared/menu/tree.ts:15 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:15:50` | `<module>` | `array` | `src/life/plugin.ts:490 / CompanionLife/desktopRest` | 子集 | 第 2 条 |
| `src/life/plugin.ts:490:44` | `CompanionLife/desktopRest` | `union` | `vendor/dsh-pet/src/shared/menu/types.ts:20 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/types.ts:20:5` | `<module>` | `union` | `src/life/plugin.ts:490 / CompanionLife/desktopRest` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:50:23` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/chat/dialog.ts:128 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/dialog.ts:128:12` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:50 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:50:23` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/config.ts:11 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/config.ts:11:43` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:50 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:50:23` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/display-hotkey.ts:13 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/display-hotkey.ts:13:30` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:50 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:50:23` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/menu/tree.ts:22 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:22:62` | `<module>` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:50 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:50:23` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/menu/tree.ts:50 / readMenuItems` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:50:55` | `readMenuItems` | `union` | `vendor/dsh-pet/platform/upstream/client.js:50 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:50:23` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/state.ts:193 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:193:27` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:50 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:50:23` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/types.ts:20 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/types.ts:20:26` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:50 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:67:31` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/menu/tree.ts:15 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:15:50` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:67 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:67:31` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/menu/types.ts:20 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/types.ts:20:5` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:67 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:77:24` | `<callback>` | `labels` | `vendor/dsh-pet/src/shared/chat/dialog.ts:128 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/dialog.ts:128:12` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:77 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:77:24` | `<callback>` | `labels` | `vendor/dsh-pet/src/shared/config.ts:11 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/config.ts:11:43` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:77 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:77:24` | `<callback>` | `labels` | `vendor/dsh-pet/src/shared/display-hotkey.ts:13 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/display-hotkey.ts:13:30` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:77 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:77:24` | `<callback>` | `labels` | `vendor/dsh-pet/src/shared/menu/tree.ts:22 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:22:62` | `<module>` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:77 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:77:24` | `<callback>` | `labels` | `vendor/dsh-pet/src/shared/menu/tree.ts:50 / readMenuItems` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:50:55` | `readMenuItems` | `union` | `vendor/dsh-pet/platform/upstream/client.js:77 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:77:24` | `<callback>` | `labels` | `vendor/dsh-pet/src/shared/state.ts:193 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:193:27` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:77 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:77:24` | `<callback>` | `labels` | `vendor/dsh-pet/src/shared/types.ts:20 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/types.ts:20:26` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:77 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:148:22` | `<callback>` | `labels` | `vendor/dsh-pet/src/shared/menu/tree.ts:100 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:100:46` | `<module>` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:148 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:259:18` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/menu/css.ts:12 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/css.ts:12:25` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:259 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:537:21` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/tooltip.ts:46 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/tooltip.ts:46:28` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:537 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:1177:21` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/balance/parse.ts:16 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/parse.ts:16:50` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:1177 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:1177:21` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/balance/types.ts:30 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/types.ts:30:25` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:1177 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:1186:35` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/balance/parse.ts:24 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/parse.ts:24:63` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:1186 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:1565:18` | `<callback>/urgentWindow` | `array` | `vendor/dsh-pet/src/shared/balance/handlers/windows.ts:58 / urgentWindow` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/handlers/windows.ts:58:20` | `urgentWindow` | `array` | `vendor/dsh-pet/platform/upstream/client.js:1565 / <callback>/urgentWindow` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:1565:18` | `<callback>/urgentWindow` | `array` | `vendor/dsh-pet/src/shared/balance/handlers/windows.ts:136 / windowsDetail` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/handlers/windows.ts:136:19` | `windowsDetail` | `array` | `vendor/dsh-pet/platform/upstream/client.js:1565 / <callback>/urgentWindow` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:1565:18` | `<callback>/urgentWindow` | `array` | `vendor/dsh-pet/src/shared/balance/types.ts:181 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/types.ts:181:25` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:1565 / <callback>/urgentWindow` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:1642:18` | `<callback>/windowsDetail` | `array` | `vendor/dsh-pet/src/shared/balance/handlers/windows.ts:58 / urgentWindow` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/handlers/windows.ts:58:20` | `urgentWindow` | `array` | `vendor/dsh-pet/platform/upstream/client.js:1642 / <callback>/windowsDetail` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:1642:18` | `<callback>/windowsDetail` | `array` | `vendor/dsh-pet/src/shared/balance/handlers/windows.ts:136 / windowsDetail` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/handlers/windows.ts:136:19` | `windowsDetail` | `array` | `vendor/dsh-pet/platform/upstream/client.js:1642 / <callback>/windowsDetail` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:1642:18` | `<callback>/windowsDetail` | `array` | `vendor/dsh-pet/src/shared/balance/types.ts:181 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/types.ts:181:25` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:1642 / <callback>/windowsDetail` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:1798:28` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/work-status.ts:10 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/work-status.ts:10:35` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:1798 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:1894:28` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/state.ts:117 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:117:31` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:1894 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:1894:28` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/state.ts:127 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:127:28` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:1894 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:1903:24` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/state.ts:120 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:120:27` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:1903 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:1903:24` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/state.ts:130 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:130:24` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:1903 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:2573:18` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/todo/format.ts:18 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/todo/format.ts:18:18` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:2573 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:2671:19` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/todo/due-picker.ts:14 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/todo/due-picker.ts:14:19` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:2671 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:3307:24` | `<callback>` | `labels` | `vendor/dsh-pet/src/shared/notify.ts:9 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/notify.ts:9:29` | `<module>` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:3307 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:3333:2` | `<callback>/frameToToast` | `switch` | `vendor/dsh-pet/src/shared/notify.ts:72 / frameToToast` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/notify.ts:72:3` | `frameToToast` | `switch` | `vendor/dsh-pet/platform/upstream/client.js:3333 / <callback>/frameToToast` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:3832:21` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/pickers.ts:77 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/pickers.ts:77:24` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:3832 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:3832:21` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/weights.ts:9 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/weights.ts:9:28` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:3832 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:4363:14` | `<callback>/makeDialog/SettingsDialog` | `labels` | `vendor/dsh-pet/src/shared/balance/parse.ts:24 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/parse.ts:24:63` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:4363 / <callback>/makeDialog/SettingsDialog` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:4371:14` | `<callback>/makeDialog/SettingsDialog` | `labels` | `vendor/dsh-pet/src/shared/balance/parse.ts:24 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/parse.ts:24:63` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:4371 / <callback>/makeDialog/SettingsDialog` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5407:22` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/chat/dialog.ts:128 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/dialog.ts:128:12` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:5407 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5407:22` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/config.ts:11 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/config.ts:11:43` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:5407 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5407:22` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/display-hotkey.ts:13 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/display-hotkey.ts:13:30` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:5407 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5407:22` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/menu/tree.ts:22 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:22:62` | `<module>` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:5407 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5407:22` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/menu/tree.ts:50 / readMenuItems` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:50:55` | `readMenuItems` | `union` | `vendor/dsh-pet/platform/upstream/client.js:5407 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5407:22` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/state.ts:193 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:193:27` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:5407 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5407:22` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/types.ts:20 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/types.ts:20:26` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:5407 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5446:17` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/motion.ts:82 / anchorPixel` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/motion.ts:82:3` | `anchorPixel` | `switch` | `vendor/dsh-pet/platform/upstream/client.js:5446 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5446:17` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/types.ts:9 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/types.ts:9:22` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:5446 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5618:15` | `<callback>/makePetCard/PetCard` | `labels` | `vendor/dsh-pet/src/shared/balance/parse.ts:24 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/parse.ts:24:63` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:5618 / <callback>/makePetCard/PetCard` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5699:21` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/chat/image-pick.ts:8 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/image-pick.ts:8:28` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:5699 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:5707:19` | `<callback>` | `labels` | `vendor/dsh-pet/src/shared/chat/image-pick.ts:17 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/image-pick.ts:17:54` | `<module>` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:5707 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:10145:25` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/score-popup.ts:13 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/score-popup.ts:13:32` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:10145 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:10182:22` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/score-popup.ts:55 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/score-popup.ts:55:22` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:10182 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:11127:20` | `<callback>` | `labels` | `vendor/dsh-pet/src/shared/chat/icons.ts:8 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/icons.ts:8:20` | `<module>` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:11127 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:11148:29` | `<callback>/pictureIcon` | `labels` | `vendor/dsh-pet/src/shared/chat/icons.ts:33 / pictureIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/icons.ts:33:21` | `pictureIcon` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:11148 / <callback>/pictureIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:11148:29` | `<callback>/pictureIcon` | `labels` | `vendor/dsh-pet/src/shared/chat/icons.ts:49 / micIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/icons.ts:49:21` | `micIcon` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:11148 / <callback>/pictureIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:11154:24` | `<callback>/pictureIcon` | `labels` | `vendor/dsh-pet/src/shared/chat/icons.ts:34 / pictureIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/icons.ts:34:23` | `pictureIcon` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:11154 / <callback>/pictureIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:11154:24` | `<callback>/pictureIcon` | `labels` | `vendor/dsh-pet/src/shared/chat/icons.ts:67 / cameraIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/icons.ts:67:23` | `cameraIcon` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:11154 / <callback>/pictureIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:11168:29` | `<callback>/micIcon` | `labels` | `vendor/dsh-pet/src/shared/chat/icons.ts:33 / pictureIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/icons.ts:33:21` | `pictureIcon` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:11168 / <callback>/micIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:11168:29` | `<callback>/micIcon` | `labels` | `vendor/dsh-pet/src/shared/chat/icons.ts:49 / micIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/icons.ts:49:21` | `micIcon` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:11168 / <callback>/micIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:11184:140` | `<callback>/cameraIcon` | `labels` | `vendor/dsh-pet/src/shared/chat/icons.ts:34 / pictureIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/icons.ts:34:23` | `pictureIcon` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:11184 / <callback>/cameraIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:11184:140` | `<callback>/cameraIcon` | `labels` | `vendor/dsh-pet/src/shared/chat/icons.ts:67 / cameraIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/icons.ts:67:23` | `cameraIcon` | `labels` | `vendor/dsh-pet/platform/upstream/client.js:11184 / <callback>/cameraIcon` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:11194:18` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/chat/styles.ts:11 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/styles.ts:11:25` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:11194 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:13527:23` | `<callback>` | `array` | `vendor/dsh-pet/src/shared/work-status.ts:10 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/work-status.ts:10:35` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:13527 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:13662:5` | `<callback>/createPetMulti/PetMulti/useEffect:callback0/applySection` | `switch` | `vendor/dsh-pet/src/shared/state.ts:117 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:117:31` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:13662 / <callback>/createPetMulti/PetMulti/useEffect:callback0/applySection` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:13662:5` | `<callback>/createPetMulti/PetMulti/useEffect:callback0/applySection` | `switch` | `vendor/dsh-pet/src/shared/state.ts:127 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:127:28` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:13662 / <callback>/createPetMulti/PetMulti/useEffect:callback0/applySection` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:13694:5` | `<callback>/createPetMulti/PetMulti/useEffect:callback0/applyPetLeaf` | `switch` | `vendor/dsh-pet/src/shared/state.ts:120 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:120:27` | `<module>` | `union` | `vendor/dsh-pet/platform/upstream/client.js:13694 / <callback>/createPetMulti/PetMulti/useEffect:callback0/applyPetLeaf` | 重复 | 第 2 条 |
| `vendor/dsh-pet/platform/upstream/client.js:13694:5` | `<callback>/createPetMulti/PetMulti/useEffect:callback0/applyPetLeaf` | `switch` | `vendor/dsh-pet/src/shared/state.ts:130 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:130:24` | `<module>` | `array` | `vendor/dsh-pet/platform/upstream/client.js:13694 / <callback>/createPetMulti/PetMulti/useEffect:callback0/applyPetLeaf` | 重复 | 第 2 条 |
| `vendor/dsh-pet/runtime/electron-helper/sprite/menu.js:11:20` | `<module>` | `labels` | `vendor/dsh-pet/src/shared/chat/dialog.ts:128 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/dialog.ts:128:12` | `<module>` | `union` | `vendor/dsh-pet/runtime/electron-helper/sprite/menu.js:11 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/runtime/electron-helper/sprite/menu.js:11:20` | `<module>` | `labels` | `vendor/dsh-pet/src/shared/menu/tree.ts:50 / readMenuItems` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:50:55` | `readMenuItems` | `union` | `vendor/dsh-pet/runtime/electron-helper/sprite/menu.js:11 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/runtime/electron-helper/sprite/menu.js:11:20` | `<module>` | `labels` | `vendor/dsh-pet/src/shared/state.ts:193 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:193:27` | `<module>` | `union` | `vendor/dsh-pet/runtime/electron-helper/sprite/menu.js:11 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/client/pet/animation/animation.ts:53:17` | `<callback>` | `union` | `vendor/dsh-pet/src/shared/physics/contact.ts:11 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/physics/contact.ts:11:27` | `<module>` | `union` | `vendor/dsh-pet/src/client/pet/animation/animation.ts:53 / <callback>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/client/pet/animation/animation.ts:53:17` | `<callback>` | `union` | `vendor/dsh-pet/src/shared/state.ts:235 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:235:25` | `<module>` | `union` | `vendor/dsh-pet/src/client/pet/animation/animation.ts:53 / <callback>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/handlers/windows.ts:58:20` | `urgentWindow` | `array` | `vendor/dsh-pet/src/shared/balance/types.ts:181 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/types.ts:181:25` | `<module>` | `union` | `vendor/dsh-pet/src/shared/balance/handlers/windows.ts:58 / urgentWindow` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/handlers/windows.ts:136:19` | `windowsDetail` | `array` | `vendor/dsh-pet/src/shared/balance/types.ts:181 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/types.ts:181:25` | `<module>` | `union` | `vendor/dsh-pet/src/shared/balance/handlers/windows.ts:136 / windowsDetail` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/parse.ts:16:50` | `<module>` | `array` | `vendor/dsh-pet/src/shared/balance/types.ts:30 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/balance/types.ts:30:25` | `<module>` | `union` | `vendor/dsh-pet/src/shared/balance/parse.ts:16 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/dialog.ts:128:12` | `<module>` | `union` | `vendor/dsh-pet/src/shared/config.ts:11 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/config.ts:11:43` | `<module>` | `array` | `vendor/dsh-pet/src/shared/chat/dialog.ts:128 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/dialog.ts:128:12` | `<module>` | `union` | `vendor/dsh-pet/src/shared/display-hotkey.ts:13 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/display-hotkey.ts:13:30` | `<module>` | `array` | `vendor/dsh-pet/src/shared/chat/dialog.ts:128 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/dialog.ts:128:12` | `<module>` | `union` | `vendor/dsh-pet/src/shared/menu/tree.ts:22 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:22:62` | `<module>` | `labels` | `vendor/dsh-pet/src/shared/chat/dialog.ts:128 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/dialog.ts:128:12` | `<module>` | `union` | `vendor/dsh-pet/src/shared/menu/tree.ts:50 / readMenuItems` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:50:55` | `readMenuItems` | `union` | `vendor/dsh-pet/src/shared/chat/dialog.ts:128 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/dialog.ts:128:12` | `<module>` | `union` | `vendor/dsh-pet/src/shared/state.ts:193 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:193:27` | `<module>` | `union` | `vendor/dsh-pet/src/shared/chat/dialog.ts:128 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/dialog.ts:128:12` | `<module>` | `union` | `vendor/dsh-pet/src/shared/types.ts:20 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/types.ts:20:26` | `<module>` | `union` | `vendor/dsh-pet/src/shared/chat/dialog.ts:128 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/send.ts:16:26` | `<module>` | `union` | `vendor/dsh-pet/src/shared/whisper.ts:13 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/whisper.ts:13:26` | `<module>` | `union` | `vendor/dsh-pet/src/shared/chat/send.ts:16 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/config.ts:11:43` | `<module>` | `array` | `vendor/dsh-pet/src/shared/display-hotkey.ts:13 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/display-hotkey.ts:13:30` | `<module>` | `array` | `vendor/dsh-pet/src/shared/config.ts:11 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/config.ts:11:43` | `<module>` | `array` | `vendor/dsh-pet/src/shared/menu/tree.ts:22 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:22:62` | `<module>` | `labels` | `vendor/dsh-pet/src/shared/config.ts:11 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/config.ts:11:43` | `<module>` | `array` | `vendor/dsh-pet/src/shared/menu/tree.ts:50 / readMenuItems` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:50:55` | `readMenuItems` | `union` | `vendor/dsh-pet/src/shared/config.ts:11 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/config.ts:11:43` | `<module>` | `array` | `vendor/dsh-pet/src/shared/state.ts:193 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:193:27` | `<module>` | `union` | `vendor/dsh-pet/src/shared/config.ts:11 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/config.ts:11:43` | `<module>` | `array` | `vendor/dsh-pet/src/shared/types.ts:20 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/types.ts:20:26` | `<module>` | `union` | `vendor/dsh-pet/src/shared/config.ts:11 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/display-hotkey.ts:13:30` | `<module>` | `array` | `vendor/dsh-pet/src/shared/menu/tree.ts:22 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:22:62` | `<module>` | `labels` | `vendor/dsh-pet/src/shared/display-hotkey.ts:13 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/display-hotkey.ts:13:30` | `<module>` | `array` | `vendor/dsh-pet/src/shared/menu/tree.ts:50 / readMenuItems` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:50:55` | `readMenuItems` | `union` | `vendor/dsh-pet/src/shared/display-hotkey.ts:13 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/display-hotkey.ts:13:30` | `<module>` | `array` | `vendor/dsh-pet/src/shared/state.ts:193 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:193:27` | `<module>` | `union` | `vendor/dsh-pet/src/shared/display-hotkey.ts:13 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/display-hotkey.ts:13:30` | `<module>` | `array` | `vendor/dsh-pet/src/shared/types.ts:20 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/types.ts:20:26` | `<module>` | `union` | `vendor/dsh-pet/src/shared/display-hotkey.ts:13 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:15:50` | `<module>` | `array` | `vendor/dsh-pet/src/shared/menu/types.ts:20 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/types.ts:20:5` | `<module>` | `union` | `vendor/dsh-pet/src/shared/menu/tree.ts:15 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:22:62` | `<module>` | `labels` | `vendor/dsh-pet/src/shared/state.ts:193 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:193:27` | `<module>` | `union` | `vendor/dsh-pet/src/shared/menu/tree.ts:22 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:22:62` | `<module>` | `labels` | `vendor/dsh-pet/src/shared/types.ts:20 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/types.ts:20:26` | `<module>` | `union` | `vendor/dsh-pet/src/shared/menu/tree.ts:22 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:50:55` | `readMenuItems` | `union` | `vendor/dsh-pet/src/shared/state.ts:193 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:193:27` | `<module>` | `union` | `vendor/dsh-pet/src/shared/menu/tree.ts:50 / readMenuItems` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/menu/tree.ts:50:55` | `readMenuItems` | `union` | `vendor/dsh-pet/src/shared/types.ts:20 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/types.ts:20:26` | `<module>` | `union` | `vendor/dsh-pet/src/shared/menu/tree.ts:50 / readMenuItems` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/motion.ts:82:3` | `anchorPixel` | `switch` | `vendor/dsh-pet/src/shared/types.ts:9 / <module>` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/types.ts:9:22` | `<module>` | `union` | `vendor/dsh-pet/src/shared/motion.ts:82 / anchorPixel` | 重复 | 第 2 条 |
| `vendor/dsh-pet/src/shared/physics/contact.ts:11:27` | `<module>` | `union` | `vendor/dsh-pet/src/shared/state.ts:235 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:235:25` | `<module>` | `union` | `vendor/dsh-pet/src/shared/physics/contact.ts:11 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/pickers.ts:77:24` | `<module>` | `union` | `vendor/dsh-pet/src/shared/weights.ts:9 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/weights.ts:9:28` | `<module>` | `array` | `vendor/dsh-pet/src/shared/pickers.ts:77 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/state.ts:193:27` | `<module>` | `union` | `vendor/dsh-pet/src/shared/types.ts:20 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/types.ts:20:26` | `<module>` | `union` | `vendor/dsh-pet/src/shared/state.ts:193 / <module>` | 子集 | 第 2 条 |
| `vendor/dsh-pet/src/shared/chat/image-pick.ts:71:32` | `<module>` | `bare string` | `kind` | 裸 string | 第 2 条 |
| `vendor/dsh-pet/src/shared/notify.ts:44:3` | `<module>` | `bare string` | `type` | 裸 string | 第 2 条 |

`writers.json` 由 `scan()` 重生成后与返工前逐字节相同：324 条调用无新增、无消失，65 条违规、109 条一致、150 条未知；未改变建议修 4–5 的 R5 规则。

</details>

### B 批（已合并）
- 本轮文件：`tests/behavior-list/families.test.mjs` 修 B07 本地时间和 B17 生命周期验证；`fixture.mjs` 删除绕过生命周期的卸载入口、说明合成存档预置依赖。
- `entries.ts` 集中读取 hear control 源码并移除未使用的 `createCore` 导出；`domains.test.mjs` 删除离线额度测试中被忽略的第三个参数并修正注释。本文件只回填 B 批执行结果及六条审查项的「已修」说明。
- B07 修前已在 `TZ=UTC` 复现「自主回顾到达原生入口」失败；修后用仅含 B07 的临时索引交给 `node scripts/checks/run-behavior-list.mjs <临时索引>`，在 `TZ=UTC`、`TZ=Asia/Ho_Chi_Minh`、`TZ=America/Los_Angeles` 下分别 1 通过、0 失败。
- B17 单项正常运行 1 通过、0 失败；临时注释 `src/voice/plugin.ts:71` 的 effect 清理并重新编译后，1 失败、0 通过，失败在「插件卸载必须经 effect 取消在途识别」，退出码 1。
- 故障注入后立即逐字节恢复源码并重新编译；最终 B17 通过，`git diff --stat -- src` 为空。B17 的 hear control 源码读取只经 `entries.ts`，测试沿用 vm 夹具。
- 最终命令 `pnpm run build && pnpm run test:behavior-list`：build 通过；索引/runner 自测 10 通过、0 失败；行为条目 15 通过、1 失败，无跳过；命令退出码 1。
- 唯一失败 B10：真实 Memory 子进程 `readiness timeout/exit`；`src/memory/main.py` 仅绑定 `127.0.0.1`，用 `.venv/bin/python` 实测 `socket.bind(('127.0.0.1', 0))` 被沙箱拒绝，`PermissionError: [Errno 1] Operation not permitted`。按环境问题保留失败，未跳过或替换真实 provider，待允许回环的环境复验。
- 未运行全量门禁；未安装依赖、联网、启动或更新 DSH、调用付费模型、读取真实数据。除已恢复的临时故障注入外，未改 `src/`、`vendor/`、其他测试、`package.json` 或生成文件。
- Claude 复查时在允许回环的本机重跑：`pnpm run build && pnpm run test:behavior-list` 自测 10/10、行为条目 16/16，B10 通过。
- 保留原有审查文本；本轮共 5 个文件，交 Claude 以一个提交验收提交。未运行 `git add/commit/stash/reset/checkout`，未推送或合并；主人验收另行完成。

## 审查结论

### A 批（第一轮，审查基于 `4071d60`）

两层审查：Codex `codex exec review --base main`（只读）＋ Claude 核实。所有条目都在临时副本里复现过，不是只读推断。已经通过的：快测 24/24、`check:arch`、`pnpm run verify`（1180/1180）、一次性验收表 45 个位置、`storage.json` 50 条依据逐行核对、Core「删一处旧违规、在另一个函数加一处」会失败、挪行号或改格式不误报。

**必须修**

1. **R8 条目身份含集合取值和整段表达式，改动已有重复集合的内容就再也过不了门禁。**`scripts/arch/lib/ast.mjs:53` 把 `normalize(node)` 记作 `expression`，`scripts/arch/lib/vocabulary.mjs:60` 又把 `values` 和对方的 `expression` 写进 `target`，而 `scripts/arch/lib/ratchet.mjs:6` 的身份包含这两项。实测：
   - 把 `src/behavior/presentation.ts:7` 标签表里的 `calm:'平静'` 改成 `'安静'`，结果新增 8 条、消失 8 条；
   - 给 `src/core/workspace.ts:40` 的状态联合加一个值，结果新增 2 条、消失 2 条。

   两种情况 `check:arch` 都失败，`--write-baseline` 又拒绝新增，所以没有正当出路，只能改脚本或手改基线。这种改文案、加状态值的日常改动会被永久挡住。

   修法：R8 重复关系的身份改成「规则 + 本方文件 + 本方函数路径 + 形状 + 对方文件 + 对方函数路径 + 关系」，不含取值和表达式正文。裸 string 条目保持「文件 + 函数路径 + 字段名」。新出现一对重复照样会被抓到；同一函数里多出一份，按计数抓到。加两条测试：改已有重复集合的取值或标签文案不失败；新增一对重复仍失败。

   已修：R8 重复关系按双方文件、函数路径、本方形状和关系计身份；裸 string 按文件、函数路径、字段名计身份，取值和表达式只保留诊断用途。新增回归先复现失败，修后改状态取值和标签文案可通过，新增重复对及同函数多一份仍阻断。
2. **扫描范围把 `vendor/` 上游代码带了进去。**`arch/layers.json:95-101` 的生成源列了大量 `vendor/dsh-pet/**`，`scripts/arch/lib/scan.mjs:27-30` 把它们全部加进扫描，`scripts/arch/lib/rules.mjs:9` 再把它们归到 `desktop`。后果：
   - `vocabulary.json` 1381 条里有 306 条涉及 vendor，其中 206 条两边都是 vendor，包括 CSS 字符串、星期、SVG 属性；
   - `rules.json` 有 2 条 R2 误报：`vendor/dsh-pet/platform/upstream/client.js:14977,15113`，读的是上游打包文件自己的服务 `petApi7340`。

   上游同步属于 AGENTS 允许的流程，但一旦改出新身份就会被门禁卡死，而且同样无法收紧基线。方案里写了「R1 不检查 vendor」、「上游代码按层分配是阶段 2、3 的事」，拍板点 7 想管住的是我们自己的生成逻辑。

   修法：收集生成源时跳过 `vendor/`，生成脚本和 `src/` 下的生成源照扫；`--report` 的「跳过」一行另列被跳过的 vendor 生成源。（这是对拍板点 7「生成源要扫描」的收窄：vendor 里的生成源不扫，主人 2026-11-17 已确认。）

   已修：收集生成源时排除 `vendor/`，保留声明用于来源追踪；`--report` 单列去重后的 97 个被跳过的 vendor 生成源，自有生成脚本和 `src/` 生成源继续扫描。合成夹具确认 vendor 内容改变不影响门禁，自有生成源仍受 R1、R8 检查。
3. **「判不出就报无法静态判定」没有兑现，有几种等价写法能零报告绕过。**下面四条都用最小样例在副本里实测过，零报告通过：
   - `scripts/arch/lib/ast.mjs:80-86`：模板插值判不出时变成 `*`，调用方却把它当成已解析的字符串。于是 `ctx.get(`${name}`)` 被 R2 当作「不是 pet 服务」忽略；`import(`${base}/life/plugin.js`)` 被 R1 当作外部包跳过。
   - `scripts/arch/lib/rules.mjs:52-55`：不处理内联类型导入 `ImportTypeNode`，所以 `type T = import('../life/plugin.js').X` 不报，而等价的 `import type` 会报。**现有代码就有漏报**：`src/console/settings.ts:67-68` 通过内联 `import()` 类型依赖了 `channels/plugin.js` 和 `desktop/platform/plugin.js`。
   - `scripts/arch/lib/ast.mjs:68` 的 `key()` 不认 `ComputedPropertyName`，所以 `const k='petLife'; const {[k]:life}=ctx` 不报。

   修法：
   - 字符串解析要带上「是否完整」的信息，含 `*` 的服务名、本地依赖、事件名一律报「无法静态判定」；
   - 内联类型导入走同一个依赖解析器；
   - 解构里的计算属性名用 `strings()` 解析，解析不出就报「无法静态判定」；
   - 每种写法在 `scripts/arch/fixtures/known-violations/` 加最小样例，并在 `tests/arch/known-violations.test.mjs` 断言。

   已修：字符串解析增加 `stringResult()` 的完整性标记，并沿模板、拼接和别名传递；R1–R3 对不完整名字报告无法静态判定。内联类型导入复用同一依赖解析器；计算解构按字符串解析计算键，未知键明示未知。新增 `core/resolution.ts` 最小样例和逐位置断言，保留完整模板与合法计算解构的零误报检查。

**建议修（不阻塞合并，可以顺带做）**

4. `scripts/arch/lib/storage.mjs:28-35`：R5 只解析第一个参数，但 `rename*`、`copyFile*` 的写入目标是第二个参数。原子写会被报成临时文件，150 条「无法静态判定」里有 13 条和它有关。建议按操作语义分别记来源和目标。

   未修：主人限定本轮只修必须修 1–3，R5 参数语义不在本轮范围。
5. R5 把未登记的 CoreStore kind 默认归给 `core`（`scripts/arch/lib/storage.mjs:60`），Core 写一个未登记的 kind 会显示「一致」。建议改成「未登记」。现在有「逐 kind 对上 store.put」测试兜底，所以不急。

   未修：主人限定本轮只修必须修 1–3，未登记 kind 的报告策略不在本轮范围。
6. R8 在 `src/` 里仍有非业务集合，例如 `http:|https:`、`127.0.0.1|[::1]|localhost`、`GET|HEAD`、`__proto__|constructor|prototype`、文件后缀和路径片段数组。第 1 条修好后，已有的这些集合可以照常修改，剩下的影响只是：新代码再写出同样的集合会被拦，要按方案「真误报就修脚本」处理。是否现在就加过滤规则（例如路径片段数组、对象标签表只收 `Record<联合类型, string>`）由主人决定，不阻塞 A。

   未修：主人明确排除建议修 4–7，本轮保留现有 R8 集合收集口径。
7. Console 读写其他第三层模块的 9 条（R1 5 条、R2 4 条）现在算基线条目，符合「已知违规只登记」。建议 E 批的度量表把它们单独列一行，标明「等运维操作表」，免得和真正的方向违规混在一起计数。

   未修：主人明确排除建议修 4–7，E 批度量表未开始。

**返工注意**

- 第 2、3 条会改变扫描结果：第 2 条删掉 vendor 条目，第 3 条新增 `console/settings.ts` 等旧违规。A 还没合并，基线在返工里**直接用 `scan()` 重新生成**，和最初建基线的方式相同。在执行结果里逐条列出新增和消失的条目及原因。合并之后才执行只减不增。
- 第 1 条改了 R8 身份，`vocabulary.json` 要整份重新生成；条目数（关系数）应当不变或只因第 2 条减少。
- 返工后 `codex/m1-c-migration`（建在 `4071d60` 上）需要变基。

### A 批复查（第二轮）

第 2、3 条已确认修好。在隔离副本里复现过：模板插值、动态 import、内联 `import()` 类型、计算属性解构这四种写法全部报出；改 vendor 不影响门禁；新写 `'left'|'right'` 不再被拦；Core 违规换位置照样失败。第 1 条只修好一半：改标签文案已经能通过，**但给原本完全重复的集合加一个值仍然失败**，下面一条必须修。

**必须修**

8. **R8 身份不能含「关系」。**`scripts/arch/lib/ratchet.mjs:8` 把 `item.relation` 算进了身份。给 `src/core/workspace.ts:40` 的状态联合加一个 `'paused'` 后，它和 `src/console/client.js` 标签表的关系从「重复」变成「子集」，身份跟着变，结果新增 2 条、消失 2 条，`--write-baseline` 拒绝写入，又一次没有正当出路。这一条出在第一轮审查给的修法里，公式写了「+ 关系」，Codex 是照着做的。

   修法：身份去掉 `relation`，保留「规则 + 本方文件 + 本方函数路径 + 形状 + 对方文件 + 对方函数路径」。基线存的是条目，身份在比对时现算，所以 `vocabulary.json` 不用重新生成。在 `tests/arch/ratchet.test.mjs` 加一条测试：两个文件里原本完全相同的集合，一方加一个值、变成子集后，`check:arch` 仍然通过。

   已修：`scripts/arch/lib/ratchet.mjs` 仅从 R8 重复关系的身份中移除 `relation`，关系仍保留作报告信息；`tests/arch/ratchet.test.mjs` 新增完全重复的状态联合与标签表单方加值变成子集的回归，确认修前新增 2/消失 2 而失败、修后检查通过且基线字节不变。现有新增重复对和同函数增加重复的阻断测试仍通过；未重生成基线。

### B 批（第一轮，审查基于 `c62930a`）

两层审查：Codex `codex exec review --base main`（只读，命令不接受同时带自定义说明，按默认口径跑）＋ Claude 核实。已经通过的：

- 快测：build 通过，自测 10/10，行为条目 16/16。
- 门禁：`pnpm run verify` 1211/1211。
- 范围：4 个提交共 11 个文件，都在允许修改的范围内，每个提交都没超阈值。
- 运行脚本：把 B16 的名字改错，以退出码 1 失败；skip、todo、取消、零匹配、重复执行、嵌套冒充、suite 和加载失败都有反例自测。
- 分级：测试只调用 `petX` 服务的公开成员（`restState`、`inspectPlanned`、`pendingFacts`、`memory.connection` 等都是公开成员）。B03 在文件系统边界移走钱包库，没有用触发器。
- 4 个家族都从插件入口或原生工具进入，都经过落盘、查询和重启。

**必须修**

1. **B07 依赖本机时区，CI 上必然失败。**`tests/behavior-list/families.test.mjs:61-66` 用 `2026-11-15T15:59Z` 加 61 秒去越过本地 `23:00` 的回顾时间，只有在 UTC+7 才成立。本机正好是 UTC+7，所以本地全绿。在 `TZ=UTC` 和 `TZ=America/Los_Angeles` 下复现过：B07 失败在「自主回顾到达原生入口」，其余 15 条都通过。`.github/workflows/ci.yml:16` 跑 `pnpm run verify` 时没有设 `TZ`，而 verify 会自动收集这个文件，合并后 CI 和发版流程都会红。

   修法：按宿主本地时间构造「回顾前一分钟」的假时间（例如用本地日期加 `22:59` 换算出 `now`），不要靠固定 UTC 时刻。也可以在测试里固定时区，但前提是 Life 读到的时区来自可注入的边界，不能改 `process.env.TZ` 去影响同进程的其他测试。验收：B07 在 `TZ=UTC`、`TZ=Asia/Ho_Chi_Minh`、`TZ=America/Los_Angeles` 下都通过。

   已修：`families.test.mjs` 用宿主本地 `2026-11-15 22:59` 构造假时间，不修改 `process.env.TZ`。修前 `TZ=UTC` 单项复现失败；修后用仅含 B07 的临时索引交给 `scripts/checks/run-behavior-list.mjs`，`TZ=UTC`、`TZ=Asia/Ho_Chi_Minh`、`TZ=America/Los_Angeles` 各 1 通过、0 失败，最终行为清单中的 B07 也通过。

2. **B17 没有真正守住「插件关闭会取消识别」。**`families.test.mjs:113` 先调用 `second.dispose()`。呈现端的 hear control 关闭时，本身就会中止传给识别器的 signal（已有的 `tests/regressions/audit-r7-pet-hear.test.mjs` 就是这么断言的），所以执行到 `captured.aborted` 时它早已是 true。而 `fixture.mjs:157` 的 `unloadVoice()` 直接调用 `release()`，没走插件在 `src/voice/plugin.ts:71` 用 `ctx.effect` 注册的清理。结果是删掉插件的卸载清理，这条测试照样通过。家族要求的是「关闭后晚到的录音与取消」，现在这条只守住了界面关闭那一半。

   修法：把界面关闭和插件卸载分开测。识别请求还在途时（不先 `dispose()` 控件），经假宿主执行插件注册的 effect 清理（例如让夹具单独停掉语音插件的 effect，或者走 `f.restart()` 的关闭阶段），再断言 signal 已中止、晚到结果不写入输入框。删掉夹具里绕过生命周期的 `unloadVoice()`。验收：临时注释掉 `src/voice/plugin.ts:71`，B17 必须失败（不提交）。

   已修：`families.test.mjs` 分别实测控件关闭和插件卸载；新增识别在途且控件存活时的 `f.restart()`，由假宿主执行插件注册的 effect，再断言 signal 中止、晚到结果不写输入框或持久化日志；删除 `fixture.mjs` 的 `unloadVoice()`。B17 正常单项 1 通过、0 失败；临时注释 `src/voice/plugin.ts:71` 并重新编译后，1 失败、0 通过，退出码 1，明确失败在「插件卸载必须经 effect 取消在途识别」。测后立即逐字节恢复源码并重新编译，`git diff --stat -- src` 为空，最终行为清单中的 B17 通过。

3. **B17 绕过 `entries.ts` 直接读 `src/`。**`families.test.mjs:98` 用 `readFileSync('src/desktop/platform/client.js')` 抽取 `createHearControl`。方案要求新测试对 `src/` 的引用全部集中在 `tests/behavior-list/entries.ts`，以后重写时只改这一个文件；这里换成读源码文本，效果上一样是引用，呈现端搬家时就得来改测试本身。

   修法：在 `entries.ts` 里导出 hear control 的载体，也就是源码路径或一个读取函数（注意 `entries.ts` 编译后在 `dist/tests/behavior-list/`，路径要相对编译产物来解析），测试只从这里取。抽取方式沿用 audit-r7 的 vm 夹具，这是方案指定的复用，不算违反分级。

   已修：`entries.ts` 新增 `readHearControlSource()`，按编译产物 `dist/tests/behavior-list/entries.js` 的位置解析源码路径，B17 只调用此导出，保留 vm 抽取方式。`rg` 核对 `tests/behavior-list/` 中 hear control 源码路径仅存在于 `entries.ts`；重新编译、B17 单项及最终行为清单中的 B17 均通过。

**建议修（不影响合并）**

- `fixture.mjs:93-99` 用 vendor 的 `emptyHomeState`、`createGarden` 手写初始的 `home.json`、`garden.json`，没有走身体模块的初始化。写数据文件属于允许的外部面，但这是一份手调的状态（需求值、关闭自动照料），建议注释写明为什么要预置、哪些字段是测试依赖的。

  已修：`fixture.mjs` 说明基于上游默认结构预置非睡眠、无在途动作的合成起点，needs 用于投喂和离线额度断言，关闭菜园自动照料以固定种植驱动；未改预置值。最终行为清单中依赖这些状态的 B03、B04、B05、B06 均通过。
- `domains.test.mjs:63,65` 的 `setAutonomy('world',true,true)` 传了第三个参数，但 `src/behavior/plugin.ts:290` 只接两个，第三个被忽略。:61 的注释暗示是它触发了离线额度，实际上起作用的是持久化的花园时钟状态（`src/behavior/room.ts:229-231`）。建议去掉第三个参数并改准注释。

  已修：`domains.test.mjs` 两处 `setAutonomy` 均只传两个参数，注释说明持久化花园时钟启用状态是重启恢复离线额度的依据；最终 B06 通过，仍验证 72 小时停机只扣默认 4 小时、再次重启不重复扣。
- `entries.ts:2` 导出了 `createCore`，但行为清单的测试都没有用到。建议删掉，或者在用到时再加。

  已修：删除 `entries.ts` 未使用的 `createCore` 导出；检索确认行为清单内无该引用，TypeScript 编译和最终 build 通过。最终索引自测 10 通过、0 失败，行为条目 15 通过、1 失败；唯一失败 B10 为本机回环受沙箱拒绝的环境问题，与本项无关。

**返工注意**

- 只改 `tests/behavior-list/**` 和本节；不改 `src/`。
- 返工后在执行结果里写明三种时区下 B07 的结果，以及「注释掉 `plugin.ts:71` 后 B17 失败」的实测。
- C 批合并后，B 还要变基一次（`package.json` 的 `scripts` 和方案的执行结果两处，按两边都保留解决）。

### B 批复查（第二轮）

三条必须修都已确认修好，三条建议修也做了。Claude 在 B 的 worktree 里实测：

- B07：`TZ=UTC`、`TZ=Asia/Ho_Chi_Minh`、`TZ=America/Los_Angeles` 下各跑一次，都通过。
- B17：临时注释掉 `src/voice/plugin.ts:71` 的 effect 清理，重新编译后显示「执行 1 次，通过 0 次」；恢复后 `git diff --stat -- src` 为空。
- B17 读 hear control 源码只经 `entries.ts` 的 `readHearControlSource()`。
- 快测：build 通过，自测 10/10，行为条目 16/16（本机允许回环，B10 通过）。

没有新的必须修。
