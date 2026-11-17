# 运行时工具链改用 mise + uv

- 级别：大改（改 CI 和发布工作流、项目规则）
- 状态：已确认
- 语言：本方案用中文（临时文件，合并时删除）；正式文档的改动按 `AGENTS.md:1-2` 写英文。

## 目标与外部变化

Her World 现在把 Node、pnpm、Python 装在仓库里的 `.tools/`，靠 `source ./scripts/env.sh` 拼 PATH、指定仓库内 pnpm store（`scripts/env.sh:9-10`）。仓库一挪位置，`.venv` 就坏，而 `scripts/setup-runtime.py:51` 只在 `.venv` 不存在时创建，重跑也修不好。本机现在已经由 mise 提供 Node 24.21.0 和 pnpm 11.25.0、由 uv 提供 Python（装在 `~/Developer/tools`），版本读仓库里现有的 `.node-version`、`.python-version`、`package.json:88` 的 `packageManager`。

改完后：

- **开发者**：不再 `source ./scripts/env.sh`，也不再跑 `setup-runtime.py`。在新开的终端里进仓库目录，`node`、`pnpm` 由 mise 按项目版本提供；第一次、挪了目录后、或者 `check:env` 报环境过期时，跑一条恢复命令：

  ```sh
  rm -rf .venv node_modules && mise install && uv venv --managed-python && uv pip install --python .venv/bin/python -r vendor/mnemosyne/requirements-test.lock && pnpm install --frozen-lockfile --ignore-scripts
  ```

  先删 `.venv` 和 `node_modules`：`.venv` 里的 `activate` 和入口脚本写的是创建时的绝对路径（例如 `.venv/bin/activate:81`、`.venv/bin/uvicorn:2`）；`node_modules/.modules.yaml:83` 记着旧 store，pnpm 11 在没有终端交互时遇到 store 变化会直接报错，不会自动重装。
- **`pnpm run check:env`** 检查的范围（写清楚，不夸大）：
  - Node 版本等于 `.node-version`（不再要求来自 `.tools/node`，也不检查来源）；
  - pnpm 版本等于 `packageManager` 里的版本（新增）；
  - `.venv` 的 Python 能运行、版本等于 `.python-version`（新增版本比较）；
  - `.venv/bin/activate` 里的 `VIRTUAL_ENV` 等于本仓库的 `.venv`（新增，挪了目录没重建会报出来）。
  - 它不证明锁文件里的 Python 依赖装全了；那由门禁 `pnpm run verify` 里的 Python 测试覆盖。
- **CI 和发布**：检查和发布步骤不变，只是准备运行时换成官方 action，不再在 runner 上拼 `.tools/`。
- **磁盘**：仓库里的 `.tools/`（290 MB）、Node 安装包缓存（50 MB）、仓库内 pnpm store（54 MB）不再需要；pnpm 包改用默认的全机 store。

## 范围变化

对应 `~/Developer/project-design/ideas/local-runtime.md:17` 的第 3 步，用户在会话里说「开始第 3 步 Her World 方案」。

- 新增目标替换或延期了什么：无。这个仓库没有 `docs/product.md` 和成文的阶段完成标准，这次不接入 dev-kit 流程的其他部分。比 brief 预估多出的 CI / 发布工作流、`.npmrc`、几份文档里的 `source ./scripts/env.sh`、`tsconfig` 的残留排除项，都是同一件事的必要部分。
- 当前闭环怎么验收：见「验收」。
- 原完成标准还算不算数：仓库本身没有阶段标准；brief 的成功标准（`local-runtime.md:18-20`：挪目录后一条命令恢复、同版本只存一份）就是这次的验收目标。
- 对应的用户场景：仓库从 `~/Developer/Codex Repo/Codex-Pet` 迁到 `~/Developer/Projects/Dafeiyu-World` 后 `.venv` 失效（`.venv/pyvenv.cfg:1` 至今指向旧路径）。

## 改动范围

