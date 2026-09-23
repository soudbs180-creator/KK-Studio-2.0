# Spec：Agent 编排与画布交付契约

- Task ID：TASK-ORCH-001、TASK-CANVAS-001、TASK-TASKSTATE-001
- 状态：IMPLEMENTED
- 日期：2026-09-23
- Intent / 账本：`docs/changes/2026-09-23-agent-orchestration/intent.md`；`docs/governance/task-ledger.json` TASK-ORCH-001/CANVAS-001/TASKSTATE-001
- 当前规范与实现基线：`src/features/creation/model.ts`（CreationTask）、`src/features/agent/agentHost.ts`、`src/features/agent/agentCanvas.ts`、`src/features/creation/imageTaskCommand.ts`
- Source of truth：本目录 spec.md（不另写冲突副本）；竞品机制参考《竞品分析-MiniMax-Design-3.0.18-vs-KK-Studio.md》

## 用户行为与入口

- 主流程和相邻流程：Agent 规划生成任务 → 物化 StagePlan（plan_patch_stage）→ 阶段进入 plan_review → 人工/编排器审批（approve→doing / reject→blocked）→ 执行 → result_review → 审批通过 done；失败项在 blocked 解除时只重试 failed/partial。
- 页面/route/组件或 API/命令入口：领域层纯函数（stagePlan.ts / orchestrator.ts）；UI 入口在 TASK-ORCH-002；Agent MCP 注册在 BACKEND-MCP-AUTO。
- loading、success、error、cancel、offline、timeout：状态推进 CAS 失败返回明确错误（并发冲突不写入）；工具面错误统一 `{ ok: false, error }`。
- 重试、幂等、stale async、unknown 受理与重启恢复（按需）：同 id 同定义重放保留已有状态、revision 与素材；同 id 不同定义拒绝并要求新 id；CAS 防 stale 状态推进；写入前校验计划可被存储 normalize 接受。计划随项目快照持久化（normalize 兼容旧数据）。
- 键盘/焦点/Escape/IME、长文案、响应式（UI 适用）：不适用（本 PR 无 UI 变更）。

## 架构、数据与权限

- 模块职责和依赖方向：domain/stagePlan（无依赖）→ features/agent/orchestrator（依赖 domain/stagePlan + features/creation/model 类型）→ agentHost（注入 orchestrator）；agentCanvas 契约依赖 model 类型。
- schema/API/事件/文件格式与兼容策略：StagePlan/Stage/StageWorkItem 为 zod 白名单 schema；`CreationProject.stagePlans` 为可选数组，normalizeStagePlans 过滤损坏条目，旧快照不受影响。
- 数据归属、原件保留、校验和、并发/原子性：阶段计划随项目快照本地持久化；推进采用乐观锁（expectedStatus 校验），不覆盖他人写入。
- 凭据与日志边界、最小权限、外部传输与费用：本 PR 无凭据接触、无外部传输；成本为本地估算口径（不接支付）。
- 相关 ADR（无需时说明原因）：无需新增 ADR（本地领域扩展，无架构分叉）。

## 平台能力

| 能力 | Desktop | Web | Mobile | 降级/禁用理由 |
| --- | --- | --- | --- | --- |
| Stage 状态机 | 是（共享领域层） | 是 | 是（共享领域层） | 无 |
| 编排器与工具面 | 是 | 是 | 是 | 无 |
| 交付契约 | 是 | 是 | 是 | 无 |
| 统一任务态契约 | 是 | 是 | 是 | 无 |
| plan 工具面注册到 Agent | 否 | 否 | 否 | 属 BACKEND-MCP-AUTO，本 PR 仅纯函数 |

## 生命周期与恢复

- 初始化/安装：无。
- 正常使用、取消/离线：状态机不依赖网络；离线仅影响生成（既有任务语义）。
- 升级和旧 schema：stagePlans 可选字段 + normalize 白名单，旧快照读取后不丢数据。
- 损坏/写失败/进程重启：计划创建和工具输入在 commit 前完整校验，非法输入返回错误且不写入；旧快照中已损坏的计划由 normalize 丢弃；CAS 失败不写入。
- 备份、还原、回滚：项目快照机制既有；本 PR 不新增。
- 导出/卸载/退役及用户数据保留：不适用。
- 各项不适用的原因：本 PR 为领域层增量，无安装/导出面。

## 验收映射

| Intent AC | 预期状态/结果 | 检查/运行环境 | 证据要求 |
| --- | --- | --- | --- |
| AC-1 | 状态机合法/非法迁移与 CAS 全部有断言 | node --test tests/unit/stagePlan.test.ts | 40 项新增单测全通过 |
| AC-2 | 编排器全流程覆盖 | tests/unit/orchestrator.test.ts | 通过 |
| AC-3 | 工具面可调用 | orchestrator.test.ts planTools 用例 | 通过 |
| AC-4 | 契约拦截 | tests/unit/agentCanvas.test.ts | 通过 |
| AC-5 | 任务态契约 | tests/unit/taskState.test.ts | 通过 |
| AC-6 | 旧快照兼容 | 全量单测回归（399 项） | 通过 |

## 风险和决策

- 可自主解决的技术决定及依据：审批门由状态推导；当轮产物以 result 连线集合实现；plan_replan 占位。
- 待用户决定的产品语义（无则写无）：无。
- 规范冲突、外部依赖与阻断范围：无。
- 与 intent 的差异及授权依据：无差异。
- 明确未承诺的能力：UI 审批交互、真实生成驱动、MCP 注册、媒体真实链路。
