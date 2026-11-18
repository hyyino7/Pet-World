# Her World 架构

这里写三层重构的目标结构和现状基线。阶段安排和完成标准见 [product.md](product.md)，拍板过的取舍见 [decisions.md](decisions.md)。

- 现状说法的基线是 Her World 0.1.8（提交 `0a45ada`）。
- 代码路径默认相对 `src/`；`scripts/`、`tests/`、`vendor/` 下的文件写全路径。
- 目录：阶段 1 缩小后（[decisions.md](decisions.md)「阶段 1 缩小」），第一层、第三层保留现有目录（`src/core/`、`src/room/` 等），只有第二层合并时新建目录，名字在 2a 方案里定。下面总览里的 `kernel / living / surface` 只是层的代号，不是目录。

---

## 0. 一页总览

```
        你（桌宠 / Room / QQ / 微信 / 语音 / 设置页）
                       │
┌──────────────────────▼─────────────────────────────┐
│ 第三层  呈现与连接  surface/                       │
│   Desktop·PetPlatform   Room   Channels   Voice   Console │
│   只往下依赖，同层不互相引用；只存自己的数据          │
└──────────────────────┬─────────────────────────────┘
        向下：调用（读快照、发命令） │ 向上：事件、登记
┌──────────────────────▼─────────────────────────────┐
│ 第二层  生活世界  living/                          │
│   身体 · 计划与回顾 · 钱包背包菜园阅读                  │
│   一个实例；内部直接调用                             │
└──────────────────────┬─────────────────────────────┘
        向下：调用            │ 向上：事件、登记
┌──────────────────────▼─────────────────────────────┐
│ 第一层  伙伴本体  kernel/                          │
│   身份与绑定 · DSH 聊天接缝 · 记忆 · 情绪 · 记录库       │
│   登记口：来源适配 · 能力状态 · 工具声明 · 初始化 · 运维操作      │
└────────────────────────────────────────────────────┘
                    DSH（聊天、调度、会话日志）
```

**一条总规则：向下用调用，向上用事件和登记。** 底层绝不主动去找上层要东西，也不订阅上层的事件。例如记忆不订阅生活世界的回顾事件，而是生活世界在回顾完成时**向下调用**记忆服务。

---

## 1. 外部能看到什么变化

- **主人看到的**：功能、界面、数据位置、DSH 里的插件名和更新按钮都不变，重构完应该和 0.1.8 用起来一样。
- **开发者看到的**：目录按三层重排；多一组自动检查；多一份状态拥有者表；多一套带版本号的迁移与回退流程。
- **这次不做**：新功能、换 DSH 插件体系、拆多个包。

---

## 2. 三层和模块

### 2.1 现在 → 以后

| 现在的目录 | 行数（不含上游生成文件） | 去哪里 | 说明 |
| --- | ---: | --- | --- |
| `core/` | 3370 | 第一层 | 目录不改；剩余的向上读取和 import 按 [product.md](product.md)「第一层剩余违规的去向」在 2a、阶段 3 清，另有 4 条长期例外 |
| `memory/` | 966 | 第一层 | 记忆的创建和关闭归第一层 |
| `emotion/` | 698 | 第一层 | 含近期互动账本 |
| `contracts/` | 268 | 拆成三份，各层一份 | 接口跟着拥有者走 |
| `behavior/` + `life/` + `economy/` | 6430 | 第二层 | 合并成一个实例，见 2.3 与第 6 节 |
| `desktop/` | 21380（大头是生成文件） | 第三层 | 生成文件改生成器，不手改 |
| `room/` | 989 | 第三层 | 不再引用 `desktop/images` |
| `channels/` | 1818 | 第三层 | 不再往 Core 数据库的 `records` 表写自己的记录 |
| `voice/` | 71 | 第三层 | 通过第一层声明的「语音接口」使用，见 5.4 |
| `console/` | 1674 | 第三层 | 通过「运维操作表」操作其他模块，见 5.5 |
| `world/` | 74 | 按调用者分到三层 | 它转发 `vendor/dsh-world`，还转发本地的记忆批处理；`petWorld.modules` 的公开形状必须保持不变 |

### 2.2 第一层「伙伴本体」管什么

1. **身份与绑定**：伙伴 ID、绑定的资料目录、存储清单、`core.json`；**共享 home 会话的身份记录**（前台打开 home 不要求自主生活启用，所以这条记录不能放在可卸载的生活入口里）。
2. **与 DSH 原生聊天的接缝**：现在的 `core/native/`。
3. **记忆**：Mnemosyne 引擎整体复用，创建、关闭、绑定校验都归本层。
4. **情绪**：状态文件和近期互动账本。
5. **记录库**：自述、历史、日记、相册。
6. **登记口**（本层提供，上层登记）：

| 表 | 作用 | 现状（M2 后） |
| --- | --- | --- |
| **初始化登记** | 各模块登记自己的初始化动作和清单里的文件 | 已有 `registerInitializer`（`core/workspace.ts:183-187`），Economy、Memory Bank、近期账本在用。Core 写死的 13 个目录、桌宠配置、Life 控制文件、情绪文件（`core/initialization.ts:8-10,67-79`）**不再改成登记**：显式初始化时一次建好、启动时一起校验，避免部分加载语义（阶段 1 缩小）；`initialization.ts` 的两条 R1 是长期例外 |
| **提示词与历史投影** | 各模块登记提示词片段；工具结果在历史里怎么瘦身 | 历史瘦身已由工具声明的 `historyOverview` 派生（`core/tables/tools.ts`），Core 不再 import 各模块的投影函数。提示词片段继续用 `registerWorldPrompt`（`core/native/prompt.ts:91`）在模块入口登记，动态段退休照旧（`prompt.ts:25-55`）；段声明表和状态快照退休表**不做**（阶段 1 缩小） |
| **来源适配表** | 一种「原生输入来源」登记一整套适配：准入、工具限制、守卫、历史投影、图片恢复 | 已落地：`core/tables/sources.ts`，挂在 `host.native.sourceTable`。Core 登记主人原生输入，Life、Room、Channels 各自登记适配器，Desktop 登记首步前的图片恢复和第 7、9 行声明（5.8）。判定分 `unclaimed / rejected / accepted / failed`，另有只读分类供历史投影。登记完成屏障未实现，见下面的契约 |
| **能力状态表** | 各模块登记自己的状态行（只有状态和操作名，不能被调用） | 已落地：`core/tables/capabilities.ts`。Core 只登记会话和记忆两行，其余由提供它的模块在入口登记、卸载时撤销；模块缺席即无行，设置页对这类拥有者显示「不可用」 |
| **运维操作表** | 设置页要执行的操作（开房间、授权访问、改平台设置、操作 Channels）由各模块登记，控制台只调用这张表 | 未做（阶段 3）：控制台直接认识 Desktop、Room、Life、Emotion、Economy、Channels |

另有伙伴工具声明表（`core/tables/tools.ts`，挂在 `host.native.toolTable`）：各模块在工具定义旁声明可用来源和可选的历史概览，Life 名单和历史瘦身由它派生。三个登记口共用 `core/tables/registry.ts` 的登记表。

**每张表的契约（契约测试在 `tests/core/tables*.test.ts`）：**

- 重复登记：同一键重复登记是错误，不是覆盖。
- 优先级和顺序：需要顺序的表（提示词、来源适配）显式写排序键，不靠加载先后。
- 「没有适配器认领」和「适配器拒绝」是两种结果，不能都当成 `false`。
- 登记完成屏障：第一层在所有登记完成之前，对来源适配表返回「未就绪」，不是「放行」。**未实现，推迟不排期**：没有找到可用的宿主接点，硬加会让启动窗口里的主人输入被拒；现在没登记的来源返回 `unclaimed` 并拒绝，和 0.1.8 一致。2a、阶段 3 的验收继续覆盖「未登记即拒绝」和不同装载顺序；等 DSH 提供接点，或观察到启动窗口里有输入被误拒时再议。
- 撤销：模块卸载时撤销登记；撤销之后，在途调用必须失效或被取消，不能继续用旧回调。
- 异常：适配器抛错只影响它负责的来源，不拖垮其他来源，也不放行。
- 授权边界：owner、guest、Life、电视画面这几种输入的授权互相独立；渠道准入还要核验原消息和一次性授权，所以准入不是一个布尔回调，而是带上下文的结构化判定。
- 实时准入和只读分类分开：来源适配表的准入只判断「现在这条输入能不能进」；历史投影等事后读取已保存消息时，用只读分类按消息字段选出分支，不看当前运行状态、不消耗授权。没有被任何适配器认领的已保存输入，一律保护所在轮次不瘦身。
- 词表可扩展：`source.kind` 和工具来源的内置取值在 `contracts/tables.ts` 声明；新来源的 kind 在 DSH 的 `MessageSourceMap` 声明一次即可，新的工具来源用 `toolTable.registerSource` 登记，拼错或未登记的被拒绝，撤销后旧授权立即失效。

### 2.3 第二层「生活世界」管什么

| 区 | 现在对应 | 唯一拥有的数据 |
| --- | --- | --- |
| 身体 | `behavior/` | `data/behavior/home.json`（已有 `data/life/home.json` 则沿用） |
| 钱包背包菜园阅读 | `economy/` | `data/economy/economy.sqlite`、`storage.json` |
| 计划、回顾、闹钟、日记复盘 | `life/` | `data/life/control.json`、`life.json`、`life/wakes.jsonl`、`activity/*`、`compactions.jsonl` |

