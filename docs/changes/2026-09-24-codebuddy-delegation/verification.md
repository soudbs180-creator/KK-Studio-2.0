# 验证：CodeBuddy 受控委派（TASK-AGENT-007）

## 当前已验证

- 本机 WorkBuddy 安装包内 `codebuddy` 脚本使用已登录账号，在 `--tools "" --permission-mode dontAsk --no-session-persistence --max-turns 1` 下返回固定短文本。适配器只传有限 prompt、最小环境变量；原始 CLI 事件和 stderr 不进入 MCP 回复。
- 真实 CLI 的 `--output-format json` 在此安装版本中返回事件数组；代码只接受其中唯一的最终 `result`，并用回归用例覆盖该格式。受限适配器真实回复为 `KK_CODEBUDDY_LIVE_OK`，耗时 7803 ms。
- 使用本项目的 `infinite-canvas` MCP Server，经真实 `codebuddy_consult` 工具调用同一已登录 CLI，得到 `KK_MCP_CODEBUDDY_OK`，耗时 9243 ms。此项证明 MCP → CLI → 登录账号 → MCP 回执，未证明 Codex 在 KK 对话中自动选择了该工具。
- 单元/集成用例覆盖路径、固定参数、环境隔离、错误、超时、限流、CLI 事件数组、HTTP 鉴权/配置/连通测试、MCP 工具注册与回执。浏览器用例使用本地协议 fixture 验证未连接、已保存、测试失败与成功的界面状态；fixture 不代表真实 CodeBuddy 账号。

## 项目回归与新包

- `npm run test:agent`：137 项、135 通过、2 项 Windows 上的 POSIX 权限测试跳过；`npm run verify`：416 项 Node、310 项 Playwright 全通过，治理 64 项、功能 29 项、UI 161 文件均无违规，lint/typecheck/format/build 通过。第一次 `verify` 因隔离工作树未安装/构建内置画布插件而有 7 个插件 UI 用例失败；按项目脚本运行 `plugins:install` 与 `plugins:build` 后整套复跑通过。失败日志保留在 `.tmp/codebuddy-verify-20260924.log`，最终回归日志为 `.tmp/codebuddy-verify-20260924-final2.log`，Agent 日志为 `.tmp/codebuddy-agent-tests-final.log`。
- `npm run client:build:agent` 生成新 release EXE、MSI 与 NSIS。首次打包因当前工具环境 Node 24.19.0 缺少同目录 `LICENSE` 而停止；改用主项目已有的匹配 Node 24.20.0/许可文件临时拷贝，在隔离工作树完成打包，不改产品源码。自查补上配置写失败不提前改内存状态、取消/超时强制终止后，第二次重新打包成功。包内清单 4271 文件，含 `agent/dist/agent/codebuddy.js`、`agent/dist/server/mcp.js` 和 Agent 指令，关键文件与清单 SHA-256 逐项相符，包内适配器含最新 `SIGKILL` 逻辑。首次包内 Node/MCP 真实调用登录 CLI 得到 `KK_PACKAGED_CODEBUDDY_OK`（约 9.3 秒）；最终新包再以完整 Tauri 路径验证。最终构建日志见 `.tmp/codebuddy-tauri-20260924-final2.log`。

## Web 与 Desktop 同态运行

- Web：实际启动 `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 1423 --strictPort`；访问 `http://127.0.0.1:1423/`，内部设置页选择「网络」。入口链 `ConnectionSettings → AgentConnectionSettings → CodeBuddyConnectionSettings → agentApi`，HTTP 服务链 `server/http → config → codebuddy`。1920×1080 与 390×844 同状态截图见 [桌面宽度](evidence/web-codebuddy-1920.png)、[手机宽度](evidence/web-codebuddy-390.png)；卡片、输入框和按钮均在视口内，无横向溢出。真实账号连接只在下述 Tauri 运行态验证。
- Desktop：启动最终 `src-tauri/target/release/kk-studio.exe --data-dir <临时目录>`，WebView2 加 `--remote-debugging-port=9352`；实际页面 `http://tauri.localhost/` 的项目画布与设置「网络」。从 UI 启动随包 Agent，保存本机 CLI 路径并点「测试 CodeBuddy 连接」，真实状态到「已验证」。[桌面设置截图](evidence/desktop-codebuddy-verified.png)。随后在 KK 对话明确请求调用工具，Codex 经 `infinite-canvas` MCP 完成 `codebuddy_consult`：最终新包事件记录显示 `status=completed`、`durationMs=8161`、`error=null`，输入仅有 `prompt` 键、42 字且包含测试短句；返回含 `KK_DESKTOP_CODEBUDDY_FINAL_OK`，KK 最终对话显示该回复且 turn 已结束。[桌面对话截图](evidence/desktop-codebuddy-reply.png)、[脱敏事件记录](evidence/desktop-codebuddy-runtime.json)。应用退出后 Agent loopback 健康端点不可达。
- 第一次 Desktop 尝试只等 120 秒，截图显示 Codex 仍在推理、没有工具调用事件，故当时未通过；[失败截图](evidence/desktop-codebuddy-failure.png) 保留。第二次延长观察后约 120 秒才见第一次工具调用，再约 20 秒显示最终回复。最终新包复测总耗时约 145 秒，其中工具约 8 秒。前置 Codex 推理延迟尚不符合高效自动调配目标，留在路线图中优化；本轮没有实现自动按难度/成本路由。

## 交付门禁

- 主线合并前独立复核、PR/远端检查与用户产品验收仍须单独完成。当前分支基于 `feat/TASK-MEMORY-001-local-memory`，需先处理其合并顺序；本轮构建产物不等于已安装或已发布。

## 边界

本适配器调用 WorkBuddy 安装包内的 **CodeBuddy CLI**，不等于接入 WorkBuddy 原生第三方应用 OAuth。未读取 WorkBuddy 收藏、账号资料或会话；豆包、千问与素材站也未被此工具接入。记忆不会自动完整外发，Codex 仅能自行转述必要的短片段。FEAT-009 与 TASK-AGENT-002 继续保持 PARTIAL。
