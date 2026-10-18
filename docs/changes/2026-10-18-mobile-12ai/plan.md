# Plan：12ai 手机端生成与原件保存

- Task ID：TASK-MOBILE-12AI-001；IN PROGRESS；2026-10-18。
- [Intent](intent.md) / [Spec](spec.md)；执行按本仓 SDLC 的已授权自主流程，不增加形式审批。
- 根分支 `fix/TASK-MOBILE-12AI-001-provider-compat`，base `c248d8178ec1754315559a9e476ac909bb494287`。
- Mobile 基线 323/323、0 skip；根及 Mobile 使用锁文件 `npm ci --ignore-scripts`。证据在工程外 `.analysis/kkai-12ai-mobile-fix-20261018`，不覆盖前次验收收据。

## 顺序与归属

1. root：图片回归先失败，再实现 `services/twelveAiProtocol.ts` 单一连接识别与 `providerClient.ts` 图片格式修复，改清晰的原件失败提示。保留已有文本及未知受理防重复机制。
2. 独立视频工作树 `TASK-MOBILE-12AI-VIDEO-001`：视频服务、最小模型参数表、工作流、现有回执恢复、聊天媒体预览和 Composer 入口；先测试后实现。不改根图片 client、版本或治理文档。根顺序整合提交。
3. root：协议/恢复 ADR、账本/功能卡/PROGRESS、Web/Mobile 版本、受影响测试、全量 verify、Mobile lint/type/test/组合构建；现有 fixtures 不能替代真实生成证据。
4. 新独立 reviewer 审查当前提交 SHA 与旧版数据/回滚、密钥和收费边界；PR 满足 Hosted 当前检查后合入，不直推 main。
5. 精确 main 质量通过后正式 Release 自动上线。回读 build-info/产物/健康和唯一 previous；用户在网页填写 Key 后单次真实图片验收，验证自动归档与刷新原件散列，不清除原项目或失败任务。

## 重点回归

12ai 三个确认主机及 `/v1` 路径、伪装域名和通用端点；原件 CORS/签名/超限/取消；文本完整 SSE；视频首次提交与 GET 恢复、intent/回执落盘失败、停止/离线/Key 换 ref、连接变化和导入只读回执；新快照旧版校验可读；项目与素材刷新保存。失败保留原记录，不自动再次付费。

## 恢复

发布健康失败沿用受管原子 previous 回滚，不修改业务服务和数据库。若线上真实图片仍失败，保留新证据及单次请求，不重复生成掩盖故障。任何必要外部条件仅阻塞依赖部分，不冻结可继续的本地实施。
