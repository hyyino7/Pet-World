# 阶段 2a 第 2 批：换包后保留 Core 配置（已知问题 8）

- 级别：常规
- 状态：已确认（2026-11-19，主人全部按推荐通过）
- 来源：Codex 只读起草，Claude 定稿。边界见 [stage2a-merge.md](stage2a-merge.md)「第 2 批」。行号以 `f935dad` 为准。下文 `app.asar!/` 指本机 DSH 安装包 `DeepSeek Harness.app/Contents/Resources/app.asar` 里的程序文件（只读核对过，未运行）。

## 目标与外部变化

**新装、搬到新设备**：`dafeiyu-setup --apply` 不再从归档取包、把 Core 配置写进包里再重打包（`scripts/install-dsh.mjs:164-181`），改成让 DSH 自己安装 npm 上的 `her-world`，并把完整的 `00-Core` 配置写进本机 profile 的 `cordis.patch.yml` 覆盖，验证通过后写出 `installation.json` 回执。之后在 **Her World → 版本**页换任何版本，Core 都从这份 profile 覆盖取身份和数据路径，不会再报 `Invalid companionId`（`docs/product.md` 已知问题 8）。

**已经用旧 setup 装过的机器**：新增子命令 `dafeiyu-setup migrate-core-config`。默认只核对并报告，加 `--apply` 才把包里的 Core 配置搬到 profile 覆盖，并写出或校验回执。日常机器这类「npm 包加 profile 覆盖」的安装，可以用同一条命令补齐回执，之后迁移命令（它要 `installation.json`，`scripts/migrate/context.mjs:48-55`）就能用。

**命令行变化**：`--archive` 不再接受，会在动手之前报错并给出新用法；新增 `--version <版本>` 指定要装的 npm 版本（不给就装稳定版）。

## 范围变化

无（在 2a 完成标准里，[product.md](../product.md) 2a 完成标准「已知问题 8 作为 2a 里单独的常规批次修掉」）。

## 改动范围

- 这一步是：改逻辑（安装和离线维护脚本）
- 分支：`codex/2a-2-setup`
- 允许修改：
  - `scripts/install-dsh.mjs` — 改成经 DSH 安装 npm 包、写 profile 覆盖；新增 `migrate-core-config` 子命令；去掉包内注入和重打包
  - `scripts/lib/core-config.mjs` — 读写 profile 覆盖的辅助函数
  - `tests/core/core-install-config.test.mjs`、`tests/regressions/audit-r5-install-receipt.test.mjs` — 跟着改，不放宽断言
  - `tests/infrastructure/first-install.test.mjs`、`tests/regressions/audit-r4-memory-entry.test.mjs` — 执行中补充（2026-11-19，Claude 定）：两者分别断言准备阶段调用 `/usr/bin/tar`（`:37-38`）、用 `const bundlePath =` 截取源码（`:23`），都绑在要删掉的归档安装上。只改夹具，让它走新的 setup 路径；首次安装生成配置和 Memory 入口重新绑定的行为断言保留
  - `tests/behavior-list/setup-config.test.mjs`（新）、`tests/behavior-list/index.json` — L1「换包后 Core 配置仍在」
  - `tests/regressions/audit-r3-portable-memory.test.mjs` — 执行中补充（2026-11-19，Claude 定，返工一轮的门禁发现）：它截取 setup 源码 `const resumeRepo =` 到 `const configuredBeforeBinding =` 一段放进 vm 执行，返工一轮改用 `checkedSetup`/`requireSetup` 后上下文里缺这两个函数。只改夹具，把这两个函数放进 vm 上下文；`/--memory-python/` 等原有断言一字不改
  - `tests/behavior-list/index.test.mjs` — 执行中补充（2026-11-19，Claude 定）：索引自测把 L1 家族名单固定成 4 个（`:9`），只补上「换包后 Core 配置仍在」和更新测试标题，原有断言保留
  - `package.json` 的 `devDependencies`、`pnpm-lock.yaml` — 只加测试用的 `@deepseek-ai/cordis-plugin-include@1.1.0`（拍板点 5）
  - `docs/portability.md` 的「搬到另一台设备」一节 — 改成新命令
