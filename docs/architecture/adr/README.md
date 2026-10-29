# ADR（Architecture Decision Records）

本目录是**全项目唯一的 ADR 位置**。记录每个重要决策的「为什么选 A 不选 B」。

功能状态在 `docs/features/`，工程规则在 `AGENTS.md` / `AI_RULES.md`，但**为什么这样决定**只能在这里查。

> **历史说明**：2026-10-11 之前存在第二处 ADR 目录 `docs/decisions/`，其编号体系为 `0001-` 且与本目录的 `ADR-NNN` 冲突。已归并至本目录，该目录已删除。归并映射见下方「编号变更记录」。

## 编号规则

- 文件名格式：`ADR-NNN-kebab-title.md`，`NNN` 为三位序号。
- **编号全局唯一、只增不复用**。新 ADR 取当前最大编号 +1，不得填补历史空缺，也不得复用已删除编号。
- 编号表达**登记顺序**，不表达重要性或优先级。日期以文件内 `- 日期 / Task ID / Owner：` 字段为准，不用文件名排序判断新旧。
- 推翻旧 ADR 时：新增 ADR 并在「替代/被替代的 ADR」字段写明被替代编号；旧 ADR 保留原文，在头部标注 `- 状态：SUPERSEDED by ADR-NNN`。**禁止删除或改写旧 ADR 正文**。
- 纠错用追加勘误，不抹去历史。

## 格式

模板见 [`../../templates/adr.md`](../../templates/adr.md)。最少包含：状态、日期/Task ID/Owner、背景与约束、方案比较、决定、迁移/恢复/退出、验证与接受条件。

`ACCEPTED` 只表示决定已采纳，**不等于实现或发布已完成**——实现状态以任务账本与 verification 证据为准。

## 什么时候写 ADR

改变模块依赖、公共契约、平台职责、持久化格式、任务恢复语义、安全边界或重大依赖前必须写。普通局部实现不用新增 ADR。

判断法：3 个月后回来改这块代码，会不会想知道「为什么当初这么写」？会，就写。

- 用户做的产品/视觉决策，由 AI 整理成 ADR
- AI 做的技术决策，合并 PR 时补一份

## 编号变更记录

### 2026-10-11 编号去重与目录归并

原存在 3 组编号重复，且 3 份 ADR 是**互不相关的决策**（不是替代关系），因此按**登记时间先后**重新编号，不使用 superseded 语义：

| 原文件名                                      | 新文件名                               | 依据                                                                                             | 引用更新   |
| --------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| `ADR-002-taskhost-text-output.md`             | `ADR-012-taskhost-text-output.md`      | 2026-09-21，晚于同号 ADR-002（2026-09-17）                                                       | 无外部引用 |
| `ADR-006-google-interactions.md`              | `ADR-013-google-interactions.md`       | 2026-09-23，早于同号 ADR-006（2026-09-24），但被引用于 `changes/2026-09-23-google-interactions/` | 已同步     |
| `ADR-007-vps-portability.md`                  | `ADR-014-vps-portability.md`           | 2026-09-28，晚于同号 ADR-007（2026-09-23）                                                       | 已同步     |
| `decisions/0001-canvas-ui-token-alignment.md` | `ADR-015-canvas-ui-token-alignment.md` | 原属另一编号体系，归并后取当前最大号+1                                                           | 无外部引用 |

保留原编号不变的三份：`ADR-002-local-main-integration.md`、`ADR-006-stage-plan-package-contract.md`、`ADR-007-gemini-cli-bridge.md`。

`npm run index:check` 校验编号唯一性与目录唯一性。

## 现有决策

