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

## 2026-09-24 补充验证：Agent 不得自行审批

- 实现者自查发现 Agent 可通过 `plan_update_stage_state` 把 `plan_review` 直接推进为 `doing`，绕开 `decideStage`。新增测试在旧实现下失败（工具返回 `ok:true`），修复后定向 `orchestrator.test.ts` 13/13 通过，覆盖计划审批、结果审批和解除阻断三条越权路径；宿主 `decideStage` 仍可合法完成审批。
- 这条修复发生在上述 404/404 与 300/300 运行之后；以下为当前代码重新执行的结果，不沿用旧数字：`node --test tests/unit/*.test.ts` 405/405，`tsc --noEmit`、ESLint 0 warning、Prettier、Vite production build 均 PASS；治理 66 任务、功能 31 项、Markdown 83 文件、UI 标准 159 文件均 0 违规；Playwright/Edge（Vite preview）300/300 PASS。Vite 对第三方 zod 注释和大 chunk 给出非阻断告警。浏览器测试重写的既有截图和 JSON 仅还原本轮由测试产生的文件，未覆盖任务文档或源码。
- 当前代码没有可见 UI 改动，浏览器回归只说明旧 Web 行为未明显回退；未做 Desktop release、真实 Provider 或人工审批端到端验收。最终独立复审仍为 **NOT VERIFIED**；提交后的 head SHA 需与本次文件树绑定并运行 delivery 检查。

## 2026-09-24 独立预审缺口修复：CAS 与项目包

- 审查基线 `ae4bf7a9` 的两项 P1：公开 `persistPlan` 可把 rev2/done 回写成 rev0/doing；`stagePlans` 空字段使 Rust 项目包校验失败，Web/Rust 漏收仅由阶段工作项引用的素材。独立审查结论为 CHANGES REQUIRED，详见 `review.md`。
- 失败先行：`orchestrator.test.ts` 新用例在旧实现下因无受控更新入口失败；`projectPackage.test.ts` 新用例实际得到 `[]` 而非计划素材 id；Rust `exports_normalized_project_with_empty_stage_plans` 实际返回 `corrupt: 项目快照无效`。
- 修复后定向 Node（orchestrator/projectPackage/stagePlan）38/38；全量 Node 407/407；Rust 全量 80/80（含空 `stagePlans` 导出与仅计划素材的导入往返）；TypeScript noEmit 与增量构建、ESLint、Prettier、Vite production build、治理 66/0、功能 31/0、Markdown 83/0、UI 标准 159/0 均通过。Rust 编译有五项既有 dead_code warning；Vite 有第三方注释及 chunk 提示，均非失败。
- 当前代码的 Playwright/Edge 浏览器回归 300/300 通过；测试重写的 23 个既有截图仅恢复其本轮生成改动，未纳入 PR。当前 head 的 hosted CI 和独立复审需在提交后核对；未做 Desktop GUI/正式发布、真实 Provider 或人工审批端到端验收。

## 2026-09-24 重复工作项 ID 复审修复

- 绑定 `67ff18fb` 的独立复审关闭原 ORCH-FINAL-R1/R2，但发现 ORCH-FINAL-R3：重复工作项 id 可把已成功项和排队项一并更新为 running。复审实际最小输入得到 `[queued, succeeded] → [running, running]`，结论 CHANGES REQUIRED。
- 失败先行：新增 Node 计划创建与 `plan_patch_stage` 测试在旧实现下分别未抛错/返回 `ok:true`；Rust `rejects_stage_plan_with_duplicate_work_item_ids_before_export` 原返回成功导出。补计划级唯一性校验后，Node 定向 29/29、Rust 新用例通过。
- 当前候选的全量 Node 409/409、Rust 81/81、Playwright/Edge 300/300、TypeScript noEmit/增量构建、ESLint、Prettier、cargo fmt、Vite production build 均通过；治理 66/0、功能 31/0、Markdown 84/0、UI 标准 159/0。浏览器默认启动检查提示 1423 端口已用，但当时 HTTP 连接拒绝且无监听进程；由本任务启动同一 Vite preview 并使用临时 `reuseExistingServer` 测试配置完成 300/300，随后停止自有预览进程并移除临时配置。测试生成的 24 个已跟踪截图已恢复，不纳入提交。提交后的 delivery、Hosted CI 和独立复审仍待完成；Desktop GUI、真实 Provider 与发布未验证。

