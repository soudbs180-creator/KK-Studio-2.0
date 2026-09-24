# Plan：Agent 编排与画布交付契约（波次A 领域层）

- Task ID：TASK-ORCH-001、TASK-CANVAS-001、TASK-TASKSTATE-001
- 状态：IMPLEMENTED
- 日期：2026-09-23
- Intent / Spec / ADR：本目录 intent.md / spec.md；无新增 ADR
- Owner / branch / worktree：root / `feat/TASK-ORCH-001-agent-orchestration-closure` / `D:/kk-studio/.worktrees/TASK-ORCH-001`
- Base / HEAD SHA 与远端目标：base = origin/main @ 9f04bfc（已 fetch 后建 worktree）；目标 PR → origin/main
- Git dirty/index 状态、并行任务与文件归属：worktree 新建时干净；无并行同文件任务；本 PR 独占 `src/domain/stagePlan.ts`、`src/features/agent/orchestrator.ts`、`src/features/creation/taskState.ts` 等新文件

## 开工证据

- 已读取的规则、账本、规范和实现：AGENTS.md、AI_RULES.md、BRANCH-POLICY.md；task-ledger.json（66 条）；features.registry.json（31 条）；`_feature-template.md`；check-features.mjs / check-governance.mjs / ledger.mjs；agentHost.ts / agentCanvas.ts / agentTypes.ts / model.ts / imageTaskCommand.ts / generationQueue.ts / TaskWorkbench.tsx / TaskExecutionApproval.tsx
- 依赖/工具版本与安装：node 24 + npm ci（244 packages）成功
- 基线 lint/typecheck/相关测试：typecheck 通过；新增 40 项单测 + 全量 399 项通过（见 verification.md）
- PRE-EXISTING FAILURE 与关联任务：无（基线干净）
- 计划中 AI 自主事项：审批门由状态推导；当轮产物分组用 result 连线集合等价实现；plan_replan 占位
- 必需外部条件与已存在的用户授权：无外部密钥；用户已授权波次 A（"开始把"）

## 实施顺序

| 步骤 | 文件/模块 | 改动和目的 | 依赖 | 验证 |
| --- | --- | --- | --- | --- |
| 1 | `src/domain/stagePlan.ts`（新增） | Stage 状态机：5 态、CAS 推进、审批门、重试、normalize、摘要 | 无 | stagePlan.test.ts |
| 2 | `src/features/creation/taskState.ts`（新增） | 统一任务态契约：9 态、可重试、失败子集、成本估算 | model 类型 | taskState.test.ts |
| 3 | `src/features/agent/orchestrator.ts`（新增） | 编排器：物化/审批/阻断/重试 + plan 工具面 4 工具 | 1 | orchestrator.test.ts |
| 4 | `src/features/creation/model.ts` | CreationProject.stagePlans 可选字段 + normalize 兼容 | 1 | 全量单测 |
| 5 | `src/features/agent/agentCanvas.ts` | 交付契约 + 当轮产物收集/摘要 | model 类型 | agentCanvas.test.ts |
| 6 | `src/features/agent/agentHost.ts` | 注入 orchestrator，暴露 stagePlans()/planTools() | 3,5 | typecheck + 既有 agentHost.test.ts |
| 7 | 治理登记 | 功能卡 feat-030/031、registry +2、ledger +5、features:write、changes 交付包 | 全部 | lint / governance:check |

## 并行与冲突

- 可独立的任务/文件、各自 worktree：无（本 PR 单 worktree）。
- 同文件写入的串行顺序：无外部写入者。
- 整合负责人、目标 branch/base 和同步策略：root；PR 至 origin/main；合并前 merge 最新 main。
- 冲突后重新验证的范围：若 main 前移，重跑 typecheck + 全量单测 + lint。

## 风险与恢复

- 最危险的失败场景与预防：normalize 白名单误丢数据 → stagePlans 可选 + 逐条 safeParse，损坏条目丢弃且不影响其他字段。
- 数据备份/原件保护/回滚或补偿：全部新文件/增量字段；git 可回退。
- 触发恢复的条件及 runbook：typecheck/lint 失败 → 修复后重跑；单测失败 → 定位断言修复。
- 高风险外部动作的授权、权限和费用边界：无。
- 不选择的方案及理由：不新增画布 group 模型（改动大，当轮产物用 result 连线集合等价）；不把 plan 工具直接注册 MCP（归 BACKEND-MCP-AUTO）。

## 验证和交付

- 定向回归：4 个新增/扩展测试文件 40 项通过；全量 399 项通过；typecheck 通过。
- 完整验证与必要 Rust/native/live 检查：无 Rust 变更；Rust 检查在 PR 合并门禁（CI）执行。
- UI 的 Figma/DOM/截图、1421/1423/Tauri 证据（适用时）：本 PR 无 UI 变更，不适用；UI 任务 TASK-ORCH-002 补充。
- 独立 reviewer 与当前 SHA 审查：PR review 阶段由独立上下文 AI 审查。
- 文档、账本、PROJECT_STATE/HANDOFF/PROGRESS 更新：功能卡、registry、ledger 已更新；PROJECT_STATE 见 verification.md 关联更新。
- PR、用户产品验收、发布和回滚记录：PR 提交后由用户验收合并。
- 暂不可验证项及准确状态：UI 审批交互、真实生成驱动、MCP 注册、媒体链路（均为后续任务，未声明完成）。

## 计划变更记录

- 2026-09-23：创建计划。实现中修正：stageApprovalGateFor 由状态推导门（修复 result 门测试失败）；stageWorkItemCounts 补充 cancelled 计数；plan_patch_stage 工作项 kind 用类型守卫归一。均未改变产品意图或超出授权。
- 2026-09-23 补充：竞品路线图审查发现 `taskState.ts` 重复定义的普通重试逻辑允许 `unknown`/已提交任务，并把 `unknown` 输出列为失败。追加失败先行测试，统一复用 `taskRecovery.canRetryTask`；`retryFailedOutputIndices` 改接任务状态且仅返回确定失败项。更新功能卡、账本与验证勘误，保留原始测试记录的历史含义。
- 2026-09-24 补充：独立预检发现同 id 重放重置已完成计划、非法工具输入先写成功后被存储校验丢弃。新增失败先行测试；领域创建和持久化在写前校验，计划工具输入使用 schema 解析并返回结构化错误；同 id 同定义重放保留当前状态，不同定义要求新 id。修复后重新运行受影响测试与交付门禁，独立复审仍待完成。
- 2026-09-24 补充：实现者审计发现 Agent 工具可以直接完成 plan/result 审批并解除阻断；先失败测试后将工具可写迁移限制为 `doing` 发起审批/阻断，保留宿主 `decideStage`/`retryStage` 作为决策入口。更新工具描述与验收记录。