- 必须复用：
  - DSH 自带的插件命令（`app.asar!/dsh/node_modules/@deepseek-ai/dsh/lib/plugin-DC80YBt4.js:64-99`）装包，不自己下载或解包
  - `scripts/lib/core-config.mjs:6-19,23-40` 的 `prepareCoreConfiguration`、`prepareMemoryServiceEntry`
  - `scripts/prepare-store-switch.mjs:21-37` 的 profile 覆盖写法（`{id: '00-Core', name: 'her-world/00-Core', config}`）
  - `scripts/install-dsh.mjs` 现有的停写检查、备份、`applying` 标记和回执发布（`:188-230,238-272,322-332`）
  - `inspectRepoBinding`（`scripts/lib/repo-storage.mjs`）核对 Core 库里的身份
- 不做：
  - 不改 `src/`、`scripts/migrate/`、`scripts/lib/repo-storage.mjs`、仓库根 `cordis.patch.yml`
  - 不改 `package.json` 的 `files`、`bin`、`exports`、`imports`（新子命令放在已发布的 `install-dsh.mjs` 里）
  - 不改 `docs/github-updates.md`（高风险，只读）
  - `scripts/prepare-store-switch.mjs` 保留，它处理的是更早的 `dsh-Chatpet` 包

**开工前先验证两件事，任何一件不成立就停下来报告**：DSH 自带的插件命令在本机这个版本能按 profile 安装指定版本的 `her-world`；`@deepseek-ai/cordis-plugin-include@1.1.0` 能锁定、安装、导入。

## 特殊情况

- **旧 setup 装的机器，包里还带着配置**：停 DSH 后，从当前已装的 `her-world/00-Core` 和已有的 profile 覆盖算出实际配置，核对身份三项（`companionId`、`scopeId`、`ownerActorId`）和绝对路径；有 Core 库时再用 `inspectRepoBinding` 在私有副本上核对。确认后只搬配置、写回执。重复运行时，已经一致的覆盖和回执原样保留。
- **日常机器（npm 包加 profile 覆盖）**：以当前生效的覆盖为准，核对包、profile、Core 路径、身份三项和 Memory 绑定；一致就报告通过，缺回执且证据完整就补写。插件已安装但停用的也能核对，保持停用。
- **已经换过包、覆盖还没写**：包里的配置已经丢了。只有同一 profile 里有一份已完成的回执，并且能和当前包、Core 库的身份三项、存储绑定交叉核对上，才允许据此恢复（拍板点 3）。
- **证据冲突**（回执是 `prepared`/`applying`、配置互相矛盾、有重复的 Core 声明、home 层改变了最终配置）：不动现场，返回固定原因码，由主人核对后再试。输出只给路径、状态和原因码，不打印配置值。
- **离线**：搬配置全程离线。setup 的 `--offline` 照样传给 DSH；npm 包和依赖必须已在缓存里，缺包就失败。
- **空状态**：真正第一次安装才生成新身份；已有安装痕迹但配置来源不明，进入核对流程，不生成新身份。profile 里没有 `cordis.patch.yml` 时写一份新的；文件格式错误时交给主人。
- **失败和回滚**：同一个 profile 串行执行。先记本次尝试和 `applying`，再原子写覆盖、交给 DSH 装包、重新读出组合后的配置，最后发布完成回执。即使用 `--no-backup`，也保留改动前的 profile 补丁和旧回执快照。中途失败、能证明原包和绑定仍有效时，自动恢复这两份；包或数据状态不明时，保留 `applying` 和快照，由主人走 DSH 和现有离线恢复（拍板点 4）。
- **打包后能否运行**：两个入口都用现有的 `bin`。`verify` 的包检查覆盖入口和相对依赖；另从解包目录跑一次 `dafeiyu-setup --help`。运行时不依赖开发检出里的 `yaml` 或测试依赖，YAML 解析用 DSH 应用自带的。

## 概念与扩展检查

无新增概念或词表。Core 配置的位置从「包内 `cordis.patch.yml`」改成「profile 层覆盖」，这已经是日常机器的现状；回执沿用现有的 `status`、`packageInstalled`、`profileDir`、`config` 字段，迁移和备份照常读。层间接口不变。

## 拍板记录

