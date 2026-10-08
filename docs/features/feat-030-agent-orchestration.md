# Agent 编排与画布交付契约（FEAT-030）

- 状态：PARTIAL
- 领域：intelligence
- 最近更新：2026-10-08
- 关联任务：TASK-ORCH-001, TASK-ORCH-002, TASK-ORCH-003, TASK-CANVAS-001

## 用户可见入口

- 能力：已有本地阶段计划采用 plan_review → doing → result_review → done 审批流程，拒绝计划进入 blocked，解除阻断只重置失败工作项；真实生成执行尚未接入。
- 当前 UI 入口：任务工作台 → 阶段计划；查看阶段/工作项/进度，plan/result 人工审批、选项返工、空阶段拒绝、解除阻断与重新申请审批共用原编排器。审批不自动提交生成。
- Desktop / Web 差异：领域层与工具面两端一致；Agent MCP 注册（plan 工具面接入 Codex）由 BACKEND-MCP-AUTO（TASK-MCP-AUTO）负责，当前尚未接入，仅以宿主纯函数形态存在。

## 代码位置

- 前端：`src/domain/stagePlan.ts`（状态机）、`src/features/agent/orchestrator.ts`（编排器+工具面）、`src/features/agent/agentHost.ts`（宿主注入）、`src/features/agent/agentCanvas.ts`（交付契约）；`TaskWorkbench.tsx`、`StagePlanPanel.tsx`、`StagePlanDetail.tsx`（阶段 UI），`src/App.tsx` 创建共享实例。
- 桌面 Rust：`src-tauri/src/project_package_snapshot.rs`（计划字段校验）、`src-tauri/src/project_package.rs`（计划素材原件打包）
- 服务端：无（阶段计划本地持久化，云端化属平台波次）
- 数据/存储：`CreationProject.stagePlans` 随 Web 本地快照或 Desktop creation-v2 快照保存，项目包导出/导入保留计划及其引用原件。

## 测试与证据

- 本轮TASK-ORCH-002本地AC DONE：领域/实际持久hook定向46/46、Stage浏览器12/12，完整verify根638/646、Agent172/174（原skip8/2）、browser389/389零retry；production Tauri审批/返工/重启和真实CAS冲突/草稿恢复通过。源码HEAD 41dd865独立复验PASS，最终文档精确SHA收据另记，见[本轮验证](../changes/2026-10-08-stage-workbench/verification.md)。以下数字是历史证据。
- 单测：`tests/unit/stagePlan.test.ts`、`tests/unit/orchestrator.test.ts`、`tests/unit/creationSaveQueue.test.ts`、`tests/unit/agentCanvas.test.ts`；历史全量 Node 422/422 通过。
- 浏览器回归：历史300/300；本轮新增 `tests/browser/stage-workbench.spec.ts` 的真实 App/IndexedDB 审批流，Desktop 对应 `tests/desktop/stage-workbench.mjs`。
- Rust 历史验收：项目包导出/导入及重复身份拒绝回归82/82；本轮Desktop GUI范围为上列本地审批/保存/冲突恢复，真实生成与正式发布未验收。
- 变更与验证证据：`docs/changes/2026-09-23-agent-orchestration/verification.md`

## 当前能力

- 已实现的本地领域与工作台能力（审批和持久化已有本地 fixture 端到端验收）：
  - Stage 状态机：doing / plan_review / blocked / result_review / done，CAS 推进（乐观锁），非法迁移与并发冲突拦截；计划审批前不得执行，全部工作项成功后才能请求结果审批或完成；
  - 编排器：计划物化（同 id 同定义重放保留进度，不同定义拒绝覆盖；写前校验）、审批决策（plan/result 两门）、异常阻断、解除阻断并只重试失败工作项、待审批汇总；
  - 结果审批拒绝由宿主指定返工项及可选新 prompt（省略时整个阶段返工）；关联下游工作项与旧素材引用失效，受影响的结果审批需重新进行；
  - 原提示词保持计划定义，返工执行提示词单独保存；已批准计划的有效提示词变更须重新通过计划审批，同 ID 原计划重放保留返工进度；
  - 工作项写入：按预期 revision 与合法状态迁移更新，审批后的迟到结果不得覆盖计划；依赖项须先成功，缺失、自依赖或环形依赖被拒绝；Web/Rust 项目包保留空计划字段与只由计划引用的素材原件，拒绝跨项目计划；
  - 计划工作项 ID 在所有阶段内唯一；重复 ID 在创建和项目包预检时拒绝，防止按 ID 更新误推进其它工作项。
  - MCP 风格工具面：plan_get_stage_status / plan_update_stage_state / plan_patch_stage / plan_replan（纯函数形态，供后续 MCP 注册）；Agent 工具不能自行完成 plan/result 审批或解除阻断，阶段操作与宿主审批均须携预期 revision；
  - 交付契约：产物必须携带 node_id 且已注册素材资产，否则拦截；本轮产物按 result 连线收集与摘要。
