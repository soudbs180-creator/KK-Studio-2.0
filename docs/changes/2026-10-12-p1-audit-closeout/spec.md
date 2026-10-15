# 规格：P1 当前事实、门禁和证据边界

1. 当前事实必须绑定本地 `origin/main` ref、当前 checkout HEAD、clean/dirty 状态、实时任务/功能计数和 worktree 数量。
2. `branch-audit.mjs` 必须通过 Prettier，脚本逻辑和无共同祖先的诊断行为保持不变。
3. PR #53 的 merged SHA、head/base SHA、Hosted check conclusion 和 delivery skipped 状态必须原样记录；delivery skipped 不得升级为发布 PASS。
4. Windows 入口候选落后当前 main 时保持 TODO；`TASK-AGENT-010` 缺 Hosted、发布 receipt 和第二环境安装回读时保持 REVIEW/PARTIAL。
5. TaskState 与 AI Gateway 的本地缺口须记录为未完成实现或未验证外部能力，fixture、静态检查和历史 SHA 不得代填真实回执。
