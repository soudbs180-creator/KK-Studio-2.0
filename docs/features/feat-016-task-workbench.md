# 任务工作台与审批（FEAT-016）

- 状态：PARTIAL
- 领域：system
- 最近更新：2026-09-22
- 关联任务：T4、T5、UI-003、TASK-UI-006

## 用户可见入口

- 任务工作台（TaskWorkbench：Content/Review/Export）、任务执行审批（TaskExecutionApproval）、画布任务面板（TaskPanel/Popover）、批次矩阵（BatchMatrix）。

## 代码位置

- `src/components/TaskWorkbench*.tsx`、`TaskExecutionApproval.tsx`、`BatchMatrix.tsx`、`CommentRegion.tsx`
- 队列：`src/features/creation/generationQueue.ts`
- 画布任务：`src/components/canvas/TaskPanel.tsx`、`TaskPanelPopover.tsx`

## 测试与证据

- 浏览器：`task-workbench`、`task-intent`
- 单测：`generationQueue`、`deliveryPolicy`

## 当前能力

- 真实任务状态、批次进度、审批门禁、取消与重试；画布任务面板显示真实任务（演示任务明确标注）。

## 差距与后端化

- Planner、Compositor/Exporter 外部导出、外部分享为 Prototype。
- `$0.04/张`为示例价，未取得供应商报价；真实成本以平台计费为准（FEAT-018）。

## 变更记录

- 2026-09-21：创建卡片，状态 PARTIAL。

- 2026-09-22：TASK-UI-006修复折叠、HUD背景与弹层生命周期；关联 `tests/browser/ui-interactions.spec.ts`、`ui-interaction-matrix.spec.ts`，验收见 `docs/changes/2026-09-22-ui-interactions/verification.md`。不升级外部服务或分组持久化能力状态。
