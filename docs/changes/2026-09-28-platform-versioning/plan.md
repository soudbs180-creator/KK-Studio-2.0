# Plan：三端独立版本与本地数据目标

- Task ID：TASK-VERSION-001
- 状态：IN PROGRESS
- Owner / branch / worktree：root / `codex/TASK-VERSION-001-platform-versions` / `D:/kk-studio/.worktrees/platform-versioning`
- Base：`origin/main@065bcbf`；原 dirty checkout 保持原样。

## 基线

已读项目规则、现行 DATA-STORAGE、账号/Mobile 功能卡、版本入口和包配置。Node 24.21.0；`npm ci`、lint、typecheck、459/459 Node 测试通过。T10-PREP 迁移 PR 独立进行，不混入本任务。

## 顺序

1. 测试先行定义无前导零的三段版本、patch 9→10、独立 bump、非法输入不写入及包元数据一致性。
2. 实现版本源、bump/check 命令；把 Web 和 Desktop 真实包/显示统一到 2.1.1，Mobile 只记规划元数据。
3. 写明 AI 自动判定平台影响与版本递增规则；同步账号/本机服务产品目标和当前实现差距，登记后续任务。
4. 执行完整 verify、Rust/Tauri 包检查与 Web/Desktop 同态版本显示；delivery、独立 review、Hosted CI 后 PR 合入并检查 main。

## 风险与回滚

版本号不能当发布证明。切换共享 package 版本来源时，MCP/插件及更新 UI 需按运行平台取同一版本。回滚代码与配置通过 PR；不删除或迁移任何用户数据。账号、本机服务、Mobile 是后续实现，功能状态保持非 REAL。
