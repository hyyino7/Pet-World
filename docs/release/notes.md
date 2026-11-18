# Her World 0.2.0

在 DSH 里聊天、跨会话召回记忆、使用桌宠和 Room，以及通过 QQ 与伙伴互动，仍按原来的方式使用。

## 你会看到的变化

- 某个模块没有加载时，设置页中缺少的能力状态会显示「不可用」。工作区已绑定就绪而桌宠模块没加载时，设置页不再因此显示「已停用」，房间仍按自己的状态显示。长期记忆和哔哩哔哩保留各自原有的状态提示。
- 历史瘦身时，如果一轮对话里有已保存的输入无法归类，整轮都会保留。Life（自主生活）模块没加载时，已有的 Life 轮次也会保留原样。

## 如果你有插件或脚本直接调用 Core

`her-world/core` 的导入路径照旧。使用 `createCore()` 返回的 `PetCoreHost` 时，按下面的方式更新旧调用。

| 原来的写法 | 0.2.0 的写法 |
| --- | --- |
| 赋值 `host.native.lifeAdmission`、`roomAdmission` 或 `channelBoundary` | 用 `host.native.sourceTable.register(adapter)` 登记输入来源及准入规则，卸载时调用登记结果的 `revoke()`。判断会话是否为访客用 `host.native.isGuest(sessionId)`。 |
| 赋值 `host.native.playbackEvidence` | 用 `host.native.registerPlaybackEvidence(resolve)` 登记原来的查询回调，卸载时调用登记结果的 `revoke()`。 |
| 读写 `host.native.memoryEnabledForNewSessions` | 读取用 `host.native.memoryEnabledForNewSessions()`，设置用 `host.native.setMemoryEnabledForNewSessions(enabled)`。旧的 `if` 判断会把函数当作真值，记得加括号。 |
| `host.native.scopeFor(sessionId)` 或设置 `host.native.resolveScope` | 改用 `host.native.nativeScopeFor(sessionId)` 或设置 `host.native.resolveNativeScope`。 |
| 用 `host.workspace.runtime.baseCapabilities()` 读取能力行，或覆盖 `capabilities` 提供状态 | 用 `host.workspace.runtime.capabilities()` 读取当前状态，通过 `host.workspace.runtime.capabilityTable.register(row)` 提供自己的能力行。 |
| 直接启动 Memory 连接时，在 `host.native.memory.connection.start()` 的范围对象里传 `workspaceId` | 改传 `bankId`，值仍是伙伴的便携存储 ID。 |

工具的适用来源和历史概览可以用 `host.native.toolTable.register(declaration)` 登记。`her-world/contracts` 提供来源、工具和能力登记所需的 TypeScript 类型。

## 升级、迁移和回退

- **直接升级**。先留好升级前的离线备份和 0.1.8 安装包。从 npm 安装的 0.1.8，在 DSH 的 **Her World → 版本**页选择 0.2.0 更新即可，跳过迁移。通过 GitHub 安装的，先按说明切换到 npm，保留已绑定的伙伴工作区和 Core 私有配置。[离线备份说明](https://github.com/hyyino7/her-world/blob/main/docs/portability.md#offline-file-backup-and-same-machine-recovery) · [安装和更新说明](https://github.com/hyyino7/her-world/blob/main/docs/github-updates.md#dsh-installation-and-updates)
- **迁移演练**。只在隔离副本上做。仍使用 0.1.8 时先退出 DSH 并确认所有写入者已停止，再从新版对应的源码检出查看迁移计划、指定新目录执行带备份的迁移，成功后升级。迁移只补存储清单和迁移日志。[迁移步骤](https://github.com/hyyino7/her-world/blob/main/docs/development.md#migration-inventory)
- **回退**。在同一台设备、同一路径先换回与备份匹配的 0.1.8 安装包。完全退出 DSH 并确认停写后，用恢复工具先备份当前状态，再恢复升级前的备份，最后启动旧版。升级后新增的聊天在恢复后的旧版里看不到，已送达消息和已消耗额度也不会撤销。[安装和更新说明](https://github.com/hyyino7/her-world/blob/main/docs/github-updates.md#dsh-installation-and-updates)、[备份恢复步骤](https://github.com/hyyino7/her-world/blob/main/docs/development.md#migration-inventory)