| 编号                                                                | 标题                                   | 状态     |
| ------------------------------------------------------------------- | -------------------------------------- | -------- |
| [ADR-001](ADR-001-task-isolation.md)                                | 任务隔离                               | —        |
| [ADR-002](ADR-002-local-main-integration.md)                        | 经验证候选进入本地主线                 | Accepted |
| [ADR-003](ADR-003-asset-metadata-paging.md)                         | 资产元数据分页                         | —        |
| [ADR-004](ADR-004-desktop-agent-runtime.md)                         | 桌面 Agent 运行时                      | —        |
| [ADR-005](ADR-005-agent-attachments-and-canvas-view.md)             | Agent 附件与画布视图                   | —        |
| [ADR-006](ADR-006-stage-plan-package-contract.md)                   | 阶段计划与项目包的跨端契约             | ACCEPTED |
| [ADR-007](ADR-007-gemini-cli-bridge.md)                             | Gemini CLI 本地登录桥                  | 本地候选 |
| [ADR-008](ADR-008-platform-versions-and-local-first.md)             | 平台版本与本地优先                     | —        |
| [ADR-009](ADR-009-image-model-capabilities.md)                      | 图片模型能力                           | —        |
| [ADR-010](ADR-010-unified-image-mask.md)                            | 统一图片蒙版                           | —        |
| [ADR-011](ADR-011-platform-delivery-gates-and-vps-control-plane.md) | 平台交付门禁与 VPS 控制面              | —        |
| [ADR-012](ADR-012-taskhost-text-output.md)                          | 在现有 TaskHost 保存文本输出           | 接受     |
| [ADR-013](ADR-013-google-interactions.md)                           | Google Interactions（既有项目边界内）  | —        |
| [ADR-014](ADR-014-vps-portability.md)                               | 静态 Web 版本与服务器数据分开搬迁      | PROPOSED |
| [ADR-015](ADR-015-canvas-ui-token-alignment.md)                     | 画布视觉走 token 体系，停止 Figma 直抄 | 已采纳   |

| [ADR-016](ADR-016-agent-and-provider-recovery.md) | Agent 会话归属与凭据保存恢复 | ACCEPTED |

| [ADR-017](ADR-017-unified-ui-and-collection-compatibility.md) | 统一 UI 与画布分类的兼容边界 | ACCEPTED；当前候选验收另记 |
| [ADR-018](ADR-018-provider-protocol-and-cli-execution.md) | 显式Provider协议与CLI执行边界 | ACCEPTED；当前任务验证另记 |
| [ADR-019](ADR-019-unified-local-repository-and-optional-account.md) | 统一本地仓库、可选账号与手动加密同步 | ACCEPTED；实现和发布未完成 |
| [ADR-020](ADR-020-project-lifecycle-in-creation-snapshot.md) | 项目生命周期保存在现有创作快照 | ACCEPTED；实现进行中 |
| [ADR-021](ADR-021-native-local-repository-authority.md) | Native统一仓库权威与重复启动 | ACCEPTED；基础已验，Web数据面与后台租约待 |
| [ADR-022](ADR-022-project-chats-and-v3-migration.md) | 普通多聊天与不可降级快照迁移 | ACCEPTED；实现与验收未完成 |
| [ADR-023](ADR-023-local-model-installation-and-owned-runtime.md) | 可信本地包安装与自有引擎 | ACCEPTED；实现与验收未完成 |
| [ADR-024](ADR-024-server-authoritative-mid-turn-steering-and-drain-boundary.md) | 服务端权威 Mid-turn Steering 与安全 Drain 边界 | ACCEPTED；实现待排期 |
| [ADR-025](ADR-025-mobile-12ai-originals-and-video-recovery.md) | Mobile 12ai 原件与视频查询恢复 | ACCEPTED；实现与发布验收进行中 |
| [ADR-026](ADR-026-modular-capability-architecture.md) | 模块化能力契约与依赖反转 | ACCEPTED；能力实现分阶段推进 |
| [ADR-027](ADR-027-architecture-ratchet-and-dependency-cruiser.md) | 架构依赖集合棘轮与自动门禁 | ACCEPTED；P0候选验证另记 |

| [ADR-028](ADR-028-capability-manifest-projections.md) | 能力声明、Port与单一清单投影 | PROPOSED；仅声明候选，协议投影待实施 |

| [ADR-032](ADR-032-independent-image-capabilities-and-lineage.md) | 独立图片能力与资产溯源 | ACCEPTED；源码候选，真实运行与主线待验 |
