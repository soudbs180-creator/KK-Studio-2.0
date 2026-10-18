# Review：冷启动严格比较闭环

TASK-COLDSTART-LOCAL-20261018；base fe103d2b0ac24da90f5820b8034f6a016a79221b。不沿用上轮fe103审查批准新代码。边界见[Spec](spec.md)与[Verification](verification.md)。

首轮dirty Standards仅源码预检PASS/54定向；首轮独立Spec CHANGES REQUIRED/COLD-SPEC-001/P1，收据review-spec-dfb1d54c-a5ae-466b-a794-7341f39202d2.json SHA f8ce56da49d6382388f22a99d900426b4e460d4d1934aacf74c3ff5da15482ba完整保留。空字段不落盘却导致同值消息commit的问题已真实RED后修正双方持久化JSON比较。新增真实merge/metadata-only/flush等回归；旧调用者强制重复commit断言与新规格冲突，改为首次变更commit/相同回放不commit且仍flush，身份/metadata原断言保留。扩展113项已PASS，仍需精确新commit双轴补审、完整verify和真正默认冷启，不以dirty预检代替最终审查。
