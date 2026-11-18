# 开发与验证

先读 README 和本文。保留当前源码与运行说明；不新增历史方案、交接或审计报告集合。

<a id="local-tools"></a>
## 本机工具

本机使用 mise 提供 Node、pnpm，uv 提供受管理的 Python；先把 mise 的 shims 加入 PATH。本机安装方法见 `~/Developer/dev-kit/README.md` 的「本机运行环境」。从新的登录 shell 进入仓库后，版本分别由 `.node-version`、`package.json` 的 `packageManager` 和 `.python-version` 选择，不改全局版本或已安装的 DSH。

首次准备、移动检出目录或环境检查报告旧路径时，在仓库目录执行恢复命令：

```sh
rm -rf .venv node_modules && mise install && uv venv --managed-python && uv pip install --python .venv/bin/python -r vendor/mnemosyne/requirements-test.lock && pnpm install --frozen-lockfile --ignore-scripts
```

该命令按锁文件重建两个可丢弃目录，移除手工加装的依赖；pnpm 使用默认共享 store。若旧 shell 曾加载 `scripts/env.sh`，先开新终端，清掉旧 PATH 和项目 store 覆盖。离线且依赖已可用时，直接使用现有环境。

```sh
pnpm run check:env
```

环境检查核对 Node、pnpm 和虚拟环境 Python 的版本、Python 可执行性及 `.venv/bin/activate` 的路径；不检查运行时来自哪里，也不证明所有锁定的 Python 依赖已经安装，后者由全量验证中的 Python 测试覆盖。缺少 mise shims 的 shell 可能找不到 pnpm，或选错 Node。

上游来源和许可证保留在 `references/manifest.json`、vendor 记录及 `THIRD_PARTY_NOTICES.md`。

## 日常快测

只跑本次改动相关的检查。以种地时钟为例：

```sh
pnpm run build
node --test dist/tests/behavior/garden-clock-continuity.test.js tests/regressions/audit-r5-garden-clock.test.mjs
```

build 会更新生成文件和编译产物；`dist/src` 中已有跟踪文件的差异也要检查。只改文档时做链接、diff 和范围检查。`pnpm test` 和已有的聚焦测试脚本仍可用，不串联重叠套件重复构建。

<a id="architecture-behavior"></a>
## 架构检查与行为清单

以下命令用于源码检出；声明在 `arch/layers.json`、`arch/storage.json`，R1–R4 和 R8 基线在 `arch/baseline/`，R5 仅报告。普通检查比较新增和消失项，报告模式另打印调用位置、依赖边、写入者、词表定义、判断数和跳过的生成源。

```sh
pnpm run check:arch
pnpm run check:arch -- --report
```

清理旧违规时，在同一个提交内运行以下命令收紧基线；它拒绝新增条目：

```sh
pnpm run check:arch -- --write-baseline
```

行为索引是 `tests/behavior-list/index.json`。先完成上面的 build，再运行含索引自测的入口：

```sh
pnpm run test:behavior-list
```

只执行并核对索引条目的既有入口：

```sh
node scripts/checks/run-behavior-list.mjs
```

L1 是插件入口的完整流程，L2 是公开面行为，L3 是保留在全量门禁的回归参考。清单入口只跑 L1/L2，要求每条身份恰好执行一次并通过，零匹配、跳过、取消或 todo 都算失败。它使用合成数据和假模型；其中真实 Memory provider 需要本机回环，沙箱拒绝监听应记录为环境失败，不改成通过或跳过。

<a id="migration-inventory"></a>
## 合成副本、迁移与盘点

这些也是源码检出命令，需要已经构建。输入是完成安装的 `installation.json` 回执。开发使用生成器产出的合成副本；真实副本由主人提供且只在另行授权的隔离检查点使用。迁移仅加存储清单版本和日志，不宣告跨库搬迁或已安装环境验收完成。

用一个不存在或为空的输出目录生成 current 布局；legacy 布局把变体参数改为 `legacy`，并换一个空目录，两者互斥：

