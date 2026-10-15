# Spec: 当前主线与 Cherry 增量守恒

Task ID: TASK-CHERRY-RED-001。授权与身份见 [intent](intent.md)。

1. 保留 main 的 UI/模型目录、凭据 loading/error/retry、跨进程事务、revision CAS/补偿、任务身份和恢复；保留 Cherry 的助手、多路多轮对话、安全 Markdown/本地导出、MCP 修复和三桌面平台增量。
2. 协议以 main 为唯一模型：openai-chat、openai-responses、anthropic、azure-openai、ollama，并补 Gemini。旧 openai-compatible、anthropic-messages、api_key 只在输入边界显式归一化。HTTP 免密仅允许严格 loopback；图片继续受协议/认证与原 fingerprint 门禁约束。
3. 消息历史、助手、路由和任务 round-trip 不丢失。迟到、取消、失败及不确定受理保持原防重边界；较旧的失败不得覆盖较新连接健康状态。
4. Windows 原事务锁保持；Unix 凭据后端必须进入同一事务路径。没有真实平台回执的能力保持未验，不能由配置或 Windows 测试代填。
5. Desktop/Web 从最新主线版本递增，Mobile 规划不变；当前任务完整验证、原生构建与运行、精确 SHA 独立复审、Hosted/Delivery 后才合并，并验证合并主线。
6. 主仓 dirty/index、其他工作区、分支、用户数据和日常客户端均保留；仅原先 clean 的 PR58 工作区由本任务写入。

执行步骤见 [plan](plan.md)，证据见 [verification](verification.md)，独立结论见 [review](review.md)。
