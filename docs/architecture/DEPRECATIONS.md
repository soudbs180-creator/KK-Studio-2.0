# 弃用与兼容跟踪

- docId: DEPRECATIONS
- status: current
- updatedAt: 2026-10-28
- source: TASK-ORG-1；四文档补篇A3/B5/B8
- supersededBy: null

本清单记录已明确立项的兼容垫片、旧协议和退役计划。目录/文档流程见[REPO-LAYOUT](REPO-LAYOUT.md)，能力与协议版本原则见[MODULARITY](MODULARITY.md)。代码中的deprecated标记不自动意味着用户已批准删除。

## 登记与移除条件

每项记录旧入口/版本、替代方案、影响调用方及数据、owner、到期任务、引入/弃用版本、最早移除版本和验收证据。保留至少一个发布周期，并满足N/N-1契约兼容要求及既有旧版测试；日期不能代替真实发布/迁移完成证据。

| 已确认退役项 | 替代与影响 | 任务/owner | 弃用/移除版本 | 当前证据 |
| --- | --- | --- | --- | --- |
| 尚未完成逐项登记 | 此表初建，不能据空表宣称全仓无弃用债务 | TASK-ORG-1 / root | 未确定 | 本卡仅建立入口，不执行删除 |

P3d候选已实现Provider旧路径兼容导出；其余旧插件策略、协议退役和文档迁移仍须单独登记。TEST_READY/TEST_INFRA仍是候选，不据此删除。

| P3兼容入口 | 单一实现替代 | 任务/owner | 最早移除条件 |
| --- | --- | --- | --- |
| creation/providerRegistry、providerCredentials、providerCoordination、providerSaveRecovery | integrations/providers | TASK-MOD-P3-COMPAT / root | 首个包含P3的正式发布后至少一个周期，调用者迁移与旧版回归通过 |
| creation/model、snapshotCodec、chatMigration、taskRecovery、taskRetryAvailability、mediaAlphaPreservation、textProtocolEvent | domain纯核心；window存储I/O仍留适配器 | TASK-MOD-P3-COMPAT / root | 同上，不删除旧项目/任务/资产 |
| creation/CanvasImageCommand、agent/chatProjectUpdate、image-edit/mask/schema与snapshot纯解析出口 | runtime共享Context、domain纯函数 | TASK-MOD-P3-COMPAT / root | 同上，保持单一Context/函数/类身份 |

Desktop/Web2.1.49和契约1.3.0仍是源码候选，没有正式发布/到期回执；详细取舍见[ADR-029](adr/ADR-029-feature-cycle-decoupling.md)。