- 对外三样：**世界快照**（沿用 `BehaviorSnapshot`，新增钱包只读视图）、**命令**（沿用现在的请求 ID 去重和「结果未知需核对」语义）、**事实流**（沿用 `CompanionFactSource`）。
- 内部三个区之间直接调用，不再通过 Cordis 服务名互相查找。
- **合并目录不等于合并事务。** 身体文件和经济数据库仍然分开提交，「身体效果已生效、库存结算失败后重启补结算」的现有协议原样保留，不改。

### 2.4 第三层「呈现与连接」管什么

Desktop（含 PetPlatform）、Room、Channels、Voice、Console。两条规则：

1. **只往下依赖，同层不互相引用。** 需要别的同层模块的能力时，经第一层的接口或登记表。
2. **只存自己的数据，不往第一层、第二层的存储里写。**

现在违反的：`room/chat.ts` 引用 `desktop/images`；Channels 把 5 类记录（kind）写进 Core 数据库的通用 `records` 表；Desktop 把会话映射 `desktop-session` 写进 Core 数据库（`desktop/index.ts:44`）；Desktop 读多个上层服务。

---

## 3. 依赖规则和自动检查

规则写成机器可读的清单 [arch/layers.json](../arch/layers.json)：每个模块属于哪层，允许依赖谁，允许读哪些服务，允许发布和订阅哪些事件。检查脚本用仓库已有的 TypeScript 编译器接口写，不加新依赖。

- **R0**：第三层 → 第二层 → 第一层；第三层模块之间禁止互相依赖。向下调用、向上事件与登记。

| 编号 | 检查什么 | 覆盖范围 | 怎么查 | 建立时间 |
| --- | --- | --- | --- | --- |
| **R1** | 静态 import 方向 | `.ts` 和 `.js/.mjs/.cjs`；动态 `import()`；`createRequire`；`#别名` 路径 | 脚本读 import 关系，对照 `layers.json` | M1 |
| **R2** | 运行时服务读取 | `ctx.get('petX')`、`ctx.petX`、`scope.petX`、`inject: [...]`；还要识别别名、解构、计算名（例如把服务名存进变量再读）；遇到无法静态判定的写法直接判失败，要求改成显式写法 | 扫描 + 每个模块声明允许读取的服务；声明是子集且方向合规 | M1 |
| **R3** | 事件 | `ctx.on / ctx.emit('pet/…')`，也包括 DSH 原生事件的订阅；事件只能向上流（订阅者所在层不低于发布者）；事件名在发布层的 contracts 里声明 | 扫描 | M1 |
| **R4** | 直接给别人的对象赋值 | `host.native.xxx =`，也包括通过别名、解构后的赋值 | 扫描，并配一个「已知违规」样例集验证脚本真的抓得到 | M1 |
| **R5** | 谁在写哪份数据 | 见下 | 见下 | M1 起只报告；存储句柄随阶段 3 的数据搬迁方案再定 |
| **R6** | 关闭后不留尾巴 | 定时器、订阅、在途请求，以及在途 I/O 和子进程 | 见第 8 节 | 从阶段 2a 起，每个新写的模块各带一条 |
| **R7** | 外围可关闭 | 见下 | 组合测试 | 阶段 2 覆盖生活世界的卸载与暂停；阶段 3 覆盖全部外围模块 |
| **R8** | 词汇重复与裸字符串 | 同一组字符串取值（例如六种照料动作）出现在多个文件；公开接口（各层 contracts 和对外服务）里的 `kind / action / status / type` 字段是裸 `string`，而不是声明出来的类型 | 扫描；旧重复留在基线里放行并只报告，随各阶段统一词表逐步清理；新增重复当场阻断 | M1 |

