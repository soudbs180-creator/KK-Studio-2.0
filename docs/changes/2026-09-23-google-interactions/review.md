# Review: Google 对话与生图

- Task ID: TASK-AGENT-004
- 状态: PARTIAL（本地/fixture 验证通过；真实 Google 请求与桌面边界待验收）
- Base: b45c5bc7a180c641dbcc3d127d1106f05174df12
- 独立上下文检查实际 diff；此处不把自审称为独立 review。

## 检查范围与实际 diff

- 新增：`src/features/agent/googleInteractions.ts`、`googleAgentConnection.ts`、`googleAgentConfig.ts`、`googleAgentTools.ts`、`src/domain/googleConversation.ts`、`src/components/GoogleAgentControls.tsx`、`GoogleConversationPanel.tsx`、`settings/GoogleConnectionSettings.tsx`、`src/components/useConversationSubmit.ts`、`tests/unit/google*.test.ts`、`tests/browser/google-agent.spec.ts`、ADR-006 与 changes 文档。
- 修改：`agentConnection.ts`（AgentBridge 增 Google 会话读写）、`agentHost.ts`（画布桥实现）、`creation/model.ts`（项目增可选 googleConversation）、`ConversationPanel.tsx`（Google 通道分发 + 抽取 useConversationSubmit）、`App.tsx`（面板接线）、`ConnectionSettings.tsx`、`conversation-panel.css`、`features.registry.json`、`task-ledger.json` 等。
- 设计要点核对：Key 只进系统凭据/内存（浏览器测试断言 localStorage 不含 Key）；请求固定 Google 域名且拒绝重定向；无自动重试；已受理/unknown 结果不可重新生成；归档使用稳定 ID 去重；旧项目存储身份保持、新增可选字段。

## 结论

- 本地/fixture 全部检查通过（见 verification.md）；共享组件（ConversationPanel/Composer）浏览器回归 7/7 通过。
- 待办：真实 Google API Key 验收、桌面（Tauri）运行时复核、独立 reviewer 终审。

## 2026-09-23 组合分支补审

Google CLI 通道叠加后，独立 reviewer 发现 Google Key 输入把值放在 React 保留的 `key` prop，且从 CLI 模式切回 Key 时没有持久化/运行时切换。当前候选已改用普通 `apiKey` prop，并在 Key 保存后同步模式；浏览器回归先保存 CLI，再切回 Key，检查输入值、会话与图片。补审其余 CLI 安全问题见 [TASK-AGENT-005 review](../2026-09-23-google-cli-login/review.md)。最终独立复核仍待完成。