- 这一步是：改逻辑（运行时的提供方式），业务代码不动。
- 允许修改：
  - `scripts/env.sh` — 删除。它有三项作用：导出 `CODEX_PET_ROOT`（仓库里没有别的消费者）、指定仓库内 pnpm store（`:9`）、把 `.tools` 和 `.venv/bin` 放到 PATH 前面（`:10`），都由新做法取代。
  - `scripts/setup-runtime.py` — 删除，由恢复命令取代。
  - `scripts/doctor.mjs` — 按上面「`check:env` 检查的范围」改第 23-30 行：删掉第 25 行的 `.tools/node` 路径检查，报错提示改成指向 `docs/development.md` 的恢复命令；pnpm 与 `packageManager` 比较；Python 版本与 `.python-version` 比较；读取 `.venv/bin/activate` 的 `VIRTUAL_ENV` 与 `<repo>/.venv` 比较。
  - `scripts/checks/verify.mjs:17` — `run('python', …)` 改成 `run('.venv/bin/python', …)`。
  - `package.json:95` — `test:memory` 里的裸 `python` 改成 `.venv/bin/python`。
  - `.npmrc:3` — 删掉 `store-dir=.cache/pnpm-store`（见拍板记录 2）。
  - `scripts/install-dsh.mjs:242-243` — 删掉那条「项目 store 不能替换 DSH store」的保护：它只在 `pnpm_config_store_dir` 等于旧的仓库内 store 时生效，删掉 `env.sh` 和 `.npmrc` 那一行后，再也没有东西会设这个值（见拍板记录 3）。
  - `.gitignore:6`、`.gitignore:9` — 删掉 `.tools`、`.pnpm-store/` 两行（`.venv`、`.cache/` 保留）。
  - `tsconfig.json:12`、`tsconfig.build.json:5` — 从 `exclude` 里去掉 `.tools`。
  - `.github/actions/project-runtime/action.yml` — 重写：`actions/setup-node@v4`（`node-version-file: .node-version`）、`pnpm/action-setup@v4`（不写 `version`，读 `packageManager`；不开 `run_install`）、`astral-sh/setup-uv@v6`（保留 `version: '0.12.5'`，不给 `python-version`，免得覆盖版本文件），然后 `uv venv --managed-python`、`uv pip install …lock`、`pnpm install --frozen-lockfile --ignore-scripts`。删掉 `.tools` 链接、`npm install --prefix .tools/pnpm` 和三个 `UV_*` 目录变量（`action.yml:13-24`）。
  - `.github/workflows/ci.yml:16`、`.github/workflows/release.yml:29`、`:54`、`:73` — 删掉 `source ./scripts/env.sh` 这一行，其余命令不变。
  - `AGENTS.md:12-14`（「Use the repo-local toolchain…」两句）— 改成：运行时版本来自 `.node-version`、`.python-version`、`packageManager`，由本机的 mise 和 uv 提供；恢复命令见 `docs/development.md`；不要为了构建本项目去改全局版本或已安装的 DSH 应用。
  - `docs/development.md:7-19`「Local tools」— 改写成：前提（mise、uv，以及 shims 在 PATH 上，指向 `~/Developer/dev-kit/README.md` 的「本机运行环境」）；恢复命令；什么时候重跑；从 `source` 过旧 `env.sh` 的 shell 迁移时要新开终端。
  - `docs/portability.md:224-228`、`docs/settings.md:468`、`art/life-animation-sources/README.md:20` — 删掉 `source ./scripts/env.sh` 或改成「在仓库目录里」；「repo-local Node 24 toolchain」改成「the project Node version」。
  - `docs/animation-standard.md:303` — 同上，但只在这份文档已经提交到 `main` 之后才改（见特殊情况）。
  - `docs/plans/runtime-toolchain.md` — 本方案，合并时删除。
- 必须复用：现有版本文件 `.node-version`、`.python-version`、`package.json:88`，不新增版本声明；现有锁文件 `vendor/mnemosyne/requirements-test.lock`、`pnpm-lock.yaml`；`scripts/doctor.mjs` 现有的 `check()` 结构；`action.yml:21` 已有的 `--managed-python`。
- 不做：
  - 不把 Python 依赖改成 `pyproject.toml` + `uv sync`。
  - 不改 `scripts/lib/device-runtime.mjs`。新装 DSH 绑定时，`--memory-python` 仍要求一个平台匹配、装好依赖、满足隔离检查的虚拟环境解释器（`scripts/lib/device-runtime.mjs:52-53`、`:89`），仓库的 `.venv/bin/python` 满足；托管流程会把基础 Python 和 venv 一起复制进设备目录（`:208`）。本机现有绑定是否已经独立于仓库，这次没读个人 DSH 配置，不作担保。
  - 不改 vendor 里上游文档的裸 `python` 写法（`vendor/mnemosyne/service/README.md:619` 等），那不是本项目的入口。
  - 不动 `.cache/release`（439 MB，发布流程的缓存）。
  - 不接入 dev-kit 流程的其他部分（`docs/product.md` 等）。

## 特殊情况