```sh
node scripts/fixtures/synthetic-companion.mjs --out /tmp/her-world-synthetic --variant current
```

盘点只输出路径、大小、表名、行数、已知记录数量和登记差异；浏览器存储显示为待主人检查，不读取正文或打印绑定值。它在隔离镜像中检查绑定和数据库，完成后清理镜像：

```sh
node scripts/migrate/inventory.mjs --installation /tmp/her-world-synthetic/installation.json
```

查看待做步骤或当前状态：

```sh
node scripts/migrate/companion-migrate.mjs plan --installation /tmp/her-world-synthetic/installation.json
node scripts/migrate/companion-migrate.mjs status --installation /tmp/her-world-synthetic/installation.json
```

执行前退出全部 DSH 并确认所有写入者停下。正式探测无法确认停写时会拒绝；不拿日常 DSH 作为合成演练环境。备份目录必须是源目录之外的新目录：

```sh
node scripts/migrate/companion-migrate.mjs run --installation /tmp/her-world-synthetic/installation.json --backup /tmp/her-world-migration-backup
```

进程中断后，续做会核对并沿用原备份，不另建备份；先检查状态，再续做：

```sh
node scripts/migrate/companion-migrate.mjs run --installation /tmp/her-world-synthetic/installation.json --resume
```

失败只输出固定原因代码和说明，退出码非 0。完成日志会拒绝再次全新执行；`lock-held` 要求先确认没有迁移进程，再按提示处理遗留锁。当前 plan/status、锁外预检和部分拒绝路径仍可能生成源 Core 的 WAL/SHM，并发预检也可能遇到 SQLite 锁竞争；已登记为源码检出中 `docs/product.md`「已知问题」第 5 条，迁移锁尚未消除此影响。

回退使用原有恢复器；它会先备份当前状态、保留送达/额度等不可回退记录，并要求安装包指纹一致。迁移期间备份的锁会随恢复回来：

```sh
node scripts/companion-backup.mjs restore --installation /tmp/her-world-synthetic/installation.json --backup /tmp/her-world-migration-backup --before /tmp/her-world-before-restore
```

原有恢复 CLI 的输出不属于迁移/盘点的固定原因与隐私输出契约；真实数据检查点不能把其原始输出交给 Agent。开发演练只用合成副本。

真实副本检查点（M3、阶段 2、阶段 3 还会再做）在独立设备上跑：源机退出 DSH 后，打包伙伴 Repo、安装包和源码 bundle，用隔空投送或移动硬盘传过去，不经云端；新设备按 [portability.md](portability.md)「Move to another device」安装绑定，再盘点、迁移、回退、续做。设备 profile 里的语音、附件不随 Repo 走，新设备上为空属于预期。盘点只给出未登记 kind 的个数；要查是哪几种，只按冒号前的前缀聚合计数，不输出完整 kind 和字段值。恢复命令的输出重定向到本机日志，只取退出码和 `restored` 字段。

<a id="baseline-counting"></a>
## 典型修改的计数