- 明确标注未接：
  - 阶段计划自动创建/执行与增量重规划未接（TASK-ORCH-003）；`plan_replan` 仍为摘要占位；
  - 工具面尚未注册到 Agent MCP 服务（BACKEND-MCP-AUTO）；
  - 编排器尚未驱动真实生成执行（依赖 B3 媒体真实链路）。

## 差距与后端化

- “UI 已显示但后端未接”的点：阶段 UI 已接本地编排器并等待保存完成；审批不替代现有 TaskExecutionApproval（高成本/远程门），也不自动执行工作项。
- “已实现但未验证”的点：编排器驱动真实多视频任务未实机验证（媒体链路未闭合）。
- 变成 REAL 还缺什么：计划驱动执行（TASK-ORCH-003）、MCP 注册（BACKEND-MCP-AUTO）、真实媒体链路（BACKEND-MEDIA-001）与真实多阶段验收；本地 fixture UI 验收不能替代外部能力。
- 外部依赖与阻断条件：无外部密钥依赖；媒体真实链路依赖供应商 Key（EXT-PROVIDER）。

## 变更记录

- 2026-10-08：吸收 MiniMax 阶段审批入口，在原工作台/原项目状态上补 UI 和共享宿主接线；保留严格 revision、项目范围、依赖失效、原提示词及 unknown 围栏。功能仍 PARTIAL，详见[比较与融合顺序](../changes/2026-10-08-stage-workbench/comparison.md)。

- 2026-09-26：`9ddfcb5` 源码独立复审 PASS，Hosted verify/delivery 成功；功能仍为 PARTIAL，Desktop GUI、真实 Provider、MCP 注册与 UI 阶段视图未验收。详情见验证记录。

- 2026-09-26：`abb2bb8` 独立复审发现返工提示词绕过计划审批与破坏同 ID 重放；当前候选改为可选 `reworkPrompt` 并在提示词变化时重新审批，Web/Rust 包契约同步，新 head 待验证。

- 2026-09-26：`5fff9de` 独立复审关闭前五项问题，但发现结果拒绝后成功项不能返工的 P1；当前候选补宿主返工选择与跨阶段依赖失效，新 head 仍待独立复审与 Hosted CI。

- 2026-09-26：`36a3419` 独立复审发现审批门、未运行完成、ABA、依赖图及跨项目计划问题；当前候选已补跨端校验和回归，本地验证通过，新 head 仍待独立复审与 Hosted CI。

- 2026-09-23：创建卡片；新增 Stage 状态机、编排器、工具面与交付契约（TASK-ORCH-001 / TASK-CANVAS-001，见 `docs/changes/2026-09-23-agent-orchestration/`）。
- 2026-09-24：独立预检发现同 id 重放清空进度、非法计划写入后重载丢失；修复为重放保留原状态、写前校验与结构化错误。修复 head 的独立复审待完成。
- 2026-09-24：实现者自查修复 Agent 工具绕过人工审批门的问题；新增越权路径回归测试，独立复审仍待完成。
- 2026-09-24：独立预审发现旧计划覆写与跨端项目包漏同步两项阻断；已补受控工作项写入及 Web/Rust 项目包往返回归，修复后 head 的独立复审待完成。
- 2026-09-24：`67ff18fb` 独立复审关闭前两项 P1，同时发现重复工作项 ID 问题；新增 TS/Rust 失败先行测试并补计划级唯一性校验，新 head 仍待复审。跨端决定见 [ADR-006](../architecture/adr/ADR-006-stage-plan-package-contract.md)。
