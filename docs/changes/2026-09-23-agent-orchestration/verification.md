# Verification：Agent 编排与画布交付契约

- Task ID：TASK-ORCH-001、TASK-CANVAS-001、TASK-TASKSTATE-001
- 状态：VERIFIED（领域层；剩余未验证项见"未验证项"）
- 日期：2026-09-23
- 环境：Windows 11 / node 24；worktree `D:/kk-studio/.worktrees/TASK-ORCH-001`（base origin/main @ 9f04bfc）

## 验证结果总览

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| npm ci | PASS（244 packages） | 安装日志 |
| npm run typecheck | PASS | tsc --noEmit 无输出 |
| 新增单测 4 文件 | PASS 40/40 | node --test 输出 |
| 全量 npm test | PASS 399/399 | node --test 输出 |
| npm run format:check | PASS | prettier 全部文件通过 |
| npm run lint | PASS | eslint 0 错误 + governance 66 tasks 0 违规 + features 31 0 违规 + markdown 83 文件 0 违规 |
| npm run ui:check | PASS | 159 文件 0 违规 |
| npm run build | PASS | vite build 成功（chunk 体积提示为既有告警） |
| npm run test:ui | PASS 300/300 | Playwright（msedge，1920x1080 + 响应式矩阵） |

## 测试细节

- `tests/unit/stagePlan.test.ts`（新增，15 项）：合法迁移 doing→plan_review→doing→result_review→done 全链；CAS 期望状态不匹配即抛错且不写入；非法迁移（done 后再动、未知状态、未知阶段）抛错；approvalGateFor 由状态推导（plan_review→plan、result_review→result、其余 null）；pendingStageApprovals 汇总；retryStageWorkItems 只把 failed/partial 重入队且 done/queued/running 不受影响；stagePlanSummary 各状态计数；normalizeStagePlan(s) 对损坏条目丢弃、白名单重建；zod 解析。
- `tests/unit/taskState.test.ts`（新增，12 项）：unifiedTaskStatuses 9 态全量；taskStateRank 排序；canRetryTask（failed/partial 可重试、unknown 需人工核对、done/cancelled 不可重试）；retryFailedOutputIndices 只选 failed/partial；estimateTaskCostUsd 非负有限、按定价表累乘；formatCostUsd 估算标注。
- `tests/unit/orchestrator.test.ts`（新增，9 项）：upsertPlan 幂等覆盖；requestStageApproval plan/result 两门；decideStage plan 门 approve→doing / reject→blocked；result 门 approve→done / reject→doing；不在审批状态拒绝；markStageBlocked；retryStage 只重试失败项；approvalSummary 汇总；planTools 四工具调用并持久化（get/update/patch/replan）。
- `tests/unit/agentCanvas.test.ts`（扩展 +3，共 4 项）：assertCanvasDelivery 对无 node_id（报"未携带 node_id"）、不存在的节点（报"不存在"）、无资产注册（报"尚未注册素材资产"）抛 CanvasDeliveryContractError，合法交付不抛；collectRecentOutputs 按 result 连线收集、按来源过滤；summarizeRecentOutputs 摘要文本。
- 修复记录：stageApprovalGateFor 从"阶段声明门优先"改为"由状态推导"（修复 result 门测试）；stageWorkItemCounts 补 cancelled；plan_patch_stage kind 用类型守卫归一（修 TS7053/TS2322）。

## 治理与登记验证

- features.registry.json：31 条（+FEAT-030/031），卡片路径与 id 一致，状态 PARTIAL。
- task-ledger.json：66 条（+TASK-ORCH-001/002/003、TASK-CANVAS-001、TASK-TASKSTATE-001）；仅 TASK-ORCH-001 为 IN_PROGRESS（唯一 active，含绝对 worktree 与分支，不与既有活动任务冲突），其余为 TODO/PARTIAL。
- 功能卡：feat-030 / feat-031 含固定章节、状态行与 registry 一致、含自身 id。
- 交付包：本目录 intent/spec/plan/verification/review 五件套。

## 未验证项

