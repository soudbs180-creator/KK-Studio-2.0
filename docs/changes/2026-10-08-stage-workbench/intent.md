# Intent：竞品拆解与现有阶段计划工作台闭环

- Task ID：TASK-ORCH-002
- 状态：IMPLEMENTED（本地验收完成，主线/发布门禁另验）
- 日期与提出者：2026-10-08，用户提出、AI 工程转译。
- 请求来源：用户要求学习 MiniMax Design，补齐 KK 功能，避免重复功能；更好的直接学习，各有优势则比较融合。
- 用户授权范围与依据：在现有项目内分析、实现、验证普通技术改进；不包含竞品程序修改、付费调用、共享分支推送或产品发布。
- 关联账本、spec、plan：`../../governance/task-ledger.json`、本目录 `spec.md`、`plan.md`。

## 用户原意

基于真实代码比较竞品与 KK，复用已有功能，持续完善可用链路；不能把静态发现、样例或占位能力当作已完成。

## AI 工程转译

先建立映射到现有 feature/task ID 的能力比较。首个实现落在已登记的 TASK-ORCH-002：把现有 `CreationProject.stagePlans`、StageOrchestrator 的审批和返工规则接入任务工作台，并与 Agent 宿主共用编排器。保留 KK 的强制 revision、项目隔离和统一 TaskHost。此轮不创建第二套计划存储、任务队列或审批状态机。

## 目标与非目标

- 预期结果：用户能查看项目的阶段计划、工作项、等待审批和完成进度，并批准、拒绝或解除阻断；结果拒绝沿用原有依赖失效规则。
- 包含范围：竞品与已有功能比较、工作台阶段视图、宿主接线、真实持久化与回归。
- 明确不包含：计划自动执行 TASK-ORCH-003、Agent MCP 服务注册 BACKEND-MCP-AUTO、付费媒体供应商接入、竞品源码复制和第三方插件直接移植。
- 受影响平台/模块：Desktop/Web 共享 React UI、Agent 宿主和 FEAT-030；原生 Mobile 未实现。
- 已有实现和规范来源：`docs/architecture/adr/ADR-006-stage-plan-package-contract.md`、`src/domain/stagePlan.ts`、`src/features/agent/orchestrator.ts`、现有 feature registry/task ledger、`docs/UI_INDEX.md`。

## 验收条件

| ID   | 用户可观察结果                                                                | 技术证据/检查                     | 适用平台                |
| ---- | ----------------------------------------------------------------------------- | --------------------------------- | ----------------------- |
| AC-1 | 现有工作台显示阶段、待审批门、工作项状态和进度，空项目说明入口条件            | 浏览器生产构建与窄屏截图          | Web/Desktop 共享界面    |
| AC-2 | 计划/结果批准和拒绝更新原项目；刷新保留结果；结果拒绝保留原提示词并失效依赖   | 浏览器审批/重载回归、现有编排单测 | Web；Desktop 持久化另验 |
| AC-3 | 过期 revision、重复点击、切换项目后的旧操作不能修改其他项目；错误给出恢复动作 | 宿主边界单测与浏览器回归          | Web/Desktop 共享逻辑    |
| AC-4 | 比较结论指向已有 feature/task，明确保留、学习、融合及未实现项                 | 比较文档、registry/ledger 检查    | 仓库治理                |

## 假设、风险和决策

- FACT：main@21d121d 已有阶段模型与编排器；App 未实例化/注入编排器，工作台只读任务列表。竞品有阶段审批工作流，KK 的 revision 校验更严格。
- INFERENCE：先完成现有阶段入口比增加独立 Agent 看板更符合避免重复的要求。
- UNKNOWN / CONFLICT：本机竞品仅完成静态分析，未验证其在线服务；新 UI 没有专属 Figma 节点，沿用当前工作台和 UI 治理 tokens，不声称精确 Figma 对齐。
- AI 自主决定的技术事项：以现有 TASK-ORCH-002 为唯一任务归属；审批后不会偷偷调用模型；未接入的自动执行明确提示。
- 必须由用户决定的产品语义/范围事项：无新增必须决定事项。
- 外部条件、费用或不可逆动作：npm 依赖安装和本地验证；不调用真实供应商。
- 不在本次范围的问题与账本 ID：TASK-ORCH-003、BACKEND-MCP-AUTO、BACKEND-MEDIA-001、TASK-ORCH-004。

## 后续主线集成授权

用户在本地候选交付后明确要求“合并主线”。按当前BRANCH-POLICY推送本任务分支、创建PR并在当前CI/独立审查门禁满足后squash；无部署、付费调用或分支清理授权。准备推送时主线前移至5b0eb6a（PR #34），因此先在本任务worktree融合并重新验收，不能直接沿用旧SHA审查。具体方案见[integration-plan](integration-plan.md)。上文无推送授权及初始main不变描述是首轮历史范围。
