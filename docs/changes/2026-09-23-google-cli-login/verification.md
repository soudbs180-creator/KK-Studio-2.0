# Verification: Gemini CLI 账号登录通道

- Task ID: TASK-AGENT-005
- 状态: LOCAL_PASS / REAL_NOT_RUN
- 本地与 fixture 验收全部通过；真实 gemini 安装、登录与起桥需用户操作后标记 PASS。

## 本地 / fixture 验收（全绿）

- 单元测试 32/32：geminiCliAdapter（8）、geminiBridge（8）、googleAgentCli 连接层（8）、googleInteractions（4）、googleAgent 004 回归（4）。
  - 桥协议：/status 返回 installed/version/login；/chat 返回 text/sessionId/error；错误映射 unreachable/not-installed/not-logged-in/quota/timeout/failed。
  - 连接层：cli 未安装→安装指引；已安装未登录→登录指引；登录成功→connected 且模型来自 cliModels；对话回存 cliSessionId 并用于下一轮 resume；附件被拒；GeminiCliError 文案透传；configure 在 cli 下强制 text。
- typecheck、eslint（--max-warnings 0）、UI 标准（0 违规）、governance（61 任务 0 违规）、features（29 特性 0 违规）、npm run build 全部通过。
- 浏览器测试 247/247（含 12 workers 全量回归）：
  - 新增 tests/browser/google-cli-agent.spec.ts：设置选 Gemini CLI 登录方式 → 保存 → 检测桥（fixture 已就绪）→ 新建项目选 Google → 面板免 API Key 提示 → 连接 → 连续对话（第二轮带 resumeSessionId）→ 生图 option 在 cli 下带 disabled 属性 → 生图提示文案可见。
  - 004 回归 google-agent.spec.ts、agent.spec.ts、frontend、provider-scheduling、model-picker 等全部通过。
- 密钥/凭据：cli 模式不读取、不保存任何 API Key；偏好仅存 loginMode 与桥地址（localStorage，非敏感）。

## 待真实环境验收（需用户操作）

1. 终端安装：npm install -g @google/gemini-cli
2. 登录：运行 gemini，选择 Login with Google（完成后 ~/.gemini 出现凭据）
3. 启动桥：node scripts/gemini-bridge.mjs（默认 127.0.0.1:1424）
4. KK 设置 → 模型供应商 → Google Gemini → Gemini CLI 账号 → 检测 Gemini CLI 显示已就绪 → 新建项目选 Google → 连接后对话
5. 真实验证点：连续对话续接（--resume 的 sessionId 是否由真实 CLI 返回）、quota/未登录错误的真实文案、Tauri 桌面端偏好持久化。
