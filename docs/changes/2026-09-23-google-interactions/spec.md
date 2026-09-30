# Spec: Google 对话与生图

- Task ID: TASK-AGENT-004
- 状态: READY，用户请求授权范围内的 AI 技术决策
- Intent: [intent](intent.md)

设置的模型供应商页面增加 Google Gemini 卡片，使用固定官方 HTTPS 地址和既有 credential service；保存连接元数据与不透明引用。Web 密钥只在当前会话，Desktop 使用系统凭据库。测试连接只查询模型。

对话执行方式新增 Google Gemini，支持聊天/图片两种输出，精确模型 ID 可编辑。图片默认采用用户提供的 gemini-3.1-flash-image、1:1、2K。采用当前官方 response_format 与 steps/model_output 协议；不将用户示例中的转义下划线作为实际字段。请求无自动重试，无自定义外传地址或重定向。连续对话使用 previous_interaction_id；每轮重发 system_instruction/tools/config。

Google 会话独立保存在当前 CreationProject，可恢复已完成历史。API Key、原始响应、图片 base64 不进入会话记录。切换项目终止旧请求，迟到响应不得写其他项目。中断或无法确认受理的请求标 unknown，恢复不得自动重新提交。用户可明确新建会话。

图片经既有素材归档和 Agent Host 入画布，以 interaction/output 的稳定身份去重；只归档 model_output，忽略 thought 中的图像。可读取画布并调用受限 KK 工具，写操作沿用询问模式；不向 Google 暴露本机路径/凭据。生图模式直接返回图片；其他生成仍由 KK 已有任务入口管理。

验收矩阵: 文本/图片与多轮、原件图片输入、HTTP 401/429/5xx/断流、取消/迟到/切换项目、重复点击、工具审批拒绝/允许、归档失败、快照恢复与旧项目兼容、Codex 回归。凭据/真实配额/真实模型质量无证据时保持 NOT VERIFIED。

官方来源（2026-09-23）: [overview](https://ai.google.dev/gemini-api/docs/interactions-overview), [get started](https://ai.google.dev/gemini-api/docs/get-started), [image](https://ai.google.dev/gemini-api/docs/image-generation), [reference](https://ai.google.dev/api/interactions-api).
