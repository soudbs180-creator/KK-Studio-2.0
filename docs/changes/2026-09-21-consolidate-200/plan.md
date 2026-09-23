# KK Studio 2.0.0 Consolidation Implementation Plan

> 执行：按项目 AGENTS 的已授权自主流程，在当前独立目标 clone 的 task branch 串行实施；最终独立审查。使用 executing-plans / verification-before-completion，项目 change package 和 task ledger 为进度权威。

**Goal:** 四个工作目录收敛为一个最新、可运行、易分享的 2.0.0 工程。

**Architecture:** 目标 clone 与源 checkout 隔离。先保存全部非生成内容和 Git，再三方融合各候选。最后校验运行、生成精简分享包，确认可恢复后移除重复目录。

**Tech Stack:** Node 24 / React 18 / TypeScript / Vite / Tauri 2 / Rust / PowerShell。

**Spec:** [spec.md](spec.md)

## Global Constraints

- 唯一日常工程：D:/kk-studio/KK-Studio-2.0；版本基线 2.0.0。
- 不改变用户数据路径、schema、存储 key 和凭据服务；不覆盖 APPDATA。
- 不 force-push、不重写历史、不删除未保全的 dirty 内容。

## Review Focus

- 外部 Codex worktree 的 .git 绝对路径：修复到最终 common dir 后 status 能读取。
- Skill/MCP 两候选重叠：保留 Skill 草稿长度/启停保护与 MCP 确认调用。
- 安全分支未知受理/取消语义：相应用例必须继续通过。
- 分享 ZIP：无用户项目、凭据、.git、node_modules、target 构建缓存。
- 删除目录：物理路径必须为 D:/kk-studio 下预先指定的旧兄弟目录，且归档已逐文件验证。

## Tasks

- [x] 只读盘点 HEAD/tree/status/refs/worktrees/目录体积，读取规则与现行文档。
- [ ] 生成并完整校验 pre-consolidation.zip；将 46 个用户数据文件恢复到新临时目录并逐项验 hash。
- [ ] 在 chore/TASK-CONSOLIDATE-200 融合 closure、安全、本地能力和 MiniMax 增量；保留全部历史 refs，逐项解决代码和 ledger 冲突。
- [ ] 更新 AGENTS/README/现行存储和启动文档、包名与版本约定；移除已执行完的危险旧清理脚本，保留 Git 历史。
- [ ] 运行 npm run verify、Rust fmt/test/check 和 client build；三模式验证最终 bundle，并生成最新源码/桌面分享 ZIP 和 SHA256。
- [ ] 独立复核实际差异、恢复校验和删除清单；修复阻断项。
- [ ] 修复仍保留的外部 worktree 登记；清理目标内临时/重复目录和指定旧兄弟目录；记录实际剩余大小。
- [ ] 更新 verification/review/PROGRESS/PROJECT_STATE/AI_HANDOFF/ledger，交付当前版本与明确的远端门禁状态。
