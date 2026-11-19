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

## 审查结论