1. **setup 装哪个版本、旧参数怎么办** — 推荐：默认装稳定版 `her-world`，`--version <版本>` 可指定；`--archive` 在动手前拒绝并指向新用法。理由：新装用稳定版，隔离验收可以指定起点，版本来源可复核。决定：按推荐。
2. **搬配置入口** — 推荐：`dafeiyu-setup migrate-core-config`，默认只核对，加 `--apply` 才写；沿用 `--dsh-app`、`--dsh-home`、`--profile`、`--output-dir`。理由：放进已发布的 `install-dsh.mjs`，不用改 `files`；旧机器不必先换包就能运行。决定：按推荐。
3. **只剩一份已完成回执时能不能恢复** — 推荐：允许，但要当前包、profile、Core 库和存储绑定全部交叉核对通过；有冲突就停在核对阶段。理由：已经换过包的机器仍有路可走。决定：按推荐。
4. **半途失败谁来回退** — 推荐：脚本只自动回滚能证明安全的 profile 补丁和回执；包或数据状态不明时交给主人走 DSH 和现有离线恢复。理由：配置、包、数据库各有自己的完成证据，脚本不猜。决定：按推荐。
5. **测试里怎么解析 profile 补丁** — 推荐：加一个只供测试的依赖 `@deepseek-ai/cordis-plugin-include@1.1.0`（和本机 DSH 里的版本一致）并更新锁文件，让 CI 和行为清单跑上游真实的补丁算法；运行时仍用 DSH 应用自带的。理由：CI 上没有 DSH 应用，自己模拟补丁算法证明不了换包后真的能解析。决定：按推荐。

## 验收

- 快测：先用合成 profile 复现「包里带配置 → 换成不带 `config` 的包 → Core 启动失败」，确认失败。实现后：`pnpm run build && node --test tests/core/core-install-config.test.mjs tests/regressions/audit-r5-install-receipt.test.mjs tests/behavior-list/setup-config.test.mjs`。覆盖：旧 setup 搬配置、npm 已有覆盖、回执缺失和冲突、离线缺包、重复运行、写入或装包失败后的回读。
- L1「换包后 Core 配置仍在」（`tests/behavior-list/setup-config.test.mjs`）：真实走 setup 的配置落盘流程，只替换「取得包」这一步；用上游算法从磁盘上的包和 profile 解析 Core，启动真实 `00-Core` 入口并读到合成身份；关闭后换成不带 `config` 的 npm 形状包，重新解析、启动，核对身份三项、同一个 Core 数据目录和已有工作区。同时保留「去掉 profile 覆盖就重现原故障」的断言。家族「换包后 Core 配置仍在」，`l1Stage: 阶段 2`。
- 门禁：`pnpm run verify`；`pnpm run build && pnpm run test:behavior-list`。
- 主人手动（结束故障家族「换包后 Core 配置仍在」这一轮）：在隔离的 DSH 环境用合成伙伴，从检查过的包运行新 setup，指定一个可装的 npm 版本；启动后确认插件已激活、工作区可读。到 **Her World → 版本**换成另一个兼容的已发布版本，按提示重启，确认 `00-Core` 已启动、伙伴和绑定都在。然后退出 DSH，用 `migrate-core-config` 核对模式确认 profile 覆盖和回执一致。没通过之前，日常机器不升级。

**提交阈值声明**（执行中补充，2026-11-19，主人同意）：`scripts/install-dsh.mjs` 整个安装流程换掉，这一个文件就改了约 840 行，拆不成每步都能通过测试的小提交。实现和测试放在同一个提交里（`1364425`，10 个文件、1585 行），超过 15 个文件 / 600 行的阈值；测试依赖和执行记录各自单独提交。

## 执行结果

- `scripts/install-dsh.mjs` 经 DSH 安装稳定版或指定 npm 版本，原子写入 profile 覆盖并验证后发布回执。`migrate-core-config` 默认离线核对，加 `--apply` 才搬配置或补回执。
- `scripts/lib/core-config.mjs` 用 DSH 的补丁算法核对分层配置，保留 profile 中的其他声明和 YAML 注释。失败时，包和绑定可核对则恢复原补丁和回执，否则保留 `applying` 和快照。
- `setup-config.test.mjs` 的换包红测已转绿，`index.json` 和 `index.test.mjs` 已登记第 5 个 L1 故障家族。测试依赖沿用上一轮锁定的版本。
- `core-install-config.test.mjs`、`audit-r5-install-receipt.test.mjs` 覆盖旧 setup 搬配置、npm 已有覆盖、缺失及冲突回执、重复运行、离线缺包、写入失败和装包后回读。`first-install.test.mjs` 和 `audit-r4-memory-entry.test.mjs` 的夹具已接到新路径。
- `docs/portability.md` 已更新新设备命令和旧设备搬配置说明。历史付费检查 `scripts/checks/check-native-memory-live.mjs` 仍读取旧回执的 `archive` 字段，若继续使用该检查，需要另定 npm 包的核对方式。
- 方案快测构建通过，27 通过、0 失败。补跑首次安装、Memory 入口和便携 Memory 回归，36 通过、0 失败。
- `pnpm run build && pnpm run test:behavior-list` 通过，索引校验 11 项、行为清单 71 项，均为 0 失败。`pnpm run check:types` 通过。
- 临时打包通过 `check:package`，从解包目录执行两个命令的 `--help` 均成功。自动检查只用了合成数据。全量门禁和隔离 DSH 的版本页验收待执行。
- 建议 Claude 按文件和代码块提交。计数文件数/差异行依次为测试依赖 1/1、抽出原安装准备和工作区收尾 2/298、Core 覆盖辅助函数 1/111、npm setup 与搬设备说明 2/543、换包和 setup 回归 7/496、离线搬配置及其测试和说明 3/199、执行记录 1 文件。锁文件和构建产物按约定不计。

