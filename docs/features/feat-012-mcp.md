# MCP 客户端（FEAT-012）

- 状态：PARTIAL
- 领域：intelligence
- 最近更新：2026-09-26
- 关联任务：TASK-CAP-001、BACKEND-MCP-AUTO、TASK-AGENT-001、TASK-AGENT-003、TASK-MINIMAX-001、TASK-MCP-PROTO-001、TASK-MCP-REGISTRY-001、TASK-MCP-REGISTRY-002

## 用户可见入口

- 设置 › MCP 服务器（McpSettings、McpServerCard）：添加 Streamable HTTP 端点、初始化、查看工具。

## 代码位置

- `src/features/mcp/mcpClient.ts`：2025-11-25 Streamable HTTP（initialize/session），强制 HTTPS、HTTP 仅允许 loopback
- UI：`src/components/settings/McpSettings.tsx`、`McpServerCard.tsx`

## 测试与证据

- 单测：`tests/unit/mcpClient.test.ts`
- 浏览器：`tests/browser/mcp-settings.spec.ts`

## 当前能力

- 手动配置并连接真实 MCP 服务器、列工具等客户端能力（代码真实）。

## 差距与后端化（Wave 1）

- “自动调用”仍为 Prototype：需要工具选择/授权/调用编排、与技能和对话的集成、错误与取消状态。
- 未用真实第三方 MCP 服务器做桌面 release 验收（TASK-CAP-001 缺口）。
- 当前客户端固定 `2025-11-25` 的 `initialize`/session 流程；[MCP 官方协议版本说明](https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions)列出的 `2026-07-28` modern 流程使用 `server/discover`。新版专用服务器兼容性尚未实测，按静态契约推断当前不支持；由 TASK-MCP-PROTO-001 跟进，不把“手动真实连接”泛化成全部 MCP 版本。

## 变更记录

- 2026-09-21：创建卡片，状态 PARTIAL。

## 默认 Agent 与模型目录更新（2026-09-22）

KK 画布 MCP 的自动编排已由默认 Codex 接通：读取快照、增删改节点/连线、图片和文本任务受理。重复 requestId 去重；工具回执未知时串行队列停止后续写入并中断本轮。此证据不扩展为任意第三方 MCP 已自动调用。

代码与测试入口：`src/features/agent/agentHost.ts`、`src/features/models/modelCatalog.ts`、`tests/browser/agent.spec.ts`、`tests/browser/model-picker.spec.ts`。证据见 [本轮验证](../changes/2026-09-22-codex-default-agent/verification.md)。状态仍为 PARTIAL。

## 本轮实施

TASK-AGENT-003：图片附件、显式画布引用和视口/选择桥接；验收见 [本轮记录](../changes/2026-09-23-agent-attachments/verification.md)。

## 2026-09-24 配置上限修复

原 registry 写入允许第 51 个服务器，但读取 schema 最多接受 50 个，重启后会误判整份配置损坏。现写前按同一上限拒绝第 51 个，同时允许同 id 更新，原数据不变；证据见 [本轮验证](../changes/2026-09-24-mcp-registry-limit/verification.md)。功能状态仍 PARTIAL。

2026-09-26 独立审查另复现两个基线问题：多标签页基于旧快照写入会互相覆盖（TASK-MCP-REGISTRY-001）；旧版已写出 51 项时界面显示空列表且无恢复入口（TASK-MCP-REGISTRY-002）。这两项未由本次预防性写入修复关闭。
