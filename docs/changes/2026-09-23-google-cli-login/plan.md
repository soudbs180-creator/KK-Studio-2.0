# Gemini CLI 账号登录通道 Implementation Plan

- Task ID: TASK-AGENT-005;Spec: [spec](spec.md);Intent: [intent](intent.md)
- Owner: root;Branch: feat/TASK-AGENT-004-google(堆叠,004 未合并);Worktree: C:/Users/Administrator/.codex/worktrees/google-interactions/KK-Studio-2.0
- 流程: 先写失败的单元测试 → 实现桥与适配器 → 集成连接层与 UI → 浏览器测试 → 全量验证。
- 第一版范围: CLI 登录状态检测 + 文字对话 + --resume 续接;生图/附件留 API Key 通道。

## 实施步骤

1. ledger 登记 TASK-AGENT-005(依赖 TASK-AGENT-004);features.registry 关联 FEAT-009/012。
2. tests/unit/geminiCliAdapter.test.ts(注入 fetcher)与桥 spawn 测试(注入 spawn):参数构造、JSON 解析、错误分类、取消、sessionId。
3. scripts/gemini-bridge.mjs: /status 与 /chat,Windows 入口解析(cmd shim → node 入口,避免 shell 注入),127.0.0.1 绑定,请求体限制,超时/断开终止子进程。
4. src/features/agent/geminiCliAdapter.ts: fetch 桥,错误分类。
5. googleAgentConnection 集成 loginMode;GoogleConversation 加 cliSessionId。
6. GoogleConnectionSettings 登录方式 UI + GoogleAgentControls 禁用生图;浏览器测试 mock 桥。
7. 全量验证(typecheck/lint/build/单元/浏览器/UI 标准);真实 gemini 验收留给用户(安装+登录+起桥)。

## 风险

- gemini headless JSON 是否含 sessionId 未最终确认:解析 response.sessionId / stats.sessionId 兼容,无则本轮不回填续接(单轮可用),真实验收后补。
- Windows spawn .cmd shim: 解析 where gemini 的 cmd 提取 node 入口,失败回退 cmd /c(参数经引号转义)。
- 桥手动启动是临时形态,桌面自动拉起留后续任务。
