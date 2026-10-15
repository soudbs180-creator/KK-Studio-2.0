# Intent: 收敛 PR49/52 并融合 PR58 与当前主线

- Task ID: TASK-CHERRY-RED-001
- 日期: 2026-10-15；Owner: root
- 授权来源: 用户要求先核对 #49/#52 是否被 #53 替代，再处理 #58 冲突，验证后合并；保留所有未提交改动，不删除工作区或分支。
- Branch: `codex/TASK-CHERRY-RED-001-mainline`
- Worktree: `D:/kk-studio/.worktrees/TASK-CHERRY-RED-001`，开工时 clean。
- 原 head: `26f7556946542a2ed529dee0623d57cfb91aad8e`
- 集成 base: `cbda65e4389fc807769a8faf7654892415992589`
- 原规格: [Cherry 红框规格](../2026-10-13-cherry-red-scope/spec.md)。当前结果见 [verification](verification.md)。

本轮只整合已经授权的功能和修复。#49/#52 的推送防护目标已由 #53 实现；旧证据、两个未承接规划任务和功能 ID 冲突另有核对记录，原分支保留。#58 中仍缺失的助手、多模型对话、Markdown/本地分享、MCP 与桌面能力需要和最新主线兼容，不允许整文件覆盖掉新 UI、凭据事务、恢复或协议安全。

不执行清理、强推、直接推 main、生产发布、真实付费 Provider 调用，也不触碰日常客户端和原主仓的并发改动。
