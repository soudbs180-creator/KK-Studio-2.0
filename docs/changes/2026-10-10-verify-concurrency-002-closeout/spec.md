# Spec：并发复核合并后状态收口

- Task ID：TASK-VERIFY-CONCURRENCY-002
- 状态：PARTIAL
- 日期：2026-10-10
- 来源：[intent](intent.md)、[分支规则](../../engineering/BRANCH-POLICY.md)、[审查规则](../../engineering/REVIEW.md) 和前次并发复核包。
- 基线：`origin/main@2b6c0ba10e17b873d5a38d85b2d38fb8848149cc`。

本包只同步已经发生的状态：PR #46 原始 head `9ae856ea5229beb8b8d82516e1c308bd5e6f6a15` 已 squash 为 `2b6c0ba10e17b873d5a38d85b2d38fb8848149cc`，该 SHA 已在 `origin/main`，候选与落地主线 tree 均为 `6d78477b5da204bc7621acbbe7f520b5a9e655ef`。合并后 run `37983272823` 的 `verify`、`deploy-linux`、`upload-artifact` 成功，`delivery` 因 push 条件跳过。

文档仍如实保留两个边界：当前本地/Hosted 绿灯没有证明历史 source105 首轮失败的根因；真实 Provider、Mobile 和产品 UI 验收不在本任务范围。IRV-CONC-001 继续为有界 P2 follow-up，IRV-CONC-002 因主线回读和合并后 verify 已完成而关闭。

本包通过普通 PR 集成，不直接写共享 `main`，不改写历史证据，不清理用户工作树。生成的 `TASK_LEDGER.md` 由 `npm run governance:write` 刷新。
