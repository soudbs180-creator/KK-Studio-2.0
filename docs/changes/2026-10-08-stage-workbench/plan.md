# Plan：阶段计划工作台接线与竞品能力收敛

> For agentic workers: REQUIRED SUB-SKILL: 使用 superpowers:executing-plans 在当前隔离 worktree 顺序实施，按 superpowers:test-driven-development 先验证失败再实现。

- Task ID：TASK-ORCH-002
- 状态：IN PROGRESS
- 日期：2026-10-08
- Intent / Spec：本目录 `intent.md`、`spec.md`。
- Owner / branch / worktree：AI；`codex/TASK-ORCH-002-stage-workbench`；`D:\kk-studio\KK-Studio-2.0\.worktrees\TASK-ORCH-002-stage-workbench`。
- Base / HEAD SHA：21d121d2b884b2b7ced4a98eb0e03c590de5c3cd；origin/main，目标分支未经用户发布授权不得推送。
- 初始状态：新 worktree clean；主仓库 main 保持原状；分析代理只写工作区外部证据文件，不写产品。

**Goal:** 学习竞品阶段审批能力，补齐已有 TASK-ORCH-002，在原工作台和原项目状态上形成真实可测闭环。

**Architecture:** 复用 StageOrchestrator 与 CreationProject 存储。共享宿主边界校验 projectId；React 面板仅展示计划并提交含 revision 的命令；AgentHost 注入同一实例。

**Tech Stack:** React 18、TypeScript strict、Vite、Tauri 2、Node 24、npm、node:test、Playwright。

**Spec:** `spec.md`。

## Global Constraints

不新建队列、计划存储、重复 feature ID；不改供应商凭据、竞品程序或用户资产；不自动执行批准后的计划；无真实付费 API 调用。保留严格 CAS、依赖失效、原 prompt、项目范围和 TaskHost 提交 gate。普通技术实现已获授权，规范文件 READY 后自主执行。所有成功声明只来自本次运行。

## Review Focus

1. 旧项目事件在切换到同 ID 计划的新项目后误改新项目：宿主项目范围测试必须拒绝。
2. 双击或迟到结果覆盖更新后的 revision：真实编排 CAS 单测及审批双击浏览器回归。
3. 拒绝结果错误清空原 prompt 或漏失效依赖：领域已有 rework 回归 + 工作台结果拒绝回归。
4. 保存失败显示成功或禁用理由不可见：宿主异常与 UI 反馈回归；原生存储故障路径独立复核。
5. 并行 Agent 写入导致工作台镜像陈旧状态：工作台只读 project.stagePlans，刷新持久化回归；宿主/工具共用实例。

## 开工证据

已读 AGENTS、AI_RULES、PROMPTING、SDLC、BRANCH-POLICY、REVIEW、UI_INDEX、当前 PROJECT_STATE、registry/ledger、StagePlan/Orchestrator/AgentHost/App/TaskWorkbench。竞品证据位于工作区 output/minimax-rea-20261008；只引用静态证据结论。工具为 D:\tools\node-v24.20.0-win-x64；依赖在本 worktree 执行 npm ci。基线检查和任何既有失败写入 verification.md。

## Task 1：共享宿主边界

**Files / Interfaces:** 原 `src/features/agent/orchestrator.ts` 的 decideStage/retryStage 增加可选 expectedProjectId 校验；工作台必须传入显示项目 ID。原 `tests/unit/orchestrator.test.ts` 验证项目切换与错误写入。

- [x] 写测试：跨项目同ID计划的旧审批/解除阻断被拒绝；原revision/迁移/返工回归保留。保存错误在Task 2验证可见及恢复草稿保留，不宣称事务回滚。
- [x] 运行新测试，确认缺失宿主边界导致 RED；安装环境错误不计 RED。
- [x] 最小实现项目校验和原编排器委托，不复制状态机。
- [x] 运行新测试和原 stagePlan/orchestrator 单测；Expected：全部通过。

## Task 2：工作台 UI 与 App/Agent 宿主接线

**Files / Interfaces:** `StagePlanPanel.tsx` 消费原项目和 Task 1 命令；`TaskWorkbench.tsx` 增加阶段计划 tab；`App.tsx` 唯一实例和保存状态；tokens CSS。浏览器测试只替代外部条件，不替代真实 App/存储。

- [x] 写生产浏览器测试：显示审批/结果/工作项、批准与拒绝持久化、双击仅推进一次、空状态、390 宽度。
- [x] build + 定向 Playwright；Expected：缺少阶段入口/动作 RED。
- [x] 最小实现现有 workbench timeline、操作状态和错误；AgentHost 注入原编排器。
- [x] 定向浏览器回归及相邻 task-workbench/agent 测试；Expected：新旧路径通过，既有队列数量不变。
- [x] 记录截图；Desktop 实测能力与 Web fixture 分开记录。

## Task 3：能力比较与可审查交付

**Files:** 本目录 comparison/verification/review、原 FEAT-030 card/registry、TASK-ORCH-002 ledger、PROGRESS/PROJECT_STATE/AI_HANDOFF、版本文件。

- [ ] 比较结论映射已有 feature/task，保留 KK 的强制 CAS/BYOK/本地资产归档；对竞品插件优势记录现有任务归属，不再登记同功能。
- [ ] 按脚本提升受影响平台 patch，生成治理文档；Expected：version/governance/features 检查通过。
- [ ] 完整 npm run verify 和必要 native 检查；Expected：通过或逐项记录实际阻断，不能隐藏失败。
- [ ] 对当前 committed HEAD 进行独立 fresh-context review，修复 blocker 并重跑相关/完整验证。
- [ ] 更新 ledger、状态和交接，保持 FEAT-030 PARTIAL。保留隔离分支供审查，不推送或发布。

## 并行、风险与恢复

两名既有分析代理只写分配的竞品/KK 比较证据；产品代码由主执行者顺序写入。本任务 schema 不变，无迁移；回滚可还原代码而保留项目。最大风险是把 UI 审批误作自动执行或制造另一份状态，本 spec 明确禁止。独立 review 按仓库要求以明确 HEAD 为证据；local commit 是可恢复的技术快照，公开 push/merge/release 留给用户最终控制。

## 计划变更记录

2026-10-08：进一步读取原方法后，直接在编排器的既有审批/解除阻断入口增加项目范围校验，替代新的 stageWorkbench 包装模块。共享接口沿用 StageDecisionInput；App 传入额外 expectedProjectId。减少重复封装，旧内部调用兼容，验收不变。