- Rust 检查（cargo / rust tests）：本 PR 无 Rust 变更；PR 合并门禁执行。
- 运行证据（runtimeEvidence）：无 UI 变更与真实媒体链路，运行截图不适用；UI 对接（TASK-ORCH-002）与媒体链路（BACKEND-MEDIA-001）完成后补。
- 已知后续缺口：TaskWorkbench 阶段计划视图（TASK-ORCH-002）、编排器驱动真实生成（TASK-ORCH-003）、plan 工具 MCP 注册（BACKEND-MCP-AUTO）、媒体真实链路（BACKEND-MEDIA-001）。

## 验证结论

领域层实现完成并通过全部门禁：新增 40 项 + 全量 399 项单测、typecheck、format:check、lint（eslint+governance+features+markdown）、ui:check、build、浏览器 300 项全部通过；治理登记完整。能力按 PARTIAL 标注（不冒充 REAL）。剩余未验证项仅限后续任务范围内的 UI 对接、真实媒体链路与运行证据。

## 2026-09-23 补充勘误：未知受理与普通重试

- 上述首次测试摘要把 `canRetryTask` 的 `unknown` 行为写成“需人工核对”，但候选 `taskState.ts` 实际对 `unknown/unknown` 返回 `true`，并把 `unknown` 输出选入失败集合。此处是旧测试按错误行为断言所遗漏的问题，不能把原始 PASS 当作该安全边界已通过。
- 与既有 `taskRecovery.canRetryTask` 对照后，以相同输入复现差异：`unknown/unknown`、`failed/submitted` 在原有逻辑均拒绝普通重试，候选新函数均允许。应用 UI 仍调用原有函数，未观察到真实重复提交。
- 先修改 `taskState.test.ts`，确认两项测试按预期失败；再删除第二套重试判定，使统一任务态复用 `taskRecovery.canRetryTask`，失败子项选择只接收整个任务并只返回 `failed` 输出。`unknown` 输出与受理不明任务均返回空集合。
- 本次定向测试 `taskState.test.ts` + `taskRecovery.test.ts` 12/12 通过；全量 Node 单测 399/399、TypeScript `tsc --noEmit` 通过。代码无 UI 或原生运行路径改动，真实 Provider 回执丢失与重启恢复仍未实机验收。

## 2026-09-24 补充验证：计划重放与写入校验

- 审查基线：`origin/main@76339c9f`；发现问题时的候选 head 为 `b5669f1d`。独立 reviewer 报告 ORCH-R1（同 id 重放丢进度）和 ORCH-R2（非法计划写入后被读取 normalize 丢弃），见 `review.md`。
- 失败先行：新加的 `orchestrator.test.ts` 三项测试在旧实现下失败，分别复现重置 `done/revision/assetId`、缺 prompt 仍返回成功、计划工具重放重置状态。修复后 `orchestrator.test.ts` + `stagePlan.test.ts` 定向 25/25 通过。
- 修复后：领域创建和编排器持久化写前按同一 `stagePlanSchema` 校验；工具输入在映射前校验，空 id、空/缺/超长 prompt、非法 kind、null 阶段/工作项与超量工作项均拒绝且不修改项目；有效计划可由 `normalizeStagePlan` 读取。同 id 同定义重放不写入，保留阶段、revision、素材引用；同 id 不同定义拒绝。新计划数量与读取上限统一为 64。
- 当前本地代码检查：Node 单测 404/404、TypeScript `tsc --noEmit`、ESLint 0 错误、Prettier、Vite production build、浏览器回归 300/300 均通过；governance 66 任务、features 31 功能、Markdown 83 文件、UI 标准 159 文件均 0 违规。浏览器测试生成的已跟踪截图/JSON 仅还原本轮测试改动，不纳入 PR。此次数量是新增 5 项防回归测试后的候选结果，不替代上方 399/399 的历史运行记录。
- 当前独立审查状态：独立 reviewer 对旧 head 给出两项问题，修复后因 reviewer 执行额度中断而未能绑定新 head 复验；最终独立审查仍为 **NOT VERIFIED**。本地逻辑验证不代表 UI、Desktop 原生重启或真实 Provider 验收。
