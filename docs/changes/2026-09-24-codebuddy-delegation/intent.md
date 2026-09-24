# Intent：Codex 主 Agent 的 CodeBuddy 委派（TASK-AGENT-007）

- 用户目标：设计师在 KK Studio 中以 Codex 为主控，能自然调用已登录的 WorkBuddy/CodeBuddy 处理合适任务，记忆可控共享，并逐步扩展其他厂家。
- 当前证据：本机 WorkBuddy 随包 CodeBuddy CLI 已用登录账号完成一轮真实短文本请求；WorkBuddy 官方 Open API 需要获批第三方应用与 OAuth，当前没有该授权。旧 `TASK-AGENT-006` 候选依赖未安装的社区网关，不作为已接入证据。
- 本子任务：给现有 Codex MCP 服务增加受限 `codebuddy_consult` 工具，并在本地 Agent 设置中配置 CLI 路径与执行真实连通测试。Codex 仍是唯一默认主 Agent。
- 验收：用户配置本机 CLI 路径后，Codex 可委派一条有限长度的短文本任务并取回真实回复；工具不读取项目文件、不调用 CodeBuddy 工具、不持久化会话、不继承 KK 凭据环境变量；失败、超时、取消、并发与未配置均给明确状态。
- 范围外：把 WorkBuddy 网页/桌面原生会话接管为第二主 Agent、任意模型自动成本优化、官方 OAuth 申请、豆包区域限制绕过、跨应用完整记忆文件共享。后续仍由 TASK-AGENT-002 与 TASK-MEMORY-002 追踪。
