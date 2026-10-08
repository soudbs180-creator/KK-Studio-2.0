# Intent：MCP 设置组件职责拆分

- Task ID：TASK-UI-COMPONENT-BOUNDARY-001。
- 状态：IMPLEMENTED；日期：2026-10-03。
- 请求来源：本轮项目质量基线的 `ui:check` 发现 `McpSettings.tsx` 达到 301 行，违反组件 300 行职责边界。
- Owner：root；分支：`codex/TASK-AUDIT-20261003`。
- [Spec](spec.md) · [Plan](plan.md) · [Verification](verification.md) · [Review](review.md)。

## 用户原意

MCP 设置入口应该继续可用，同时代码职责清晰、可维护，不因治理门禁暴露边界问题后留下超长组件或行为回归。

## AI 工程转译

把 MCP 设置中的新增表单和服务器列表渲染拆成职责单一的兄弟组件，保留父组件对 registry、连接客户端、取消控制器和反馈状态的唯一所有权；不改变持久化、协议、权限或用户可见交互语义。

## 目标与非目标

- 预期结果：`McpSettings.tsx` 低于 300 行，表单/列表可独立阅读，现有行为和状态传递不变。
- 包含范围：三个 settings 组件及其类型回归。
- 明确不包含：MCP 协议、存储 key、连接生命周期和 UI 视觉重设计。
