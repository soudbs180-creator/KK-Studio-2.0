# Spec：原生归档接入成本回执

- Task ID：TASK-TASKSTATE-002
- 范围：`src/features/creation/taskCostArchive.ts` 与 `nativeTaskHost.ts` 的归档回执。
- 不做：不改 UI，不发明单价，不把 token 用量换算成美元，不接真实供应商账单。

## 契约

- 宿主记录可带可选 `costReceipt`。它必须是普通对象；数组、字符串和缺失都表示没有报价。
- 回执格式非法、任务身份不符或与已接受回执冲突时，任务上原有的报价和实际费用保持不变。
- 身份被隔离的宿主记录不携带报价，避免把别人的费用写到当前任务。
- `source: "fixture"` 可以留下回执对象，但不能写成 `actualCostUsd`。
- 输出上的 `tokenUsage` 只保留用量，不产生 `estimatedCostUsd` 或 `actualCostUsd`。
