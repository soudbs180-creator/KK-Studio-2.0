# 对话与创作消息面板（FEAT-009）

- 状态：PARTIAL
- 领域：creation
- 最近更新：2026-09-23
- 关联任务：T4、BACKEND-CONVERSATION、TASK-AGENT-001、TASK-AGENT-002、TASK-AGENT-003

## 用户可见入口

- 工作区右侧 ConversationPanel：项目创作消息、模型选择、图片附件和语音输入。

## 代码位置

- src/components/ConversationPanel.tsx、ConversationMessages.tsx、ConversationModelPicker.tsx。
- src/features/agent 的 agentConnection/agentEventStream/agentHost/agentImages 接 Codex 官方执行器，src/App.tsx 复用项目和图片/文本任务。
- src-tauri/src/main.rs 的旧 chat_completion/stream 命令仍存在，但不是当前前端多轮聊天实现证据。

## 测试与证据

- tests/browser/creation-flow.spec.ts、tests/browser/unified-image-command.spec.ts。
- T4 的统一图片入口验证；[本轮勘误](../changes/2026-09-21-text-and-rule-audit/verification.md)。

## 当前能力

- KK 对话默认 Codex：命名 SSE、真实账号模型/额度、项目会话恢复、停止和权限请求已接通；API 来源需显式选择。
- 已从 KK 输入取得真实回复、MCP 画布操作和内置生图结果。图片进入 KK 自有素材仓库；卡片来源按 thread/turn 元数据持久化。工具回执未知时阻止自动重试。
- 分级/全部模型菜单、关闭记忆页、返回、页内置顶由 ModelPickerMenu 统一提供。Google/豆包/WorkBuddy 适配器保持禁用。
- 新增文本节点（FEAT-008）是单次文本生成，不能作为本面板多轮文本聊天验收。

- Windows 设置 › 网络：启动并连接/停止服务；缺资源或 Web 显示原因。随包执行器和实际资源哈希见 [本轮验证](../changes/2026-09-22-agent-desktop/verification.md)。

## 差距与后端化

- BACKEND-CONVERSATION：Web 已接通真实 Codex，Windows 一键生命周期、真实回复、随包MCP与同线程恢复已验收。Agent 图片附件与显式画布引用已接通；内置生图参考图片编辑、其他软件/后台网页适配器仍待完成。
- T9 收敛 Web 平台差异。缺相应证据时不得标 REAL。

## 变更记录

- 2026-09-21 的初始卡片曾错误声称 Desktop 多轮聊天已复用旧 Rust 命令。
- 2026-09-22 根据实际 import/调用链勘误为 PARTIAL，登记独立后续任务；旧验证结果不改写。
- 本轮默认 Codex 与统一模型入口见 [验证](../changes/2026-09-22-codex-default-agent/verification.md)、[使用说明](../changes/2026-09-22-codex-default-agent/usage.md)。新增 tests/browser/agent.spec.ts、model-picker.spec.ts 与 tests/unit/agent*.test.ts；保留 PARTIAL 表示平台/适配器边界。

## 本轮实施

TASK-AGENT-003：图片附件、显式画布引用和视口/选择桥接；验收见 [本轮记录](../changes/2026-09-23-agent-attachments/verification.md)。

TASK-AGENT-004: Google API Key 对话与生图实施中，真实服务待验证。

TASK-AGENT-005: Gemini CLI 账号登录通道实施中，真实 gemini 待验证。