- **挪了目录没跑恢复命令**：`check:env` 的 `VIRTUAL_ENV` 检查失败，提示跑恢复命令。
- **本机没有 mise**：恢复命令在 `mise install` 失败；没有 uv：在 `uv venv` 失败。`docs/development.md` 指向 dev-kit README 的准备步骤。
- **shims 不在 PATH 上**（例如某个 Agent 的 shell）：找不到 `pnpm`，或者用了别的 Node。`check:env` 只比较版本，同版本但来源不同的 Node 不会被拦下；这是已知边界，写进 `docs/development.md`。
- **从 `source` 过旧 `env.sh` 的 shell 继续工作**：旧 PATH 和 `pnpm_config_store_dir` 还留在那个 shell 里，删掉文件也撤不掉。迁移说明写明新开终端；验收在新的登录 shell 里做。
- **恢复命令删掉了手工装进 `.venv` 或 `node_modules` 的东西**：这两个目录只该有锁文件里的依赖，恢复命令会按锁文件装回来。
- **CI 的 Python 来源**：保留 `--managed-python`，runner 上已有的同版本系统 Python 不会被选中；版本仍由 `.python-version` 决定。
- **CI 的 pnpm 版本**：`pnpm/action-setup` 读 `packageManager`，和本机 mise 用同一个声明；`action.yml:16`、`setup-runtime.py:47` 里写死的 `pnpm@11.25.0` 都去掉，版本只维护一处。
- **全机 pnpm store**：默认在 `~/Library/pnpm/store`，和项目在同一块磁盘上，可以硬链接，多个项目共用同一份包。目录里已经有内容，具体是谁在用没有核实。
- **动画文档还没提交**：`docs/animation-standard.md` 是工作区里别人的未提交文件，`docs/development.md` 末尾也有别人的未提交改动。执行开始前，如果动画文档已经提交，就一起改第 303 行；如果还没提交，就不改它，在「执行结果」里列为待办。合并时 `docs/development.md` 若仍有本地改动，git 会拒绝合并，要先由作者提交，或者用户决定怎么处理。
- **旧的本机文件**：合并后 `.tools/`、`.cache/node-v24.21.0-darwin-arm64.tar.gz`、`.cache/SHASUMS256.txt`、`.cache/pnpm-store`、`.cache/npm`、`.cache/uv` 不再使用，由 Claude 列清单、用户确认后删除（见拍板记录 5）。
- **打包**：打包的文件选择规则和业务运行时范围不变（`.tools`、`.venv` 本来就不在 `package.json` 的 `files` 里）；`docs/development.md`、`docs/portability.md` 会进包（`package.json:60`、`:81`），所以包里的文档内容会跟着更新。`check:package` 照常检查。

## 概念与扩展检查

- 删除的运行依赖：`.tools/` 仓库内工具链、`scripts/env.sh` 入口、`CODEX_PET_ROOT`、仓库内 pnpm store。
- 删除的残留配置和保护：`tsconfig*.json` 里的 `.tools` 排除项、`.gitignore` 的两行、`install-dsh.mjs` 里针对旧 store 的保护。
- 新增的概念：「恢复命令」，拥有者是 `docs/development.md`，`AGENTS.md` 链接过去，不重复写。
- 版本声明：复用现有三个版本文件；仓库内 pnpm 版本从三处（`package.json:88`、`action.yml:16`、`setup-runtime.py:47`）收成一处。
- 接口变化：业务接口、运行时导出、数据格式都不动；开发入口（不再 `source`）、PATH 来源、CI 准备步骤变了。

## 拍板记录

1. CI 怎么准备运行时 — 推荐：官方 action（`actions/setup-node@v4`、`pnpm/action-setup@v4`、`astral-sh/setup-uv@v6`），都由各工具自己维护，读同一组版本文件；备选：`jdx/mise-action`，和本机完全同一套机制，但多一个第三方依赖。决定：按推荐。
2. pnpm store 放哪 — 推荐：全机默认 store（`~/Library/pnpm/store`），满足「同一版本只存一份」；备选：保留仓库内 `.cache/pnpm-store`。决定：按推荐。
3. `install-dsh.mjs` 里针对旧 store 的保护 — 推荐：删掉，新做法下不会再触发，留着是死代码；备选：保留并加注释说明只为兼容旧 shell。决定：按推荐。
4. 恢复命令的形式 — 推荐：写在 `docs/development.md` 的一条命令；备选：加一个 `package.json` 脚本（mise 能提供 pnpm，但多一层）。决定：按推荐。
5. 合并后删旧文件 — 推荐：Claude 列清单（约 400 MB），用户确认后删，再跑一次恢复命令；备选：用户自己删。决定：按推荐。
6. 执行人 — 推荐：Codex 在 worktree 的 `codex/runtime-toolchain` 分支上实现，Claude 验收；备选：无。决定：按推荐。

## 验收

- 快测：`pnpm run check:env && pnpm run check:types`
- 门禁：`pnpm run verify`
- 手动（都在新的登录 shell 里做，不 `source` 任何脚本，命令用非交互方式跑，例如 `zsh -lc '…'`）：
  1. 在一个干净的 worktree 里（没有 `.tools/`、`.venv`、`node_modules`），只跑恢复命令，然后跑快测和门禁，全部通过。
  2. 把这个 worktree 挪到另一个目录，跑 `pnpm run check:env`，应该在 `VIRTUAL_ENV` 检查上失败；再跑恢复命令，`check:env` 通过。
  3. 在一个旧的 checkout 上（`node_modules` 记着仓库内 store），非交互地跑恢复命令，能成功。主 checkout 本身就是这种情况，合并后在那里做。
  4. 用户推送分支、开 PR 后，GitHub 上的「Source and runtime checks」通过（只能在 GitHub 上验证）。发布工作流要等下一次发版才会跑，在那之前算未验证。
  5. 合并后在主 checkout 删掉旧文件，跑恢复命令和门禁。

## 执行结果

## 审查结论
