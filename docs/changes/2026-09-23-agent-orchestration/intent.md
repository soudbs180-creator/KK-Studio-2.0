# Intent：Agent 编排与画布交付契约（波次A 领域层）

- Task ID：TASK-ORCH-001、TASK-CANVAS-001、TASK-TASKSTATE-001（本 PR）
- 状态：IMPLEMENTED
- 日期与提出者：2026-09-23，MainAgent（用户授权"开始把"启动波次 A）
- 请求来源：用户要求对齐竞品 MiniMax Design，实施《KK-Studio-竞品对齐-项目规划》波次 A；用户原话"开始把"。
- 用户授权范围与依据：波次 A 范围（A1 编排状态机、A2 交付契约、A3 统一任务态）；按 AGENTS.md / BRANCH-POLICY.md 在 worktree 分支实现，PR 合并。
- 关联账本、spec、plan：`docs/changes/2026-09-23-agent-orchestration/`

## 用户原意

竞品已经把"Agent 操作画布完成多模态创作"做成产品闭环。我（用户）的 KK Studio 已搭好但链路没闭合。请把竞品的机制学过来：Agent 生成按"阶段执行计划"编排，带人工审批门；生成产物必须真实落到画布节点；图片/文本（未来视频/音频）共用统一任务模型。

## AI 工程转译

- 目标：在 KK Studio 现有 CreationTask / agentHost / canvas 桥之上，新增 Stage 状态机领域模型、编排器、画布交付契约与统一任务态契约，全部为可单测的纯函数/纯逻辑层，不引入外部密钥。
- 使用者：Agent 宿主（plan 工具面）、任务工作台 UI（后续任务）、未来媒体链路。
- 输入/输出：StagePlan 物化到 `CreationProject.stagePlans`；plan 工具面返回结构化状态；交付契约对无 node_id/无资产注册的产物抛契约错误。
- 数据与平台范围：本地持久化（creation v1 快照）；web/desktop 一致；不接云端。
- 约束：不重复造现有模型（CreationTask 已含 9 态/幂等/成本）；不改 UI 组件结构（UI 对接归 TASK-ORCH-002）；不注册 MCP（归 BACKEND-MCP-AUTO）。
- 验收证据：typecheck + 单测全绿；registry/ledger/功能卡登记；交付包完整。

## 目标与非目标

- 预期结果：Stage 状态机（doing/plan_review/blocked/result_review/done）CAS 推进；编排器审批/阻断/失败重试；plan 工具面 4 个工具；交付契约函数；统一任务态契约模块。
- 包含范围：`src/domain/stagePlan.ts`、`src/features/agent/orchestrator.ts`、`src/features/agent/agentHost.ts`（注入）、`src/features/creation/model.ts`（stagePlans 字段）、`src/features/agent/agentCanvas.ts`（契约）、`src/features/creation/taskState.ts`、对应单测与治理登记。
- 明确不包含：TaskWorkbench UI 对接（TASK-ORCH-002）、编排器驱动真实生成执行（TASK-ORCH-003）、MCP 注册（BACKEND-MCP-AUTO）、媒体真实链路（BACKEND-MEDIA-001）。
- 受影响平台/模块：web、desktop（领域层共享）。
- 已有实现和规范来源：竞品分析报告（Stage 状态机/契约/知识机制）、`docs/features/features.registry.json`、`docs/governance/task-ledger.json`。

## 验收条件

| ID | 用户可观察结果 | 技术证据/检查 | 适用平台 |
| --- | --- | --- | --- |
| AC-1 | Stage 状态只能按合法迁移推进，并发冲突被拦截 | `tests/unit/stagePlan.test.ts` 覆盖合法/非法迁移与 CAS | web/desktop |
| AC-2 | 编排器可物化计划、批准/拒绝计划与结果、阻断、只重试失败工作项 | `tests/unit/orchestrator.test.ts` 覆盖全流程 | web/desktop |
| AC-3 | plan 工具面四个工具可调用并持久化状态 | orchestrator 单测调用 planTools | web/desktop |
| AC-4 | 产物无 node_id 或无资产注册时被契约拦截并给原因 | `tests/unit/agentCanvas.test.ts` 覆盖 | web/desktop |
| AC-5 | 图片/文本共用任务模型语义收口（9 态/重试/成本估算） | `tests/unit/taskState.test.ts` 覆盖 | web/desktop |
| AC-6 | 旧项目快照读入后不丢数据（stagePlans 可选字段兼容） | `model.ts` normalize 单测随全量回归 | web/desktop |

## 假设、风险和决策

- FACT（直接证据）：CreationTask 已含 9 态/幂等/成本字段；agentHost.applyOps 已支持 run_generation→generate→appendImageTaskResults 回填 result 连线；画布无分组模型。
- INFERENCE（假设及风险）：Stage 计划 UI 未接前，编排器状态仅对领域层可见（可接受，下一任务接 UI）。
- UNKNOWN / CONFLICT：无。
- AI 自主决定的技术事项及理由：审批门由状态（plan_review/result_review）推导而非阶段声明字段优先，避免双重权威；当轮产物分组以 result 连线集合等价实现（画布无 group 模型，不新增画布大改动）；plan_replan 先做占位（拓扑修复归 BACKEND-MCP-AUTO）。
- 必须由用户决定的产品语义/范围事项（无则写无）：无。
- 外部条件、费用或不可逆动作及已有授权：无外部密钥；全部本地可逆文件变更。
- 不在本次范围的问题与账本 ID：TASK-ORCH-002/003、BACKEND-MCP-AUTO、BACKEND-MEDIA-001、T7 发布。
