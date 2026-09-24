# Google 对话与生图 Implementation Plan

- Task ID: TASK-AGENT-004
- 状态: IN PROGRESS
- Spec: [spec](spec.md); Intent: [intent](intent.md)
- Owner: root; Branch: feat/TASK-AGENT-004-google
- Worktree: C:/Users/Administrator/.codex/worktrees/google-interactions/KK-Studio-2.0
- Base: b45c5bc7a180c641dbcc3d127d1106f05174df12 (origin/main)
- 主 checkout clean；Codex worktree API 因当前 task cwd 为容器目录而不可用，使用 Git 登记隔离 worktree。没有更改主线或其 index。
- Workflow: writing-plans / executing-plans / test-driven-development；项目 AGENTS 明确普通已授权任务自主完成，无逐阶段审批。

## 实施与验证

- [x] 记录依赖、typecheck/lint/相关测试基线。
- [x] 先写失败的 Google Interactions 协议测试；实现固定端点、模型/参数、响应解析、函数回执、错误与取消。文件 src/features/agent/googleInteractions.ts, googleAgentTools.ts。
- [x] 先写项目会话及去重/取消/未知测试；实现 googleAgentConnection、domain/googleConversation 和既有 project/agentHost 的加法字段。
- [x] 设置 Google Key、测试连接；项目对话切换/模型/比例/清晰度；复用组件与设计 tokens，保持 Codex 默认。浏览器覆盖完整操作。
- [x] 同步 feature card/registry、ledger、PROGRESS/STATE/HANDOFF；全量 verify；独立 reviewer 检查实际 diff，修复阻断问题。
- [ ] 真实 Google API Key 验收与桌面（Tauri）复核（等待用户填入 Key 后进行，见 verification.md）。

## 风险与恢复

Key 仅系统库/内存；请求固定 Google 域名且拒绝重定向。无自动重试；已受理/未知结果不可重新生成。旧项目/存储身份保持，新增可选字段。取消/切换后的旧任务只能留在原项目；归档使用稳定 ID。按单任务提交回滚，不恢复/覆盖原工程。分支审查与本地验证不代表已发布。
