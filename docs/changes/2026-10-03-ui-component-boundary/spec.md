# Spec：MCP 设置组件职责拆分

- Task ID：TASK-UI-COMPONENT-BOUNDARY-001。
- 状态：IMPLEMENTED；日期：2026-10-03。
- Intent / 账本：[intent.md](intent.md) · [`task-ledger.json`](../../governance/task-ledger.json)。
- 当前实现：[`McpSettings.tsx`](../../../src/components/settings/McpSettings.tsx)、[`McpServerForm.tsx`](../../../src/components/settings/McpServerForm.tsx)、[`McpServerList.tsx`](../../../src/components/settings/McpServerList.tsx)。

## 行为契约

- `McpSettings` 保持 registry、client、AbortController、连接状态、错误、展开项和反馈回调的 owner。
- `McpServerForm` 只负责名称/endpoint 输入、错误呈现、只读禁用和保存回调。
- `McpServerList` 只负责空态、列表映射和把服务器上下文转发给 `McpServerCard`。
- 连接、取消、断开、移除、工具展开和显式确认调用的回调签名保持原语义。

## 验收映射

| ID   | 可观察结果                                     | 技术检查                                       |
| ---- | ---------------------------------------------- | ---------------------------------------------- |
| AC-1 | 三个组件职责单一且不超过 300 行                | `node scripts/check-ui-standards.mjs`          |
| AC-2 | 只读表单、空列表、连接状态和工具操作行为不回归 | `tests/browser/mcp-settings.spec.ts`、MCP 单测 |
| AC-3 | 新组件没有类型、Lint 或格式错误                | `tsc`、ESLint、Prettier                        |

## 风险与边界

不改变 MCP 客户端协议和存储实现；浏览器测试未覆盖的真实第三方服务器仍由 `TASK-MCP-PROTO-001` 管理。
