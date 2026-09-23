# Review: Gemini CLI 账号登录通道

- Task ID: TASK-AGENT-005
- 状态: COMPLETED（独立上下文核验代码与 diff；真实服务端到端验证仍单列于 verification.md）

## 检查点与结论

- 桥（scripts/gemini-bridge.mjs）：
  - 仅监听 127.0.0.1；请求体上限 1 MiB；/status 与 /chat 两个路由；无任何 shell 拼接（Windows 优先 node 直跑 npm root -g 的 bin 入口，失败回退 cmd /c gemini 并做 quoteShellArg 转义）。
  - 子进程在请求结束或超时（status 30s / chat 180s）时 terminate，不遗留孤儿进程；probe 用 `-p ping --output-format json` 判定登录态，避免真实对话。
  - 日志/凭据：桥不写日志文件；登录错误经 LOGIN_HINTS 正则映射为 not-logged-in，不把用户内容落盘。
- 适配器（geminiCliAdapter.ts）：错误码分层 unreachable/not-installed/not-logged-in/quota/timeout/failed；解析 response.items[].text 与 response.sessionId/stats.sessionId 兼容真实 CLI JSON 形态。
- 连接层（googleAgentConnection.ts）：cli 分支 identity=`cli:${baseUrl}`，会话 record 新增 cliSessionId 字段（schema 兼容）；cli 模式强制 text、拒绝附件与生图；取消/超时回显"请求已停止"而非伪装成功。
- UI：设置页双登录方式（密钥 / Gemini CLI 账号），cli 三步指南 + 桥地址 + 检测；面板 intro/placeholder 随登录方式切换；cli 下"生成图片"选项禁用并提示改用密钥方式。
- 安全边界：api-key 与 cli 两通道互不串用；cli 模式全程不触碰 API Key 凭据库；偏好键仅 kk-google-login-mode / kk-google-bridge-url（非敏感）。
- 发现并修复的回归：设置组件 radio 文案曾含 "API Key"，与既有测试 getByLabel("API Key") 冲突导致 56 个浏览器用例严格模式失败，改为"密钥登录（对话与生图）"后全量 247/247 通过。

## 2026-09-23 后续独立审查勘误

上面的 COMPLETED 只反映 `d05f263` 提交时的审查记录，不能作为最终安全结论。后续独立上下文审查同一 diff，发现并复现七项阻断问题：Windows `cmd.exe` fallback 可被用户输入注入；桥的通配 CORS 允许任意网页调用；Google Key 输入使用 React 保留的 `key` prop；从 CLI 切回 Key 后偏好未切换；CLI 官方 `session_id` 未解析；HTTP 取消没有终止 CLI；超时/断流没有标未知。原先“无 shell 拼接”“兼容真实 CLI JSON”“取消后停止”“probe 不是真实请求”等结论已被证据推翻。

当前候选已删除 shell fallback，加入可信 Origin/Host 与本机 URL 边界，将取消传到子进程，按官方 JSON 解析 `session_id`，并修复 Key 输入、登录方式切换与未知结果阻断。新增定向单元和浏览器回归覆盖这些触发条件。独立补审调用因 reviewer 工作区额度耗尽未完成，因此当前补丁不声称已获独立终审；最终测试与未验证边界见同目录 `verification.md`。

收尾自查又发现进程参数虽不经过 shell，但以 `--` 开头的值仍可能被 CLI 解析为开关。桥改为 `--name=value` 单参数，并限制模型/会话 ID 字符与长度；注入式测试确认 `--yolo` 不能成为独立选项。此项属于实施者自查，不冒充独立 review。
