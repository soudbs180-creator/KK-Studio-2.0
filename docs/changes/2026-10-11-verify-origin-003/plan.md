# Plan：TASK-VERIFY-ORIGIN-003

- Task ID：TASK-VERIFY-ORIGIN-003
- 状态：IMPLEMENTED（本地验证完成；外部边界保持开放）
- 日期：2026-10-11
- Owner / branch / worktree：root / `main` / `D:/kk-studio/KK-Studio-2.0`
- Base / 远端：本地 `HEAD=8933692e326af6f1989efae6d8a9dfe5c192e7e4`；`origin/main=7ebf143b291e344b243e1ef396d510bb91730bd3`

## 实施顺序

| 步骤 | 文件/模块 | 改动 | 验证 |
| --- | --- | --- | --- |
| 1 | `docs/governance/PROJECT_STATE.md` | 回读 Git、ledger、worktree 后修正 current facts | 治理/差异检查 |
| 2 | `playwright.config.ts` | 固定生产端口，拒绝非 `1423` 配置 | 配置矩阵单测 |
| 3 | `tests/browser/*.spec.ts` | 将关键来源与 fixture 绑定完整 `1423` origin | Playwright 定向回归 |
| 4 | 测试规范、ledger、证据包 | 同步可执行契约并如实记录外部边界 | Markdown/治理/独立审查 |

## 并发与恢复

- 主检出已有其他任务的 dirty UI/Tauri/docs 改动；不使用 reset/clean，不覆盖未授权文件。
- 若定向回归失败，先保留失败输出，按 exact origin、端口占用和当前 bundle 排查；不放宽断言或改为随机端口。
- Hosted、PR、合并、发布和用户验收不由本计划自动关闭。