- 范围外的兼容问题：`scripts/checks/check-native-memory-live.mjs:176`（付费模型的 Memory 实测）依赖旧回执的 `archive` 字段，改装 npm 包后回执里没有这个字段。以后还要用这个检查，需要另定按 npm 包核对的方式；合并时登记进 `docs/product.md` 已知问题。

### 返工一轮

- 必须修 1。`scripts/install-dsh.mjs:355`、`scripts/install-dsh.mjs:365`、`scripts/install-dsh.mjs:543` 和 `scripts/lib/core-config.mjs:50` 为恢复路径、Memory 参数配对、继承入口等校验提供固定原因码。JSON 继续只用固定原因码报告失败。红转绿（`tests/core/core-install-config.test.mjs:252`）`setup reports an incomplete Memory binding with a fixed reason`、`setup reports an invalid resume Repo with a fixed reason`、`setup reports an unverified inherited Memory entry before probing Python`。
- 必须修 2。`scripts/install-dsh.mjs:268` 只向 `add` 传 `--offline`。离线时同时设置两个前缀的 `offline`，并给 pnpm 设置 `ignore_scripts`。`tests/behavior-list/setup-config.test.mjs:77` 在合成子进程边界核对参数和环境。红转绿（`tests/regressions/audit-r5-install-receipt.test.mjs:119`）`R5: untouched offline install failure restores prior profile patch and receipt even with --no-backup`、`R5: a fresh offline cache miss removes the new patch and applying receipt, allowing a retry`、`R5: offline replacement removes codex-pet before adding her-world with --offline`。
- 建议修 4。`scripts/install-dsh.mjs:382` 与 `scripts/lib/core-config.mjs:50` 用 `parseArgs` 的值判定显式 Memory 参数。红转绿（`tests/core/core-install-config.test.mjs:277`）`setup selects the same explicit Bank from both memory-data-dir option forms`、`setup accepts an explicit custom service entry and rejects an empty value in either option form`。
- 建议修 8。`scripts/install-dsh.mjs:285`、`scripts/lib/core-config.mjs:33`、`scripts/lib/core-config.mjs:117` 归一已核实的托管入口，保留可确认的自定义入口，其余返回 `memory-service-entry-unverified`。回读仍精确核对完整 Core 配置。旧回执只在入口需归一时更新对应字段，避免旧 pnpm 目录清理后仍依赖它。红转绿（`tests/core/core-install-config.test.mjs:119`）`migrate-core-config removes a managed entry from the override and keeps checking the legacy package`、`migrate-core-config removes a verified old pnpm entry and keeps the receipt usable after the package is pruned`、`migrate-core-config rejects unproven inherited entries without writing or exposing configuration`。`migrate-core-config keeps a custom entry verbatim and still rejects a different Memory binding` 前后均通过。
- 建议修 3。`docs/portability.md:39` 补充 `profile-busy` 的中断恢复步骤，先确认 setup 和迁移已停止、DSH 已退出，再手动删除目标 profile 下的锁目录。
- 红测 `node --test tests/core/core-install-config.test.mjs tests/regressions/audit-r5-install-receipt.test.mjs tests/behavior-list/setup-config.test.mjs` 为 26 通过、11 失败。加跑 `tests/regressions/audit-r4-memory-entry.test.mjs` 的首次修后检查为 48 通过、1 失败，原因是合成 Bank 目标目录已存在。改用带旧归属记录的两个 Bank，在临时目录用原实现重跑红测仍为 26 通过、11 失败，并确认等号写法误选默认 Bank。
- `pnpm run build && node --test tests/core/core-install-config.test.mjs tests/regressions/audit-r5-install-receipt.test.mjs tests/behavior-list/setup-config.test.mjs tests/infrastructure/first-install.test.mjs tests/regressions/audit-r4-memory-entry.test.mjs tests/behavior-list/index.test.mjs` 构建通过，64 通过、0 失败、0 跳过。
- `pnpm run build && pnpm run test:behavior-list` 构建通过。索引 11 通过、0 失败。行为清单 71 通过、0 失败，含本机回环 Memory 用例。两份脚本通过 `node --check`，差异通过 `git diff --check`。
- 实机 DSH 安装、实际离线缓存、版本页换包和手动清锁未验证。测试使用合成 `DSH_HOME` 和合成 `--dsh-app`。全量门禁待合并前执行。
- 建议按代码块分三组提交。离线参数和夹具组含 `scripts/install-dsh.mjs`、`tests/behavior-list/setup-config.test.mjs`、`tests/regressions/audit-r5-install-receipt.test.mjs`，约 55 行。诊断、Memory 参数和迁移组含 `scripts/install-dsh.mjs`、`scripts/lib/core-config.mjs`、`tests/core/core-install-config.test.mjs`，约 365 行。文档组含 `docs/portability.md` 和本方案的返工小节，约 17 行。

