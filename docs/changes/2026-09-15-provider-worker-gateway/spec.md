# Spec

- 权威 schema：src/features/generation-server/schema.sql，包含 GenerationJob、JobAttempt、CreditReservation、CreditSettlement、ProviderRequestLog 及输出、Webhook、连接控制、用户权限与对象所有权。
- 独立 Node24 Worker；浏览器请求生命周期不控制已提交任务。SQLite 事务负责幂等、预留、租约和结算。
- 每个输出单独处理。已知 Provider ID 恢复轮询；无法确认提交结果或归档结果进入 manual_review，禁止盲目重发。取消增加围栏，晚到结果不能授权资产或结算。
- 明确429完整尊重Retry-After；401/403/scope/project隔离；明确5xx最多5次有界指数退避；人工重试只操作选定失败项。
- Webhook HMAC-SHA256、±5分钟、双重幂等、generation/Provider ID/sequence校验；提前到达事件持久化pending。
- 提交前检查隐私、能力、权限、用户与连接并发、管理员禁用、成本上限、熔断、全部输出额度预留。已受理任务允许在停止新提交后继续归档。
- 每成功归档输出按管理员内部单价结算；明确未执行失败退款；未知供应商用量与运行中取消保留预留待人工复核。不伪造供应商美元/token/GPU账单。
- 服务私有PNG对象存储，完整SHA256和严格PNG完整性校验；客户端只看到assetId与其鉴权路由。其他MIME在无完整解码器时明确拒绝。
- 密钥由服务管理器/Vault注入服务器请求内存，只持久化不透明引用；无浏览器供应商密钥、无个人订阅共享或OAuth轮换。现有UI仍保留Prototype边界，新后端不自动替换账户/CreationTask UI。
