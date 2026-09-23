# Codex/Agent 续办清单（2026-09-22 当前）

用户已选择最近的 Codex/Agent 清单。TASK-AGENT-002 整体保持 PARTIAL；本轮实现 Windows Agent 托管，其他行没有因它通过而自动完成。详情与证据见 verification.md。

| 原清单项目 | 本轮状态与验收边界 | 下一步 |
| --- | --- | --- |
| Tauri 一键启停 Agent/Proxy | Agent 已实现随包启动、连接、停止、异常退出清理；Proxy 仍手动启动 | Proxy 需先定义认证与请求目标边界，再接托管 |
| Google AI Studio/Antigravity | 已核实 Gemini CLI 有账号登录与 headless；当前 PATH 未发现 gemini/antigravity。未验证能复用用户相关产品的登录 | 单独接 Gemini CLI 登录/流式/取消协议，不能把其他 Google 登录状态当作 CLI 可用 |
| 豆包 | 方舟官方 Chat API 使用 API Key/Access Key 与开通的模型；没有把豆包网页登录当 API 凭据 | 按用户连接配置接协议并真实验收；本轮没有付费调用 |
| WorkBuddy | 已检索到 CodeBuddy CLI 文档；当前 PATH 未发现 codebuddy/workbuddy，不能推断 WorkBuddy 登录等于 CodeBuddy CLI 授权 | 获取并验证实际可调用产品/协议、登录恢复和取消 |
| 后台网页、多窗口并发、KK 登录弹窗 | 未实现浏览器会话池、限并发、验证码/登录失效、未知结果恢复 | 独立实现并验证；本轮同数据根只允许一个托管 Agent，另一个实例明确报错 |
| 所有市场 API 与新模型自动参数 | 现有 OpenAI 兼容路径回归通过；非兼容协议未逐一实现 | 逐协议和可用模型声明接入，保留用途/尺寸限制 |
| 真实付费 Provider 逐厂商出图 | 未验收；受控 HTTP 测试仍只证明接线 | 使用明确配置与授权额度完成逐家真实验收 |
| 视频/音频执行器 | 保持演示/禁用原因 | FEAT-006/007 后端任务 |
| Agent 附件、内置生图参考编辑 | 未实现；既有 API 参考图链保留 | 下一项可独立实施的本地功能：复用 KK 附件与素材边界接入 Agent |
| 通用第三方 MCP、控制所有桌面 App | 未完成；既有 KK 画布 MCP 与受控握手测试不能代表所有软件 | FEAT-012/013 按具体服务权限和协议验收 |

本轮没有把内部可实现事项标成外部 BLOCKED。以上“未实现”是仍需工作的项目；真实登录、账号权限和付费调用是各自验收的外部条件。

接口核实（官方来源，2026-09-22）：[Gemini CLI 登录](https://geminicli.com/docs/get-started/authentication/)、[Gemini CLI headless](https://geminicli.com/docs/cli/headless/)、[CodeBuddy CLI headless](https://www.codebuddy.ai/docs/cli/headless)、[方舟 Chat API](https://docs.volcengine.com/docs/ark/chat-api?lang=zh&redirect=1)。当前未获取到足够的 Antigravity 或 WorkBuddy 自动调用协议依据，不声明它们不可实现，也不声明已经支持。

## 2026-09-23 续办更正

上表保留 2026-09-22 的历史状态。Agent 图片附件、显式画布引用、MCP 选择与视口已由 TASK-AGENT-003 接通；参考图片编辑仍未完成。当前逐项状态见 [新的续办清单](../2026-09-23-agent-attachments/remaining.md)，以对应 verification 的当前证据为准。
