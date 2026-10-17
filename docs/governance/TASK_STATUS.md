# Task status snapshot

- docId: TASK_STATUS
- status: current
- updatedAt: 2026-10-18
- source: `docs/governance/task-ledger.json`
- supersededBy: null

> 快照日期：2026-10-18 · 数据源：`docs/governance/task-ledger.json` · 本文不替代权威账本。

本文是当前任务路由快照，不创建第二份任务状态。任务身份由稳定的 `taskId` 决定；同一任务更新时只更新账本记录的 `updated` 日期，不新增第二条 current 记录。历史 change package 只用于追溯，并按其记录的日期、commit 和证据解释。

当前账本152项：86 `DONE`、2 `IN_PROGRESS`、11 `TODO`、50 `PARTIAL`、3 `BLOCKED`，开放66项。以[task-ledger.json](task-ledger.json)为权威，[TASK_LEDGER.md](TASK_LEDGER.md)为生成视图。

TASK-SIDEBAR-CANVAS-20261018 IN_PROGRESS/NOT_VERIFIED：先完成侧栏pin/sort持久化，再宽图连线与fresh官方Native。原两parent保持PARTIAL；候选Desktop/Web2.1.39、实际Native2.1.38，7树14分支/预算5/4，不删移、不新建树。上轮安全边界source926/docsab2完成的事实保留于历史，不能代替新验收。见[本轮验证](../changes/2026-10-18-sidebar-canvas/verification.md)。

旧TASK-UI-FULL/source241/Browser747等路由已由当前事实替代，仍保留于对应历史change package及verificationHistory。

如果本快照过期，应更新 `updatedAt` 与快照数字；如果不再承担当前路由，则写 `status: superseded` 和 `supersededBy: <新入口>`。不得通过复制同一任务并改日期来制造新的当前记录。
