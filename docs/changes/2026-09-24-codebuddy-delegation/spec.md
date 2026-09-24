# Spec：CodeBuddy 受控委派

## 入口与行为

1. 设置 › 网络 › Codex 主 Agent 下新增「CodeBuddy 委派」卡片。只有本地 Agent 已连接时才读写其配置；输入本机 CodeBuddy CLI 脚本绝对路径，保存后可运行一次固定短文本测试。路径是非敏感设置，不是账号或密钥。
2. `infinite-canvas` MCP 增加 `codebuddy_consult`。Codex 可以将适合短文案、标签整理或摘要的有限文本问题交给它；复杂设计决策、画布状态和工具执行仍由 Codex 控制。菜单中的 WorkBuddy 直接对话入口保持禁用，避免把此工具冒充原生登录适配器。
3. 工具单次输入不超过 3000 字；只传本次问题，不自动读取完整记忆、项目素材或历史对话。Codex 若传入必要的少量上下文，受同一上限约束。返回经过 JSON 校验和长度限制的回复、模型标识（若 CLI 返回）与耗时，不回传原始 stderr、账号信息或会话标识。

## 执行与失败边界

- 后端只接受本机绝对路径、目标文件且文件名为 `codebuddy` 或 `codebuddy.js`。以当前 Node 运行时直接启动脚本，`shell: false`、`windowsHide: true`、空临时工作目录；参数固定为 `--print --output-format json --tools "" --permission-mode dontAsk --no-session-persistence --max-turns 1`。不使用免审工具权限。
- 子进程环境变量采用最小允许列表，不传 KK Agent token、Provider Key 或其他代理凭据；禁用后台任务。限制输出字节数和执行时间，超限/超时终止子进程。单个 MCP 进程同时只运行一项委派；HTTP 连通测试亦在自身进程内限并发。
- CLI 未登录、退出非零、返回非 JSON、空回复、超时、取消均失败关闭。设置保存只验证路径和文件，连通测试才证明登录账号可用；显示区分这两种状态。
- 仅显式传给 CodeBuddy 的问题进入该厂商模型。记忆开关关闭时没有记忆注入；开启时 Codex 只可根据本轮选中片段决定是否转述必要内容，不传完整记忆文件。

## 验证

- 单测覆盖 CLI 参数、环境隔离、解析、超时/取消/并发/错误；HTTP 端点认证与配置；MCP 工具注册及回执。
- 浏览器验证设置卡片的未连接、保存、测试与错误态，1920/390 可达性及现有 Design System。
- 用本机已登录 CodeBuddy CLI 进行真实一轮调用；Web production preview 与 Tauri 运行态分别记录，未运行的部分保持 NOT_VERIFIED。
