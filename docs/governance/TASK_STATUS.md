# Task status snapshot

- docId: TASK_STATUS
- status: current
- updatedAt: 2026-10-17
- source: `docs/governance/task-ledger.json`
- supersededBy: null

> 快照日期：2026-10-17 · 数据源：`docs/governance/task-ledger.json` · 本文不替代权威账本。

本文是当前任务路由快照，不创建第二份任务状态。任务身份由稳定的 `taskId` 决定；同一任务更新时只更新账本记录的 `updated` 日期，不新增第二条 current 记录。历史 change package 只用于追溯，并按其记录的日期、commit 和证据解释。

当前账本包含149项任务：84 `DONE`、2 `IN_PROGRESS`、12 `TODO`、48 `PARTIAL`、3 `BLOCKED`、0 `REVIEW`，共65项未关闭。状态、负责人、依赖和证据以[task-ledger.json](task-ledger.json)为唯一事实源；[TASK_LEDGER.md](TASK_LEDGER.md)是生成视图。

当前安全修复入口为TASK-AUDIT-REPAIR-20261017，IN_PROGRESS/整体NOT_VERIFIED：A core及恢复通过；source d356791c / Desktop-Web2.1.36完整verify通过（Node1832PASS/14既有SKIP、Agent199PASS/2既有SKIP、产品Edge823首试、DESIGN41+8、development四步），精确源码独审PASS，Native不变源Rust213PASS/1硬件ignored+integration41/check/fmt通过。d356官方build与隔离Native六检查通过，两个日常链接已恢复；默认只读资料实际验收因恢复banner遮挡“查看”菜单FAIL，C待修，新source完整verify/独审/重建/日常复验及最终文档HEAD验收仍待。26项缺失分配、5个旧REVIEW与HOME及branch不符任务保留历史再纠正分配/状态，原统一scope继续开放；[本轮验证](../changes/2026-10-17-audit-repair/verification.md)保留75浏览器12FAIL/8026中止，不能拿新结果重写历史。
旧TASK-UI-FULL/source241/Browser747等路由已由当前事实替代，仍保留于对应历史change package及verificationHistory。

如果本快照过期，应更新 `updatedAt` 与快照数字；如果不再承担当前路由，则写 `status: superseded` 和 `supersededBy: <新入口>`。不得通过复制同一任务并改日期来制造新的当前记录。
