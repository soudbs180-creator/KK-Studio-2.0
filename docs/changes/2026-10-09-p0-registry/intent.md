# P0 登记包：push 守卫修复 / 画布千张性能 / 批量生成防护

- 日期：2026-10-09
- 分支：docs/TASK-P0-REGISTRY-20261009
- 任务：TASK-FIX-PUSH-GUARD-SPACES-001、TASK-PERF-CANVAS-1000-001、TASK-PROTECT-BATCH-GEN-001
- 功能卡：FEAT-038（画布千张画面性能）、FEAT-039（批量生成防护与资源回收）

## 意图

把功能台账（`docs/plans/KK-Studio-功能台账与四向推进-2026-10-09.md`）中 P0 项正式立项：修复 push 守卫空格路径真实缺陷、登记画布千张性能与批量生成防护两张新功能卡及对应任务，纳入 features.registry / task-ledger 权威登记，后续开发按 worktree + PR 落地。

## 范围

- 新增功能卡 `docs/features/feat-038-canvas-scale.md`、`docs/features/feat-039-batch-guard.md`
- `docs/features/features.registry.json` 追加 FEAT-038、FEAT-039（PLANNED 起步，挂开放任务）
- `docs/governance/task-ledger.json` 追加 3 个 P0 TODO 任务
- 重新生成 `docs/features/README.md`（features:write）与 `docs/governance/TASK_LEDGER.md`（governance:write）
- 更新 `docs/PROGRESS.md` 登记本次推进

## 不在范围

- 不实现任何性能/防护代码（仅登记）；实现走后续独立 worktree + PR
- 不修改 push guard 脚本本身（修复动作是 TASK-FIX-PUSH-GUARD-SPACES-001 的验收内容，不在本登记包内改动代码）
- 不改动既有 34 张功能卡与 114 条任务的状态
