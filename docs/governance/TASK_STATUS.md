# Task status snapshot

- docId: TASK_STATUS
- status: current
- updatedAt: 2026-10-17
- source: `docs/governance/task-ledger.json`
- supersededBy: null

> 快照日期：2026-10-17 · 数据源：`docs/governance/task-ledger.json` · 本文不替代权威账本。

本文是当前任务路由快照，不创建第二份任务状态。任务身份由稳定的 `taskId` 决定；同一任务更新时只更新账本记录的 `updated` 日期，不新增第二条 current 记录。历史 change package 只用于追溯，并按其记录的日期、commit 和证据解释。

当前账本包含149项任务：84 `DONE`、2 `IN_PROGRESS`、12 `TODO`、48 `PARTIAL`、3 `BLOCKED`、0 `REVIEW`，共65项未关闭。状态、负责人、依赖和证据以[task-ledger.json](task-ledger.json)为唯一事实源；[TASK_LEDGER.md](TASK_LEDGER.md)是生成视图。

当前安全修复入口为TASK-AUDIT-REPAIR-20261017：A core保全通过，原main8c/63条dirty在221560a3隔离快照，候选Desktop/Web2.1.36，当前unit1812PASS/14SKIP、lint和4项浏览器/Rust bin预检通过；完整verify、C与最终SHA验收仍NOT_VERIFIED。26项缺失目录、5个旧REVIEW与HOME及branch不符的审查任务已保留完整历史，再按当前分配改unallocated/PARTIAL；不是批量结案。原统一任务继续开放，旧树仅历史来源，新安全修复由本审计task独占承接。详细状态和实际结果见[本轮验证](../changes/2026-10-17-audit-repair/verification.md)，不能用旧UI/Native/Hosted PASS代填。

旧TASK-UI-FULL/source241/Browser747等路由已由当前事实替代，仍保留于对应历史change package及verificationHistory。

如果本快照过期，应更新 `updatedAt` 与快照数字；如果不再承担当前路由，则写 `status: superseded` 和 `supersededBy: <新入口>`。不得通过复制同一任务并改日期来制造新的当前记录。
