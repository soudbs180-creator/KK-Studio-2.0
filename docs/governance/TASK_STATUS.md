# Task status snapshot

- docId: TASK_STATUS
- status: current
- updatedAt: 2026-10-15
- source: `docs/governance/task-ledger.json`
- supersededBy: null

> 快照日期：2026-10-15 · 数据源：`docs/governance/task-ledger.json` · 本文不替代权威账本。

本文是当前任务路由快照，不创建第二份任务状态。任务身份由稳定的 `taskId` 决定；同一任务更新时只更新账本记录的 `updated` 日期，不新增第二条 current 记录。历史 change package 只用于追溯，并按其记录的日期、commit 和证据解释。

当前账本包含 139 项任务：82 `DONE`、1 `IN_PROGRESS`、12 `TODO`、34 `PARTIAL`、4 `BLOCKED`、6 `REVIEW`，共 57 项未关闭。任务状态、负责人、依赖和证据以 [`task-ledger.json`](task-ledger.json) 为唯一事实源；[`TASK_LEDGER.md`](TASK_LEDGER.md) 是生成视图。

当前 TASK-UI-FULL-20261015 继续全页面UI、主线保全及当前SHA验收，尚未DONE。其他需要优先回读的任务包括 Windows 入口恢复、图片编辑/移动端真实验收、Provider/Desktop 门禁、并发与来源契约、TaskState、AI Gateway、BYOK、Agent 入口和本轮规则治理。具体状态必须以账本和当前 head 的 verification 为准，不能由本快照或文件 mtime 推断。

如果本快照过期，应更新 `updatedAt` 与快照数字；如果不再承担当前路由，则写 `status: superseded` 和 `supersededBy: <新入口>`。不得通过复制同一任务并改日期来制造新的当前记录。
