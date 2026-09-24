# Plan：CodeBuddy 受控委派

1. 在 `vendor/canvas-agent/src/agent/codebuddy.ts` 实现路径校验、最小环境、受限单轮子进程调用、JSON 解析、超时/取消和每进程互斥；先写有意义的故障与成功单测。
2. 在 `vendor/canvas-agent/src/config.ts` 增 `codebuddy.cliPath` 非敏感配置；在 `server/http.ts` 增已认证的配置读写与固定文本连通测试；在 `server/mcp.ts` 注册 `codebuddy_consult`，调用时重新读配置，Codex 会话无需重启。更新 `agent-instructions.md` 的委派边界。
3. 在 `src/features/agent/agentApi.ts` 加类型化端点；在 `src/components/settings/CodeBuddyConnectionSettings.tsx` 加状态、路径保存、真实测试和明确反馈，并挂到现有 Agent 设置。沿用 Design System 组件与布局。
4. 更新 `TASK-AGENT-007` 账本、FEAT-009、PROJECT_STATE、PROGRESS、AI_HANDOFF、验证和评审文档。运行 agent/build、Node 单测、全量 verify、Rust 回归与真实 CLI 单轮；新 Tauri release 若未通过不声称交付。
5. 自审、独立复核、推送独立分支；CodeBuddy 任务依赖记忆分支，绝不把未验证的社区 WorkBuddy 网关候选混入。
