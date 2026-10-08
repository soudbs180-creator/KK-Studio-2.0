# Spec：阶段计划在现有任务工作台中审批

- Task ID：TASK-ORCH-002
- 状态：IMPLEMENTED（本地验收完成，真实执行仍为未接项）
- 日期：2026-10-08
- Intent / 账本：本目录 `intent.md`；`docs/governance/task-ledger.json` 的既有 TASK-ORCH-002。
- 当前规范与实现基线：main / origin/main@21d121d2b884b2b7ced4a98eb0e03c590de5c3cd。
- Source of truth：`CreationProject.stagePlans`、`stagePlanSchema`、`createStageOrchestrator`、当前 UI_INDEX 和工作台 tokens；不引入另一份计划文件或云状态。

## 用户行为与入口

在现有任务工作台增加“阶段计划”tab。项目无计划时说明暂无计划及可导入已有项目计划，不能生成虚假样例。计划按原阶段顺序显示目标、状态、待审批门、成功数量、工作项原提示词、返工指令、依赖、错误和资产 ID。多计划可选择；当前选择消失或换项目时清除旧选择和错误。

计划审批提供“批准计划”“拒绝计划”，结果审批提供“批准结果”“返工结果”；拒绝结果先明确影响范围，再提交。blocked 提供解除阻断，恢复状态沿用 orchestrator.retryStage。每个审批提交携带 projectId、planId、stageIndex、expectedRevision 和 gate。事件只操作当前显示的项目；失败显示持久错误与重新查看最新状态的建议，不吞掉错误。

计划拒绝后解除阻断不会绕过审批：doing 且尚未批准的计划提供“重新提交计划审批”，复用 requestStageApproval，保持项目范围和 revision 校验。合法的零工作项结果阶段可以确认拒绝阶段摘要；有工作项时必须选择至少一个返工项。

操作不发起供应商请求。doing 状态显示自动执行尚未接入，避免把“批准”误认为已生成。无可用宿主或项目保存失败时禁用写入并说明原因；离线仍可作本地审批。关闭弹层/切 tab 不改变计划。按钮可用键盘触发，沿用 modal Escape/focus 生命周期；390/1099/1920 宽度不隐藏审批动作。

## 架构、数据与权限

- App 创建唯一共享 StageOrchestrator，动态读取 creationRef 的活动项目，通过现有 commitCreation 保存；AgentHost 与工作台复用同一个实例。
- 项目范围校验置于共享宿主边界，先校验当前 projectId 再走既有 revision/state 校验；仅 UI 禁用按钮不能替代校验。
- UI 仅拥有选择、操作忙碌/错误、返工确认状态，不能镜像修改 StagePlan。批准不授权 provider 的数据保留/批量提交 gate。
- schema/API/文件格式：不改变现有 StagePlan 或原生 project package 格式；旧项目无 stagePlans 仍正常打开。
- 数据归属：计划在原项目内，与画布/任务同一持久化；CAS 防止覆盖新结果。原 prompt 不改写，结果拒绝使用已有依赖失效逻辑。
- 保存确认：flush 仅在所请求 revision 已获持久层确认时成功。排队期间若前一保存发生冲突而暂停可写性，未确认的后一操作必须拒绝，不能因为跳过写入而显示成功；重新读取保留内存草稿供单独恢复。
- 凭据与日志：不读取或输出供应商密钥、竞品个人数据；无新网络能力。
- ADR：遵守已有 Stage Orchestration ADR；此次只接线和视图，不需要第二份领域 ADR。

## 平台能力

| 能力           | Desktop               | Web            | Mobile | 降级/禁用理由                             |
| -------------- | --------------------- | -------------- | ------ | ----------------------------------------- |
| 阶段查看/审批  | 共享实现，native 另验 | 生产构建回归   | 未实现 | 未持有活动项目/保存错误时禁止写入         |
| 阶段自动执行   | 未实现                | 未实现         | 未实现 | TASK-ORCH-003；保持现有 TaskHost 单一队列 |
| Agent 计划工具 | 宿主纯工具接线        | 宿主纯工具接线 | 未实现 | MCP 服务注册另属 BACKEND-MCP-AUTO         |

## 生命周期与恢复

安装沿用 npm/package-lock；不新增依赖。初始化从原持久化项目读取。刷新/重启依赖既有存储恢复，损坏或写失败保留原有告警；不新增存储迁移。原 TaskHost 的 unknown 受理、取消和恢复规则不受审批影响。回滚仅还原本任务代码，已有 StagePlan 格式和项目数据可继续由旧领域代码读取；不删除用户文件。导出沿用原项目包，无新增退役或卸载动作。

## 验收映射

| Intent AC | 预期状态/结果                                                               | 检查/运行环境                     | 证据要求                       |
| --------- | --------------------------------------------------------------------------- | --------------------------------- | ------------------------------ |
| AC-1      | timeline 和空状态可读，窄屏可操作                                           | Playwright 生产 dist              | DOM、截图、无新 console error  |
| AC-2      | plan_review→doing/blocked，result_review→done/doing，结果与 revision 持久化 | 真浏览器 IndexedDB + 既有编排单测 | 断言状态/刷新/依赖失效，无请求 |
| AC-3      | 旧操作拒绝，原/新项目均无错误写入                                           | 新宿主边界单测 + 双击 UI          | revision 和项目内容断言        |
| AC-4      | 无重复 feature/task，不提升未经实测状态                                     | governance/features 检查          | 比较矩阵与已验证任务账本       |

## 风险和决策

审批 UI 先完整暴露已存在的计划契约；计划创建/重排、媒体执行和 MCP 远端注册继续归属原任务。FEAT-030 保持 PARTIAL，不能因为新增 tab 提升 REAL。用户授权的持续完善按证据逐项推进，本轮交付不代表所有外部能力已经完成。

## 集成补充约束

当前基线推进为origin/main@5b0eb6a；保持既有Plan标签，仅一个阶段审批面板、一个共享编排器。TaskWorkbenchContent→TaskWorkbenchStages→StagePlanDetail承载阶段内容，project.stagePlans仍为唯一权威；保留主线canPauseTask、activeProjectIdRef/画布刷新及重规划/回执/MCP行为。本轮新增与主线原阶段/任务回归均须通过；自动执行、MCP自动编排、真实媒体不因合并而提升状态。
