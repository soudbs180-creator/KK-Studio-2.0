# Intent: Gemini CLI 账号登录通道

- 任务: TASK-AGENT-005
- 用户目标: 在 KK 中像使用 Codex 一样,登录 Google 账号后免 API Key 使用 Gemini(先跑通文字对话为主)。
- 现状: TASK-AGENT-004 已实现 Google Interactions API Key 通道(对话+生图,本地验证通过,真实 Key 待验收)。
- 路线: 官方 Gemini CLI 支持 Google 账号 OAuth 登录,免费额度 60 次/分、1000 次/天(个人账号)。KK 前端不能直接 spawn 子进程,采用仓库内零依赖桥 `scripts/gemini-bridge.mjs` 代理:桥 spawn `gemini -p --output-format json [--resume <id>]`,KK 前端通过 HTTP 调用。
- 边界: 第一版仅文字对话 + 会话续接(--resume,尽力而为);生图仍走 API Key 通道(CLI 侧生图需 MCP 扩展且要 Key);图片附件暂不支持;桥由用户手动启动(桌面自动拉起为后续增强)。
- 安全: 请求只发给本地桥(默认 127.0.0.1);凭据为 gemini 的本地 OAuth 登录态,KK 不接触 token;桥拒绝非本机来源。
