# Plan：MCP 设置组件职责拆分

- Task ID：TASK-UI-COMPONENT-BOUNDARY-001。
- 状态：IMPLEMENTED；日期：2026-10-03。
- Owner / branch / worktree：root / `codex/TASK-AUDIT-20261003` / `D:/kk-studio/KK-Studio-2.0/.worktrees/TASK-AUDIT-20261003`。

## 实施顺序

| 步骤 | 文件                | 改动                           | 验证                        |
| ---- | ------------------- | ------------------------------ | --------------------------- |
| 1    | `McpServerForm.tsx` | 提取设置表单和只读/错误反馈    | TypeScript、UI 标准         |
| 2    | `McpServerList.tsx` | 提取空态、服务器列表和回调转发 | TypeScript、浏览器回归      |
| 3    | `McpSettings.tsx`   | 保留状态 owner，传递显式回调   | ESLint、MCP 单测/Playwright |
| 4    | change package/账本 | 记录边界修复和当前 SHA 证据    | 治理/Markdown/格式          |

## 恢复

若回归失败，按组件职责恢复父子回调契约；不修改 MCP 存储或协议代码。所有改动均可由本任务提交回滚。
