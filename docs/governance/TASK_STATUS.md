# Task status snapshot

- docId: TASK_STATUS
- status: current
- updatedAt: 2026-10-17
- source: `docs/governance/task-ledger.json`
- supersededBy: null

> 快照日期：2026-10-17 · 数据源：`docs/governance/task-ledger.json` · 本文不替代权威账本。

本文是当前任务路由快照，不创建第二份任务状态。任务身份由稳定的 `taskId` 决定；同一任务更新时只更新账本记录的 `updated` 日期，不新增第二条 current 记录。历史 change package 只用于追溯，并按其记录的日期、commit 和证据解释。

当前账本包含150项任务：85 `DONE`、1 `IN_PROGRESS`、12 `TODO`、49 `PARTIAL`、3 `BLOCKED`、0 `REVIEW`，共65项未关闭。以[task-ledger.json](task-ledger.json)为权威；[TASK_LEDGER.md](TASK_LEDGER.md)为生成视图。

TASK-CHAT-MIGRATION-20261017 PARTIAL/NOT_VERIFIED：Desktop/Web 2.1.37（Mobile 2.1.1规划），冻结源码89b8291b；默认原9项目已迁移snapshot3、11个独立聊天上下文，repositoryId和原始资料保持；编辑、旧历史持久化及正常关闭重开证据见本轮验证。真实新回复仍未验收：Codex共享周额度100%、ordinaryUsageAllowed=false，发送前拒绝，/turn提交0；预计北京时间2026-10-23 04:08:15重置。未消耗reset、未购买额度或绕过保护。 本地完整验证和原始保全通过不代替真实回复或Hosted；原审计A–D保持历史DONE，统一范围和37功能成熟度不批量结案。见[迁移验证](../changes/2026-10-17-chat-migration/verification.md)。

旧TASK-UI-FULL/source241/Browser747等路由已由当前事实替代，仍保留于对应历史change package及verificationHistory。

如果本快照过期，应更新 `updatedAt` 与快照数字；如果不再承担当前路由，则写 `status: superseded` 和 `supersededBy: <新入口>`。不得通过复制同一任务并改日期来制造新的当前记录。
