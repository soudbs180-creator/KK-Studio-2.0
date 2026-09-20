# Plan

- ID：TASK-MAIN-CLOSE-002
- 独立分工：TASK-UI-CLOSE-003 负责页面视觉与交互；TASK-PERF-ASSETS-001 负责素材元数据、分页、预览和原件按需读取；治理审计保持只读。各自产出先提交在自己的 Codex 注册 worktree，主协调者拥有汇总分支和全局账本。
- 实施顺序：核对当前主线 → 检查规则和基线 → 处理动画采样竞态 → 审阅子任务差异与证据 → 集成 → 完整验证和三模式验收 → 更新账本 → PR/CI → 合并并同步根目录。
- 运行资源：1421、1423、9337 由主协调者分配，避免不同 checkout 共用端口导致误验收；重型编译与浏览器测量错开。
- 风险与回滚：每个子任务提交可独立回退；原 main 和用户的历史归档保留。其他用户任务的工作区不得修改。治理 PR 有并行作者时先读取状态，避免自动覆盖其最新版本。
- 验证命令：npm run lint、npm run typecheck、动画定向回归、npm run verify；素材原生契约改变时 cargo test/fmt/check 和 Tauri release；最终核对 git status、HEAD、origin/main、tree 和实际 bundle。
