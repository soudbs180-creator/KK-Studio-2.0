# 未完成任务收口实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前审计工作树中收口可由本地代码与 fixture 完成的 P1 未完成项：让 Stage 编排计划可在任务工作台查看和审批，移除伪造成本估算，并强制 Agent/生成结果满足画布交付契约。

**Architecture:** StagePlan 仍由 `CreationProject.stagePlans` 持久化，`createStageOrchestrator` 是唯一状态写入者；TaskWorkbench 只渲染计划并转发带 revision 的审批操作。任务成本统一通过 `taskState` 纯函数表达，未取得报价时保持未知。画布交付校验集中在 Agent 画布契约，宿主在归档结果前调用它，避免生成路径各自判断。

**Tech Stack:** React 18, TypeScript strict, Vite, Node test runner, Playwright, Zod。

**Spec:** `docs/governance/PROJECT_GOALS.md`, `docs/governance/task-ledger.json`, `docs/changes/2026-10-03-task-audit/spec.md`。

## Global Constraints

- `CreationProject.stagePlans` 是计划唯一持久化来源；不得新增第二套计划状态。
- 阶段审批必须带 `planId`、`stageIndex`、`gate` 和 `expectedRevision`，并由编排器 CAS 校验。
- Provider 未返回报价时不得展示示例单价或伪造实际扣费；成本只能标为未知或估算。
- 交付结果必须保留稳定节点身份，并在注册资产/文本结果后才进入画布。
- 凭据不得写入项目快照、localStorage、导出包、URL 或日志。
- 所有 UI 异步/审批入口都要有失败反馈；外部 Provider、Desktop、生产环境仍按原账本状态保留。

## Review Focus

- 并发审批：旧 revision 点击审批不得覆盖新计划，UI 要显示错误且保持当前计划。
- 计划门状态：plan 审批前不能执行工作项，result 审批只能在全部工作项成功后出现。
- 成本边界：缺报价、零价、负价、非有限值和批量上限都不能生成伪造金额。
- 交付边界：缺 node id、节点不存在、未注册资产或文本为空时不能声称画布交付完成。
- 刷新恢复：计划和审批状态从现有 CreationSnapshot 重新读取后仍可见，旧任务列表行为不回归。

### Task 1: TaskWorkbench 阶段计划视图与审批交互（TASK-ORCH-002）

**Files:**

- Create: `src/components/TaskWorkbenchStages.tsx`
- Modify: `src/components/TaskWorkbench.tsx`
- Modify: `src/components/TaskWorkbenchContent.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/workspace.css`（只补计划面板所需样式）
- Test: `tests/browser/task-workbench.spec.ts`

**Interfaces:**

- Consumes: `StagePlan`, `stageApprovalGateFor`, `stagePlanProgress`, `stageWorkItemCounts`, `StageOrchestrator.decideStage`。
- Produces: TaskWorkbench 的 `Plan` 标签、阶段状态徽标、plan/result 审批按钮和错误提示；Agent host 使用同一个 `createStageOrchestrator` 实例。

- [ ] **Step 1: Write the failing browser test** — 在有效项目快照中注入一个 `plan_review` 阶段，打开任务工作台，断言计划标题、阶段状态和“批准计划”可见；点击后断言状态变为 `doing`。
- [ ] **Step 2: Run the browser test to verify it fails** — 运行定向 Playwright；预期失败于计划标签或审批按钮不存在。
- [ ] **Step 3: Implement the plan panel and callback chain** — 新建 `TaskWorkbenchStages`，父组件增加 `Plan` 标签和显式 `onStageDecision` 回调；App 以 ref 动态读取活动项目并创建编排器，审批失败由面板显示。
- [ ] **Step 4: Run the browser test to verify it passes** — 定向 Playwright 通过，并确认现有任务工作台测试无失败。
- [ ] **Step 5: Commit** — `feat: expose stage plan approvals in task workbench`。

### Task 2: 统一任务成本估算语义（TASK-TASKSTATE-001 本地收口）

**Files:**

- Modify: `src/features/creation/model.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/TaskExecutionApproval.tsx`
- Modify: `src/components/TaskWorkbenchContent.tsx`
- Modify: `tests/unit/taskState.test.ts`
- Test: `tests/browser/task-workbench.spec.ts`

**Interfaces:**

- Consumes: `estimateTaskCostUsd`, `formatCostUsd`。
- Produces: 新任务和重试任务在无供应商报价时 `estimatedCostUsd` 为 `undefined`；UI 统一显示“尚未取得报价”，有真实估算时明确标注“估算，非实际扣费”。

- [ ] **Step 1: Write the failing test** — 断言 `createTask` 和重试任务不再写入 `0.04` 示例价格；审批对话框和工作台显示未知报价。
- [ ] **Step 2: Run the unit/browser tests to verify they fail** — 预期现有任务仍带 `0.04` 或显示 Prototype 示例单价。
- [ ] **Step 3: Implement minimal cleanup** — 删除模型和重试入口中的示例单价，审批与工作台改用 `formatCostUsd`；保留供应商回报价字段与现有 schema 兼容。
- [ ] **Step 4: Run unit and browser tests to verify they pass**。
- [ ] **Step 5: Commit** — `fix: keep task cost unknown without provider quote`。

### Task 3: 画布交付契约接入宿主（TASK-CANVAS-001 本地收口）

**Files:**

- Modify: `src/features/agent/agentCanvas.ts`
- Modify: `src/features/agent/agentHost.ts`
- Modify: `src/App.tsx`
- Modify: `tests/unit/agentCanvas.test.ts`
- Modify: `tests/unit/agentHost.test.ts`

**Interfaces:**

- Consumes: `assertCanvasDelivery`, `CanvasDeliveryContractError`, `appendImageTaskResults`。
- Produces: 图片和文本结果在宿主提交前通过稳定节点与已注册结果校验；失败转为可观察错误，不静默把未归档结果写入画布。

- [ ] **Step 1: Write the failing test** — 覆盖宿主图片导入和统一生成发布路径；构造缺少资产/空文本的结果，断言不会提交并返回契约错误。
- [ ] **Step 2: Run the tests to verify they fail** — 预期当前宿主仍会提交未经契约校验的结果。
- [ ] **Step 3: Implement centralized validation** — 扩展契约对文本 Provider 结果的注册判断；Agent host 和 App 发布路径在 commit 前校验每个新结果，保留已归档结果和稳定来源连线。
- [ ] **Step 4: Run targeted and full unit tests to verify they pass**。
- [ ] **Step 5: Commit** — `fix: enforce canvas delivery contract at host boundaries`。

## Verification

- 定向：`node --test tests/unit/taskState.test.ts tests/unit/agentCanvas.test.ts tests/unit/agentHost.test.ts tests/unit/orchestrator.test.ts`
- 定向浏览器：`node node_modules/@playwright/test/cli.js test tests/browser/task-workbench.spec.ts`
- 全量：`node --test tests/unit/*.test.ts tests/deploy/*.test.mjs`、Canvas Agent、Playwright、TypeScript、ESLint、Prettier、UI、治理、功能、Markdown、Vite、Cargo。
- 更新 `docs/changes/2026-10-03-incomplete-tasks/` 五份交付文档、`task-ledger.json`/生成视图、`PROJECT_STATE.md`、`AI_HANDOFF.md`、`docs/PROGRESS.md`。
