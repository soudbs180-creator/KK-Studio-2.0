# Task status snapshot

- docId: TASK_STATUS
- status: current
- updatedAt: 2026-10-18
- source: `docs/governance/task-ledger.json`
- supersededBy: null

> 快照日期：2026-10-18 · 数据源：`docs/governance/task-ledger.json` · 本文不替代权威账本。

本文是当前任务路由快照，不创建第二份任务状态。任务身份由稳定的 `taskId` 决定；同一任务更新时只更新账本记录的 `updated` 日期，不新增第二条 current 记录。历史 change package 只用于追溯，并按其记录的日期、commit 和证据解释。

当前账本包含150项任务：86 `DONE`、1 `IN_PROGRESS`、12 `TODO`、48 `PARTIAL`、3 `BLOCKED`、0 `REVIEW`，共64项未关闭。状态、负责人、依赖和证据以[task-ledger.json](task-ledger.json)为唯一事实源；[TASK_LEDGER.md](TASK_LEDGER.md)是生成视图。

TASK-WEB-RELEASE-20261017本次有界DONE/PASS：main f730 / 正式v2.1.38已部署独立手机Web，生产九项首试全过，用户实际手机UI确认正常；current38/previous37恰好两个受管目录、原37完整155文件保留，旧4a06ea8受管目录已回收。临时root授权已撤、原授权恢复，本次两私钥与隔离测试已清理；其他149对象保持。完整证据见[最终生产验证](../changes/2026-10-18-web-mobile-production-receipt/verification.md)。FEAT-028保持PARTIAL、T12开放，最终文档HEAD审查/Hosted/Delivery另由文档PR记录。

以下为2026-10-17历史审计范围，不代表本次Web发布状态：TASK-AUDIT-REPAIR-20261017仅有界本地A–D DONE/PASS：source4699458d / Desktop-Web2.1.36完整verify、精确源码独审、官方build/隔离Native与日常两链接正常关闭重开通过，原始资料及恢复证据保全。默认9项目旧聊天资料仍READ_ONLY，raw/identity/shared memory保持；迁移/protocol7和原统一scope继续开放。原148任务完整对象与37功能成熟度/runtimeEvidence不变，不批量DONE。旧75浏览器12FAIL、8026中止、d356默认菜单遮挡真实FAIL及复验全过程见[验证](../changes/2026-10-17-audit-repair/verification.md)。最终文档HEAD review/Delivery以提交后收据为准，Hosted/发布/真实Provider/用户验收未执行。

旧TASK-UI-FULL/source241/Browser747等路由已由当前事实替代，仍保留于对应历史change package及verificationHistory。

如果本快照过期，应更新 `updatedAt` 与快照数字；如果不再承担当前路由，则写 `status: superseded` 和 `supersededBy: <新入口>`。不得通过复制同一任务并改日期来制造新的当前记录。
