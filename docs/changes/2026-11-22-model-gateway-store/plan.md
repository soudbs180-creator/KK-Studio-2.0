# Plan：统一模型网关与本地模型商店

- Task ID：TASK-MODEL-GW-20261122
- 状态：IN PROGRESS
- 日期：2026-11-22
- Intent / Spec / ADR：本目录；ADR-027
- Owner / branch / worktree：root / `feat/TASK-MODEL-GW-20261122-gateway-store` / 根 checkout
- Base / HEAD SHA 与远端目标：base `e4383a1e`；远端 PR 待推送
- Git dirty/index 状态、并行任务与文件归属：根目录大量无关 dirty；本任务只写入下列步骤文件

## 开工证据

- 已读取：AGENTS、AI_RULES、PROMPTING、ADR-023、FEAT-038、localModel*、ai-gateway scheduler
- worktree:check ACTIVE_WORKTREE_BUDGET_EXCEEDED（PRE-EXISTING）
- 计划中 AI 自主事项：领域契约、路由模块、FastVideo 适配、设置 UI 扩展、单测、功能卡与账本

## 实施顺序

| 步骤 | 文件/模块 | 改动和目的 | 依赖 | 验证 |
| ---- | --------- | ---------- | ---- | ---- |
| 1 | `docs/changes/2026-11-22-model-gateway-store/*`、ADR-027 | 规格与裁决 | — | 文档评审 |
| 2 | `localModelStore.ts`、recommendations fitTier、设置 UI | 商店生命周期与硬件分级 | 1 | unit |
| 3 | `providerPoolRouting.ts`、scheduler 接线、单测 | 多源路由 | 1 | unit |
| 4 | `fastVideoAdapter.ts`、能力声明、单测 | 视频后端候选 | 1 | unit；实机后置 |
| 5 | FEAT-040、ledger、PROGRESS、verification | 治理同步 | 2–4 | features:check |

## 风险与恢复

- 最危险：误嵌 AGPL 或伪造模型 SHA → 禁止；社区包默认不可安装直到 pin。
- 无关 dirty 不得混入本任务提交。

## 验证和交付

- 定向：`localModelStore`、`providerPoolRouting`、`fastVideoAdapter`、既有 recommendations 回归
- 实机 FastVideo / 大文件下载：NOT VERIFIED
- 文档与账本随交付更新
