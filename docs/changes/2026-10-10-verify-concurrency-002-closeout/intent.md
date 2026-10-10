# Intent：并发复核合并后状态收口

- Task ID：TASK-VERIFY-CONCURRENCY-002
- 状态：PARTIAL（合并后回读已完成；历史根因仍未知）
- 日期与提出者：2026-10-10，root 按用户要求继续严格收口。
- 授权范围：只记录已合并 PR、主线回读、Hosted 结果和账本状态；不改产品源代码、测试断言、重试策略、历史证据或根工作树。
- 关联：[原验证](../2026-10-10-verify-concurrency-002/verification.md)、[原审查](../2026-10-10-verify-concurrency-002/review.md)、[规范](spec.md)、[计划](plan.md)、[任务账本](../../governance/task-ledger.json)。

PR #46 已按默认 squash 合并。合并后的主线 verify、deploy-linux 和证据上传均已成功，delivery 按 workflow 条件跳过；本收口包把这些事实同步回权威文档，并关闭合并后回读项 IRV-CONC-002。历史 source105 首轮 9 个 flaky 的根因仍为 UNKNOWN，因此任务继续保持 PARTIAL。

## 验收

| ID | 预期结果 | 证明方式 |
| --- | --- | --- |
| AC-1 | 合并 SHA、origin/main、tree 和合并后 Hosted 结果可回读 | PR API、Git fetch/readback、run `37983272823` |
| AC-2 | IRV-CONC-002 关闭，IRV-CONC-001 仍明确约束 DONE/根因声明 | 本收口包 review、task ledger 和原始证据 |
| AC-3 | 新的 dated change package、生成账本、独立复核和普通 PR 流程完整 | delivery/governance/Markdown/JSON/diff checks、Hosted checks |
