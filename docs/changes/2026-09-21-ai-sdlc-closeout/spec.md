# Spec — 合入后状态

- `origin/main` 必须精确回读为 PR #4 的 merge SHA `92c1ef17c42030ef6976e039efe4775c4bdc0939`。
- 账本、Progress、Project State、AI handoff、verification、review 和 branch reconciliation 必须描述当前合入事实，保留历史记录。
- 规则任务保留 PARTIAL，因为 GitHub protection/rulesets API 返回 403，服务器强制保护尚未生效。
- 只清理本次治理分支/工作树；其他任务和 dirty evidence 保留。
