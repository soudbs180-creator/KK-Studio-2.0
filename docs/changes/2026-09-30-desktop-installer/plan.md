# Plan：Desktop 安装器

- Task ID：TASK-DESKTOP-INSTALLER-001；状态：IN PROGRESS。
- Owner：root；分支 codex/T7-desktop-installer。
- Worktree：D:/kk-studio/.worktrees/T7-desktop-installer。
- Base：origin/main@bd3bc66889b2856e273c2117191a74fdebd6f791；原 main 干净且未改动。
- [Intent](intent.md) · [Spec](spec.md) · [Verification](verification.md) · [Review](review.md)。

已读根规则、SDLC/BRANCH-POLICY/REVIEW、治理/剩余记录、版本规则与真实发布、Agent、桌面测试实现。新 worktree 独立 npm ci，Node 24.19.0；基线 lint/typecheck 与桌面启动单测 12/12 PASS。Tauri CLI 帮助与当前官方 Windows 配置文档用于核对 NSIS 和离线 WebView2；依赖不升级。

依赖图：安装器配置 → production EXE/Agent/NSIS → 收据 → 隔离安装/重装/卸载运行 → 全量 verify → 当前提交独立 review → PR/CI。各步串行；不对已有 dirty worktree 写入。

1. 增加独立 installer 配置与 npm 构建/收据/验收入口。
2. 校验安装器和全部已安装文件，覆盖损坏、缺文件与越界路径。
3. 真实 NSIS 安装与 Tauri 运行，覆盖隔离项目保存、Agent、重装、修复、卸载再装。
4. 同步功能卡/账本/恢复入口、完整 verify、独立只读 reviewer 与实际 PR 门禁。

危险路径是卸载误作用于已有用户安装；启动时拒绝已有安装，变更前核对注册位置，每次操作只针对本轮生成的临时根目录。测试保留报告和临时项目便于恢复，不修改原真实数据。保留 bd3bc66 的 portable 包；低版本降级需真实早期产物另行验收。
