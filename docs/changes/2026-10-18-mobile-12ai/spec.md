# Spec：12ai 手机端生成与原件保存

- Task ID：TASK-MOBILE-12AI-001；READY；2026-10-18。
- [Intent](intent.md)；官方权威：[API 手册](https://doc.12ai.org/docs/api)、[GPT Image](https://doc.12ai.org/docs/api/gpt-image)、[Chat](https://doc.12ai.org/docs/api/chat-completions)、[异步视频](https://doc.12ai.org/docs/api/async-video)、[Sora](https://doc.12ai.org/docs/api/videos)。

## 图片与文本

仅明确识别为 12ai 的 HTTPS 原始连接，在 `/v1/images/generations` 请求 `response_format: b64_json`。识别范围固定为 new/cdn/api.12ai.org、默认 TLS 端口、根路径或 `/v1`；不改用户连接地址。不对其他兼容端点添加该参数。仍按图片签名、MIME、16MiB、输出数量检查原件，并使用现有归档路径。URL 返回仍安全处理，失败提示说明接口已响应但原件取回失败，不自动生成第二次。

文本继续 `/v1/chat/completions` 的现有单条用户输入与 SSE 契约；完整结束才归档。`max_completion_tokens` 是可选项，本次不新增任意上限、tools 或多轮产品功能。

## 视频与恢复

只在明确的 12ai 连接提供文生视频入口。统一协议用 `/v1/task/submit` 与 `/v1/task/{id}`，Sora 用 `/v1/videos` 与对应查询、content 下载端点。模型 ID 和必填默认参数逐项取官方文档；未证明兼容的模型不能盲目提交。界面展示基础时长、尺寸和单条数量。

保留已有 snapshot、存储 key 和数据身份；复用 `kind: video`、`protocol: openai-compatible`、既有 `providerRequestId` 保存上游任务 ID，不持久化原件访问 URL。不新增回滚旧版无法识别的 snapshot 字段。视频沿用 16MiB 原件上限，超限保持可核对失败而不删旧数据。图片与视频分别校验实际文件签名。

收到任务 ID 后只查询同一任务；unknown 或丢回执不自动 POST。停止连接不宣称取消上游或退款。刷新后 Key 按现有设计清除；用户重新保存同连接 Key 并明确点击恢复时，仅在连接 ID、捕获地址及协议一致时允许查询，导入的只读回执禁止远端查询。原件跨域读取不携带 API Key，不虚构统一视频 content 或取消端点。

## 平台、费用与验收

变更限独立 Mobile 工程和组合 Web 版本元数据，保留 Desktop 行为。原生编译、实机 Safari、云端同步不由手机视口验收代替。真实图片只复验一张；文本和视频的 fixture 与真实付费证据分开，视频未实测不声称上游生成已验收。沿用正式 Release 自动部署和唯一 previous；保留旧版对新数据可读的回滚证据。
