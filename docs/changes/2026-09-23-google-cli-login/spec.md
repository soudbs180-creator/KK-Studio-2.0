# Spec: Gemini CLI 账号登录通道

- 任务: TASK-AGENT-005;依赖: TASK-AGENT-004(未合并,堆叠在同一分支/ worktree,交付时注明)
- Base: b45c5bc7a180c641dbcc3d127d1106f05174df12(004 之上叠加)

## 桥协议(scripts/gemini-bridge.mjs,node:http 零依赖,默认端口 1424)

- `GET /status` → `{ installed, version?, login }`
  - 探测: spawn gemini 解析可执行入口;`gemini --version`;headless 空探测判断登录态。
  - login=false 时提示用户先在终端 `gemini` 登录。
- `POST /chat` body `{ prompt, resumeSessionId?, model? }` → `{ text, sessionId?, error? }`
  - spawn `gemini -p <prompt> --output-format json [-m model] [--resume id]`;
  - 解析 JSON `{response, stats, sessionId?}`;超时默认 180s;客户端断开即终止子进程。
- 仅监听 127.0.0.1;请求体 ≤ 1 MiB;拒绝非法 JSON。

## 前端(src/features/agent/geminiCliAdapter.ts)

- `geminiCliStatus({baseUrl?, fetcher?})` → 状态(installed/login/error 分类)。
- `geminiCliChat({prompt, resumeSessionId?, model?, signal?})` → `{text, sessionId?}`;HTTP 错误分类(不可达/超时/桥返回错误)。
- baseUrl 默认 `http://127.0.0.1:1424`,可注入(测试用)。

## googleAgentConnection 集成

- settings 增 `loginMode: "api-key" | "cli"`(默认 api-key);configure 可改。
- connect: cli 模式 → geminiCliStatus;未装/未登录给出明确指引;已登录 → connected(模型列表用 CLI 常量)。
- sendMessage: cli 模式 → 附件非空拒绝;调用 geminiCliChat;文本加入 messages;sessionId 存会话。
- 会话: GoogleConversation 增可选 `cliSessionId`(schema 白名单,normalize 兼容旧数据)。
- 生图: cli 模式下禁用 image 输出模式(面板提示用 API Key 通道生图)。

## UI

- GoogleConnectionSettings: 增"登录方式"选择(API Key / Gemini CLI 账号);cli 模式显示桥地址输入与状态检测、启动指引。
- GoogleAgentControls: cli 模式下禁用图片输出/比例/清晰度。
- 连接按钮与面板文案保持,状态展示 cli 特有错误。

## 测试

- 单元: geminiCliAdapter(注入 fetcher 模拟桥响应/错误);桥 spawn 逻辑(注入 spawn 模拟 gemini 输出/ENOENT/超时);googleAgentConnection cli 分支(注入 adapter)。
- 浏览器: mock 桥 HTTP;设置 cli 方式 → 连接 → 对话(连续会话带 --resume)→ 生图模式禁用。
- 真实验收: 用户安装 `@google/gemini-cli`、`gemini` 登录、启动桥、KK 填桥地址后对话。

## 2026-09-23 安全与协议补充

- 本地桥只接受 `127.0.0.1` / `localhost` Host；跨源浏览器请求只允许 KK 的 1421 开发、1423 预览与 Tauri Origin。没有可信 Origin 的浏览器请求和非 JSON 对话请求均拒绝。
- Windows CLI 定位使用 Node 运行随 Node 安装的 npm CLI，解析 npm 全局包入口；找不到即明确报告未安装。用户输入不进入 shell。
- 浏览器取消/断开沿 HTTP 请求信号终止 CLI 子进程。发出对话请求后的超时、断流、取消标记为结果未知且不自动重试；明确未登录/未安装拒绝仍可重试。
- 用户提示词、模型与会话 ID 用单个 `--name=value` 参数传入 CLI，模型与会话 ID 在桥内限制字符和长度；提示词即使以 `--yolo` 开头也只能成为 `--prompt` 的值。
- 以官方 CLI JSON 的 `session_id` 为主解析字段，兼容已知旧字段。连接检测会执行一次 `ping`，可能消耗 Gemini CLI 额度。
- 安全取舍与回退见 [ADR-007](../../architecture/adr/ADR-007-gemini-cli-bridge.md)。
