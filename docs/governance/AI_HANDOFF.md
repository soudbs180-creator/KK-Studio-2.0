# AI恢复入口

- docId: AI_HANDOFF
- status: current
- updatedAt: 2026-11-03
- source: `docs/governance/PROJECT_STATE.md`
- supersededBy: null

1. 核对Git status、main与工作树，读取[当前状态](PROJECT_STATE.md)与[任务台账](task-ledger.json)。
2. 阶段1源码`71064b0e`已完成当前门禁与独立审查；W1原119项均有回执，open=0。详见[验收](../changes/2026-11-03-mainline-reset/verification.md)。
3. 立即继续阶段2：`features/comfyui`参数/编辑器与`features/image-edit`生产入口，沿用现有TaskHost、AssetPort与项目持久化。
4. Desktop优先；门禁通过即合入本地main、回收任务分支。P1-G/TYPES及阶段2未完成实现仍按台账执行。

[历史交接](../archive/AI_HANDOFF_20261103.md)只供追溯。
