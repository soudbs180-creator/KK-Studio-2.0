# Plan：发布记录收口

- Task ID：TASK-MOBILE-COMPOSER-001；交付包角色：current；branch `docs/TASK-MOBILE-COMPOSER-001-production-receipt`，初始base `b457d3a05759ca7a2f6a8c4bb62a8ba8aea908ea`，PR创建时main推进后以正常merge集成`87c9cfbe0f19555f9998d6b7051760f22f26f67f`。
- 单一写入者root复用已登记隔离树；只更新PROGRESS、PROJECT_STATE、AI_HANDOFF、同一task对象、FEAT-028 summary/卡片及生成视图。原其他152任务均保留，新main增加Canvas任务后保留其他153任务；36个非028功能对象保持。
- 先核实发布、线上UI/原件与只读库存，再写本后缀五件套及release索引；保留原包的失败、flaky、未提交预检与当时PENDING。
- 执行governance/features生成与check、Markdown/index/snapshot/commands/version、格式、lint/typecheck；提交后正式Delivery、精确docs HEAD独立审查、正常PR/Hosted门禁，禁止direct-main/force。
- 无产品变更，不重新收费生成、不重复整套本地产品测试；当前产品完整验证与Hosted按[Verification](verification.md)实际来源记录。实体Android接受未到则保持IN_PROGRESS/NOT_VERIFIED。
- 并发main源码41完整保留；仅TASK_LEDGER生成视图发生merge冲突，按已合并JSON重新生成，不手工选择任一旧视图。新提交/Delivery/独审/Hosted按集成后HEAD重新核定。
- [Intent](intent.md) / [Spec](spec.md) / [Review](review.md)。
