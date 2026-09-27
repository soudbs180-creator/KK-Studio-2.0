# Review：Agent 编排与画布交付契约（波次A 领域层）

- Task ID：TASK-ORCH-001、TASK-CANVAS-001、TASK-TASKSTATE-001
- 状态：NOT VERIFIED（以下保留原自查记录；2026-09-24 修复后的 head 尚待独立复审）
- 日期：2026-09-23
- Reviewers：MainAgent 自查（全部门禁）+ PR 门禁（delivery:check / verify / 独立上下文 AI）
- Scope：本 PR diff（新增 stagePlan/taskState/orchestrator + 修改 model/agentCanvas/agentHost + 测试 + 治理登记）

## 变更范围清单

| 文件 | 变更类型 | 审查要点 |
| --- | --- | --- |
| src/domain/stagePlan.ts | 新增 | 状态机完整性、CAS、zod 白名单、normalize 兼容 |
| src/features/creation/taskState.ts | 新增 | 9 态契约、成本估算边界 |
| src/features/agent/orchestrator.ts | 新增 | 编排器写路径、工具面返回结构 |
| src/features/creation/model.ts | 修改（+stagePlans） | 可选字段、normalize 不丢旧数据 |
| src/features/agent/agentCanvas.ts | 修改（+契约） | 错误类型与拦截语义 |
| src/features/agent/agentHost.ts | 修改（+注入） | 可选注入不破坏既有构造 |
| tests/unit/{stagePlan,taskState,orchestrator}.test.ts | 新增 | 断言与产品语义一致 |
| tests/unit/agentCanvas.test.ts | 扩展 | 契约错误信息可读 |
| docs/features/feat-030/031 + registry + ledger + changes | 新增 | 登记一致性 |

## 自查结果

- 对 spec 一致：AC-1..AC-6 均有对应实现与测试；无范围外改动（未动 UI、未注册 MCP、未改媒体链路）。
- 用户可见行为与文档：本次无 UI 变更；功能卡与账本状态 PARTIAL 如实标注，未冒充 REAL。
- 错误与极端场景：非法迁移/CAS 冲突/未知计划/未知状态均有明确错误文案；工具面统一 ok/error 结构；成本估算负值/NaN 防护。
- 安全与凭据：无凭据接触、无外部传输、无敏感日志；无新增依赖。
- 可维护性：领域层与宿主解耦（orchestrator 通过注入 commit 持久化）；类型守卫收敛 unknown 输入；中文注释与既有风格一致。
- 性能与占用：纯函数/内存对象操作，无新开销路径。
- 测试缺口：UI 交互（TASK-ORCH-002）、真实生成驱动（TASK-ORCH-003）、MCP 注册（BACKEND-MCP-AUTO）未覆盖——属后续任务范围，不构成本 PR 缺陷。
- 与既有活动任务冲突检查：ledger 校验通过（唯一新 active 任务 TASK-ORCH-001，worktree/branch 独占）。

## 未执行/未满足项

- Rust 检查：原始领域层提交无 Rust 变更；2026-09-24 跨端修复已修改 Rust 项目包，当前完整 Rust 测试 80/80 通过，详见补充验证。
- 运行证据（runtimeEvidence）：无 UI 变更与真实媒体链路，不适用；由 TASK-ORCH-002 与 BACKEND-MEDIA-001 补充。
- 独立上下文 AI 复核：PR 提交后执行。

## 结论与下一步

- 最终自查结论：实现范围合规、测试充分（399 单测 + 300 浏览器）、lint/format/ui:check/build 全绿、治理登记完整；可按交付包规范提交 PR。
- 下一步：git add/commit；推分支；开 PR；PR 合并门禁（verify + delivery:check + 独立 review）通过后交付用户验收。

## 2026-09-23 补充审查

原自查遗漏了 `taskState.ts` 的第二套普通重试判定与既有 `taskRecovery.ts` 冲突：未知受理或已提交的任务可能被新辅助函数标为可重试。已通过先失败的测试复现，再删除重复判定并复用既有门禁；确定失败的输出选择改为读取任务状态，排除 `unknown` 输出。本次补充仅覆盖这项修正，独立上下文对更新后的候选 SHA 仍须重新复核，不能沿用原自查结论充当独立 review。

