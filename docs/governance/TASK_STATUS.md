# Task status snapshot

- docId: TASK_STATUS
- status: current
- updatedAt: 2026-10-18
- source: `docs/governance/task-ledger.json`
- supersededBy: null

> 快照日期：2026-10-18 · 数据源：`docs/governance/task-ledger.json` · 本文不替代权威账本。

本文是当前任务路由快照，不创建第二份任务状态。任务身份由稳定的 `taskId` 决定；同一任务更新时只更新账本记录的 `updated` 日期，不新增第二条 current 记录。历史 change package 只用于追溯，并按其记录的日期、commit 和证据解释。

当前账本153项：89 `DONE`、2 `IN_PROGRESS`、11 `TODO`、48 `PARTIAL`、3 `BLOCKED`，开放64项。以[task-ledger.json](task-ledger.json)为权威，[TASK_LEDGER.md](TASK_LEDGER.md)为生成视图。

TASK-COLDSTART-LOCAL-20261018 IN_PROGRESS/NOT_VERIFIED，先核查真实默认冷启全部字段严格一致。候选Desktop/Web2.1.40尚未完成全量与Native验收；原首次cold FAIL保留，同实例activation PASS不作cold证明。开工9树141dirty保全PASS，main现96dirty另存且不回退并发变动。9树17分支、预算5/4、7分配路由零失配，全部保护。见[当前验证](../changes/2026-10-18-coldstart-local/verification.md)。

前轮TASK-SIDEBAR-CANVAS-20261018 有界本地DONE/PASS/source50412d4e，侧栏pin/sort及宽图实际Web/fresh2.1.39 Native已验，原两父任务本地技术验收DONE。3条旧无效路由改unallocated/NOT_VERIFIED并保留完整历史，未伪造其功能完成；7树14分支/预算5/4，全部保留。完整验证、原库9项目11聊天22消息保全及最终精确HEAD/日常启动收据边界见[本轮验证](../changes/2026-10-18-sidebar-canvas/verification.md)。

旧TASK-UI-FULL/source241/Browser747等路由已由当前事实替代，仍保留于对应历史change package及verificationHistory。

如果本快照过期，应更新 `updatedAt` 与快照数字；如果不再承担当前路由，则写 `status: superseded` 和 `supersededBy: <新入口>`。不得通过复制同一任务并改日期来制造新的当前记录。

复验关闭：首次852含1flaky的事实错误已撤回，真实429健康标记时序及V3夹具已修；精确504完整854首试零flaky、新官方EXE/fresh与原库Native通过。原拒收/失败保留；精确最终文档HEAD、Delivery和日常还原以外部收据为准。
