# Plan：统一接入层需求文档补件

- 日期：2026-10-17；状态：requirements-only 文档整理 IN PROGRESS。
- 关联任务：TASK-AGENT-001、TASK-PROV-BYOK-001、TASK-KK-UNIFIED-20261015；补件执行 TASK-AUDIT-REPAIR-20261017。
- [原意](intent.md)、[补件规格](spec.md)、[验证](verification.md)、[审查](review.md)。
- 本次 branch/worktree：`fix/TASK-AUDIT-REPAIR-20261017` / `D:/kk-studio/.worktrees/TASK-AUDIT-REPAIR-20261017`；来源快照 `221560a322107092f66c142c7b911439087019f8` 未验收。

## 本次顺序

1. 冻结原 intent 字节；只创建四份角色文档，不修改原意或原使用优先级。
2. 在新审计任务登记补件职责和原任务来源；不将全部统一接入实施挪入审计任务。
3. 核对原 hash、五件套、链接与 ledger/Delivery 归属；实际结果写 verification。
4. 未来产品实施沿原 intent 分期另立明确任务并重新核对实现、版本资料与真实能力；此步骤本次 NOT RUN。

## 未执行范围

没有本包对应的 CLI profile 池、多账号调度、OAuth、网页登录、迁移、轮换数据库、真实额度或真实 Provider 验收。原任务已有成果只按其原 SHA 和范围解释，不因本文档补齐而升级为 DONE/REAL。
