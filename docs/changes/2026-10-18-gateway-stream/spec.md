# Spec：增量流、取消与一次响应边界

TASK-GATEWAY-STREAM-20261018；[原意](intent.md)、[计划](plan.md)。

- 可选内部awaitable文本delta回调从adapter经过Scheduler/chat抵达现有HTTP路由，3参数runChatCompletion及非stream JSON保持兼容；仅stream请求发Ark stream:true与include_usage。真实本地HTTP首段先到、上游完成仍被barrier阻挡是必要验收，不能以完整response.text后数chunk代替。
- SSE读取正确处理UTF-8分片、CRLF/多行data、空事件及usage空choices，设置有限事件/总字节/文本上限，复用现有纯文本事件语义。正常stop后继续读取至DONE才完成；空输出、malformed、截断、未完成、工具/length终结均不得伪造成功。CONTENT_BLOCKED/refusal为不可重试，首字前也不能换号重试。
- 第一次实际下游write立即设置重试栅栏；write=false仍是已接受数据，等待drain或close/abort。此前可按既有分类换账号，此后任何失败不重试，不生成成功stop/DONE。客户端在首段前后断连均向上游传播AbortSignal，停止解析/secret解析/账号切换，不给账号记故障或撤销健康会话pin。
- HTTP头前按现有OpenAI错误JSON/状态映射；头后只按流错误/关闭处理，不二次写JSON/status，不泄漏私密配置。成功完成输出正常stop及DONE，并保留合法usage；旧适配器忽略可选callback时仍兼容最终text。
- 维持鉴权、必需幂等键、未配置chat返回404、图片/异步409、错误分类与公共模型过滤。幂等键只被转发，无持久同步chat去重账本，不能承诺零重复计费。无main.ts/UI/默认路由接入，无新凭据/权限/持久化契约。

当前官方协议参考：[Ark Chat API](https://docs.volcengine.com/docs/ark/chat-api?lang=zh)、[官方API说明](https://api.volcengine.com/api-docs/view?action=ChatCompletions&serviceCode=ark&version=2024-01-01)。stream SSE及include_usage空choices是公开契约，不是真实服务验收。内部可选参数实现既有流式目标，不引入新架构决策或数据迁移；沿用现有网关规范与错误分类。
