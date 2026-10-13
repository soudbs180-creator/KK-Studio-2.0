# Plan：开发协作流程

- Task ID：`TASK-DOCS-STRUCT-001`
- 状态：IMPLEMENTED
- 日期：2026-10-10
- Intent / Spec / ADR：本目录 `intent.md`、`spec.md`；设计说明 [`docs/superpowers/specs/2026-10-10-development-workflow-design.md`](../../superpowers/specs/2026-10-10-development-workflow-design.md)
- Owner / branch / worktree：root / 当前共享 checkout `main` / `D:\kk-studio\KK-Studio-2.0`；账本延续任务保留其历史 branch 字段 `docs/TASK-DOCS-STRUCT-001`，本次不改 branch 或创建新 worktree
- Base / HEAD SHA：实施前 `b7c7266e`；当前共享 HEAD `8933692e`；独立 review 已按当前 exact HEAD 复核，最终边界和复跑结果见 verification/review
- Git dirty/index 状态、并行任务与文件归属：已有 Tauri、治理审计和工作树记录的并发改动；本任务只写治理文档和交付包

## 实施顺序

1. 登记账本任务并转为 `IN_PROGRESS`。
2. 新增 `DEVELOPMENT-WORKFLOW.md`，定义领取、确认、状态、笔记、验证、根因和竞品节奏。
3. 最小扩展五个模板，补齐状态、成果、边界和防复发字段。
4. 更新文档索引、SDLC、竞品目录和 `PROGRESS.md`。
5. 创建本交付包，运行 JSON、Markdown、治理、目标、功能和 delivery 检查。

## 风险与恢复

- 遇到同文件并发改动时保留双方内容，暂停冲突文件，不整文件覆盖。
- `pnpm-lock.yaml` 不是项目支持的锁文件；本轮将重新生成的忽略文件按 SHA 移出主 checkout 并写入 retention manifest，未删除原件且未修改 npm/package-lock。
- 若状态证据不足，保持 `REVIEW`/`PARTIAL`，不得提前写 `DONE`。

## 计划变更记录

- 2026-10-10：按已通过设计执行；未扩大产品范围，未创建第二状态源。
- 2026-10-10：发现既有 `TASK-DOCS-STRUCT-001` 已占用当前工作树，移除重复任务方案并在原任务上追加本流程范围；独立 review 已随并发主线推进至当前 `8933692e` 重跑。后续生成的忽略 pnpm 锁文件已可恢复隔离，治理门禁恢复为 0 violations。