## 2026-09-24 独立上下文预检与修复

- 审查范围：独立 AI 上下文只读审查 `origin/main@76339c9f` 到候选 `b5669f1d` 的实际 diff、相关源码，并运行 `taskState`/`taskRecovery` 定向测试 12/12。该审查不是 GitHub 另一账号批准，也不代表用户产品验收。
- ORCH-R1（P1，合并阻断）：同 id 重放 `upsertPlan` / `plan_patch_stage` 将已完成阶段、revision 和素材引用重置。修复为同 id 同定义直接返回现有计划，不写入；同 id 内容变化拒绝，须创建新计划。测试先复现失败，再验证已完成阶段、素材和 revision 保留。
- ORCH-R2（P2，本任务存储契约阻断）：`plan_patch_stage` 接受缺少 prompt 的计划并返回成功，但读取时 `normalizeStagePlans` 丢弃整个计划；null 阶段/工作项还会直接抛异常。修复为工具输入和领域计划双层 schema 校验、写前拒绝且返回 `ok:false`，并限制计划数量与持久化上限一致。测试覆盖缺/空/超长 prompt、非法 kind、null 输入、超量工作项、有效计划往返。
- 上述问题由原审查确认；修复后定向测试及完整本地检查见 `verification.md`。独立 reviewer 在复验前因执行额度中断，因此当前修复 head 的独立审查仍为 **NOT VERIFIED**，不得将原审查或实现者自检标为最终 PASS。

## 2026-09-24 补充自查：审批工具权限边界

- ORCH-R3（P1，合并阻断）：`plan_update_stage_state` 暴露给 Agent 的工具原可直接执行 `plan_review→doing`、`result_review→done` 与 `blocked→doing`，绕过宿主的人工决策/失败项重试入口。先新增失败测试复现，随后将工具限定为 `doing→plan_review/result_review/blocked`；`decideStage` 和 `retryStage` 仍由宿主调用。该发现和修复仅为实现者自查，最终独立复审仍为 **NOT VERIFIED**。

## 2026-09-24 独立最终预审与修复

- 独立审查绑定 `ae4bf7a9`，结论 **CHANGES REQUIRED**。ORCH-FINAL-R1（P1）：所有规范化项目均带 `stagePlans`，但 Rust 项目包白名单拒绝，且 Web/Rust 包引用收集遗漏计划工作项的 `assetId`。ORCH-FINAL-R2（P1）：公开 `persistPlan` 可用旧 revision 将 `done` 覆盖回 `doing`。审查未修改代码或批准 PR。
- 实现者新增失败先行测试后修复：项目包两端校验和收集计划素材，Rust 导出/导入覆盖空计划与仅计划引用的原件；移除公开覆盖入口，工作项更新受 `expectedRevision` 与状态迁移约束。定向和完整验证见 `verification.md`。
- 旧审查只证明旧 head 不可合并；当前修复后新 head 的独立审查仍为 **NOT VERIFIED**，Hosted CI 也须重新绑定新 SHA。PR #14 与 #15 的四个文档内容冲突尚待按顺序整合。

## 2026-09-24 精确 head `67ff18fb` 复审与输入边界修复

- 独立 reviewer 对 `67ff18fb7633beba5a86dfd1bb6be066880a2580` 的结论为 **CHANGES REQUIRED**：ORCH-FINAL-R1/R2 经 Node 38/38、Rust 项目包 17/17 定向复验已关闭；新增 ORCH-FINAL-R3（P2，当前验收阻断）由重复 `workItem.id` 触发。`find` 校验首项，`map` 更新全部同名项，最小输入把 `[queued, succeeded]` 改成 `[running, running]`，绕过终态保护。审查只读，不是 GitHub 人工 approval。
- 实现者新增失败先行测试：领域创建和计划工具原接受跨阶段重复 id，Rust 原生包原可导出同阶段重复 id。修复为计划级唯一性校验，三条输入路径均拒绝且不写入；两端 schema 与项目包决定见 [ADR-006](../../architecture/adr/ADR-006-stage-plan-package-contract.md)。完整结果见 `verification.md`。
- 此次修复仍在未提交候选中；新 head 的独立复审和 hosted CI **NOT VERIFIED**，不得沿用 `67ff18fb` 的结论当作通过。

