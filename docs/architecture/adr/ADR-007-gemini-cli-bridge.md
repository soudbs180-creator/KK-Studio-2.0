# ADR-007: Gemini CLI 本地登录桥

- 日期：2026-09-23
- 状态：本地候选；真实 CLI 与桌面运行待验收
- 关联：TASK-AGENT-005，依赖 TASK-AGENT-004

## 背景

用户希望在 KK 中使用 Google 账号。Google Interactions 图片请求通过 API Key 接入；Gemini CLI 则提供用户主动完成的 Google 账号登录，适合文字对话。KK WebView 无法直接复用浏览器登录状态，也不应读取 Gemini CLI 的 OAuth 凭据。

## 决策

Gemini CLI 模式由用户启动本机桥 `scripts/gemini-bridge.mjs`。桥只监听 `127.0.0.1`，客户端只接受带明确端口的本机 HTTP 地址。浏览器请求必须来自 KK 的开发、预览或 Tauri Origin；桥校验 Origin、Host 和 JSON Content-Type，并拒绝没有可信 Origin 的浏览器请求。无 Origin 的本机非浏览器客户端可调用，因此此桥仍以同一操作系统用户为信任边界。

Windows 桥通过 Node 运行 npm 全局安装的 Gemini CLI 入口；定位失败时报告未安装，不使用 `cmd.exe` 拼接命令。用户 prompt、model、session ID 各作为单个 `--name=value` 参数传递，model 和 session ID 限定字符与长度，避免以 `--` 开头的值变成独立 CLI 开关。客户端断开后终止本轮子进程。CLI JSON 的 `session_id` 用于下一轮 `--resume`；未知受理结果持久标为 `unknown`，阻止自动重复提交。

CLI 通道只在 KK 中展示文字回复，不向 KK 传输 CLI 登录令牌，也不宣称支持生图或附件。图片仍使用用户明确选择的 API Key 通道。CLI 自身的本地配置和工具行为由其安装环境决定；此桥不向其开放 KK 画布工具。检测/连接会发送简短真实请求以确认登录，可能消耗账号额度。

## 备选与取舍

- 直接从 KK 读取 CLI OAuth 缓存：减少一个进程，但会越过凭据边界且依赖未承诺的私有格式，拒绝。
- 在 KK 网页复用 Google AI Studio 登录 Cookie：不等于官方 API 授权，拒绝。
- 只保留 API Key：生图可用，但不满足 Google 账号登录的文字对话需求。

首版桥需要用户自行安装、登录并启动 CLI；真实安装/登录、Windows Tauri 和账号配额仍需同态验收。停用 CLI 模式或关闭本地桥即可回退，Google API Key 与已有 Codex 会话不受迁移影响。
