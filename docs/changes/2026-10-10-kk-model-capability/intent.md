# Intent：kk 多平台模型能力闭环

- Task ID：TASK-AI-GATEWAY-001
- 日期：2026-10-10
- 目标：让文本/图片能力、实际模型标识和网关操作在同一套可验证契约中流通。
- 触发：现有网关只有图片生成语义，模型菜单和 Codex 归档会丢失有效模型标识，无法安全暴露文本、SSE、模型发现能力。
- 约束：复用现有 credentialRef、ChannelRegistry/Scheduler、ProviderConnection、generation-server 和 Design System；不新增账号池、headless 登录、第二队列或明文凭据路径。
- 验收：文本结果与图片结果类型分离；Ark 文本走 /chat/completions；stream=true 输出兼容 SSE；/v1/models 只返回非敏感元数据；图片选择器和归档保留实际模型 ID；缺失 Codex 型号时显示未知状态。
- 未覆盖：真实 Ark/Codex 凭据联调、DPAPI、外部 sub2api 和生产发布。