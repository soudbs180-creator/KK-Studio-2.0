# 未完成边界

2026-09-22 续办状态见 [当前清单](../2026-09-22-agent-desktop/remaining.md)。下表保留前一轮边界，桌面 Agent 托管由新记录更新。

| 项目 | 状态/原因 | 后续模块 |
| --- | --- | --- |
| Tauri 一键启停 Agent/Proxy | 待办。本轮提供开发启动器，未打包执行器、托管生命周期或验证 release | src-tauri、scripts/agent，TASK-AGENT-002 |
| Google AI Studio/Antigravity、豆包、WorkBuddy | 待办。已登录不等于第三方程序有可调用的账号协议，各适配器需要独立核实 | src/features/agent，TASK-AGENT-002 |
| 后台网页、多窗口并发、KK 登录/验证弹窗 | 待办。未实现浏览器 session、并发池、取消/恢复与登录窗口，不绕过网站验证 | 浏览器适配器、Tauri WebView |
| 所有市场 API 与新模型自动参数 | 当前仅接现有 OpenAI 兼容协议；用途/尺寸须明确返回或按文档声明，不能笼统保证 | src/integrations、src/features/models |
| 真实配置付费 Provider 逐家出图 | 未验证。本轮受控 HTTP 验证接线、账号隔离、归档；真实 Codex 对话/内置生图另有证据 | EXT-PROVIDER |
| 视频/音频执行器 | 原有待办，菜单/工具明确拒绝未接线生成 | FEAT-006/007 |
| Agent 对话附件、原生生图参考图编辑 | 当前明确限制；API 原有参考链保留 | src/features/agent |
| 通用第三方 MCP、控制所有桌面 App | 待办。当前实测的是 KK 画布工具，不能扩大为所有软件 | FEAT-012/013 |

原搬运约束保持：不搬上游 file/image-storage、生成 API 前端层与整套 UI；本轮图片归档复用 KK 自有素材系统。其余搬运审计见原 port-infinite-canvas 变更目录与工程外审计报告。
