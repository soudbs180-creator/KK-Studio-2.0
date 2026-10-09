# Verification：P0 evidence refs

## 基线事实

- Base: `3d358f0ae41f5de4ba9ca0bddfef07a941b4b064`.
- 原 Hosted quality run [37915637393](https://github.com/soudbs180-creator/KK-Studio-2.0/actions/runs/37915637393) 的 verify 明确报告：TASK-FIX-PUSH-GUARD-SPACES-001 缺少 `docs/audits/KK-Studio-功能状态审计-2026-09-25.md`；TASK-PERF-CANVAS-1000-001 与 TASK-PROTECT-BATCH-GEN-001 缺少 `docs/plans/KK-Studio-功能台账与四向推进-2026-10-09.md`；另有 TASK_LEDGER stale，共 4 violations。
- 当前树中确认存在：本登记包 `docs/changes/2026-10-09-p0-registry/verification.md`、`docs/features/feat-038-canvas-scale.md`、`docs/features/feat-039-batch-guard.md`。

## 修复边界

- 三个任务仍为 TODO / NOT_VERIFIED。
- push guard、千节点性能、批量生成防护均未实现，本 PR 仅修复引用与生成视图。
- Hosted verification for this head is required; no local result is substituted.