### 返工二轮

- `tests/regressions/audit-r3-portable-memory.test.mjs:9` 导入 `checkedSetup` 和 `requireSetup`，在 `:40`、`:56` 注入两处 VM 上下文。两个 R3 用例通过原有断言，含 `/--memory-python/`。
- `scripts/install-dsh.mjs:359` 恢复保留 Bank 时缺少 `--memory-python` 的原提示。用 `node --input-type=module` 在合成 profile 上调用安装入口，确认 `scripts/install-dsh.mjs:545` 的 JSON 只有失败状态、原因码 `memory-python-required` 和 profile 路径，1 通过、0 失败。
- 在 `tests/` 交叉检索 `runInNewContext`、`createContext`、`indexOf` 和 `install-dsh`，截取安装脚本进 VM 的夹具只有 R3 和 `tests/regressions/audit-r4-memory-entry.test.mjs:23`。R4 的 12 项全部通过。
- 修前 `node --test tests/regressions/audit-r3-portable-memory.test.mjs tests/regressions/audit-r4-memory-entry.test.mjs` 为 30 通过、2 失败，均因 R3 夹具缺少 `checkedSetup`。
- `pnpm run build && node --test tests/regressions/audit-r3-portable-memory.test.mjs tests/core/core-install-config.test.mjs tests/regressions/audit-r5-install-receipt.test.mjs tests/behavior-list/setup-config.test.mjs tests/infrastructure/first-install.test.mjs tests/regressions/audit-r4-memory-entry.test.mjs tests/behavior-list/index.test.mjs` 构建通过，84 通过、0 失败、0 跳过。
- `pnpm run verify` 的环境、类型、架构检查和构建通过。Node 测试 1466 通过、1 失败、0 跳过，门禁退出码 1。唯一失败是 `tests/memory/memory-process.test.mjs:81` 调用 `/bin/ps` 被沙箱拒绝（`EPERM`）。临时 Node 探针复现该拒绝，并确认本机回环监听成功。
- 补跑门禁中断后的检查。`.venv/bin/python tests/memory/memory_provider_test.py` 为 22 通过、0 失败。`pnpm run check:release`、`pnpm pack --pack-destination <临时目录>` 和 `pnpm run check:package <临时包>` 均通过。安装脚本和 R3 测试均通过 `node --check`，差异通过 `git diff --check`。
- 返工一轮的「诊断、Memory 参数和迁移」组纳入 R3 夹具和安装脚本的 Bank 重绑提示，合计 4 个文件。本小节归入文档组。

## 审查结论

验收会话（Claude）两层审查：第 1 层 Codex CLI `codex exec review --base main`，第 2 层 Claude 回读代码并只读核对本机 DSH 安装包（`app.asar`、`runtime/primary-runtime/dependencies/pnpm`，未运行）。

**已核实通过**