## 2026-09-26 身份唯一性自查

- `c7abc45` 已通过 Hosted CI `verify`/`delivery`，但独立新 head 复审任务因执行额度耗尽而中断，不能视为 PASS。
- 实现者随后发现阶段 `index` 与项目内计划 `id` 可由外部数据重复注入；阶段推进和计划写入按这些身份查找后批量映射，可能影响多个对象。TS 计划 schema 现在拒绝重复阶段索引，项目读取仅保留同 ID 的首个有效计划；Web 包无损校验及 Rust 包预检拒绝异常导出/导入。失败先行与完整本地测试见 `verification.md`。
- 此次自查及修复不是独立复审。新提交 SHA 的独立 review 与 Hosted CI 均须重新完成；PR #14 保持不可合并。

## 2026-09-26 `36a3419` 独立复审与处理

- 独立只读 reviewer 绑定 `origin/main@76339c9f` 到 `36a341952e46bbf2f31eff1d9984d0c5189767dc`，结论 **CHANGES REQUIRED**，未修改代码或提交 GitHub approval。
- P1：`approvalGate: plan` 未批准可执行或直接请求结果审批；全部工作项仍排队也可标记 `done`；阶段状态绕回后旧 Agent 请求仍能以相同 `expectedStatus` 推进；依赖缺失/自引用/循环可创建，前置项未成功仍能运行后续项。reviewer 动态复现了 ABA 与缺失依赖运行。
- P2：Web/Rust 项目包可接受 `stagePlans[].projectId` 与所在项目不一致，导入后编排器拒绝状态更新；reviewer 以静态调用链指出。
- 实现者新增失败先行测试后处理：计划批准标记及执行/完成门禁、Agent 工具与宿主阶段入口的 revision 校验、依赖图及运行检查、Web/Rust 项目包归属与状态校验。原先演示错误完成路径的测试已改为真实审批/工作项成功流程；范围内本地验证见 `verification.md`。独立 reviewer 的旧结论仍是 CHANGES REQUIRED，新 head 必须补审。

## 2026-09-26 `5fff9de` 独立复审与结果返工修复

- 独立只读 reviewer 对 `5fff9dec935fc325b875db7d0f660c95d1fd2f8a` 确认前述五项问题已关闭，但结论仍为 **CHANGES REQUIRED**：新发现一项既有 P1，结果拒绝后阶段回到 `doing`，所有工作项却仍为终态 `succeeded`，无法重新生成或修改同 ID 计划。reviewer 用单项完整审批流程复现。
- 实现者新增失败先行测试后补宿主控制的返工项选择、prompt 修订与下游依赖失效；清除旧素材引用并重新打开受影响的结果审批。原本成功项不开放普通覆盖。修复后新 head 须重新绑定独立复审及 Hosted CI。

## 2026-09-26 `abb2bb8` 独立复审与返工审批边界

- 独立 reviewer 对 `abb2bb8e75ca816ba8f4049e660ed63bfb23c09b` 确认拒绝结果后的返工路径已打通，但结论 **CHANGES REQUIRED**：修改已批准计划的 prompt 后沿用 `planApprovedAt`，新工作可直接运行，宿主再请求计划审批反而报已批准（P1）；修改原 prompt 后同 ID 原定义重放失败（P2）。reviewer 以单阶段流程实际复现，未改文件。
- 候选新增独立的可选 `reworkPrompt` 运行字段，原始 prompt 留作幂等定义；改变 plan-gated 阶段的有效提示词时清除审批标记、整阶段及下游排队并重新进入计划审批。Web/Rust 项目包往返覆盖新字段。新 head 须再做独立复审及 Hosted CI。

## 2026-09-26 `9ddfcb5` 独立复审结论

- 独立只读 reviewer 对 `9ddfcb5bbb9ee1e9f484d022104c4dfc600df526` 给出 **PASS**：计划门返工提示词更改后必须重批；同 ID 原计划重放保留当前返工状态；Web/Rust 项目包保留 `reworkPrompt`；此前结果拒绝死路、下游失效与审批/身份/依赖保护未见回归。定向 Node 53/53、Rust 项目包 19/19、TypeScript 检查通过。该结论只覆盖所审源码，不等于用户产品验收或后续文档提交的 Hosted CI。