固定起点为 `bfe069f`（M1 基线）；M2 复测的起点是 `d865bff`，5a 重测的起点是 `754a0a5`，分支见 [product.md](product.md#典型修改前后对比)。先把修改提交到对应的实验分支，再将 `<分支>` 替换为该分支名执行（M2 复测把 `bfe069f` 换成对应起点）：

```sh
git diff --stat bfe069f..<分支>
```

只统计起点与实验分支之间已提交的差异。分为 `src/`、测试和其他，其他包含跟踪的 build 产物；不为压低数字删除这些差异。按 `arch/layers.json` 的文件根映射模块和层，测试及 `dist/src` 归回相应源码模块，不另造测试层；位于 `src/` 的生成文件仍计入其物理模块，并注明它的生成源。三个分支都只度量，不合并。

G5 的规则、词表和模块边使用上面的架构报告及其现有 `scan()` 结果人工归组；修复批次结合提交说明、源码/测试差异和已保存的执行结果逐个判断，附随生成文件、文档和合并不重复计。它尚无独立的仓库度量命令。

## 全量验证与发布

```sh
pnpm run verify
```

这是共享的 PR/发布检查：环境、类型、架构棘轮、一次构建，所有编译后的 TypeScript 和 JavaScript 测试入口各一次，Python Memory 测试、发布校验，以及一次归档和包闭包/完整性检查。种地、钱包、库存、去重、Memory、连续性、备份恢复与存储归属的回归仍在其中；测试使用可丢弃数据，不调用付费模型。Memory 进程测试需要本机回环；沙箱拒绝监听应记录为环境失败，不是召回失败，不能记成通过或跳过。

发布工作流会自行执行它。日常只做相关快测；已提交且干净的源码无需另做发布副本再重复全量验证。发布入口及脏工作区的隔离方法见 [发布与更新说明](github-updates.md)。

## 可选原生检查

`scripts/checks/`、`tests/manual/` 中的原生与窗口检查需要显式指定的隔离环境，不对个人伙伴数据运行。

- `test:native-context`：已安装 DSH 的原生循环与落盘，使用本机脚本模型，核对上下文、互动确认、原始记录和已接受计划。
- `test:native-services`：跨会话 Bank 召回及 provider 重启。
- `test:native-life`：限定作用域的回顾读写、越界拒绝、纠正/撤回、原生历史恢复及压缩连续性。
- `test:room-refresh`：可选的 macOS Room 合成器与窗口检查。

这些检查不安装或更新 DSH。已安装环境里的主人验收，与源码、包和脚本宿主验证分开。

对明确选中的原生日志，可用只读检查比较上下文呈现：

```sh
pnpm run check:context-payload -- /absolute/events.jsonl.zstd --day YYYY-MM-DD --offset-hours 7
```

结果是按请求加权的文本字符数，不是计费 token 或实测缓存节省；重叠估计不能相加。

## 运行时与数据边界

DSH 拥有聊天和调度。各模块拥有自己的数据并暴露显式接口，呈现端和读取器不新建助手运行时，不独立写 Memory。当前状态使用原生必需的尾部快照和 surface 替换；原始事件、对话、互动回执和阅读文本仍保留。历史维护在原生空闲时准备，在下一次真实请求中应用，不另调模型。Memory、压缩、回顾和来源撤回保持现有拥有者。设置和存储细节见 [设置](settings.md) 与 [可搬迁存储](portability.md)。

已接受的 Life 步骤按实际完成事件续行，无需模型再次决定。身体在提交前明确拒绝时保留原操作，等主人互动完成后继续；提交结果未知时仍须核对原回执。集成测试经真实协调器驱动这些转移，不手动推进下一步。

送达确认和共享 Memory 召回分开。已准入的领域事实保持系统证据及原始执行者和来源，传输信封只作证据。跨会话检查须在首个会话确认事实后，由第二个会话真正调用 provider recall，不能把已知事实 ID 直接塞给它。

Body 在现有 home 检查点保留可选 `gardenClockEnabled` 元数据。显式暂停 Life 会冻结作物时间，组件挂起保留时钟意图；恢复前的查询保留经过的生长量。Economy 拒绝倒退已有生长或结算时钟的检查点；无法重建旧存档中已丢失的进度。

回顾回归包含 `tests/life/life-review-runtime.test.mjs` 及编译后的 `life-review-files`、`review-continuation`、`life-sleep-continuity`，覆盖按日重试、重启核对、历史日记保护，以及经 Life/Body 协调器完成实际睡眠，不用付费模型。

运行时 exports、原生 bundle ID 和伙伴数据格式保持稳定。`dist/src` 保留给 GitHub 安装，发布工作流将它与已验证源码一起构建并冻结；`dist/tests`、source map、缓存、工具和个人伙伴数据不交付。普通 build 校验内置媒体，可选重新生成使用 `src/behavior/animation-allocation.json` 与 `art/` 素材。

素材交接、画布与锚点、时序、视觉验收及登记见源码检出中的 `docs/animation-standard.md`。