## 2026-09-26 阶段和计划身份唯一性回归

- 旧 head `c7abc45` 的 Hosted quality run `35945896838` 对该 SHA 的 `verify` 与 `delivery` 均成功；它不验证下面的新改动。独立复审因 reviewer 执行额度耗尽，仍为 **NOT VERIFIED**。
- 失败先行：TS 归一化原接受重复阶段索引并保留两个同 ID 计划（2 项失败）；Rust 原生包原接受重复阶段索引/计划 ID 并成功导出（1 项失败）。修复后 Web 项目包测试确认两种情况都返回 `corrupt` 而非静默丢计划。
- 当前工作树完整本地检查：Node 412/412、Rust 82/82、Playwright/Edge 300/300；TypeScript noEmit/增量构建、ESLint、Prettier、cargo fmt、Vite production build 全部通过；治理 66/0、功能 31/0、Markdown 84/0、UI 标准 159/0。浏览器测试改写的 21 张已跟踪截图和 Rust 测试生成的 2 份 schema 已恢复，不纳入候选。
- 新 head 提交后的 `delivery:check`、Hosted CI 与独立审查仍须重新绑定准确 SHA；Desktop GUI/正式发布和真实 Provider 未验证。

## 2026-09-26 独立复审阻断修复回归

- 独立 reviewer 对 `36a341952e46bbf2f31eff1d9984d0c5189767dc` 的结论为 CHANGES REQUIRED：计划门可绕过、排队工作项可标完成、阶段工具同状态 ABA、依赖图未执行四项 P1，以及包内计划归属不一致一项 P2。reviewer 只读动态复现了 ABA 和缺失依赖运行；其结论不等于修复后 PASS。
- 失败先行：新增 49 项定向 Node 运行中 6 项失败，分别复现审批绕过、未执行完成、Agent 阶段 ABA、前置未完成仍运行、Web 包接受外项目计划、缺失/自依赖/循环；Rust 项目包扩展测试在旧实现成功导出异常计划而失败。另补宿主审批 ABA 失败测试、状态不可能组合的归一化与 Rust 包拒绝测试。
- 修复后本地：Node **420/420**、Rust **82/82**、Playwright/Edge **300/300**；TypeScript noEmit/增量构建、ESLint 0 错误、Prettier、cargo fmt、Vite production build 通过。浏览器测试改写的 22 张已跟踪截图已恢复，不在候选内。Rust 仍有五项既有 dead_code warning，Vite 仍有第三方 zod 注释及大 chunk 提示，均非失败。
- 重新验证的门禁覆盖：计划批准标记随 Web/Rust 包往返；未批准/未成功/异常依赖/跨项目计划均不可成为有效可写入候选；Agent 工具与宿主审批携预期 revision，旧请求不写入。新提交后的 delivery、Hosted CI 和独立补审仍 **NOT VERIFIED**；Desktop GUI、真实 Provider、正式发布和用户产品验收不在本地验证结论内。

## 2026-09-26 结果拒绝返工回归

- 独立 reviewer 对 `5fff9dec935fc325b875db7d0f660c95d1fd2f8a` 的结论仍为 CHANGES REQUIRED：此前五项问题关闭，但结果审批拒绝后所有工作项仍成功且无法重跑，是现存流程 P1。其最小复现同时验证工作项更新和同 ID 重物化均无法修改产物。
- 新增单项返工端到端定向测试，旧实现实际得到 `succeeded` 而非预期 `queued`；修复后验证新 prompt、旧素材引用清除、旧 revision 拒绝、新产物和第二次结果审批。另验证跨阶段成功依赖及已完成阶段失效、前置重做前不得运行下游、非法返工选择无写入。
- 当前本地 Node **422/422**、Rust **82/82**、Playwright/Edge **300/300**（首跑 298 直接通过、2 重试通过；这 2 项随后以 `--retries=0` 独立重跑 2/2）、TypeScript noEmit/增量构建、ESLint、Prettier、cargo fmt、Vite production build 均通过；治理 66/0、功能 31/0、Markdown 84/0、UI 标准 159/0。浏览器测试改写的已跟踪截图在核对后恢复，不纳入候选。新 SHA Hosted CI/独立补审仍待完成；旧 SHA 的托管结果不替代当前候选。
