# Task status snapshot

- docId: TASK_STATUS
- status: current
- updatedAt: 2026-10-18
- source: `docs/governance/task-ledger.json`
- supersededBy: null

> 快照日期：2026-10-18 · 数据源：`docs/governance/task-ledger.json` · 本文不替代权威账本。

本文是当前任务路由快照，不创建第二份任务状态。任务身份由稳定的 `taskId` 决定；同一任务更新时只更新账本记录的 `updated` 日期，不新增第二条 current 记录。历史 change package 只用于追溯，并按其记录的日期、commit 和证据解释。

当前账本151项：85 `DONE`、2 `IN_PROGRESS`、12 `TODO`、49 `PARTIAL`、3 `BLOCKED`，开放66项。以[task-ledger.json](task-ledger.json)为权威，[TASK_LEDGER.md](TASK_LEDGER.md)为生成视图。

TASK-LOCAL-GUARDS-20261018当前IN_PROGRESS/NOT_VERIFIED，限定不依赖额度的工作树检查、凭据缓存和测试证据边界；候选Desktop/Web2.1.38，完整验证和Native待本轮收据。7登记树/13本地分支，approved root计5/4，拒绝新增并保留现有树。上轮chat迁移已通过本地9项目11chat/历史编辑重开，真实新回复仍未验；不批量关闭原任务或提升37功能成熟度。见[本轮验证](../changes/2026-10-18-local-guards/verification.md)。

旧TASK-UI-FULL/source241/Browser747等路由已由当前事实替代，仍保留于对应历史change package及verificationHistory。

如果本快照过期，应更新 `updatedAt` 与快照数字；如果不再承担当前路由，则写 `status: superseded` 和 `supersededBy: <新入口>`。不得通过复制同一任务并改日期来制造新的当前记录。
