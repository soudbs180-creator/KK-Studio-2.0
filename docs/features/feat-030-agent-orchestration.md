# Agent 编排与画布交付契约（FEAT-030）

- 状态：PARTIAL
- 领域：intelligence
- 最近更新：2026-09-23
- 关联任务：TASK-ORCH-001, TASK-ORCH-002, TASK-ORCH-003, TASK-CANVAS-001

## 用户可见入口

- 能力：Agent 生成任务按"阶段执行计划"编排：规划（plan）→ 审批（plan_review）→ 执行（doing）→ 结果审批（result_review）→ 完成（done）；失败只重试失败工作项。
- 当前 UI 入口：任务工作台（TaskWorkbench）展示任务队列；阶段计划状态条（待审批提示）在本功能后续任务（TASK-ORCH-002）接入。
- Desktop / Web 差异：领域层与工具面两端一致；Agent MCP 注册（plan 工具面接入 Codex）在 BACKEND-MCP-AUTO（TASK-MCP-AUTO）完成，当前工具面仅以纯函数形态存在。

## 代码位置

- 前端：`src/domain/stagePlan.ts`（状态机）、`src/features/agent/orchestrator.ts`（编排器+工具面）、`src/features/agent/agentHost.ts`（宿主注入）、`src/features/agent/agentCanvas.ts`（交付契约）
- 桌面 Rust：`src-tauri/src/project_package_snapshot.rs`（计划字段校验）、`src-tauri/src/project_package.rs`（计划素材原件打包）
- 服务端：无（阶段计划本地持久化，云端化属平台波次）
- 数据/存储：`CreationProject.stagePlans` 随 Web 本地快照或 Desktop creation-v2 快照保存，项目包导出/导入保留计划及其引用原件。

## 测试与证据

- 单测：`tests/unit/stagePlan.test.ts`、`tests/unit/orchestrator.test.ts`、`tests/unit/agentCanvas.test.ts`
- 浏览器回归：既有浏览器回归 300/300 通过；Stage UI 交互尚未接入，专项回归由后续任务补充。
- Rust 测试 / 实机验收：项目包导出/导入回归 80/80 Rust 全量通过；Desktop GUI 与正式发布未验收。
- 变更与验证证据：`docs/changes/2026-09-23-agent-orchestration/verification.md`

## 当前能力

- 已实现的本地领域层能力（尚无端到端运行验收）：
  - Stage 状态机：doing / plan_review / blocked / result_review / done，CAS 推进（乐观锁），非法迁移与并发冲突拦截；
  - 编排器：计划物化（同 id 同定义重放保留进度，不同定义拒绝覆盖；写前校验）、审批决策（plan/result 两门）、异常阻断、解除阻断并只重试失败工作项、待审批汇总；
  - 工作项写入：按预期 revision 与合法状态迁移更新，审批后的迟到结果不得覆盖计划；Web/Rust 项目包保留空计划字段与只由计划引用的素材原件；
  - 计划工作项 ID 在所有阶段内唯一；重复 ID 在创建和项目包预检时拒绝，防止按 ID 更新误推进其它工作项。
  - MCP 风格工具面：plan_get_stage_status / plan_update_stage_state / plan_patch_stage / plan_replan（纯函数形态，供后续 MCP 注册）；Agent 工具不能自行完成 plan/result 审批或解除阻断；
  - 交付契约：产物必须携带 node_id 且已注册素材资产，否则拦截；本轮产物按 result 连线收集与摘要。
- 明确标注未接：
  - TaskWorkbench 阶段计划 UI（只读/审批交互）未接（TASK-ORCH-002/003）；
  - 工具面尚未注册到 Agent MCP 服务（BACKEND-MCP-AUTO）；
  - 编排器尚未驱动真实生成执行（依赖 B3 媒体真实链路）。

## 差距与后端化

- “UI 已显示但后端未接”的点：任务工作台无阶段计划视图；审批仍走现有 TaskExecutionApproval（高成本/远程门），未走 plan/result 门。
- “已实现但未验证”的点：编排器驱动真实多视频任务未实机验证（媒体链路未闭合）。
- 变成 REAL 还缺什么：TaskWorkbench 阶段计划视图与审批交互（TASK-ORCH-002/003）、MCP 工具注册（BACKEND-MCP-AUTO）、真实媒体链路（BACKEND-MEDIA-001）、每平台运行证据。
- 外部依赖与阻断条件：无外部密钥依赖；媒体真实链路依赖供应商 Key（EXT-PROVIDER）。

## 变更记录

- 2026-09-23：创建卡片；新增 Stage 状态机、编排器、工具面与交付契约（TASK-ORCH-001 / TASK-CANVAS-001，见 `docs/changes/2026-09-23-agent-orchestration/`）。
- 2026-09-24：独立预检发现同 id 重放清空进度、非法计划写入后重载丢失；修复为重放保留原状态、写前校验与结构化错误。修复 head 的独立复审待完成。
- 2026-09-24：实现者自查修复 Agent 工具绕过人工审批门的问题；新增越权路径回归测试，独立复审仍待完成。
- 2026-09-24：独立预审发现旧计划覆写与跨端项目包漏同步两项阻断；已补受控工作项写入及 Web/Rust 项目包往返回归，修复后 head 的独立复审待完成。
- 2026-09-24：`67ff18fb` 独立复审关闭前两项 P1，同时发现重复工作项 ID 问题；新增 TS/Rust 失败先行测试并补计划级唯一性校验，新 head 仍待复审。跨端决定见 [ADR-006](../architecture/adr/ADR-006-stage-plan-package-contract.md)。
