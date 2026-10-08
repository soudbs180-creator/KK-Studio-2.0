# Spec：阶段审批、成本语义与画布交付边界

- Task ID：TASK-AUDIT-20261003
- 基线：`origin/main` 的当前可复现工作树
- 实现提交：`6ebaad8`、`937b050`、`d61adda`

## 阶段计划

- `TaskWorkbench` 提供 `Plan` 标签，并把 `stagePlans` 与 `onStageDecision` 显式传入内容组件。
- 每个计划显示阶段状态、目标、工作项数量和当前审批门；plan/result 门分别显示批准按钮。
- App 从当前项目动态读取计划创建编排器，审批结果通过已有 CAS/revision 契约持久化；错误在面板中以 alert 呈现。

## 成本

- `CreationTask.estimatedCostUsd` 只有真实可追溯的供应商报价或明确估算才可有值。
- 创建任务和剩余项重试不生成假定单价 `$0.04/张`。
- UI 统一调用 `formatCostUsd`：有值时标为“估算，非实际扣费”，无值时显示“尚未取得报价”；实际账单只接受供应商回执。

## 画布交付

- `assertCanvasDelivery` 保留稳定 `nodeId` 检查，并接受带非空文本的 provider 文案结果。
- `assertCanvasDeliveries` 为批量发布提供同一校验入口。
- Agent 图片导入要求本地 `assetId` 后才提交；App 图片结果同样要求 `assetId`，文案结果要求 provider 来源和非空文本。
- 校验失败时不追加结果节点；任务输出进入 `unknown` 并保留契约错误，便于后续核对供应商。

## 原生回执一致性（独立复核返修）

- 实时提交、轮询与重启恢复必须同时核对 `taskId` 和 `idempotencyKey`；任一不符都不得读取其素材或发布其正文。
- `outputIndices` 与逐项 `outputs` 必须一一对应、无重复、无越界；实时回执还须与本次实际提交的索引集合一致。恢复允许合法的子集提交，并保留其余已归档输出。
- 缺失、冲突或非法回执统一进入 `unknown`，禁止普通重试和自动重复提交；有效的既有归档证据保留，不以异常回执覆盖。
- 在适配器归一化前检查非法输入，不能先丢弃非法索引而让残余回执看似合法；保留旧 `assetIds` 格式的兼容。
- 共用同一校验函数，避免实时 Map 与恢复 find 对重复回执作出不同判定。单元回归覆盖身份双向不符、重复、冲突、缺失、越界与归档保护；浏览器回归覆盖实时提交/轮询和普通重试围栏。

## 验收

| ID          | 验收                                         | 证据                                                             |
| ----------- | -------------------------------------------- | ---------------------------------------------------------------- |
| ORCH-002-A  | Plan 视图显示计划与审批门                    | `tests/browser/task-workbench.spec.ts`                           |
| ORCH-002-B  | 批准计划后阶段进入执行中                     | `tests/browser/task-workbench.spec.ts`                           |
| TASKSTATE-A | 新建/重试任务没有演示成本                    | `tests/unit/creation.test.ts`                                    |
| TASKSTATE-B | 审批与工作台显示未知报价                     | `tests/browser/task-workbench.spec.ts`                           |
| CANVAS-A    | 文案 provider 结果可通过契约，缺资产图片被拒 | `tests/unit/agentCanvas.test.ts`, `tests/unit/agentHost.test.ts` |
