# AI恢复入口

- docId: AI_HANDOFF
- status: current
- updatedAt: 2026-11-03
- source: `docs/governance/PROJECT_STATE.md`
- supersededBy: null

1. 核对 Git status、`main` 与工作树，读取[当前状态](PROJECT_STATE.md)与[任务台账](task-ledger.json)。
2. 阶段 1（治理降噪）与阶段 2（ComfyUI 参数/原生编辑器同步 + 重绘/扩图/高清修复/图层拆分生产接通）已完成验证并合入本地 `main`（版本 `2.1.64`），详见[阶段 2 验收](../changes/2026-11-03-comfy-production/verification.md)。
3. 立即推进阶段 3：真实多模态生成链贯通、剥离 `useLocalGeneration`（`FEAT-025`）假演示数据分支，以及音视频节点真实异步任务宿主接线（`BACKEND-MEDIA-001`）。
4. Desktop 优先；门禁通过即合入本地 `main` 并回收任务分支。

[历史交接](../archive/AI_HANDOFF_20261103.md)只供追溯。
