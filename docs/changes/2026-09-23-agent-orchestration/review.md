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

- Rust 检查：无 Rust 变更，合并门禁执行。
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
