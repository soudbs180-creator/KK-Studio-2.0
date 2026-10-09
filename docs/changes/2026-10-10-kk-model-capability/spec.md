# Spec：kk 多平台模型能力闭环

## 能力契约

1. CapabilityManifest.operations 支持 chat，保留既有 generate。
2. SubmitResult 使用文本、inline 图片和异步任务的可辨识联合类型；聊天路径拒绝图片结果。
3. Ark 通道根据 operation 调用 /chat/completions 或 /images/generations。
4. generation-server 提供受鉴权保护的 GET /v1/models 和 OpenAI 兼容 /v1/chat/completions；流式响应是单次 buffered delta 加 [DONE]。
5. 模型选择和图片归档保留 displayName/effectiveModel；未知上游型号显示“图片模型未报告”。

## 安全与边界

- /v1/models 只输出 id、owned_by、capabilities，不得泄露 baseUrl、credentialRef 或 secret。
- 凭据继续经现有 vault/memory resolver 读取，日志、提示词和响应原文不增加秘密落盘。
- 旧图片适配器、调度冷却、重试、ProviderConnection 和 UI 入口保持兼容。