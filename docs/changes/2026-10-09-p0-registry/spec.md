# 登记包规格：P0 立项记录

## 1. 功能登记（features.registry.json 追加）

| 字段 | FEAT-038 | FEAT-039 |
|---|---|---|
| id | FEAT-038 | FEAT-039 |
| title | 画布千张画面性能 | 批量生成防护与资源回收 |
| area | canvas | creation |
| status | PLANNED | PLANNED |
| card | docs/features/feat-038-canvas-scale.md | docs/features/feat-039-batch-guard.md |
| tasks | TASK-PERF-CANVAS-1000-001 | TASK-PROTECT-BATCH-GEN-001 |

状态口径：仅计划/设计，无实现或 UI（符合 README 定义）；非 REAL 必须挂开放任务（TODO），已满足。

## 2. 任务登记（task-ledger.json 追加）

| 字段 | 值 |
|---|---|
| 任务 | TASK-FIX-PUSH-GUARD-SPACES-001 / TASK-PERF-CANVAS-1000-001 / TASK-PROTECT-BATCH-GEN-001 |
| status | TODO |
| priority | P0（全部） |
| branch | docs/TASK-P0-REGISTRY-20261009 |
| worktree | unallocated（TODO 允许） |
| verificationResult | NOT_VERIFIED |

验收标准逐条写入各任务 acceptance：空格/长路径 fixture、千节点 DOM 数量级、节流与分批入画布行为。

## 3. 关联视图

- `docs/features/README.md` 由 features:write 重新生成（37 功能）
- `docs/governance/TASK_LEDGER.md` 由 governance:write 重新生成（117 任务）
