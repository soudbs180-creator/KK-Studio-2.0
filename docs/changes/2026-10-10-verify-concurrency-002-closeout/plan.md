# Plan：并发复核合并后状态收口

- Task ID：TASK-VERIFY-CONCURRENCY-002
- 状态：IN PROGRESS
- 日期：2026-10-10
- Owner / branch / worktree：root / `codex/TASK-VERIFY-CONCURRENCY-002-closeout` / `D:/kk-studio/.worktrees/TASK-VERIFY-CONCURRENCY-002`
- Base：`origin/main@2b6c0ba10e17b873d5a38d85b2d38fb8848149cc`

1. 新建本 dated closeout package，记录 PR #46 的原始 head、squash merge SHA、origin/main tree 和合并后 Hosted run。
2. 更新权威 `task-ledger.json` 与 `docs/PROGRESS.md`，生成 `TASK_LEDGER.md`；保持任务 PARTIAL，关闭 IRV-CONC-002，保留 IRV-CONC-001 的 UNKNOWN 根因边界。
3. 运行 Markdown、治理、delivery、JSON 和 diff 检查；复核没有 source/config/evidence 变化。
4. 对最终 closeout head 做独立精确 head review，推送普通 PR，等待 Hosted 门禁后按默认 squash 合并，再 fetch/readback main。

任何新 source/config/evidence 变化都必须回到原始验证矩阵并重新审查；本包只处理合并后状态同步。