- 范围：`git diff --stat main...HEAD` 的 13 个文件都在「允许修改」和两条「执行中补充」里；`src/`、`scripts/migrate/`、`scripts/lib/repo-storage.mjs`、根 `cordis.patch.yml`、`package.json` 的 `files`/`bin`/`exports`/`imports` 都没动。
- 不碰主人的 DSH：`home` 取自 `resolveDshHome(--dsh-home)`，DSH 自带实现里显式参数优先于 `$DSH_HOME` 和 `~/.dsh`（`app.asar!/dsh/node_modules/@deepseek-ai/dsh-home-paths/lib/index.js:109-110`）；`runPlugin` 把 `DSH_HOME` 设为解析结果、`--profile` 用解析后的 profile（`scripts/install-dsh.mjs:267-271`），比 main 只继承环境更严。测试夹具传合成 `--dsh-app`/`--dsh-home`，故意把环境里的 `DSH_HOME` 设成另一个目录，并断言子进程拿到的是参数值；`spawnSync` 和 `pgrep` 全部替换，没有测试启动真实 DSH。
- 测试没有放宽：`first-install`、`audit-r4` 只换夹具，首次生成配置和 Memory 入口重新绑定的断言保留；`audit-r5` 原有断言逐条保留，并加强（装包时回执必须已是 `applying`、包规格、组合后的 Core 配置等于回执）；`core-install-config` 第一条把「拦截 tar 和依赖请求」换成「不调用任何外部进程、profile 补丁和清单不变」，意图不变。
- 失败回滚（拍板点 4）：只有补丁、回执、home 补丁、包快照和绑定都能证明没变时才恢复（`scripts/install-dsh.mjs:244-259`），否则保留 `applying` 和快照；`--no-backup` 时快照照写在本次尝试目录（`:226-230`），R5 有对应测试。
- `migrate-core-config` 默认只核对：不带 `--apply` 时在写任何东西之前返回（`:303-307`），输出只有状态、路径和 `enabled`；拒绝时只有原因码和 profile 路径，测试断言身份三项不出现在输出里。
- 范围外已知问题属实：`scripts/checks/check-native-memory-live.mjs:176` 读回执的 `archive` 字段，合并时登记进 `docs/product.md` 已知问题。
- 重跑：构建后受影响测试 54 项 0 失败；`pnpm run verify` 1457 项 0 失败、发布检查通过；`pnpm run test:behavior-list` 索引自测 11 项、行为清单 71 条全过（含 `2A2-01`）。

**必须修**

1. `scripts/install-dsh.mjs:559-563` — 非 `SetupError` 的错误到顶层一律变成 `{"reason":"setup-failed"}`，原因和提示文字都丢了。setup 里还有二十多处 `assert`（如 `:350`「Rebind Memory with --memory-python…」、`:356`、`:369-370`、`:376-377`、`prepareMemoryServiceEntry` 要求显式选 `--memory-service-entry`），main 上这些提示会打到 stderr。实测：`--memory-python` 不带 `--memory-data-dir`、`--resume-repo` 指向不存在的目录，都只输出 `setup-failed`。主人照 `docs/portability.md` 搬设备、或者做隔离实机验收时一旦出错，无从判断该改哪个参数。改法：给这些场景各定固定原因码（或把断言消息作为 `message` 一并输出，消息里只有路径，不含身份值），`migrate-core-config` 仍只输出原因码；补一条测试覆盖至少一个断言场景。
2. `scripts/install-dsh.mjs:267-272` — 离线参数传错了地方：
   - `--offline` 也被加到了 `remove codex-pet` 上。DSH 原样转发给自带的 pnpm 11.28.5，`pnpm remove` 的选项里没有 `offline`，pnpm 会报 Unknown option 退出 1（pnpm.mjs 的 `readCommandConfig` 在 `rejectUnknownOptions` 时直接失败）。所以 `--replace-codex-pet --offline` 必定失败；main 上的删除命令不带这个参数，这是新引入的回归。
   - 装 npm 版本时，DSH 会先跑 `pnpm view <规格>` 做兼容预检（`app.asar!/dsh/node_modules/@deepseek-ai/dsh-plugin-manager/lib/index.js:531-556,738-739`），只转发 `--registry=`，不转发 `--offline`；而 pnpm 11 只读 `pnpm_config_*` 环境变量，不读这里设的 `npm_config_offline`。所以 `--offline` 时仍会请求 registry（失败会被忽略，装包本身还是离线的），违背主人选了离线的本意。
   - 改法：`--offline` 只加给 `add`；离线时另设 `pnpm_config_offline=true`（`ignore_scripts` 同理补上 `pnpm_config_ignore_scripts=true`）；夹具断言 `remove` 不带 `--offline`、环境里有 `pnpm_config_offline`。