**棘轮**：R1–R4 的基线在 [arch/baseline/rules.json](../arch/baseline/rules.json)，R8 在 [arch/baseline/vocabulary.json](../arch/baseline/vocabulary.json)；R5 的 [arch/baseline/writers.json](../arch/baseline/writers.json) 只作报告，不参与棘轮。已建立的检查出现新增违规，或旧条目消失而未同步收紧基线，都会失败；更新基线只能删条目，清理旧违规时同提交收紧。检查与报告命令见 [开发说明](development.md#architecture-behavior)。尚未建立的检查不计为已生效。

**R5 的做法：**

- 状态拥有者表（第 4 节）登记每份持久数据的路径或表名、拥有者、**唯一写入协议**。
- （目标，未实现，随阶段 3 的数据搬迁方案再定）第一层提供**按拥有者划分的存储句柄**：句柄只暴露拥有者自己的表和行，别的模块拿不到。拼 `.chatpet/data/…` 路径的代码只允许在第一层的存储模块里。
- Core 的 SQLite 里**不许出现别的模块的表，也不许出现别的模块的记录 kind**。Core 的 `records` 表按 `kind` 区分记录，Channels 的 5 类记录和 Desktop 的会话映射就是这样混进来的。拥有者边界覆盖**记录 kind 和写入端口**，不只是建表。
- **局限**：脚本只能查到「哪个模块创建了哪个文件、哪张表、写了哪个记录 kind」，查不到「对已有文件的某一行的越权更新」。后者靠「句柄只暴露自己的数据」从设计上堵，再用一个运行时写入追踪测试在一次性数据目录里核对实际产生的文件和表。

**R7 要覆盖：**

- 外围模块全部关闭、逐个关闭、不同启动顺序、重载（关了再开）。
- **卸载和暂停是两回事**：卸载生活入口、显式暂停生活、卸载身体入口，分别验证。
- 工作区 A→B→A 换绑。
- 写入已完成但响应被取消。

另外，**绑定校验要带实例代次**（一个每次绑定新生成的 ID），不能只比较工作区名称和路径。现有 `memory/client.ts` 已经这样防范「同名绑定重新连接后旧请求返回」，把它升级成公共助手。

**每条检查都有真实案例**：R1 到 R8 在 Her World 的提交历史里都有对应案例（例如 R6：关闭后晚到的录音、语音排队取消丢失、关闭失败导致清理中断）。新增检查也要写明对应的案例，对应不上的不加。


**检查脚本的已知局限**（报告时要考虑，改法等用到时再定）：

- R5 只解析文件操作的第一个参数（`scripts/arch/lib/storage.mjs:28`）。`rename*`、`copyFile*` 的写入目标是第二个参数，所以原子写会被报成写临时文件，「无法静态判定」的条目里有一部分是这个原因。
- R5 把未登记的 CoreStore kind 默认归给 `core`（同文件 `:60`），Core 写一个未登记的 kind 会显示「一致」。目前靠逐 kind 对上 `store.put` 的测试兜底。
- R8 会收进 `src/` 里的非业务集合，例如协议前缀、本机地址、HTTP 方法、文件后缀。已有的照常修改不受影响；新代码写出同样的集合会被拦，属于误报，按「真误报就修脚本」处理。

---

## 4. 状态拥有者表

数据路径、物理容器、当前写入者、目标拥有者和版本的机器登记见 [arch/storage.json](../arch/storage.json)；路径清单在那里维护，本节说明归属和写入协议。数据位置默认**不变**。「唯一写入协议」一栏标「待定」的，在对应阶段的实施方案里补。

| 数据 | 新拥有者 | 现在谁写 | 变化 / 唯一写入协议 |
| --- | --- | --- | --- |
| `.chatpet/{manifest.json, SOUL.md, USER.md, COMPANION.md, core.json}` | 第一层·身份与绑定 | Core 初始化和设置 | 不变 |
| Core 数据库：身份、设置、请求去重、原生消息映射、记忆待处理/确认 | 第一层 | Core、NativeMemory、Memory batch | 不变 |
| Core 数据库：`channel-received / channel-reach / life-outlet-delivery / channel-usage / channel-usage-event` | **第三层·Channels** | Channels 直接写 | **搬出**到 Channels 自己的数据库（随 Channels 重写）；`life-outlet-delivery` 的归属另议，它连接生活与渠道 |
| Core 数据库：`desktop-session` | **第三层·Desktop** | Desktop 直接写 | **搬出**到 Desktop 自己的存储（随 Desktop 重写） |
| Core 数据库：`economy.initialized:*` 标记 | **第二层·钱包区** | Economy 写 | **搬出**到 `economy.sqlite`（随阶段 2 的钱包区） |
| Core 数据库：`native-memory-view / native-memory-action` | 第一层（只保留） | 无：旧版本写入，当前 `src/` 不读不写 | 原样保留，是否清理另议；登记后盘点不再报未知 kind |
| Mnemosyne 记忆库 `data/memory/data/memory.db` 等 | 第一层·记忆 | Mnemosyne 服务、Pet 接口 | 不变 |
| 情绪 `data/emotion/state.json`；近期账本 `.chatpet/data/memory/recent-interactions.sqlite`（`src/emotion/recent.ts:11,17,47,55`） | 第一层·情绪 | Emotion | 近期账本虽在 Memory 目录，业务拥有者仍是 Emotion；初始化改为自己登记 |
| 共享 home 会话身份记录 | 第一层·身份与绑定 | Core（目前在 `life.json` 里读写，`core/companion-foundation.ts:89` 一带） | 从 `life.json` 拆出归第一层，生活世界只读；这是一项真实迁移，**放在阶段 2（2a）**；在此之前 Core 对它的读写作为一条基线例外登记 |
| 身体 `data/behavior/home.json`（或 `data/life/home.json`） | 第二层·身体区 | Behavior | 不变 |
| 旧菜园 `garden.json` | 第二层·钱包区（只作迁移来源） | 尚未采用 Economy 的存档由旧存储写 | 不再作为运行路径，只作尚未采用存档的一次性迁移来源 |
| 钱包背包 `data/economy/*` | 第二层·钱包区 | Economy | 不变 |
| `data/life/control.json`、`life.json`（计划部分）、`data/life/life/wakes.jsonl`、`activity/*`、`compactions.jsonl` | 第二层·计划区 | Life | Core 不再写 `life.json` 里的生活状态；Core 的记录库读取活动日期也要改（`core/records.ts:31` 的 `dates/journal` 现在直接读 Life 的活动记录，并且 `createLifeStore` 查询时会创建目录），改为第二层提供只读接口 |
| 日记、自述、历史 | 第一层·记录库 | 主人设置、DSH 原生 `write/edit` 工具、Life/World 回顾复制 | **唯一写入协议待定**：原生工具仍可直接写文件，需要决定经记录库守卫还是保留现状；路径要同时支持新位置 `.chatpet/{self.md, self.history/, diary/}` 和旧位置 `data/life/` |
| 相册 `data/core/photos/album.sqlite`（或旧位置 `data/life/photos/`） | 第一层·记录库 | 共用 photo store；上层相册工具拿到**可变** PhotoStore | 相册工具由第二层登记，但只拿记录库提供的受限句柄，不拿可变的 PhotoStore |
| 原生会话副本 `data/core/native-sessions/*` | 第一层 | NativeTranscripts | 不变 |
| Desktop 待办、图片 `data/desktop/*`；`data/room/images/*` | 第三层·Desktop / Room | Desktop；Room 借用 Desktop 的图片组件 | 图片准入抽成共用小包（5.4） |
| `data/pet-platform/*` | 第三层·PetPlatform | PetPlatform、迁移器 | 不变 |
| `data/channels/*`；profile 下连接设置、令牌、语音缓存 | 第三层·Channels / Voice | Channels、Voice | 不变，设备相关 |
| 浏览器 localStorage：`chatpet:economy:pending:*`、Room 的 `home-*` | 第二层·钱包区 / 第三层·Room | 控制台和 Room 前端 | 经济待确认请求迁入钱包区持久存储，迁移顺序见 7.3 |

下面两类文件不进 `storage.json`，盘点把它们列在 `differences.extra` 里属于预期。它们只在部分安装里存在，登进去会让没有它们的安装报「缺失」：

- `.chatpet/.gitignore`：安装脚本搬迁存储时追加 `/data/`，让 Git 忽略个人数据（`scripts/lib/repo-storage.mjs:228-232`）。不归业务模块。
- `.chatpet/migrations/`：主人安装里一次性导入旧伙伴时留下的原始存档。只读，不归任何模块，迁移不处理它。

---

## 5. 层间接口

### 5.1 第一层对外

- 身份与绑定服务：沿用 `CoreService`。
- 会话接缝：只暴露「登记」，不暴露可赋值的函数字段。
- 记忆服务：观察、召回、修订、撤回、校验，沿用 Pet 接口。
- 情绪服务：沿用 `EmotionService`。
- 记录库：对上层提供受限句柄。
- 登记口：见 2.2。

### 5.2 第二层对外

- **世界快照**：只读投影。
- **命令**：照料、执行计划步骤、阅读确认、购买、出售；每条带请求 ID。错误语义沿用 `ContractError`：`effect` 有三种（`none / partial / unknown`），`retry` 有四种（`never / refresh / same_request / reconcile`）。
- **事实流**：`CompanionFactSource`。事实的准备、验证、确认，目前写在 `core/companion-foundation.ts`，要搬到第二层；「原生日志落盘之后才确认事实」的顺序不能变。
- **变更信号**：一个事件 `world.changed`，只表示「去读快照」。它不是落盘回执（Cordis 的 `emit` 不等待返回）。

### 5.3 第三层对外

几乎没有，只往下登记：能力状态行、提示词与历史投影、来源适配、运维操作。别的模块不读它。

### 5.4 同层共用物

| 共用物 | 现在 | 新 |
| --- | --- | --- |
| 图片准入（`DesktopImages`，Room 在用） | `desktop/images.ts` | 抽成第三层的共用小包（目录在阶段 3 方案里定），Desktop 和 Room 都依赖它，彼此不依赖 |
| **语音**（Desktop、Room、Channels 都用） | 多处直接读 `petVoice` | **第一层的 contracts 声明一个「语音接口」**（说、听、取消、可用性），Voice 登记为实现，使用者通过第一层取得这个接口；接口撤销时，在途调用按 2.2 的契约失效。不用能力状态行，因为它不能被调用，也没有取消和失效约定 |
| 房间模型 `CompanionRoom` | `life/room.ts` 再导出 `behavior/room.ts` | 并入第二层·身体区，Room 只读快照 |

### 5.5 控制台

控制台的**外观先不动**，**架构定位现在就定**：它是第三层里唯一允许「操作别的第三层模块」的模块，操作通过**运维操作表**进行；读数据通过第二层快照和第一层服务。这样同层禁止依赖和控制台的实际职责不矛盾。

### 5.6 细粒度接口准则和概念表

三层只定了大块边界，同样的问题会在更细的地方出现：同一个词被各处各写一份，取值是裸字符串，转换散在各处。所以每个核心概念都按下面五条管：

1. **一个概念一个定义处。** 每个概念有唯一拥有者，其余地方只引用或派生，不再抄一份。
2. **取值是声明出来的类型。** 封闭的集合写成联合类型或常量表；确实开放的（自定义情绪、素材目录）写明「开放」，并写明谁登记、怎么校验。公开接口里不出现无声明的裸字符串词汇（R8）。
3. **转换只发生在一处，而且单向。** 从一套词汇转成另一套的函数集中放，并写明转换里会丢失什么信息。
4. **下层只输出语义，不认识素材和呈现端。**
5. **不同含义不共用一个名字。** 同名不同义的，各自改名；保留现有的序列化字段和外部名称，只在内部改。

这套准则**不是**把所有词合成一个枚举。十个核心概念各自的拥有者、取值范围和统一方式：

| 概念 | 拥有者 | 取值形式 | 统一方式 |
| --- | --- | --- | --- |
| 动作 `action` | 第二层（身体命令）；第一层（表达意图）；第三层（素材 ID、桌面命令） | 身体命令封闭；素材 ID 开放（目录登记） | 内部分成 `BodyAction`、`PresentationIntent`、`ExpressionAssetId`、`DesktopCommand` 四个名字；六种照料动作、十种角色动作、五种计划身体动作由第二层的一份基础表导出，后两者是它的明确子集 |
| 行为（身体状态） | 第二层 | 上游是 `any`，本地没有完整的种类表 | 第二层定义身体状态契约，输出「忙不忙、能否被打断、当前活动」；上游的 `any` 只留在一个适配器内 |
| 活动 `activity` | 第二层 | 标签是自然语言；`operationId`、`currentActivityId` 是 ID | 明确 `label / operationId / currentActivityId` 三种职责；以 `PlannedActivity → PlannedExecution → BehaviorActivity` 为基础，不另建一套活动运行时 |
| 阶段 `phase` | 第二层（身体、执行）；第三层（播放方式）；第一层（工作区绑定） | 各自封闭 | 保留各自的状态机，分别命名 `BodyPhase`、`ExecutionPhase`、`PlaybackMode`、`BindingPhase`；有损转换（例如把执行的 waiting 投影成 pending）集中成一个显式函数 |
| 表情与贴纸 | 第一层（意图、事件）；第三层（素材目录、播放回执、渠道表情库） | 目录开放 | 同形的两套目录类型合成一套；`StickerAssetId` 与 `ChannelStickerId` 分开；label 只用于显示 |
| 情绪 | 第一层 | 九种 feeling 封闭；Room 七维数值另一套；允许未知的自定义文字 | 保留两者的区别；一个统一的「情绪到呈现」优先级规则；未知 feeling 保留文字，不拒绝 |
| 槽位与素材 | 第二层（语义提示和许可规则）；第三层（素材分配、clip 名称、采样） | slot 引用现在是裸 `string` | 见 5.7 |
| 命令与请求 | 第二层 | 计划 kind、阅读状态、经济操作等集合各抄 3 到 4 份 | 每个集合一份，其余派生（5.10） |
| 事实 `CompanionFact` | 第二层 | `domain` 封闭；`type` 是裸 `string` | 补 `domain` 与 `type` 的关联类型和统一解码器；Python 侧的识别清单与它由同一份声明生成，或用契约测试对齐 |
| 会话来源 `source.kind / scope / admission` | 第一层 | `source.kind` 本地识别 7 种，不是完整封闭集；`scope` 有三种含义 | 并入来源适配表（2.2、5.8）；`NativeScope`、`MemoryScope`、`scopeId` 分别命名，不再共用「scope」一词 |

每个概念的完整内容（所有定义处和转换点、同名不同义、拥有者）在用到它的阶段之前补进本节，交付时间见 [product.md](product.md) 的「按需交付的表格」。

### 5.7 动作与行为

「她在做什么」现在被至少八套词汇描述，没有统一的接口。新设计分四段，**每一段只认识自己和下一段**：

```
命令 → 执行记录 → 身体状态 → 表现意图 ─────────── 第二层 ──┐
                                                    │ 向下读
素材分配 → clip 名称 → 播放与采样 → 播放回执  ─── 第三层 ──┘
```

**第二层拥有**：

- **命令与执行。** `BodyAction` 是一份基础表；执行统一到 `PlannedActivity → PlannedExecution → BehaviorActivity`，明确 `label / operationId / currentActivityId`。「照料、计划、阅读」等各自的词表一份，工具 schema、入口校验、设置页白名单都从它派生。
- **身体状态契约。** 一个函数集中完成「身体状态 → 业务结果」（忙不忙、能否被打断、当前活动）和有损的阶段转换；第三层只消费这些结果，不再各自解释原始 kind（现在 `desktop/platform/plugin.ts`、`room/assets.ts` 都在解释）。
- **表现意图。** 语义，不含任何素材名：活动、阶段、情绪、是否独占。情绪与活动在这里合并，**合并规则只写一处**，取代现在 `behavior/presentation.ts` 和 `behavior/playback.ts` 里两套对同一情绪给出不同结果的分类器。
- **语义许可表。** 「哪种活动允许哪些语义槽」写成声明式的表，取代 `animationSlotAllowed()` 里约 40 行 `if` 链。计划里的「呈现提示」（`presentationSlot`）仍由第二层接受，但取值是语义槽，不含文件名。

**第三层拥有**：

- **素材分配**：槽位 → 素材 → `roomClip / desktopClip`，以及组合与采样、播放回执。Room 和 Desktop 各有自己的映射表。`ActivityClip`、`ActivityPlayback` 现在放在第二层目录，改放第三层，**第二层不再出现 `roomClip / desktopClip`**。
- **表情素材目录**：由桌宠平台登记，ID 与 label 的转换留在平台。
- **兼容行为留在适配边界**：Desktop 选了睡觉、起床、吃饭的素材就触发真实的 `sleep / wake / feed`（`desktop/platform/plugin.ts:681、686`），这是已有行为，明确写在适配层，不当成呈现端的业务逻辑。

**表情是独立的一条线**：第一层产出表达意图和事件，第三层登记素材并转换 ID，在「表现意图」里与活动合并。

**保持不变**：序列化字段和外部名称；九种 feeling 与七维 Room 数值的区别；上游素材 ID、文件名和兼容别名。**不做**：全仓统一的 `Action / Phase / Status` 枚举；素材和存档的重命名。

### 5.8 会话策略表

会话安排现在分散在 Desktop、Room、Channels、Core 四处，没有一张表能回答「哪种来源可以做什么」。来源适配表（2.2）的一部分是一张结构化的**会话策略表**，每种会话一行，列包括：

- 来源与可信 actor；
- 会话选择键（工作区、渠道、scope）、共享历史范围、预设如何选；
- 工具权限、可读写的数据；
- **自动观察权，记忆和情绪分开写**：工具权限、记忆观察、情绪更新是三个独立的授权面，每行必须分别声明；
- 取消、归档、恢复、owner 接管的行为；
- 绑定代次。

会话种类：普通 owner 会话、共享 home、Life 自主轮次、回顾轮次、渠道里的主人私聊、guest 私聊或群聊、Desktop 聊天、Room 私聊与电视观看、Desktop 碎碎念与梦话（没有原生会话，也要写出来）。每行的内容来自对现有源码的盘点，**不由适配器的回调隐含**；M2 起每一行由下面「登记者」表里的模块声明，下面的表就是登记要保持的行为。

下面四张表写行为现状，M2 后行为不变，只是声明改由登记者提供。表里的行号是盘点时 `9a0d1dd` 的位置；准入、工具策略、记忆观察和情绪更新的现行代码以登记处为准。「测试」只算 `pnpm run verify` 会跑的测试；`scripts/checks/check-native-*.mjs` 是门禁外的手动检查，单独标出，不算有测试。每格由哪些测试覆盖，以 `tests/behavior-list/index.json` 的 `policyCells` 为准，`tests/behavior-list/index.test.mjs` 检查 5.8.2–5.8.4 每一格至少有一条非 L3 条目；表里「见行为清单」后的编号是其中的条目。

| 行 | 登记者 | 登记处 |
| --- | --- | --- |
| 1、2 | Core 的 `core-owner`（第 2 行只声明、不判定） | `src/core/native/conversation.ts`，`CoreNative` 构造时登记，`order` 排在其他认领 `user` 的适配器前面 |
| 3、4 | Life 的 `life`（`life`、`review` 两个分支） | `src/life/tool-policy.ts` 的 `createLifeSourceAdapter`；`src/life/plugin.ts` 登记和撤销 |
| 5、6 | Channels 的 `channels`（`owner`、`guest` 两个分支，含 QQ 补答） | `src/channels/sessions.ts` |
| 7、9 | Desktop 的 `desktop`（只声明，第 7 行沿用第 1 行；另登记首步前的图片恢复） | `src/desktop/plugin.ts` |
| 8 | Room 的 `room`（私聊、电视两个分支） | `src/room/chat.ts` 的 `sourceAdapter()`；`src/room/plugin.ts` 登记 |

播放证据由 Emotion 登记（`src/emotion/plugin.ts`，`host.native.registerPlaybackEvidence`）；footer 在轮次结束时按各来源声明取授权快照。工具能给哪些来源用，由工具在定义处声明、登记到工具声明表。

#### 5.8.1 会话来源的概念表

| 概念 | 定义处 | 取值或形状 | 同名不同义、转换点 |
| --- | --- | --- | --- |
| 输入来源 `source.kind` | DSH 的 `MessageSourceMap`；本地补充声明在 `room/chat.ts:11-13`（`chatpet-room-tv`）、`core/native/recall.ts:5`（`chatpet-recall`）、`core/native/prompt.ts:10`（`runtime-context`） | 本地识别 7 种：`user`、`dsh-world-life`、`dsh-world-reply-nudge`、`chatpet-room-tv`，以及不作为输入的 `chatpet-recall`、`runtime-context`、`compact-checkpoint`（`core/native/conversation.ts:170`）。上游的完整集合未知（见第 11 节） | `user` 同时承载主人原生输入、Desktop/Room 私聊（带 `rpcId`）和渠道输入（带 `identity`）三种来源，靠附加字段区分（`core/native/conversation.ts:38`）；回顾不是独立 kind，而是 `dsh-world-life` 加 `purpose: 'review'`（`core/native/agent.ts:63-65`） |
| 准入 `admission` | `core/native/conversation.ts` 的 `acceptsInput`，判定来自来源适配表（`core/tables/sources.ts`） | 结构化判定 `unclaimed / rejected / accepted / failed`，只有 `accepted` 放行；不带 `identity` 的 `user` 由 Core 的 `core-owner` 准入；另有只读 `classify` 供历史投影 | 同一 `source.kind` 按 `order` 依次判定，只有 `unclaimed` 交给下一个；适配器抛错返回 `failed`，该 kind 后面的适配器不再判定，所以 `core-owner` 排在最前 |
| 原生会话作用域 `NativeScope` | `core/native/conversation.ts:12` | `{workspaceId, path, storageId, guest}`，由 `core/native/agent.ts:42-49` 算出 | guest 会话的 `workspaceId` 也取主人当前绑定的工作区（`core/native/agent.ts:48`），不是 guest 自己所在的渠道工作区；Emotion 另算一份 `{id, path, guest}`（`emotion/plugin.ts:166-171`） |
| 记忆作用域 `MemoryScope` | `memory/client.ts:11` | `{companionId, scopeId, workspaceId}` | 其中 `workspaceId` 实际传入 `storageId`（`core/native/memory.ts:53`，已知问题 2） |
| `scopeId` | `core/runtime.ts:9` 的 Core 配置 | 伙伴身份的作用域字符串，存进 Core 元数据 `scope`（`core/runtime.ts:38-42`） | 授权上下文用它（`core/authority.ts:11,25`），Memory 启动参数和会话副本也带它（`core/native/memory.ts:53`、`core/native/transcripts.ts:22`）；与上面两种「scope」无关 |

拥有者是第一层（5.6）。M2 把 `NativeScope`、`MemoryScope`、`scopeId` 分别命名，准入改成带结构化结果的来源适配器判定（2.2 的契约）。

#### 5.8.2 会话策略表：来源、选择与生命周期

| # | 会话 | 来源与可信 actor | 选择键、历史范围、预设 | 取消、归档、恢复、owner 接管 | 绑定校验 |
| --- | --- | --- | --- | --- | --- |
| 1 | 普通 owner 会话 | DSH 原生输入，`user` 无 `identity`，直接准入（`core/native/conversation.ts:38`）；证据记为 `owner_statement`，actor 是 `ownerActorId`（`:74-75`） | 当前绑定工作区里任一就绪会话（`core/native/agent.ts:45-47`）；历史是这个会话自己的；预设由主人在 DSH 里选 | 取消、权限由 DSH 原生负责（`core/native/agent.ts:160-161`）；工作区归档后把会话交给 Memory 归档（`:108-128`）；首步前恢复 Desktop 图片和会话副本（`:189-193`） | `sameScope` 比较 `workspaceId/path/storageId/guest`（`core/native/agent.ts:51`）；没有实例代次 |
| 2 | 共享 home | 容器，不是来源：主人输入、Life 输入、渠道主人输入都落在这里，授权面随输入来源走（第 1、3、4、5 行） | 每个 Core 一个，缓存后复用（`core/companion-foundation.ts:74-133`）；home 的会话 ID 记在 `life.json`（`:60-62`）；预设取 Life 的 `agentPreset`，否则 DSH 组合预设，否则 `standard`（`:94`）；标题随伙伴名刷新（`:183-196`） | 归档的 home 由上游 `createHome` 识别（`:125`）；打开前先恢复会话副本（`:76`）；前台打开不要求 Life 启用（`:64`） | 打开时比较绑定的 `id/path`（`:90-93`）；R7 外的换绑由第 1 行规则负责 |
| 3 | Life 自主轮次 | `dsh-world-life`，由 Life 来源适配器准入：Life 运行中、会话是 home、事实批次被接受（`life/plugin.ts` 的 `registerSource`）；actor 是伙伴，有事实时是 `system:companion-world`（`core/native/conversation.ts:75`） | 只在 home（同上）；后台轮次（`core/native/agent.ts:184`） | 时长上限到点取消（`core/native/conversation.ts:191`）；卸载 Life 撤销准入，后台轮次一律拒绝（`life/plugin.ts:528`、`core/native/conversation.ts:23`）；主人输入入队即解除 Life 限制（`core/native/agent.ts:76-82`），轮中接管结束自主计数（`:201-208`） | 同第 1 行；Life 自己另比 `storageId` 和 `companionId`（`life/plugin.ts:166-170`） |
| 4 | 回顾轮次 | `dsh-world-life` 加 `purpose: 'review'` 和 `reviewDay`（`core/native/agent.ts:63-65`），准入同第 3 行 | 只在 home；中断的回顾把权限带到下一次 Life 输入（`:36,60-62,248-249`） | 同第 3 行；主人输入结束回顾权限（`:78-79`）；回顾完成且开启压缩时发 `pet/life.review`（`life/plugin.ts:194-196`），Memory 订阅它（`memory/batch.ts:14`，阶段 2a 改为向下调用） | 同第 3 行；回顾文件守卫按访问键复核（`core/life-review-files.ts:83-89`） |
| 5 | 渠道里的主人私聊 | QQ/微信私聊且 `speakerId` 等于设置的主人（`channels/messaging-settings.ts:50-53`、`channels/sessions.ts:46`）；`user` 带 `identity`，由渠道来源适配器准入，每条收件只能用一次（`channels/sessions.ts:76-89`）；QQ 补答 `dsh-world-reply-nudge` 只准一次且核验原消息（`:68-75,168-178`、`core/native/conversation.ts:64-70`），actor 是 `system:qq-reply`（`:75`） | 路由到共享 home（`channels/plugin.ts:52-56`、`channels/sessions.ts:152`）；前台轮次（`core/native/agent.ts:73,182`） | 关闭渠道时取消已准入的主人轮次（`channels/sessions.ts:185`）；补答授权随关闭撤销（`:177,186`） | 准入时存下 `scopeFor` 的 JSON，补答时逐字比较（`channels/sessions.ts:74,88,172`） |
| 6 | guest 私聊或群聊 | 渠道里不是主人的已登记身份（`channels/sessions.ts:55-59`）；准入同第 5 行的一次性收件；证据记为 `external_content`，actor 是发言人 `speakerId`（`core/native/conversation.ts:74-75`） | 私聊按发言人、群聊按会话分开（`channels/sessions.ts:29`）；每个对话一个独立工作区目录（`:100-104,119`），会话前缀 `chatpet-guest-<digest>-`（`:103`）；预设固定 `chatpet-channel-guest`，不符就拒绝（`:127,135-136`、`channels/guest.ts:5`） | 关闭渠道时取消在途 guest 轮次（`channels/sessions.ts:184`）；取最新未归档会话（`:112`）；Memory 的归档同步只遍历主人工作区（`core/native/agent.ts:112-115`），guest 会话不经过它 | 同第 5 行；另要求会话 `cwd` 和组合预设不变（`channels/sessions.ts:57-58`） |
| 7 | Desktop 聊天 | `user` 带 `rpcId`，无 `identity`，按主人输入准入（`desktop/conversation.ts:181`）；同一 `rpcId` 不重复投递（`:173`） | 每个存储绑定记一个会话 ID，存在 Core 的 `desktop-session`（`desktop/index.ts:44-45`、`desktop/conversation.ts:138-141`）；可打开工作区里任一未归档会话（`:142-145`）；新建会话 `chatpet-<uuid>`，用 DSH 默认预设（`:159`） | 停止走原生取消（`:184-189`）；「新建」先保存再归档旧会话（`:147-157`）；关闭小窗只撤销排队命令，不停原生会话（`:81-85`） | `sameBinding` 比较 `id/path/storageId`，另有小窗代次 `revision`（`desktop/conversation.ts:37-39,128`） |
| 8 | Room 私聊与电视观看 | 私聊：`user` 带 `rpcId`，按主人输入准入（`room/chat.ts:130`）。电视：`chatpet-room-tv`，由 Room 来源适配器只准当前这一条（`room/chat.ts:78-82,133-134,149`），证据记为 `virtual_action`、actor 是伙伴（`core/native/conversation.ts:74-75`） | 同一个会话：`chatpet-room-<storageId 摘要>-N` 取最新未归档（`room/chat.ts:67-73`），没有就新建，DSH 默认预设（`:89-95`）。私聊是前台轮次，电视是后台轮次（`core/native/agent.ts:73,184`） | 同时只处理一条（`room/chat.ts:111-112`）；调用方取消或 300 秒超时即取消原生轮次（`:113,135-136`）；关闭 Room 等在途轮次结束（`:151-154`）；先恢复会话副本和图片（`:86-87`） | `binding()` 比较 `id/path`（`room/chat.ts:61-66`），回复前后复核会话没换（`:128,145`） |
| 9 | Desktop 碎碎念与梦话 | 没有原生会话和输入：一次性调用模型，不建 Agent、不写会话记录、不写 Memory（`desktop/features.ts:204-206,213-231`） | 系统提示只有伙伴身份（`:208`）；梦话加上游的说梦话指令（`:229`） | 自动触发要求：同一绑定、不忙、非安静模式、Life 不接管自主、设置开启、睡着与否和梦话一致（`:86-91`）；条件变化即中止（`:271-274`），时长上限（`:211`），Life 启动时暂停（`:308`、`life/plugin.ts:173`） | `same(target)` 复核绑定（`desktop/features.ts:220,232`） |

本表各行的测试：第 1 行 `tests/regressions/audit-r6-memory-scope.test.mjs:183`（等待期间绑定变化即撤下召回）、`tests/core/history-maintenance.test.ts:65`（换工作区不进历史维护）；第 2 行 `tests/core/companion-foundation.test.ts:87`；第 3、4 行 `tests/behavior-list/families.test.mjs:17,61`、`tests/life/review-continuation.test.ts:37`、`tests/life/life-review-runtime.test.mjs:128`；第 5 行 `tests/regressions/audit-qq-recovery.test.mjs:121`、`tests/regressions/audit-r7-channel-nudge.test.ts:71,86`、`tests/behavior-list/channels.test.mjs:14,39`；第 6 行 `tests/regressions/audit-qq-recovery.test.mjs:144`；第 7 行 `tests/desktop/desktop.test.ts:26,49`；第 8 行见行为清单 M2A-01、M2A-04、M2A-05、M2A-08、M2A-02、M2A-03（门禁外有 `scripts/checks/check-native-room.mjs`）；第 9 行 `tests/desktop/desktop-features.test.ts:13,157`、`tests/regressions/audit-desktop.test.ts:160`、`tests/regressions/audit-r2-desktop-policy.test.ts:61`。

#### 5.8.3 会话策略表：三个授权面

| # | 会话 | 工具权限 | 记忆观察 | 情绪更新 |
| --- | --- | --- | --- | --- |
| 1 | 普通 owner 会话 | 预设的原生工具，加上 Core 的 `pet_memory_*`（非 guest 且 Memory 开启，`core/native/agent.ts:154-158`）和各模块登记的工具；DSH 原生权限照常，不加计数（`:160-161`）。测试：`tests/life/life-tool-policy.test.ts:10`（解除限制后恢复主人工具） | 首步召回（`core/native/agent.ts:215-227`）；输入记为 `owner_statement` 排进 Memory（`core/native/conversation.ts:74-75,86-88`），完成的回复也排进（`:133-141`）；Memory 总开关对所有会话一起生效（`:42-45`）。测试：`tests/behavior-list/native.test.mjs:21`、`tests/life/life-memory-integration.test.ts:117,168` | 回复末尾的 `pet-expression` 在轮次完成时写入（`emotion/plugin.ts:265-269,273-278`）；`pet_emotion_update` 工具（`:195-207`）。测试：footer 由 `tests/infrastructure/emotion.test.ts:23`、`tests/emotion/emotion-state.test.ts:10` 覆盖；工具本身见行为清单 M2A-10 |
| 2 | 共享 home | 随输入来源（第 1、3、4、5 行） | 随输入来源 | 随输入来源 |
| 3 | Life 自主轮次 | 只留 Life 能力名单（`core/life-tool-policy.ts:2-9`）：入队时装限制（`core/native/agent.ts:55-70,76-82`），执行时再查（`:166-167`）；另有步数、工具次数、时长上限（`core/native/conversation.ts:182-204`）。Memory 工具只有读、召回、记住，没有更正和撤回（`core/life-tool-policy.ts:5`）。测试：`tests/life/life-tool-policy.test.ts:10,48`；步数和次数上限见行为清单 B01、M2A-12、M2A-13、M2A-14、M2A-15 | 召回同第 1 行；输入信封记为 `virtual_action` 排进 Memory（`core/native/conversation.ts:74-75,86-88`），附带的事实逐条登记（`:61-62,103-122`）；完成的非回顾轮次之后把旧生活状态投影进历史（`core/native/agent.ts:254-255,93-103,143-147`）。测试：`tests/life/life-memory-integration.test.ts:94,195`、`tests/life/autonomous-life.test.ts:198,211`、`tests/core/history-maintenance.test.ts:34,57` | `pet_emotion_update` 在名单内（`core/life-tool-policy.ts:6`）；footer 同第 1 行，不按来源排除。测试：工具在名单内由 `tests/life/life-tool-policy.test.ts:48` 覆盖；footer 在 Life 轮次生效见行为清单 M2A-12 |
| 4 | 回顾轮次 | 名单加 `read`、`write`（`core/life-tool-policy.ts:11-13,23`）；回顾文件守卫只许读材料和记录、只许写自述和未封存的日记日（`core/life-review-files.ts:64-93`）。测试：`tests/life/life-review-files.test.ts:25,44,63`、`tests/life/review-continuation.test.ts:50`、`tests/behavior-list/families.test.mjs:61` | 同第 3 行；回顾轮次不做历史投影（`core/native/agent.ts:254`，`core/native/history-maintenance.ts:43`）；压缩批次由 `pet/life.review` 触发（`memory/batch.ts:14`）。测试：`tests/core/history-maintenance.test.ts:57` | 同第 3 行。测试：见行为清单 M2A-16 |
| 5 | 渠道里的主人私聊 | 前台主人轮次，权限同第 1 行（`core/native/agent.ts:73,182-185`），没有 Life 限制和自主计数。测试：见行为清单 M2A-19（门禁外有 `scripts/checks/check-native-channel-homes.mjs`） | 输入记为 `owner_statement`，actor 是 `ownerActorId`，归属带渠道身份（`core/native/conversation.ts:71-75,88`）；补答把原消息加入证据根（`:64-70`）。测试：`tests/regressions/audit-r7-channel-nudge.test.ts:71`（补答核验原消息）；主人渠道输入进 Memory 见行为清单 M2A-19 | 同第 1 行。测试：见行为清单 M2A-19 |
| 6 | guest 私聊或群聊 | 预设屏蔽所有继承工具（`channels/guest.ts:13`）；`pet_memory_*`、`pet_emotion_update` 不对 guest 登记（`core/native/agent.ts:157`、`emotion/plugin.ts:207`）；自主工具校验拒绝 guest（`core/native/conversation.ts:197-200`）；看不到主人档案和私有环境事实（`core/native/agent.ts:135`、`core/companion-foundation.ts:149-155`）。测试：`tests/behavior-list/families.test.mjs:19`（guest 调 Life 工具被拒）、`tests/life/life-core-integration.test.ts:94`；预设屏蔽全部工具见行为清单 M2A-20（门禁外有 `scripts/checks/check-native-services.mjs:99`） | 召回同一个共享 Bank（`core/native/agent.ts:215-227`，作用域见 5.8.1）；输入记为 `external_content`、actor 是发言人，排进 Memory（`core/native/conversation.ts:74-75,86-88`）；回复归属记为 `external`（`:138`）；拒绝主人私有事实（`:104`）；不做历史投影（`core/native/agent.ts:97`）。测试：`tests/regressions/audit-r6-memory-scope.test.mjs:200`、`tests/life/life-memory-integration.test.ts:181`、`tests/life/autonomous-life.test.ts:227` | 没有工具；**footer 会写共享情绪**（`emotion/plugin.ts:166-170,265-269,273-278`，已知问题 1）。测试：见行为清单 M2A-21（门禁外 `scripts/checks/check-native-services.mjs:104` 断言的就是这个现状） |
| 7 | Desktop 聊天 | 同第 1 行。测试：见行为清单 M2A-09（第 1 行的测试不经过 Desktop 入口） | 同第 1 行；附带的图片在首步前恢复（`core/native/agent.ts:190`）。测试：见行为清单 M2A-09 | 同第 1 行。测试：见行为清单 M2A-09 |
| 8 | Room 私聊与电视观看 | 私聊：同第 1 行，另加 Room 工具（`room/plugin.ts:146`）。电视：所有工具被 Room 的守卫拒绝（`room/plugin.ts:149`），另受自主步数和时长上限（`core/native/conversation.ts:182-196`）。测试：见行为清单 M2A-01、M2A-02、M2A-03（门禁外有 `scripts/checks/check-native-room.mjs`） | 私聊：同第 1 行。电视：画面输入记为 `virtual_action`、actor 是伙伴，排进 Memory（`core/native/conversation.ts:74-75,86-88`），完成的观后感也排进（`:133-141`）。测试：见行为清单 M2A-06 | 私聊：同第 1 行。电视：工具对模型可见，但执行一律被 Room 拒绝；**footer 会写共享情绪**（已知问题 1）。测试：见行为清单 M2A-01、M2A-07 |
| 9 | Desktop 碎碎念与梦话 | 没有工具（`desktop/features.ts:227-231`）。测试：`tests/desktop/desktop-features.test.ts:13`（原生一次性调用） | 不读不写 Memory（`desktop/features.ts:204-206`）。测试：见行为清单 M2A-11 | 不读不写情绪，只发布 `say` 事件（`desktop/features.ts:233`）。测试：见行为清单 M2A-11 |

#### 5.8.4 会话策略表：按会话身份的历史策略和组装方案

5.8.2、5.8.3 按来源分行，回答「这一轮能做什么」；这张表按会话身份分行，回答「这条历史怎么留、每轮带什么」。同一个会话里可能先后来过主人、Life、回顾、渠道主人四种输入，它们共用一条历史，所以历史策略跟着会话走，不跟着来源走。Life、回顾、渠道主人私聊没有自己的会话，都在 home 里。预设见 5.8.2。这两列只写现状，不改行为。

所有绑定内的原生会话共用这几种改写：

- **召回**：每轮首步按本轮输入召回，插在新输入前面（`core/native/agent.ts:215-227,237-239`），旧召回在打开的请求里换成空消息（`core/native/recall.ts:32-44`）；压缩后重新召回（`core/native/agent.ts:244`、`core/native/recall.ts:22-25`）。
- **动态段退休**：环境、事实、情绪状态、经济这些尾部动态段，只保留最新一份，旧快照在打开的请求里替换掉（`core/native/prompt.ts:25-55`，`core/native/agent.ts:148` 调用）；已废弃的旧段名也在这里清掉（`core/native/prompt.ts:13-14,60-78`）。
- **压缩**：Memory 开启时，按设置的轮数或闲置分钟数做一次原生压缩，再把摘要交给 Memory（`memory/batch.ts:19-28,89-98,49-58`）；Memory 关闭时不记批次（`:20`）。预设自带的 DSH 压缩另算，不归 Her World 管。

| 会话身份 | 会话策略（现状） | 组装方案（现状） | 测试 |
| --- | --- | --- | --- |
| 主人 home | 一个固定会话反复用，不轮换（`core/companion-foundation.ts:74-133`）；在这里跑完的回顾如果开了「回顾后压缩」，就提前触发压缩（`life/plugin.ts:194-196`、`memory/batch.ts:93`）；完成的非回顾 Life 轮次之后，把较早的生活状态在历史里投影成短版本，原始事件保留（`core/native/agent.ts:93-103,143-147,254-255`） | 前缀段：`chatpet.profile` 身份加主人档案（`core/native/agent.ts:130-137`）、`chatpet.foundation`（`core/companion-foundation.ts:197`）、`chatpet.records`（`:249-253`）、`chatpet.expression-guide`（`emotion/plugin.ts:218`）、`chatpet.life`（仅 Life 运行时，`life/plugin.ts:63-67`）、`chatpet.self`（`core/companion-foundation.ts:254-263`）。尾部动态段：`chatpet.environment`（`:200-244`）、`chatpet.interactions`（`:245-248`）、`chatpet.expression-state`（`emotion/plugin.ts:219-233`）、`chatpet.economy`（`economy/plugin.ts:239-243`）。再加召回 | `tests/core/companion-foundation.test.ts:87`（复用一个会话）；`tests/core/history-maintenance.test.ts:34`（生活状态投影）；`tests/life/life-core-integration.test.ts:81,122`（两个主人会话组装出相同的身份、自述、计划和事实；尾部变化不动前缀）；`tests/world/world-recall.test.ts:6`；`tests/core/dynamic-context.test.ts:12`；`tests/memory/memory-batch.test.ts:11`。「回顾后提前压缩」见行为清单 M2A-16、M2A-17、M2A-22、M2A-25 |
| 普通 owner 会话 | 由主人在 DSH 里新建、切换、归档，Her World 不轮换；只有共用改写 | 同主人 home，但没有 `chatpet.life`（只对 home 输出，`life/plugin.ts:65`） | 同上一行的组装和共用改写测试 |
| Desktop 聊天会话 | 每个存储绑定记一个会话；主人点「新建」才归档旧的、开新的（`desktop/conversation.ts:140-161`）；只有共用改写 | 同普通 owner 会话 | `tests/desktop/desktop.test.ts:26`（重开与归档）；组装见行为清单 M2A-09 |
| Room 会话 | 每个存储绑定一个，取编号最大的未归档会话，没有就新建（`room/chat.ts:67-73,89-95`）；Her World 不轮换；界面只回放最近 80 条（`:47`）；私聊和电视共用这一条历史 | 同普通 owner 会话；电视轮次的输入是固定提示加一帧图片（`room/chat.ts:17,116-118,126`） | 见行为清单 M2A-01、M2A-02、M2A-05 |
| guest 会话 | 每个私聊对象、每个群各一个，复用最新未归档会话（`channels/sessions.ts:29,112`）；Memory 开启时同样按轮数或闲置压缩（`memory/batch.ts:24`）；不做生活状态投影（`core/native/agent.ts:97`） | 预设前缀换成公开角色卡（`channels/guest.ts:6,14-17`），并关闭可选的运行时上下文（`:18`）。只挂上三段：`chatpet.profile`，只有身份、没有主人档案（`core/native/agent.ts:135,242`）；`chatpet.expression-guide` 和 `chatpet.expression-state`（`emotion/plugin.ts:284-287`；后者是必需动态段，关闭运行时上下文后仍保留，见 `tests/core/dynamic-context.test.ts:27-30`）。再加召回。其余段只登记在插件作用域，没有挂到 guest 预设（`channels/guest.ts:19-22`），各段自己也排除 guest（如 `core/companion-foundation.ts:150`） | `tests/world/world-modules.test.mjs:73`（私聊与群分开路由）；`tests/life/life-core-integration.test.ts:94`（拿不到私有环境事实）；guest 的完整组装见行为清单 M2A-20（门禁外有 `scripts/checks/check-native-services.mjs`） |
| Desktop 碎碎念与梦话 | 没有会话、不留历史（`desktop/features.ts:204-206`） | 系统提示只有伙伴身份（`desktop/features.ts:208`），可选带一张贴图（`:219,230`），梦话加说梦话指令（`:229`） | `tests/desktop/desktop-features.test.ts:13`；组装内容见行为清单 M2A-11 |

#### 5.8.5 盘点发现

这些是现有行为，M2 照原样登记，不在 M2 里改；要改的由主人另行决定。

- 电视画面和 guest 的回复 footer 都会写共享情绪（已知问题 1）；电视画面还会作为伙伴的 `virtual_action` 进入 Memory。
- 准入是「任一适配器认领就放行」的布尔或运算（`core/native/conversation.ts:39-40`），分不清谁认领、谁拒绝；Room 和渠道的一次性授权都藏在适配器内部状态里。
- Memory 开关是全局的（`core/native/conversation.ts:42-45`），不分会话种类。
- 各入口自己比较绑定，键各不相同（第 1、3、5、7、8 行的「绑定校验」），都没有实例代次（第 3 节）。
- Desktop 聊天和 Room 私聊在授权上等同普通 owner 会话，只是选择键和预设不同。
- Room 两种轮次、渠道主人私聊的工具权限、Desktop 聊天的三个授权面，门禁里都没有测试；M2 要先补测试，再搬适配。
- 召回每轮替换、动态段每步退休，都是在历史里原位改写；压缩只看轮数和闲置时间，home 不轮换。这些是重构后大模型使用细则要改的地方，重构期间保持不变。
- 历史策略和组装方案在门禁里没有测试的：Room 会话的全部、Desktop 与 guest 的组装内容、「回顾后提前压缩」。

### 5.9 上下文组装契约

提示词段继续用 `registerWorldPrompt` 登记（2.2）。阶段 1 缩小后，**不做逐段声明**（类别、可见性、准备依赖、有效期、预算、超时、退休），也不加 `order` 全局唯一检查；这些和召回策略一起砍出重构，记在 `~/Developer/project-design/ideas/inbox.md`，留给重构后的大模型使用细则。保留的是组装的事务顺序和下面的隐含契约，它们在阶段 2a 第一批变成契约测试，因为 2a 要搬的事实准备正靠它们保护。组装的事务顺序固定为：

> 准备 → 复核 scope → 输入准入 → 请求中替换 → 原生日志落盘 → 事实确认

规则：

- 区分五件不同的事：状态退休、召回替换、旧工具结果投影、原生压缩、完整日志保留。
- 现有的隐含契约在阶段 2a 变成契约测试（复用 `test:native-context` 和历史维护测试，只补没覆盖的项）：工具限制必须在 schema 解析前安装；`environment` 先于 `interactions` 准备；`chatpet.interactions` 这个段名及其原样 JSON 是「确认事实」协议的一部分，改名不能只改登记处；事实确认晚于原生日志落盘；替换历史只能发生在打开的原生请求里；会话预设名、会话前缀和渠道目录同时承担路由与恢复协议；「共享 home 的身份」与「Life 正在运行」是两个不同的判定。

### 5.10 扩展：一处声明，其余派生

新增一个能力时要改的文件，由「一处声明」决定，其余由它派生，漏改能被检查发现：

| 要做的事 | 一处声明 | 派生出来的 |
| --- | --- | --- |
| 新增工具 | 工具定义旁声明 `sources`（没写的只给主人），需要历史瘦身时再声明 `historyOverview`，登记到工具声明表 `host.native.toolTable`（M2 已落地） | Life 和回顾名单、历史瘦身识别、来源适配的工具限制 |
| 新增输入来源 | 在模块里写一个来源适配器（准入、分支、`turnKind`、工具策略、记忆观察、情绪更新、历史投影、会话策略行），在入口登记到 `host.native.sourceTable`；新的 `source.kind` 在 DSH 的 `MessageSourceMap` 声明，新的工具来源用 `toolTable.registerSource` 登记（M2 已落地） | 入队和首步准入、工具限制、记忆观察、情绪 footer、历史投影、会话策略一行 |
| 新增上下文段 | 在模块入口用 `registerWorldPrompt` 登记（缩小后不做段声明，5.9） | 无；顺序、可见性由登记处自己写 |
| 新增设置项 | 一份字段声明（阶段 3，按收益再评估） | 页面控件、保存键集合、校验、实际消费的接线 |
| 新增设置页操作 | 运维操作表的一条登记（阶段 3） | 路由清单、处理分支、客户端调用 |
| 新增照料动作 | 第二层的 `BodyAction` 基础表（阶段 2b） | 主人入口、角色工具枚举、计划类型与校验、计划 schema、设置页白名单、按钮 |
| 新增事实领域 | 一份事实领域声明（阶段 2b） | 类型、提示词投影、Life 读取、Python 侧识别清单 |

重构前的基线和 M2 后的复测见 [product.md](product.md) 的「典型修改前后对比」。

---

## 6. 兼容面和旧入口语义

### 6.1 保持不变的清单

- 包名 `her-world`、Bundle 激活身份、旧 entry ID。
- 包入口：`./core`、`./contracts`、`./world`、`./client`、`./00-Core` 到 `./70-Voice`、`./channel-guest`、`./locale/*`。
- 旧 Cordis 服务名：`petCore / petWorld / petMemory / petEmotion / petEconomy / petBehavior / petLife / petRoom / petDesktop / petPlatform / petChannels / petVoice`，以及 `chatpet-channel-preset / chatpet-channel-guest / chatpet-settings`。整个重构期间都保留，阶段 4 删除前以已安装环境的配置实际不再引用为条件。
- 配置项和便携设置字段（含 `null = 未配置`）；Life 的 `agentPreset`；Channels、Voice 的 `deviceDirectory`。
- Python 服务入口、打包资源、相对路径。
- **可观察行为**：工具名、错误和重试语义、提示词段的名字、历史投影的方式、「原生日志落盘后才确认事实」的顺序。这些要变成**行为清单**里的条目，不能只靠门禁通过。

### 6.2 三个旧入口的语义（阶段 2 开始前从旧测试里取证填表）

同一服务名同一时间只能有一个提供者，所以**不能新旧两份同时跑**；一个实例提供三个旧名字，**不会自动保留三个独立生命周期**。需要先定：

| 旧动作 | 现在的表现（已知部分） | 新版必须保持 | 待取证 |
| --- | --- | --- | --- |
| 卸载 `40-Life` 入口 | 身体仍可使用（`life/plugin.ts` 卸载后 Behavior 恢复准入） | 自主计划区停止，身体区继续，时钟意图保留 | 取消在途计划的具体语义 |
| 显式暂停生活 | 冻结身体被动变化和作物时间 | 同上 | 作物实际经过时间与暂停区间 |
| 卸载 `25-Behavior` 入口 | 关闭身体并保存检查点 | 同上 | 与钱包区的关系 |
| 卸载 `22-Economy` 入口 | 已采用 Economy 的存档**拒绝继续**，不退回旧钱包（`behavior/plugin.ts:143`） | 同上 | 同上 |

**常驻实例由谁创建**：推荐由 `25-Behavior` 入口创建（因为卸载 Life 后身体仍要能用），`22-Economy` 和 `40-Life` 入口只负责「撤销门面」和对应区的启停。**卸载哪个入口会关闭哪个内部区**要写成表并配测试。

---

## 7. 迁移与回退

### 7.1 原则

1. 默认不改位置和格式；只有第 4 节标「搬出」「待定」的会真的改。
2. 每个模块带自己的数据版本号，登记在存储清单里。
3. 迁移是独立的、可重复执行的步骤。**幂等的判断依据是目标状态，不是「完成标记」**（「先写日志、再改数据、最后标完成」仍有数据已提交而标记没写的窗口）：每一步先判断「目标状态是否已经成立」，成立就跳过；同时保留原来的 operation / request ID，避免重复结算。
4. **全局停写才迁移**：迁移不是启动时静默自动做的，而是主人显式触发、DSH 已停写的一个步骤。它和现有备份流程（`scripts/lib/offline-backup.mjs`）串在一起，而不是绕开它。
5. 开发期间的迁移、回退、崩溃续做演练，先在**合成数据副本**上跑通（按真实布局生成、不含主人内容）；真实副本只在检查点用，由主人授权、在隔离环境、只盘点不读内容。

### 7.2 回退

- 回退 = 恢复安全备份 + 换回旧版安装包。现有恢复器要求**安装包文件指纹完全一致**，同机同路径，所以回退验收包含「旧代码、旧数据、旧绑定一起恢复」。
- **新版运行期间新增的聊天，回退后旧版看不到。** 恢复器会把原生日志目录和会话登记恢复成备份时的样子（`scripts/lib/offline-backup.mjs:432`，对应测试 `tests/infrastructure/offline-backup.test.mjs:68`）；新版期间的聊天只保留在「回退前自动做的安全备份」里。要让它们重新出现，需要一个额外的、可选的恢复步骤，不在现有恢复器的范围内。
- 同理，**已送达的消息和已消耗的额度**是不可回退的状态；Channels 账本搬出后，现有恢复器也不会把新版的送达、去重和额度记录转回旧 Core。恢复契约要明确列出这类**不可回退状态**。
- 外部状态也要进恢复契约：DSH 工作区登记、原生日志、投影缓存、共享附件、工作区 `AGENTS.md`、设备配置引用。
- 现有恢复器不是纯回滚：恢复前，它把当前的渠道日志、Core 里受保护的送达、去重、额度记录和 Life 花费带进待恢复的数据（`scripts/lib/offline-backup.mjs:409-420`，受保护的 kind 列在 `:309`）。备份里有、当前却缺的受保护记录会让它拒绝恢复（`:354`），共享附件字节冲突也拒绝（`:426`）。回退验收按这些真实行为断言，不比较整个目录和备份是否逐字节相同。

### 7.3 经济待确认请求的迁移顺序

1. 先把浏览器 localStorage 里的待确认请求**原样导出**，保留原请求 ID、输入、绑定，并纳入备份。
2. 再导入钱包区的持久存储，核对数量和内容一致。
3. 核对通过后，才清除浏览器里的副本。

### 7.4 第一次迁移的定位

阶段 1 只做「存储清单加版本号和迁移日志」，数据格式其余不变。第一项真实数据迁移是阶段 2 的共享 home 身份记录，用来**演练备份 → 迁移 → 回退这条流程**。它不能证明跨数据库搬迁、身体与经济的未决结算、新版运行后的回退都正确，所以**不据此宣告迁移链路已通过**。完整验证等到第一次真正的跨数据库搬迁（`desktop-session`、Channels 账本或 `economy.initialized`）时做。

版本号和日志放在 `.chatpet/data/storage-manifest.json` 和 `.chatpet/data/migrations.jsonl`，迁移锁是同目录的 `migration.lock`（`scripts/migrate/context.mjs:19-20`）。它们不放进 `.chatpet/manifest.json`：那个文件算进绑定指纹（`src/core/workspace.ts:155,171`），还会被 Core 改写（`:279-281`）。三个文件都在 `.chatpet/` 里，现有备份自然覆盖。

一次迁移完成后，日志一直留着，再跑全新的 `run` 会被拒绝（`scripts/migrate/runner.mjs:26-31`）。阶段 2a 增加第二个迁移步骤之前（2a 第一批），要一起定好：完成日志归档还是另起日志和备份；旧存储清单怎么过渡（清单按完全相等比较，更新 `dataVersions` 后旧清单会在加锁前报 `manifest-mismatch`，`scripts/migrate/context.mjs:22-30`）；每轮新备份的边界；恢复会把旧的 `migration.lock` 一起带回来（`tests/migrate/normal.test.mjs:46-54`）。

### 7.5 演练覆盖

- 正常迁移 → 聊天和记忆可用 → 回退 → 旧版可用。
- 迁移到一半崩溃 → 重启接着做，不重复、不漏。
- 迁移前后，已撤回的记忆仍然不可见，身份和存储标识不变。
- 缺库、坏 JSON、软链接、外来身份：仍然不得创建空白替代（`tests/infrastructure/first-install.test.mjs` 已有断言，保留）。
- 「身体效果已生效、库存结算失败后重启」在迁移前后行为一致。

---

## 8. 生命周期规则

1. 所有定时器、订阅、在途请求通过模块的**作用域助手**登记（包装 `ctx.effect` 和 `AbortController`），不允许裸 `setTimeout`。
2. 关闭顺序：停接收新请求 → 取消在途请求 → 等已提交的写完成 → 释放资源。
3. **每个模块一条通用测试**：启动 → 触发活动 → 关闭 → 断言无残留。除假时钟外，还要断言在途 I/O 已结束、子进程已退出，并保留少量使用真实时钟的冒烟测试（假时钟证明不了 I/O 和子进程）。
4. 切换工作区或重载后，旧作用域的回调不得写新绑定的数据：绑定校验带**实例代次**（见第 3 节）。
5. **写入已完成但响应被取消**要有专门用例。

---

## 9. 重写顺序

第一层不能作为一个整体独立完成：Memory 还订阅 `pet/life.review`（`memory/batch.ts:14`），历史维护还 import 上层投影函数（`core/native/history-maintenance.ts:4`），记录库还读 Life 的活动记录，Core 还写 `life.json`。所以把它拆成几个**每步自己能完成、不破坏旧功能**的小单位。各步对应的里程碑和完成标准见 [product.md](product.md) 的「阶段」。阶段 1 缩小后（[decisions.md](decisions.md)「阶段 1 缩小」），第一层停在 P2b，P2c 取消，其中属于第二层的部分并入 P3。

| 步 | 做什么 |
| --- | --- |
| P0 | 行为基线：拆行为清单；定 `layers.json`；R1–R4、R8 先对旧代码跑，用已知违规样例集验证脚本抓得到，现状违规清单固定 |
| P1 | 迁移骨架：存储清单版本号、迁移日志、备份与回退串联、真实数据副本演练（7.4 的边界） |
| P2a | 能力状态表：Core 不再读上层服务拼状态（已完成）。原定的初始化表缩小后不做 |
| P2b | 来源适配表和工具声明表：把 Life 一类原生输入的整套适配（准入、工具限制、回顾守卫、历史投影）迁出第一层；`host.native.xxxAdmission` 赋值消失（已完成） |
| P2c | 取消。事件改调用（Memory 不再订阅 `pet/life.review`）、记录库改读第二层只读接口并入 P3；提示词段表砍掉；共享 home 身份记录的归属已定（第 4 节） |
| P3 | 合并第二层（先合并、行为不变，概念统一随后逐步）：5.9 隐含契约的契约测试先行；第一层里属于第二层的 18 条违规搬走；共享 home 身份记录迁移、常驻实例、旧入口语义表落实、事实准备和确认搬入、旧服务名门面、`economy.initialized` 搬出 |
| P4 | 第三层原地治理，不重写模块：图片准入抽共用；语音接口落地；运维操作表；浏览器里的经济待确认请求迁入持久存储；Channels 账本暂留 Core 数据库，`desktop-session` 搬出为可选 |
| P5 | 收尾：删已不用的旧适配（以已安装配置核实为前提）、更新本文、按 G8 复核长期例外 |

每步结束都要：行为清单全绿、门禁通过、能发一个版本、更新「典型修改前后对比」。

---

## 10. 特殊情况

- **首次安装 / 空状态**：没有绑定资料目录时，第一层只开聊天，不创建上层数据。主人明确初始化时，Core 一次建好全部技术容器，可选服务既不打开也不启用（`core/initialization.ts:16`）；Economy、Memory Bank、近期账本经 `registerInitializer` 登记自己的初始化。沿用现状。
- **失败**：迁移任一步失败，保留原文件，标记「待核对」，不静默继续。
- **取消**：迁移可以在两步之间取消；已完成的步骤依赖目标状态判断，不依赖标记。
- **旧数据兼容**：新代码读 0.1.8 数据；有格式改动的项靠迁移，不靠读时兼容（读时兼容算兜底，要先说明理由并经主人同意）。
- **外围模块关闭**：关掉 Desktop、Room、Channels、Voice 任一个，聊天、记忆、身体、计划都不受影响（R7）。

---

## 11. 不确定的地方和怎么验证

| 不确定 | 怎么验证 |
| --- | --- |
| 登记口的契约能否覆盖第一层现在承担的全部上层策略（`core/native/agent.ts` 的 Life 工具限制和回顾守卫、Desktop 图片恢复，`core/companion-foundation.ts` 的事实准备） | P2b 前，列出 `agent.ts`、`companion-foundation.ts`、`prompt.ts` 里每一处向上的策略，逐条对应到某张表；`prompt.ts` 本身没有直接向上读取，但它的异步准备、准入、附着、卸载、历史替换契约要完整保留 |
| 合并后 Room、Desktop 只靠快照能否替代现在的直接读取 | P4 前，逐处列出它们读 `petBehavior / petLife / petEconomy` 的位置，核对快照字段够用 |
| 三个旧入口独立卸载的语义 | 阶段 2 开始前填 6.2 的表，P3 用测试覆盖 |
| 主人的真实数据是否都在第 4 节的位置里（含旧位置 `data/life/` 下的自述、日记、相册） | P1 在真实数据副本上盘点实际文件和表，对比登记表 |
| 旧安装能否无缝升级 | P1 在隔离的已安装环境里演练 |
| 检查脚本能否覆盖 R1–R4 | P0 对旧代码跑，要求准确列出 [product.md](product.md) G5 所列的 Core 向上读取、`lifeAdmission / roomAdmission / channelBoundary`；存储写入另看 R5 报告 |
| 记录库的唯一写入协议（原生 `write/edit` 工具） | 阶段 2a 前决定（和记录库改读第二层只读接口一起）：经记录库守卫，还是保留现状并在清单里明示 |
| 上游的完整集合：`HOME_ACTIONS`、身体 kind、`source.kind`、Life 自动登记的提示词段 | 本地只有声明或 `any`；需要上游契约，或隔离环境里的只读目录快照，才能确认完整取值 |
| 素材名称是否准确表现了动作、情绪和对象 | 分配表的文字匹配不能证明效果；需要在隔离的呈现端里观看素材验收 |
| 两套分类器对同一情绪的不同呈现，是 bug 还是有意为之 | M1 登记为已知问题，由主人判断；统一规则前先确认哪个是期望行为 |
