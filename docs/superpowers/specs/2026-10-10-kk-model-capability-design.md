# KK 多平台模型能力闭环设计

## 目标
在已有 `ai-gateway`、Codex Agent、模型目录、ProviderConnection 和 generation-server 基础上，落地一个可插拔的 OpenAI 兼容能力入口：文本调用使用明确的文本结果类型并支持兼容 SSE；图片能力保留已有官方 Ark 路径，并在选择器和结果中显示实际模型标识；Codex 原生图片若上游未返回型号，显示明确的未知状态。

## 范围
- 扩展通道结果与操作契约，保留旧 `generate`/图片适配器兼容性。
- Ark 通道按操作分流文本 `/chat/completions` 与图片 `/images/generations`。
- 网关提供 `/v1/models`、非流式 `/v1/chat/completions` 和单次完成的兼容 SSE；错误沿用现有统一错误分类、调度冷却和重试。
- ModelSelection/模型菜单/图片归档元数据携带 `kind`、`displayName`、`effectiveModel`。
- 继续使用现有 credentialRef、ChannelRegistry/Scheduler、ProviderConnection、generation-server 持久化；不新增第二套账号池、队列或 headless 登录。

## 边界
- 不把网页 headless 作为默认或透明降级路径。
- 不伪造 Codex 图片模型名；上游无型号时使用“图片模型未报告”。
- 不宣称真实 Ark/Codex 外部联调已完成；需要真实凭据的验证保持 NOT VERIFIED。
- 账号池、持久化配额读数和外接 sub2api 仅保留现有扩展点，本轮不复制其 SaaS 控制面。

## 验收
1. 文本适配器返回独立文本结果，不再把任意 inline Base64 解码为文本。
2. `stream:true` 返回合法 OpenAI SSE（单次 buffered delta + `[DONE]`），不能返回 501。
3. `/v1/models` 只暴露非敏感模型与能力元数据。
4. 图片模型菜单主文案为完整已验证模型 ID/displayName；Codex 原生未知型号不会显示“Codex”作为图片模型。
5. 现有图片、调度、凭据和错误测试保持通过。
