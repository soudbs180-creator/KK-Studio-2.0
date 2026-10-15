# Task status snapshot

- docId: TASK_STATUS
- status: current
- updatedAt: 2026-10-15
- source: `docs/governance/task-ledger.json`
- supersededBy: null

> 快照日期：2026-10-15 · 数据源：`docs/governance/task-ledger.json` · 本文不替代权威账本。

本文是当前任务路由快照，不创建第二份任务状态。任务身份由稳定的 `taskId` 决定；同一任务更新时只更新账本记录的 `updated` 日期，不新增第二条 current 记录。历史 change package 只用于追溯，并按其记录的日期、commit 和证据解释。

当前账本包含 140 项任务：82 `DONE`、0 `IN_PROGRESS`、12 `TODO`、34 `PARTIAL`、4 `BLOCKED`、8 `REVIEW`，共 58 项未关闭。任务状态、负责人、依赖和证据以 [`task-ledger.json`](task-ledger.json) 为唯一事实源；[`TASK_LEDGER.md`](TASK_LEDGER.md) 是生成视图。

PR59已合入当前main cbda65e4；TASK-CHERRY-RED-001正在源分支融合该基线，状态REVIEW/新组合NOT_VERIFIED，证据见[本轮verification](../changes/2026-10-15-cherry-mainline-merge/verification.md)。其他任务状态与未验边界保持账本原义，不能由本快照或mtime推断验收。

如果本快照过期，应更新 `updatedAt` 与快照数字；如果不再承担当前路由，则写 `status: superseded` 和 `supersededBy: <新入口>`。不得通过复制同一任务并改日期来制造新的当前记录。