**建议修**（不阻塞合并）

3. `scripts/install-dsh.mjs:76-88` — 锁目录 `.her-world-setup.lock` 在进程被杀（Ctrl-C、断电）后不会清理，之后 setup 和只读核对都一直报 `profile-busy`。至少在 `docs/portability.md` 写明确认没有 setup 在跑后手动删掉；更好的是锁里记 PID，确认进程不在后再回收。
4. `scripts/install-dsh.mjs:373`、`:398` — 用原始 `process.argv.includes('--memory-data-dir')` 判断是否显式指定，但 `parseArgs` 也接受 `--memory-data-dir=/x`。用等号写法时，会走 `boundMemoryDirectory` 分支，静默改用 Repo 里的默认 Bank。应改用解析后的 `values` 判断。
5. `scripts/install-dsh.mjs:327` — 新设备上 `her-world` 已经由 DSH 装好但没有配置时，即使给了 `--resume-repo`（配置来源明确），setup 也报 `migrate-core-config-required`，而迁移命令又没有配置可搬，只能先手动 `dsh plugin remove her-world`。可以在核对过便携 Repo 后放行，或者至少在文档里写明这条绕行办法。
6. `scripts/install-dsh.mjs:138-145` — 激活清单里有缺失或已退役的其他 bundle 时，DSH 会跳过它（`app-boot/lib/index.js:1791-1793`），setup 和迁移却报 `bundle-invalid` 拒绝继续。这样做偏保守、不会出危险，但会挡住本来能装的 profile。
7. `scripts/install-dsh.mjs:289-291` — 回执证明工作区初始化过、`core.sqlite` 却不在（例如存储卷没挂上）时，`inspectRepoBinding` 返回 `unavailable`，迁移仍可能报 `checked`/`migrated`，而之后 `scripts/migrate/context.mjs` 会拒绝这个绑定。建议这种情况报冲突。
8. `scripts/install-dsh.mjs:301` — 迁移把 `memory.serviceEntry` 原样搬进 profile。如果它指向旧 pnpm 包目录里的托管入口，换包后 Memory 会启动失败。旧 setup 会删掉托管入口（`prepareMemoryServiceEntry`），所以概率低；可以复用它做同样的归一。
9. `scripts/install-dsh.mjs:250` — 首次在还没初始化的自定义 `--profile` 上离线装包、缓存缺包时，DSH 先写下 profile 初始化文件，导致包快照不同、不自动回滚，留下 `applying` 和补丁；再跑会报 `bundle-installation-conflict`。可以要求自定义 profile 也先初始化（同 desktop 的 `profile-uninitialized`），或者在取快照前先完成初始化。

**待主人操作**

- 隔离 DSH 环境的实机验收（「验收」一节最后一条）：从检查过的包运行新 setup，指定可装的 npm 版本 → 确认插件激活、工作区可读 → 版本页换另一个兼容版本并重启，确认 `00-Core` 启动、伙伴和绑定都在 → 退出 DSH，用 `migrate-core-config` 核对模式确认一致。这一步没做之前，2a 完成标准里这一项不勾，故障家族这一轮不算结束，日常机器不升级。注意：setup 和迁移用 `pgrep -x "DeepSeek Harness"` 查进程，隔离验收时日常在用的 DSH 也要退出。

**复查（返工一、二轮）**：必须修 1、2 和建议修 3、4、8 逐条回读代码确认已修。setup 的校验失败改为固定原因码（`memory-python-required`、`memory-binding-incomplete`、`resume-repo-invalid`、`memory-service-entry-unverified` 等），JSON 仍只输出原因码；`--offline` 只给 `add`，离线时设 `pnpm_config_offline`，并补 `pnpm_config_ignore_scripts`；显式 Memory 参数按解析后的值判断；迁移把已核实的托管入口归一；`docs/portability.md` 写了清锁步骤。测试没有删除、跳过或放宽，`audit-r3` 只改夹具（已补登记）。重跑：受影响测试 84/0，`pnpm run verify` 1467/0（含打包检查），行为清单 71 条全过。建议修 5、6、7、9 留着不做。
