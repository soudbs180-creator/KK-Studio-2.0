# Spec

- ID：2026-09-14-multi-provider-generation
- Source of truth：`src/domain/providerConnections.ts`、`src/features/creation/model.ts`、`src/integrations/generation/providerAdapter.ts`
- 入口与状态：Landing 的“生成数量”和“隐私模式”选择；模型设置的已登记连接列表；任务状态覆盖 queued、running、partial、succeeded、failed、cancelled、offline、interrupted。
- 数据契约与权限：浏览器只保存连接元数据和任务快照；API Key 通过现有会话内存或桌面系统凭据库读取；`credentialRef` 是不含秘密的凭据引用。`managed_api`、`user_byok` 和 `local_comfyui` 可进入调度候选，`user_oauth_local` 不进入公共池。
- 归档：生成结果立即下载并以 SHA-256 前缀创建 `assetId`，写入独立 IndexedDB；素材库显示 AI 生成标签、预览和来源，不依赖供应商临时 URL。
- 错误、取消、离线：429 读取 Retry-After 并冷却连接；401/403 隔离连接；5xx 和网络错误标记可恢复失败；外部 AbortSignal 取消请求和归档。平台额度模式只显示 Prototype 并拒绝提交。
- 验收标准：批量请求按 OpenAI Images 单次上限拆分；每段请求带幂等键；部分返回、部分归档和单任务重试不覆盖原始任务；快照归一化会丢弃未知字段，尤其是秘密字段。
