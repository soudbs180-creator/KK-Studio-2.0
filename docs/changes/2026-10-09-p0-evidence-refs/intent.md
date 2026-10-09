# Intent：修复 P0 evidence refs

## 目标

修复 3d358f0 登记包中三个 P0 TODO 的失效 evidence 路径，使治理检查只引用当前树中真实存在的文档；保留 TODO 与 NOT_VERIFIED，不实现产品代码。

## 范围

- 更新 `docs/governance/task-ledger.json` 的三个 evidence 列表。
- 重新生成 `docs/governance/TASK_LEDGER.md`。
- 不修改源码、测试行为或任何任务验收状态。
