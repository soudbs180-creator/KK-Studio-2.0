# Plan：MCP 配置上限修复

- Task ID：TASK-MINIMAX-001
- 状态：IMPLEMENTED（子项）
- 日期：2026-09-24
- Owner / branch / worktree：root / `fix/TASK-MINIMAX-001-mcp-registry-limit` / `D:/kk-studio/.worktrees/TASK-MINIMAX-001-mcp-registry-limit`
- Base：`origin/main@76339c9f`

## 顺序与冲突

1. 读取 AGENTS/AI_RULES、既有 MiniMax 审计、MCP 客户端与测试；定向测试和类型检查基线通过。
2. 新增第 51 项失败/同 id 更新测试，确认旧实现失败。
3. 共用读取上限，在写前拒绝超量；执行定向和完整验证。
4. 更新功能卡、账本、进度及五件套，记录新版协议独立任务。

编排任务 `TASK-ORCH-001` 在另一工作树并行推进。两分支相对 `origin/main@76339c9f` 有 7 个共享文档，其中 `git merge-tree --write-tree` 确认 `docs/PROGRESS.md`、`docs/features/features.registry.json`、`docs/governance/AI_HANDOFF.md`、`docs/governance/PROJECT_STATE.md` 四处内容冲突；业务源码没有同文件重叠。当前分支不读取或覆盖对方脏文件。按合并顺序在后合分支处理冲突，重生成功能/账本视图，重跑治理、相关测试及交付检查。

无外部凭据、费用、发布或数据迁移。若验证失败，保留原始存储记录并修正代码，不清空用户配置。独立 review 对最终 SHA 另行进行。
